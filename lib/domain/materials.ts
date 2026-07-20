import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { resolvePublicPreviewUrl } from "@/lib/storage/public-preview";
import {
  assetTypeLabels,
  type PublicAssetCard,
  type PublicAssetDetail,
  type PublicAssetFilters,
  type PublicAssetSort,
  type PublicAssetType,
  type PublicPreview
} from "@/types/materials";
import { getSystemSettings } from "@/lib/settings/service";

const readyPublicPreviewWhere = {
  deletedAt: null,
  accessScope: "public_preview",
  fileType: { in: ["preview", "thumbnail"] },
  metadata: { path: ["processingStatus"], equals: "ready" }
} satisfies Prisma.AssetFileWhereInput;

const publicAssetEligibilityWhere = {
  deletedAt: null,
  listingStatus: "listed",
  reviewStatus: "approved",
  certificationStatus: "certified",
  files: { some: readyPublicPreviewWhere }
} satisfies Prisma.AssetWhereInput;

const publicAssetSelect = {
  id: true,
  title: true,
  description: true,
  assetType: true,
  priceCents: true,
  currency: true,
  certificationStatus: true,
  listedAt: true,
  uploaderProfile: { select: { displayName: true } },
  tags: { select: { tag: true }, orderBy: { tag: "asc" } },
  files: {
    where: readyPublicPreviewWhere,
    select: {
      id: true,
      fileType: true,
      cosBucket: true,
      cosRegion: true,
      cosObjectKey: true,
      width: true,
      height: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  },
  certificationRecord: {
    select: {
      status: true,
      certificateNo: true,
      governmentSiteName: true,
      certificateIssuedAt: true
    }
  }
} satisfies Prisma.AssetSelect;

type PublicAssetRecord = Prisma.AssetGetPayload<{ select: typeof publicAssetSelect }>;

function encodeCursor(id: string) {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    const id = Buffer.from(cursor, "base64url").toString("utf8");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error("invalid cursor");
    }
    return id;
  } catch {
    throw new ApiError(422, "VALIDATION_ERROR", "分页游标无效。 ");
  }
}

function orderByFor(sort: PublicAssetSort): Prisma.AssetOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ priceCents: "asc" }, { id: "asc" }];
  if (sort === "price_desc") return [{ priceCents: "desc" }, { id: "desc" }];
  return [{ listedAt: "desc" }, { id: "desc" }];
}

function watermarkVersion(metadata: Prisma.JsonValue) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "unknown";
  const value = metadata.watermarkTemplateVersion;
  return typeof value === "string" ? value : "unknown";
}

function mapPreview(file: PublicAssetRecord["files"][number]): PublicPreview {
  return {
    id: file.id,
    kind: file.fileType === "thumbnail" ? "thumbnail" : "preview",
    url: resolvePublicPreviewUrl(file),
    width: file.width,
    height: file.height,
    watermarkTemplateVersion: watermarkVersion(file.metadata)
  };
}

function mapAssetCard(asset: PublicAssetRecord): PublicAssetCard {
  const files = asset.files.map(mapPreview);
  const preview = files.find((file) => file.kind === "thumbnail") ?? files[0];
  if (!preview || !asset.listedAt) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在或尚未上架。 ");
  }

  return {
    id: asset.id,
    title: asset.title,
    type: asset.assetType,
    typeLabel: assetTypeLabels[asset.assetType],
    priceCents: asset.priceCents,
    currency: asset.currency === "CNY" ? "CNY" : "CNY",
    certificationStatus: "certified",
    uploaderDisplayName: asset.uploaderProfile.displayName,
    listedAt: asset.listedAt.toISOString(),
    preview
  };
}

export async function listPublicAssets(filters: PublicAssetFilters) {
  const query = filters.q?.trim();
  const where: Prisma.AssetWhereInput = {
    ...publicAssetEligibilityWhere,
    ...(filters.type ? { assetType: filters.type } : {}),
    ...(filters.tag
      ? { tags: { some: { tag: { equals: filters.tag.trim(), mode: "insensitive" } } } }
      : {}),
    ...(filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined
      ? {
          priceCents: {
            ...(filters.minPriceCents !== undefined ? { gte: filters.minPriceCents } : {}),
            ...(filters.maxPriceCents !== undefined ? { lte: filters.maxPriceCents } : {})
          }
        }
      : {}),
    ...(filters.listedAfter ? { listedAt: { gte: new Date(filters.listedAfter) } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { tags: { some: { tag: { contains: query, mode: "insensitive" } } } }
          ]
        }
      : {})
  };

  const records = await getPrisma().asset.findMany({
    where,
    select: publicAssetSelect,
    orderBy: orderByFor(filters.sort),
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: decodeCursor(filters.cursor) }, skip: 1 } : {})
  });
  const hasMore = records.length > filters.limit;
  const page = hasMore ? records.slice(0, filters.limit) : records;

  return {
    data: page.map(mapAssetCard),
    meta: {
      hasMore,
      nextCursor: hasMore && page.length ? encodeCursor(page[page.length - 1].id) : null
    }
  };
}

export async function getPublicAsset(assetId: string): Promise<PublicAssetDetail> {
  const [asset, settings] = await Promise.all([getPrisma().asset.findFirst({
    where: { id: assetId, ...publicAssetEligibilityWhere },
    select: publicAssetSelect
  }), getSystemSettings()]);

  if (!asset) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在或尚未上架。 ");
  }

  if (!asset.certificationRecord?.certificateNo || asset.certificationRecord.status !== "certified") {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材认证公开摘要尚未就绪。");
  }
  return {
    ...mapAssetCard(asset),
    description: asset.description,
    tags: asset.tags.map(({ tag }) => tag),
    previews: asset.files.map(mapPreview),
    licenseSummary: {
      scope: "统一商业内容制作授权；禁止转售原文件、冒充权利人或用于违法侵权用途。",
      authorizationDuration: "permanent",
      downloadEligibilityDays: settings.downloadEligibilityDays
    },
    certificationSummary: {
      status: "certified",
      certificateNo: asset.certificationRecord.certificateNo,
      source: asset.certificationRecord.governmentSiteName,
      issuedAt: asset.certificationRecord.certificateIssuedAt?.toISOString() ?? null
    }
  };
}

export async function listPublicCategories() {
  const counts = await getPrisma().asset.groupBy({
    by: ["assetType"],
    where: publicAssetEligibilityWhere,
    _count: { _all: true }
  });
  const countByType = new Map(counts.map((item) => [item.assetType, item._count._all]));

  return (Object.keys(assetTypeLabels) as PublicAssetType[]).map((type) => ({
    type,
    name: assetTypeLabels[type],
    count: countByType.get(type) ?? 0
  }));
}

export async function listPublicTags(input: { q?: string; limit: number }) {
  const tags = await getPrisma().assetTag.findMany({
    where: {
      asset: publicAssetEligibilityWhere,
      ...(input.q ? { tag: { contains: input.q.trim(), mode: "insensitive" } } : {})
    },
    select: { tag: true },
    distinct: ["tag"],
    orderBy: { tag: "asc" },
    take: input.limit
  });

  return tags.map(({ tag }) => tag);
}
