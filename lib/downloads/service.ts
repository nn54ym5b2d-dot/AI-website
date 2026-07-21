import { createHmac } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getSystemSettings } from "@/lib/settings/service";
import {
  createLocalBundleSignedPath,
  createLocalDownloadBundle,
  type BundleManifestEntry
} from "@/lib/storage/download-bundle-provider";

function ensureBuyer(access: SessionAccess) {
  if (!access.roles.includes("buyer")) throw new ApiError(403, "FORBIDDEN", "当前账号没有下载已购素材的权限。");
}

function parseManifest(value: unknown): BundleManifestEntry[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new ApiError(409, "ASSET_FILES_INCOMPLETE", "授权原文件清单无效。");
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new ApiError(409, "ASSET_FILES_INCOMPLETE", "授权原文件清单无效。");
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(item.sha256) || typeof item.sizeBytes !== "string" || !/^\d+$/.test(item.sizeBytes) || typeof item.mimeType !== "string") {
      throw new ApiError(409, "ASSET_FILES_INCOMPLETE", "授权原文件清单字段不完整。");
    }
    return { id: item.id, sha256: item.sha256, sizeBytes: item.sizeBytes, mimeType: item.mimeType, ...(typeof item.originalFileName === "string" ? { originalFileName: item.originalFileName } : {}) };
  });
}

function effectiveStatus(link: { status: string; expiresAt: Date }) {
  return link.status === "active" && link.expiresAt <= new Date() ? "expired" : link.status;
}

function serializeLink(link: {
  id: string; status: string; bundleStatus: string; bundleFailureCode: string | null; expiresAt: Date; eligibilityDaysSnapshot: number; bundleGeneratedAt: Date | null;
  authorizationRecord: { id: string; status: string; assetId: string; order: { orderNo: string }; orderItem: { assetTitleSnapshot: string } };
  _count?: { downloads: number };
  downloads?: Array<{ downloadedAt: Date }>;
}) {
  return {
    id: link.id,
    authorizationId: link.authorizationRecord.id,
    authorizationStatus: link.authorizationRecord.status,
    assetId: link.authorizationRecord.assetId,
    assetTitle: link.authorizationRecord.orderItem.assetTitleSnapshot,
    orderNo: link.authorizationRecord.order.orderNo,
    status: effectiveStatus(link),
    bundleStatus: link.bundleStatus,
    bundleFailureCode: link.bundleFailureCode,
    eligibilityDays: link.eligibilityDaysSnapshot,
    expiresAt: link.expiresAt.toISOString(),
    bundleGeneratedAt: link.bundleGeneratedAt?.toISOString() ?? null,
    downloadCount: link._count?.downloads ?? 0,
    lastDownloadedAt: link.downloads?.[0]?.downloadedAt.toISOString() ?? null
  };
}

const linkInclude = {
  authorizationRecord: {
    include: {
      order: { select: { orderNo: true } },
      orderItem: { select: { assetTitleSnapshot: true, uploaderProfile: { select: { userId: true } } } }
    }
  },
  downloadBundleFile: true,
  _count: { select: { downloads: true } },
  downloads: { select: { downloadedAt: true }, orderBy: { downloadedAt: "desc" as const }, take: 1 }
};

export async function listBuyerDownloadLinks(access: SessionAccess) {
  ensureBuyer(access);
  await getPrisma().downloadLink.updateMany({ where: { requestedByUserId: access.user.id, status: "active", expiresAt: { lte: new Date() } }, data: { status: "expired" } });
  const links = await getPrisma().downloadLink.findMany({ where: { requestedByUserId: access.user.id }, include: linkInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  return links.map(serializeLink);
}

export async function ensureBuyerDownloadBundle(access: SessionAccess, authorizationId: string) {
  ensureBuyer(access);
  const link = await getPrisma().downloadLink.findFirst({ where: { authorizationRecordId: authorizationId, requestedByUserId: access.user.id }, include: linkInclude });
  if (!link) throw new ApiError(404, "RESOURCE_NOT_FOUND", "下载入口不存在。");
  if (link.authorizationRecord.status !== "active") throw new ApiError(410, "AUTHORIZATION_REVOKED", "该素材授权已撤销。");
  const status = effectiveStatus(link);
  if (status === "expired") {
    await getPrisma().downloadLink.updateMany({ where: { id: link.id, status: "active" }, data: { status: "expired" } });
    throw new ApiError(410, "DOWNLOAD_LINK_EXPIRED", "平台下载资格已过期。");
  }
  if (status === "revoked") throw new ApiError(410, "DOWNLOAD_LINK_REVOKED", "平台下载入口已撤销。");
  if (link.bundleStatus === "ready" && link.downloadBundleFile) return serializeLink(link);
  if (link.bundleStatus === "processing") return serializeLink(link);

  const claimed = await getPrisma().downloadLink.updateMany({ where: { id: link.id, status: "active", bundleStatus: { in: ["pending", "failed"] }, downloadBundleFileId: null }, data: { bundleStatus: "processing", bundleFailureCode: null } });
  if (claimed.count !== 1) {
    const current = await getPrisma().downloadLink.findUniqueOrThrow({ where: { id: link.id }, include: linkInclude });
    return serializeLink(current);
  }
  try {
    const manifest = parseManifest(link.authorizationRecord.assetFileManifestSnapshot);
    const sourceFiles = await getPrisma().assetFile.findMany({ where: { id: { in: manifest.map((entry) => entry.id) } } });
    const bundle = await createLocalDownloadBundle({ assetId: link.authorizationRecord.assetId, downloadLinkId: link.id, manifest, sourceFiles });
    const ready = await getPrisma().$transaction(async (transaction) => {
      await transaction.assetFile.create({ data: { id: bundle.fileId, assetId: link.authorizationRecord.assetId, uploadedByUserId: link.authorizationRecord.orderItem.uploaderProfile.userId, fileType: "download_bundle", accessScope: "signed_download_only", cosBucket: bundle.bucket, cosRegion: bundle.region, cosObjectKey: bundle.objectKey, fileHash: bundle.fileHash, fileSizeBytes: bundle.fileSizeBytes, mimeType: bundle.mimeType, metadata: bundle.metadata } });
      return transaction.downloadLink.update({ where: { id: link.id }, data: { downloadBundleFileId: bundle.fileId, bundleStatus: "ready", bundleGeneratedAt: new Date(), bundleFailureCode: null }, include: linkInclude });
    });
    return serializeLink(ready);
  } catch (error) {
    const failureCode = error instanceof ApiError ? error.code : "LOCAL_PROVIDER_FAILED";
    await getPrisma().downloadLink.updateMany({ where: { id: link.id, bundleStatus: "processing" }, data: { bundleStatus: "failed", bundleFailureCode: failureCode } });
    throw error;
  }
}

export async function listBuyerDownloadHistory(access: SessionAccess) {
  ensureBuyer(access);
  const records = await getPrisma().download.findMany({
    where: { buyerUserId: access.user.id },
    include: { authorizationRecord: { include: { orderItem: { select: { assetTitleSnapshot: true } }, order: { select: { orderNo: true } } } } },
    orderBy: [{ downloadedAt: "desc" }, { id: "desc" }],
    take: 100
  });
  return records.map((record) => ({ id: record.id, assetId: record.assetId, assetTitle: record.authorizationRecord.orderItem.assetTitleSnapshot, orderNo: record.authorizationRecord.order.orderNo, downloadedAt: record.downloadedAt.toISOString() }));
}

export async function issueBuyerDownloadRedirect(access: SessionAccess, downloadLinkId: string, request: Request) {
  ensureBuyer(access);
  const link = await getPrisma().downloadLink.findFirst({ where: { id: downloadLinkId, requestedByUserId: access.user.id }, include: { authorizationRecord: true, downloadBundleFile: true } });
  if (!link) throw new ApiError(404, "RESOURCE_NOT_FOUND", "下载入口不存在。");
  if (link.authorizationRecord.status !== "active") throw new ApiError(410, "AUTHORIZATION_REVOKED", "该素材授权已撤销。");
  if (link.status === "revoked") throw new ApiError(410, "DOWNLOAD_LINK_REVOKED", "平台下载入口已撤销。");
  if (link.status === "expired" || link.expiresAt <= new Date()) {
    await getPrisma().downloadLink.updateMany({ where: { id: link.id, status: "active" }, data: { status: "expired" } });
    throw new ApiError(410, "DOWNLOAD_LINK_EXPIRED", "平台下载资格已过期。");
  }
  if (link.bundleStatus !== "ready" || !link.downloadBundleFile || link.downloadBundleFile.fileType !== "download_bundle" || link.downloadBundleFile.accessScope !== "signed_download_only" || link.downloadBundleFile.assetId !== link.authorizationRecord.assetId) {
    throw new ApiError(409, "DOWNLOAD_BUNDLE_NOT_READY", "ZIP 素材包尚未准备完成。");
  }
  const settings = await getSystemSettings();
  const signed = createLocalBundleSignedPath(link.downloadBundleFile.id, settings.signedDownloadUrlTtlMinutes);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = forwarded ? createHmac("sha256", getAuthConfig().authSecret).update(forwarded).digest("hex") : null;
  const userAgentSummary = request.headers.get("user-agent")?.slice(0, 200) ?? null;
  await getPrisma().download.create({ data: { downloadLinkId: link.id, authorizationRecordId: link.authorizationRecordId, buyerUserId: access.user.id, assetId: link.authorizationRecord.assetId, assetFileId: link.downloadBundleFile.id, ipHash, userAgentSummary } });
  return { location: new URL(signed.path, request.url), expiresAt: signed.expiresAt };
}
