import type { AssetFileType, AssetType, Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import { hashContent } from "@/lib/auth/crypto";
import { getPrisma } from "@/lib/db/prisma";
import {
  createLocalDerivativeObjects,
  createUploadTarget,
  LOCAL_ASSET_STORAGE_PROVIDER,
  LOCAL_DERIVATIVE_PROVIDER,
  LOCAL_WATERMARK_TEMPLATE_VERSION,
  verifyAndFinalizeUpload
} from "@/lib/storage/asset-provider";
import type { UploaderAccess } from "@/lib/uploader/access";

const PRICE_BY_TYPE: Record<AssetType, number> = {
  person: 5000,
  object: 1000,
  scene: 5000
};

const UPLOAD_INTENT_TTL_MS = 10 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type AssetDraftInput = {
  type: AssetType;
  title: string;
  description?: string | null;
  tags: string[];
};

type AssetEditInput = {
  title?: string;
  description?: string | null;
  tags?: string[];
};

type UploadIntentInput = {
  fileType: "original" | "person_proof";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function metadataObject(value: Prisma.JsonValue) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serializeFile(file: {
  id: string;
  fileType: AssetFileType;
  fileSizeBytes: bigint;
  mimeType: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}) {
  const metadata = metadataObject(file.metadata);
  return {
    id: file.id,
    fileType: file.fileType,
    sizeBytes: Number(file.fileSizeBytes),
    mimeType: file.mimeType,
    verificationStatus: metadata.verificationStatus ?? null,
    processingStatus: metadata.processingStatus ?? null,
    sourceFileId: metadata.sourceFileId ?? null,
    watermarkTemplateVersion: metadata.watermarkTemplateVersion ?? null,
    providerMode: metadata.processingMode ?? metadata.verificationMode ?? null,
    createdAt: file.createdAt.toISOString()
  };
}

function serializeAsset(asset: {
  id: string;
  assetType: AssetType;
  title: string;
  description: string | null;
  reviewStatus: string;
  listingStatus: string;
  certificationStatus: string;
  priceCents: number;
  currency: string;
  submittedAt: Date | null;
  updatedAt: Date;
  tags?: Array<{ tag: string }>;
  files?: Array<Parameters<typeof serializeFile>[0]>;
  processingJobs?: Array<{
    id: string;
    sourceFileId: string;
    status: string;
    provider: string;
    watermarkTemplateVersion: string;
    errorCode: string | null;
  }>;
  certificationFeeCharge?: {
    id: string;
    amountCents: number;
    currency: string;
    status: string;
  } | null;
}) {
  return {
    id: asset.id,
    type: asset.assetType,
    title: asset.title,
    description: asset.description,
    tags: asset.tags?.map(({ tag }) => tag) ?? [],
    reviewStatus: asset.reviewStatus,
    listingStatus: asset.listingStatus,
    certificationStatus: asset.certificationStatus,
    priceCents: asset.priceCents,
    currency: asset.currency,
    submittedAt: asset.submittedAt?.toISOString() ?? null,
    updatedAt: asset.updatedAt.toISOString(),
    files: asset.files?.map(serializeFile) ?? [],
    processingJobs:
      asset.processingJobs?.map((job) => ({
        id: job.id,
        sourceFileId: job.sourceFileId,
        status: job.status,
        provider: job.provider,
        watermarkTemplateVersion: job.watermarkTemplateVersion,
        errorCode: job.errorCode
      })) ?? [],
    certificationFeeCharge: asset.certificationFeeCharge ?? null
  };
}

async function findOwnedAsset(access: UploaderAccess, assetId: string) {
  const asset = await getPrisma().asset.findFirst({
    where: {
      id: assetId,
      uploaderProfileId: access.uploaderProfile.id,
      deletedAt: null
    },
    include: {
      tags: { orderBy: { tag: "asc" } },
      files: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      processingJobs: { orderBy: { createdAt: "asc" } },
      certificationFeeCharge: true
    }
  });
  if (!asset) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在或不属于当前上传者。 ");
  }
  return asset;
}

function assertDraftEditable(asset: { reviewStatus: string; certificationStatus: string }) {
  if (asset.reviewStatus !== "draft" || asset.certificationStatus !== "not_started") {
    throw new ApiError(409, "STATE_TRANSITION_INVALID", "素材当前状态不能继续编辑或上传。 ");
  }
}

export async function createUploaderAsset(access: UploaderAccess, input: AssetDraftInput) {
  const tags = normalizeTags(input.tags);
  const asset = await getPrisma().asset.create({
    data: {
      uploaderProfileId: access.uploaderProfile.id,
      assetType: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priceCents: PRICE_BY_TYPE[input.type],
      tags: tags.length ? { create: tags.map((tag) => ({ tag })) } : undefined
    },
    include: { tags: true }
  });
  return serializeAsset(asset);
}

export async function listUploaderAssets(access: UploaderAccess) {
  const assets = await getPrisma().asset.findMany({
    where: { uploaderProfileId: access.uploaderProfile.id, deletedAt: null },
    include: {
      tags: { orderBy: { tag: "asc" } },
      files: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      processingJobs: { orderBy: { createdAt: "asc" } },
      certificationFeeCharge: true
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 50
  });
  return assets.map(serializeAsset);
}

export async function getUploaderAsset(access: UploaderAccess, assetId: string) {
  return serializeAsset(await findOwnedAsset(access, assetId));
}

export async function updateUploaderAsset(
  access: UploaderAccess,
  assetId: string,
  input: AssetEditInput
) {
  const current = await findOwnedAsset(access, assetId);
  assertDraftEditable(current);
  const tags = input.tags === undefined ? undefined : normalizeTags(input.tags);

  const asset = await getPrisma().$transaction(async (transaction) => {
    if (tags) {
      await transaction.assetTag.deleteMany({ where: { assetId } });
    }
    return transaction.asset.update({
      where: { id: assetId },
      data: {
        ...(input.title === undefined ? {} : { title: input.title.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description?.trim() || null }),
        ...(tags?.length ? { tags: { create: tags.map((tag) => ({ tag })) } } : {})
      },
      include: {
        tags: { orderBy: { tag: "asc" } },
        files: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        processingJobs: { orderBy: { createdAt: "asc" } },
        certificationFeeCharge: true
      }
    });
  });
  return serializeAsset(asset);
}

export async function createAssetUploadIntent(
  access: UploaderAccess,
  assetId: string,
  input: UploadIntentInput
) {
  const asset = await findOwnedAsset(access, assetId);
  assertDraftEditable(asset);
  if (input.fileType === "person_proof" && asset.assetType !== "person") {
    throw new ApiError(422, "UPLOAD_FILE_REJECTED", "只有人物素材可以上传人物证明材料。 ");
  }

  const intentId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UPLOAD_INTENT_TTL_MS);
  const target = createUploadTarget({
    intentId,
    assetId,
    fileName: input.fileName,
    fileType: input.fileType,
    expiresAt
  });
  const intent = await getPrisma().uploadIntent.create({
    data: {
      id: intentId,
      assetId,
      userId: access.user.id,
      fileType: input.fileType,
      provider: target.provider,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      sha256: input.sha256.toLowerCase(),
      stagingBucket: target.staging.bucket,
      stagingRegion: target.staging.region,
      stagingObjectKey: target.staging.objectKey,
      finalBucket: target.final.bucket,
      finalRegion: target.final.region,
      finalObjectKey: target.final.objectKey,
      expiresAt
    }
  });

  return {
    uploadId: intent.id,
    provider: target.provider,
    providerMode: target.providerMode,
    providerDisclosure: target.providerDisclosure,
    uploadUrl: target.uploadUrl,
    method: target.method,
    requiredHeaders: target.requiredHeaders,
    expiresAt: intent.expiresAt.toISOString(),
    maxBytes: 25_000_000
  };
}

export async function completeAssetUpload(
  access: UploaderAccess,
  assetId: string,
  uploadId: string
) {
  await findOwnedAsset(access, assetId);

  const result = await getPrisma().$transaction(async (transaction) => {
    const intent = await transaction.uploadIntent.findFirst({
      where: { id: uploadId, assetId, userId: access.user.id },
      include: { assetFile: true }
    });
    if (!intent) {
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "上传意图不存在。 ");
    }
    if (intent.status === "completed" && intent.assetFile) {
      const processingJob = await transaction.assetDerivativeJob.findFirst({
        where: { sourceFileId: intent.assetFile.id }
      });
      return { file: intent.assetFile, processingJob, repeated: true };
    }

    const verified = verifyAndFinalizeUpload(intent);
    const file = await transaction.assetFile.create({
      data: {
        assetId,
        uploadedByUserId: access.user.id,
        fileType: intent.fileType,
        accessScope: "private",
        cosBucket: verified.finalObject.bucket,
        cosRegion: verified.finalObject.region,
        cosObjectKey: verified.finalObject.objectKey,
        fileHash: verified.finalObject.sha256,
        fileSizeBytes: verified.finalObject.sizeBytes,
        mimeType: verified.finalObject.mimeType,
        metadata: {
          storageProvider: verified.provider,
          verificationStatus: "verified",
          verificationMode: verified.verificationMode,
          providerDisclosure: verified.providerDisclosure,
          originalFileName: verified.finalObject.fileName,
          promotedFromUploadIntentId: intent.id,
          immutableFinalKey: true
        }
      }
    });
    const updated = await transaction.uploadIntent.updateMany({
      where: { id: intent.id, status: "pending", assetFileId: null },
      data: { status: "completed", completedAt: new Date(), assetFileId: file.id }
    });
    if (updated.count !== 1) {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "上传意图已被并发完成。 ");
    }

    const processingJob =
      intent.fileType === "original"
        ? await transaction.assetDerivativeJob.create({
            data: {
              assetId,
              sourceFileId: file.id,
              provider: LOCAL_DERIVATIVE_PROVIDER,
              watermarkTemplateVersion: LOCAL_WATERMARK_TEMPLATE_VERSION
            }
          })
        : null;
    return { file, processingJob, repeated: false };
  });

  return {
    fileId: result.file.id,
    fileType: result.file.fileType,
    status: "ready" as const,
    derivativeStatus: result.processingJob?.status ?? "not_applicable",
    processingJobId: result.processingJob?.id ?? null,
    provider: LOCAL_ASSET_STORAGE_PROVIDER,
    providerMode: "metadata_only" as const,
    repeatedCompletion: result.repeated,
    file: serializeFile(result.file)
  };
}

function derivativesForSource(
  files: Array<{
    id: string;
    fileType: AssetFileType;
    fileSizeBytes: bigint;
    mimeType: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }>,
  sourceFileId: string
) {
  return files
    .filter((file) => metadataObject(file.metadata).sourceFileId === sourceFileId)
    .map(serializeFile);
}

export async function runAssetDerivativeJob(
  access: UploaderAccess,
  assetId: string,
  jobId: string
) {
  await findOwnedAsset(access, assetId);
  const job = await getPrisma().assetDerivativeJob.findFirst({
    where: { id: jobId, assetId },
    include: { sourceFile: true }
  });
  if (!job || job.sourceFile.deletedAt) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "衍生图处理任务不存在。 ");
  }
  if (job.sourceFile.fileType !== "original") {
    throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有原文件可以生成公开衍生图。 ");
  }

  if (job.status === "ready") {
    const files = await getPrisma().assetFile.findMany({
      where: { assetId, fileType: { in: ["preview", "thumbnail"] }, deletedAt: null }
    });
    return {
      jobId: job.id,
      status: job.status,
      provider: job.provider,
      derivatives: derivativesForSource(files, job.sourceFileId),
      repeatedRun: true
    };
  }

  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      await transaction.assetDerivativeJob.update({
        where: { id: job.id },
        data: {
          status: "processing",
          attempts: { increment: 1 },
          startedAt: new Date(),
          errorCode: null
        }
      });
      const descriptors = createLocalDerivativeObjects({
        assetId,
        jobId: job.id,
        sourceFileId: job.sourceFileId,
        sourceFileHash: job.sourceFile.fileHash,
        sourceSizeBytes: job.sourceFile.fileSizeBytes,
        watermarkTemplateVersion: job.watermarkTemplateVersion
      });
      const derivativeFiles = [];
      for (const descriptor of descriptors) {
        derivativeFiles.push(
          await transaction.assetFile.upsert({
            where: {
              cosBucket_cosRegion_cosObjectKey: {
                cosBucket: descriptor.bucket,
                cosRegion: descriptor.region,
                cosObjectKey: descriptor.objectKey
              }
            },
            update: { metadata: descriptor.metadata, deletedAt: null },
            create: {
              assetId,
              uploadedByUserId: access.user.id,
              fileType: descriptor.fileType,
              accessScope: descriptor.accessScope,
              cosBucket: descriptor.bucket,
              cosRegion: descriptor.region,
              cosObjectKey: descriptor.objectKey,
              fileHash: descriptor.fileHash,
              fileSizeBytes: descriptor.fileSizeBytes,
              mimeType: descriptor.mimeType,
              metadata: descriptor.metadata
            }
          })
        );
      }
      const completedJob = await transaction.assetDerivativeJob.update({
        where: { id: job.id },
        data: { status: "ready", completedAt: new Date(), errorCode: null }
      });
      return { completedJob, derivativeFiles };
    });
    return {
      jobId: result.completedJob.id,
      status: result.completedJob.status,
      provider: result.completedJob.provider,
      providerMode: "metadata_only" as const,
      providerDisclosure:
        "本地测试仅生成独立对象元数据；真实水印图片处理和 CDN 在 T017 接入。",
      derivatives: result.derivativeFiles.map(serializeFile),
      repeatedRun: false
    };
  } catch (error) {
    await getPrisma().assetDerivativeJob.update({
      where: { id: job.id },
      data: { status: "failed", errorCode: "LOCAL_PROVIDER_FAILED" }
    });
    throw error;
  }
}

export async function submitUploaderAsset(
  access: UploaderAccess,
  assetId: string,
  idempotencyKey: string
) {
  const endpoint = "POST:/api/v1/uploader/assets/{assetId}/submit";
  const idempotencyKeyHash = hashContent(idempotencyKey);
  const requestHash = hashContent(assetId);

  const result = await getPrisma().$transaction(async (transaction) => {
    const replay = await transaction.idempotencyRecord.findUnique({
      where: {
        userId_endpoint_idempotencyKeyHash: {
          userId: access.user.id,
          endpoint,
          idempotencyKeyHash
        }
      }
    });
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "同一幂等键不能用于不同素材。 ");
      }
      const asset = await transaction.asset.findFirst({
        where: { id: assetId, uploaderProfileId: access.uploaderProfile.id, deletedAt: null }
      });
      const charge = await transaction.certificationFeeCharge.findUnique({
        where: { id: replay.responseResourceId }
      });
      if (!asset || !charge) {
        throw new ApiError(409, "RESOURCE_CONFLICT", "幂等记录关联资源已失效。 ");
      }
      return { asset, charge, replayed: true };
    }

    const asset = await transaction.asset.findFirst({
      where: { id: assetId, uploaderProfileId: access.uploaderProfile.id, deletedAt: null },
      include: {
        files: { where: { deletedAt: null } },
        processingJobs: true
      }
    });
    if (!asset) {
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在或不属于当前上传者。 ");
    }
    assertDraftEditable(asset);
    const originals = asset.files.filter((file) => file.fileType === "original");
    if (!originals.length) {
      throw new ApiError(422, "ASSET_FILES_INCOMPLETE", "至少需要一份已完成校验的原文件。 ");
    }
    const readySourceIds = new Set(
      asset.processingJobs
        .filter((job) => job.status === "ready")
        .map((job) => job.sourceFileId)
    );
    if (originals.some((file) => !readySourceIds.has(file.id))) {
      throw new ApiError(
        422,
        "ASSET_FILES_INCOMPLETE",
        "所有原文件的水印预览图和缩略图处理完成后才能提交。"
      );
    }
    if (
      asset.assetType === "person" &&
      !asset.files.some((file) => file.fileType === "person_proof")
    ) {
      throw new ApiError(422, "PERSON_PROOF_REQUIRED", "人物素材必须上传必要证明材料。 ");
    }

    const charge = await transaction.certificationFeeCharge.create({
      data: {
        assetId,
        uploaderUserId: access.user.id,
        amountCents: 1000,
        currency: "CNY",
        status: "pending"
      }
    });
    const updatedAsset = await transaction.asset.update({
      where: { id: assetId },
      data: { certificationStatus: "pending_payment", submittedAt: new Date() }
    });
    await transaction.idempotencyRecord.create({
      data: {
        userId: access.user.id,
        endpoint,
        idempotencyKeyHash,
        requestHash,
        responseResourceId: charge.id,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS)
      }
    });
    return { asset: updatedAsset, charge, replayed: false };
  });

  return {
    asset: serializeAsset(result.asset),
    certificationFeeCharge: {
      id: result.charge.id,
      amountCents: result.charge.amountCents,
      currency: result.charge.currency,
      status: result.charge.status
    },
    nextStep: "certification_fee_payment_not_connected" as const,
    message:
      "素材已进入认证上传费待支付阶段；真实支付未接入，因此尚未进入平台初审。",
    idempotentReplay: result.replayed
  };
}
