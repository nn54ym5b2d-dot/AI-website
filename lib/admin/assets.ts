import type {
  AssetFileType,
  AssetListingStatus,
  AssetReviewStatus,
  AssetType,
  CertificationStatus,
  Prisma
} from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { ContentAdminAccess } from "@/lib/admin/access";
import { getPrisma } from "@/lib/db/prisma";
import {
  createUploadTarget,
  LOCAL_ASSET_STORAGE_PROVIDER,
  verifyAndFinalizeUpload
} from "@/lib/storage/asset-provider";
import { resolvePublicPreviewUrl } from "@/lib/storage/public-preview";

const SENSITIVE_FILE_TYPES = new Set<AssetFileType>([
  "person_proof",
  "supporting_proof",
  "certificate_file",
  "certificate_snapshot"
]);
const CERTIFICATE_FILE_TYPES = new Set<AssetFileType>([
  "certificate_file",
  "certificate_snapshot"
]);
const UPLOAD_INTENT_TTL_MS = 10 * 60 * 1000;

function cleanTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function serializeFile(file: {
  id: string;
  fileType: AssetFileType;
  fileSizeBytes: bigint;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: Date;
}) {
  return {
    id: file.id,
    fileType: file.fileType,
    fileSizeBytes: file.fileSizeBytes.toString(),
    mimeType: file.mimeType,
    width: file.width,
    height: file.height,
    sensitive: SENSITIVE_FILE_TYPES.has(file.fileType),
    createdAt: file.createdAt.toISOString()
  };
}

function certificationSummary(record: {
  id: string;
  status: CertificationStatus;
  governmentSiteName: string | null;
  certificateNo: string | null;
  credential: string | null;
  certificateFileId: string | null;
  certificateSnapshotFileId: string | null;
  certificateIssuedAt: Date | null;
  certificationStartedAt: Date | null;
  verifiedAt: Date | null;
  notes: string | null;
} | null) {
  if (!record) return null;
  return {
    ...record,
    certificateIssuedAt: record.certificateIssuedAt?.toISOString() ?? null,
    certificationStartedAt: record.certificationStartedAt?.toISOString() ?? null,
    verifiedAt: record.verifiedAt?.toISOString() ?? null
  };
}

function assetSummary(asset: {
  id: string;
  assetType: AssetType;
  title: string;
  description: string | null;
  category: string | null;
  reviewStatus: AssetReviewStatus;
  listingStatus: AssetListingStatus;
  certificationStatus: CertificationStatus;
  priceCents: number;
  currency: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  uploaderProfile: { displayName: string };
  tags: Array<{ tag: string }>;
  certificationRecord: Parameters<typeof certificationSummary>[0];
  _count?: { files: number; reviewEvents: number };
}) {
  return {
    id: asset.id,
    assetType: asset.assetType,
    title: asset.title,
    description: asset.description,
    category: asset.category,
    reviewStatus: asset.reviewStatus,
    listingStatus: asset.listingStatus,
    certificationStatus: asset.certificationStatus,
    priceCents: asset.priceCents,
    currency: asset.currency,
    rejectionReason: asset.rejectionReason,
    submittedAt: asset.submittedAt?.toISOString() ?? null,
    reviewedAt: asset.reviewedAt?.toISOString() ?? null,
    listedAt: asset.listedAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    uploaderDisplayName: asset.uploaderProfile.displayName,
    tags: asset.tags.map(({ tag }) => tag),
    certification: certificationSummary(asset.certificationRecord),
    fileCount: asset._count?.files ?? null,
    reviewEventCount: asset._count?.reviewEvents ?? null
  };
}

async function writeAudit(
  transaction: Prisma.TransactionClient,
  input: {
    access: ContentAdminAccess;
    action: string;
    targetType: string;
    targetId?: string | null;
    assetId?: string | null;
    requestId: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await transaction.auditLog.create({
    data: {
      actorUserId: input.access.user.id,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      assetId: input.assetId ?? null,
      requestId: input.requestId,
      metadata: input.metadata ?? {}
    }
  });
}

export async function listAdminAssets(input: {
  assetType?: AssetType;
  reviewStatus?: AssetReviewStatus;
  certificationStatus?: CertificationStatus;
  listingStatus?: AssetListingStatus;
  query?: string;
}) {
  const assets = await getPrisma().asset.findMany({
    where: {
      deletedAt: null,
      assetType: input.assetType,
      reviewStatus: input.reviewStatus,
      certificationStatus: input.certificationStatus,
      listingStatus: input.listingStatus,
      ...(input.query
        ? {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { id: { equals: input.query } }
            ]
          }
        : {})
    },
    include: {
      uploaderProfile: { select: { displayName: true } },
      tags: { orderBy: { tag: "asc" } },
      certificationRecord: true,
      _count: { select: { files: true, reviewEvents: true } }
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 100
  });
  return assets.map(assetSummary);
}

export async function getAdminDashboard() {
  const [listed, pendingReview, certifying, certificationException, recent] = await Promise.all([
    getPrisma().asset.count({ where: { listingStatus: "listed", deletedAt: null } }),
    getPrisma().asset.count({ where: { reviewStatus: "pending_review", deletedAt: null } }),
    getPrisma().asset.count({ where: { certificationStatus: "certifying", deletedAt: null } }),
    getPrisma().asset.count({ where: { certificationStatus: "exception", deletedAt: null } }),
    getPrisma().asset.findMany({
      where: { reviewStatus: "pending_review", deletedAt: null },
      include: {
        uploaderProfile: { select: { displayName: true } },
        tags: { orderBy: { tag: "asc" } },
        certificationRecord: true,
        _count: { select: { files: true, reviewEvents: true } }
      },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      take: 5
    })
  ]);
  return {
    metrics: { listed, pendingReview, certifying, certificationException },
    pendingAssets: recent.map(assetSummary)
  };
}

export async function getAdminAsset(assetId: string) {
  const asset = await getPrisma().asset.findFirst({
    where: { id: assetId, deletedAt: null },
    include: {
      uploaderProfile: { select: { displayName: true } },
      tags: { orderBy: { tag: "asc" } },
      files: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      reviewEvents: {
        include: { actor: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" }
      },
      certificationRecord: true,
      certificationFeeCharge: true,
      certificationRefundRequest: true,
      _count: { select: { files: true, reviewEvents: true } }
    }
  });
  if (!asset) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在。 ");
  }
  return {
    ...assetSummary(asset),
    files: asset.files.map(serializeFile),
    reviewEvents: asset.reviewEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      actorDisplayName: event.actor.displayName,
      createdAt: event.createdAt.toISOString()
    })),
    certificationFeeCharge: asset.certificationFeeCharge
      ? {
          id: asset.certificationFeeCharge.id,
          amountCents: asset.certificationFeeCharge.amountCents,
          currency: asset.certificationFeeCharge.currency,
          status: asset.certificationFeeCharge.status,
          paidAt: asset.certificationFeeCharge.paidAt?.toISOString() ?? null
        }
      : null,
    certificationRefundRequest: asset.certificationRefundRequest
      ? {
          id: asset.certificationRefundRequest.id,
          amountCents: asset.certificationRefundRequest.amountCents,
          status: asset.certificationRefundRequest.status,
          reason: asset.certificationRefundRequest.reason,
          requestedAt: asset.certificationRefundRequest.requestedAt.toISOString()
        }
      : null
  };
}

export async function updateAdminAsset(
  access: ContentAdminAccess,
  assetId: string,
  input: { title?: string; description?: string | null; category?: string | null; tags?: string[] },
  requestId: string
) {
  await getAdminAsset(assetId);
  await getPrisma().$transaction(async (transaction) => {
    const before = await transaction.asset.findUniqueOrThrow({ where: { id: assetId } });
    await transaction.asset.update({
      where: { id: assetId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category
      }
    });
    if (input.tags) {
      const tags = cleanTags(input.tags);
      await transaction.assetTag.deleteMany({ where: { assetId } });
      if (tags.length) {
        await transaction.assetTag.createMany({ data: tags.map((tag) => ({ assetId, tag })) });
      }
    }
    await writeAudit(transaction, {
      access,
      action: "asset.metadata_updated",
      targetType: "asset",
      targetId: assetId,
      assetId,
      requestId,
      metadata: {
        changedFields: Object.keys(input),
        previous: {
          title: before.title,
          description: before.description,
          category: before.category
        }
      }
    });
  });
  return getAdminAsset(assetId);
}

export async function reviewAdminAsset(
  access: ContentAdminAccess,
  assetId: string,
  input: { decision: "approve" | "reject"; reason?: string },
  requestId: string
) {
  await getPrisma().$transaction(async (transaction) => {
    const asset = await transaction.asset.findFirst({
      where: { id: assetId, deletedAt: null },
      include: { certificationFeeCharge: true }
    });
    if (!asset) throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在。 ");
    if (asset.reviewStatus !== "pending_review" || asset.certificationStatus !== "pending_review") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有已支付认证费并进入待初审的素材可以审核。 ");
    }
    if (!asset.certificationFeeCharge || asset.certificationFeeCharge.status !== "success") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "认证费未确认支付成功，不能进入审核结果。 ");
    }

    const nextReviewStatus = input.decision === "approve" ? "approved" : "rejected";
    const nextCertificationStatus = input.decision === "approve" ? "certifying" : "not_started";
    const now = new Date();
    await transaction.asset.update({
      where: { id: assetId },
      data: {
        reviewStatus: nextReviewStatus,
        certificationStatus: nextCertificationStatus,
        listingStatus: "unlisted",
        rejectionReason: input.decision === "reject" ? input.reason : null,
        reviewedByUserId: access.user.id,
        reviewedAt: now,
        listedAt: null
      }
    });
    await transaction.assetReviewEvent.create({
      data: {
        assetId,
        fromStatus: asset.reviewStatus,
        toStatus: nextReviewStatus,
        actorUserId: access.user.id,
        reason: input.reason ?? null
      }
    });

    if (input.decision === "approve") {
      await transaction.certificationRecord.upsert({
        where: { assetId },
        update: {
          status: "certifying",
          certificationStartedAt: now,
          verifiedByUserId: access.user.id,
          verifiedAt: null
        },
        create: {
          assetId,
          status: "certifying",
          certificationStartedAt: now,
          verifiedByUserId: access.user.id
        }
      });
    } else {
      await transaction.certificationRefundRequest.create({
        data: {
          assetId,
          certificationFeeChargeId: asset.certificationFeeCharge.id,
          amountCents: asset.certificationFeeCharge.amountCents,
          currency: asset.certificationFeeCharge.currency,
          reason: input.reason ?? "初审未通过",
          requestedByUserId: access.user.id
        }
      });
    }

    await writeAudit(transaction, {
      access,
      action: input.decision === "approve" ? "asset.review_approved" : "asset.review_rejected",
      targetType: "asset",
      targetId: assetId,
      assetId,
      requestId,
      metadata: {
        fromReviewStatus: asset.reviewStatus,
        toReviewStatus: nextReviewStatus,
        toCertificationStatus: nextCertificationStatus,
        reason: input.reason ?? null,
        refundQueued: input.decision === "reject"
      }
    });
  });
  return getAdminAsset(assetId);
}

function assertCertificateFile(
  file: { id: string; assetId: string; fileType: AssetFileType; accessScope: string } | null,
  assetId: string,
  expectedType: "certificate_file" | "certificate_snapshot"
) {
  if (
    !file ||
    file.assetId !== assetId ||
    file.fileType !== expectedType ||
    file.accessScope !== "private"
  ) {
    throw new ApiError(422, "VALIDATION_ERROR", "认证文件不属于当前素材或文件用途不正确。 ");
  }
}

export async function verifyCertification(
  access: ContentAdminAccess,
  certificationId: string,
  input: {
    status: "certifying" | "certified" | "exception";
    governmentSiteName?: string | null;
    certificateNo?: string | null;
    credential?: string | null;
    certificateFileId?: string | null;
    snapshotFileId?: string | null;
    issuedAt?: string | null;
    notes?: string | null;
  },
  requestId: string
) {
  const result = await getPrisma().$transaction(async (transaction) => {
    const record = await transaction.certificationRecord.findUnique({
      where: { id: certificationId },
      include: { asset: true }
    });
    if (!record) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证记录不存在。 ");
    if (record.asset.reviewStatus !== "approved") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "素材初审未通过，不能更新认证结果。 ");
    }
    if (record.status === "certified" && input.status !== "certified") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "已认证记录不能回退到其他状态。 ");
    }

    const certificateFileId = input.certificateFileId ?? record.certificateFileId;
    const snapshotFileId = input.snapshotFileId ?? record.certificateSnapshotFileId;
    if (certificateFileId) {
      const file = await transaction.assetFile.findUnique({ where: { id: certificateFileId } });
      assertCertificateFile(file, record.assetId, "certificate_file");
    }
    if (snapshotFileId) {
      const file = await transaction.assetFile.findUnique({ where: { id: snapshotFileId } });
      assertCertificateFile(file, record.assetId, "certificate_snapshot");
    }

    const certificateNo = input.certificateNo ?? record.certificateNo;
    if (input.status === "certified" && (!certificateNo || !certificateFileId)) {
      throw new ApiError(422, "VALIDATION_ERROR", "认证通过必须填写证书编号并关联认证证书文件。 ");
    }

    const updated = await transaction.certificationRecord.update({
      where: { id: certificationId },
      data: {
        status: input.status,
        governmentSiteName: input.governmentSiteName,
        certificateNo: input.certificateNo,
        credential: input.credential,
        certificateFileId: input.certificateFileId,
        certificateSnapshotFileId: input.snapshotFileId,
        certificateIssuedAt: input.issuedAt === undefined
          ? undefined
          : input.issuedAt
            ? new Date(input.issuedAt)
            : null,
        notes: input.notes,
        verifiedByUserId: access.user.id,
        verifiedAt: new Date()
      }
    });
    await transaction.asset.update({
      where: { id: record.assetId },
      data: { certificationStatus: input.status }
    });
    await writeAudit(transaction, {
      access,
      action: `certification.${input.status}`,
      targetType: "certification_record",
      targetId: certificationId,
      assetId: record.assetId,
      requestId,
      metadata: {
        fromStatus: record.status,
        toStatus: input.status,
        hasCertificateFile: Boolean(certificateFileId),
        hasSnapshotFile: Boolean(snapshotFileId)
      }
    });
    return updated;
  });
  return certificationSummary(result);
}

export async function updateAssetListing(
  access: ContentAdminAccess,
  assetId: string,
  input: { action: "list" | "delist"; reason?: string },
  requestId: string
) {
  await getPrisma().$transaction(async (transaction) => {
    const asset = await transaction.asset.findFirst({
      where: { id: assetId, deletedAt: null },
      include: {
        certificationRecord: true,
        files: { where: { deletedAt: null } }
      }
    });
    if (!asset) throw new ApiError(404, "RESOURCE_NOT_FOUND", "素材不存在。 ");

    const nextStatus = input.action === "list" ? "listed" : "delisted";
    if (input.action === "list") {
      const usablePreview = asset.files.find(
        (file) => file.fileType === "preview" && file.accessScope === "public_preview"
      );
      const certificate = asset.certificationRecord;
      if (
        asset.reviewStatus !== "approved" ||
        asset.certificationStatus !== "certified" ||
        certificate?.status !== "certified" ||
        !certificate.certificateNo ||
        !certificate.certificateFileId ||
        !usablePreview
      ) {
        throw new ApiError(
          409,
          "STATE_TRANSITION_INVALID",
          "上架前必须完成初审、认证证书记录并存在可用水印预览图。 "
        );
      }
      resolvePublicPreviewUrl(usablePreview);
    } else if (asset.listingStatus !== "listed") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有已上架素材可以下架。 ");
    }

    await transaction.asset.update({
      where: { id: assetId },
      data: { listingStatus: nextStatus, listedAt: input.action === "list" ? new Date() : null }
    });
    await writeAudit(transaction, {
      access,
      action: input.action === "list" ? "asset.listed" : "asset.delisted",
      targetType: "asset",
      targetId: assetId,
      assetId,
      requestId,
      metadata: { fromStatus: asset.listingStatus, toStatus: nextStatus, reason: input.reason ?? null }
    });
  });
  return getAdminAsset(assetId);
}

export async function listCertifications(input: { status?: CertificationStatus; assetType?: AssetType }) {
  const records = await getPrisma().certificationRecord.findMany({
    where: { status: input.status, asset: { assetType: input.assetType, deletedAt: null } },
    include: {
      asset: { include: { uploaderProfile: { select: { displayName: true } } } },
      certificateFile: true,
      certificateSnapshotFile: true
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return records.map((record) => ({
    ...certificationSummary(record),
    asset: {
      id: record.asset.id,
      title: record.asset.title,
      assetType: record.asset.assetType,
      uploaderDisplayName: record.asset.uploaderProfile.displayName
    },
    certificateFile: record.certificateFile ? serializeFile(record.certificateFile) : null,
    certificateSnapshotFile: record.certificateSnapshotFile
      ? serializeFile(record.certificateSnapshotFile)
      : null
  }));
}

export async function getCertification(certificationId: string) {
  const record = await getPrisma().certificationRecord.findFirst({
    where: { id: certificationId, asset: { deletedAt: null } },
    include: {
      asset: { include: { uploaderProfile: { select: { displayName: true } } } },
      certificateFile: true,
      certificateSnapshotFile: true
    }
  });
  if (!record) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证记录不存在。 ");
  return {
    ...certificationSummary(record),
    asset: {
      id: record.asset.id,
      title: record.asset.title,
      assetType: record.asset.assetType,
      uploaderDisplayName: record.asset.uploaderProfile.displayName
    },
    certificateFile: record.certificateFile ? serializeFile(record.certificateFile) : null,
    certificateSnapshotFile: record.certificateSnapshotFile
      ? serializeFile(record.certificateSnapshotFile)
      : null
  };
}

export async function createCertificationFileUpload(
  access: ContentAdminAccess,
  certificationId: string,
  input: {
    fileType: "certificate_file" | "certificate_snapshot";
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  },
  requestId: string
) {
  const record = await getPrisma().certificationRecord.findUnique({
    where: { id: certificationId },
    include: { asset: true }
  });
  if (!record) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证记录不存在。 ");
  if (record.asset.reviewStatus !== "approved") {
    throw new ApiError(409, "STATE_TRANSITION_INVALID", "素材初审未通过，不能上传认证文件。 ");
  }

  const intentId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UPLOAD_INTENT_TTL_MS);
  const target = createUploadTarget({
    intentId,
    assetId: record.assetId,
    fileName: input.fileName,
    fileType: input.fileType,
    expiresAt
  });
  await getPrisma().$transaction(async (transaction) => {
    await transaction.uploadIntent.create({
      data: {
        id: intentId,
        assetId: record.assetId,
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
    await writeAudit(transaction, {
      access,
      action: "certification.file_upload_created",
      targetType: "upload_intent",
      targetId: intentId,
      assetId: record.assetId,
      requestId,
      metadata: { certificationId, fileType: input.fileType }
    });
  });
  return {
    uploadId: intentId,
    provider: target.provider,
    providerMode: target.providerMode,
    providerDisclosure: target.providerDisclosure,
    uploadUrl: target.uploadUrl,
    method: target.method,
    requiredHeaders: target.requiredHeaders,
    expiresAt: expiresAt.toISOString(),
    maxBytes: 10_000_000
  };
}

export async function completeCertificationFileUpload(
  access: ContentAdminAccess,
  certificationId: string,
  uploadId: string,
  requestId: string
) {
  const record = await getPrisma().certificationRecord.findUnique({ where: { id: certificationId } });
  if (!record) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证记录不存在。 ");

  const result = await getPrisma().$transaction(async (transaction) => {
    const intent = await transaction.uploadIntent.findFirst({
      where: { id: uploadId, assetId: record.assetId, userId: access.user.id },
      include: { assetFile: true }
    });
    if (!intent || !CERTIFICATE_FILE_TYPES.has(intent.fileType)) {
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证文件上传意图不存在。 ");
    }
    if (intent.status === "completed" && intent.assetFile) {
      return { file: intent.assetFile, repeated: true };
    }
    const verified = verifyAndFinalizeUpload(intent);
    const file = await transaction.assetFile.create({
      data: {
        assetId: record.assetId,
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
          certificationId,
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
    await writeAudit(transaction, {
      access,
      action: "certification.file_upload_completed",
      targetType: "asset_file",
      targetId: file.id,
      assetId: record.assetId,
      requestId,
      metadata: { certificationId, fileType: file.fileType }
    });
    return { file, repeated: false };
  });
  return {
    fileId: result.file.id,
    status: "ready" as const,
    provider: LOCAL_ASSET_STORAGE_PROVIDER,
    providerMode: "metadata_only" as const,
    repeatedCompletion: result.repeated,
    file: serializeFile(result.file)
  };
}

export async function getSensitiveFile(
  access: ContentAdminAccess,
  fileId: string,
  requestId: string
) {
  const file = await getPrisma().assetFile.findFirst({
    where: { id: fileId, deletedAt: null }
  });
  if (!file || !SENSITIVE_FILE_TYPES.has(file.fileType) || file.accessScope !== "private") {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "敏感文件不存在或用途不允许查看。 ");
  }
  await getPrisma().auditLog.create({
    data: {
      actorUserId: access.user.id,
      action: "sensitive_file.view_requested",
      targetType: "asset_file",
      targetId: file.id,
      assetId: file.assetId,
      requestId,
      metadata: { fileType: file.fileType, deliveryMode: "short_lived_redirect" }
    }
  });
  return { file: serializeFile(file), assetId: file.assetId };
}

export async function listAuditLogs() {
  const logs = await getPrisma().auditLog.findMany({
    include: { actor: { select: { displayName: true } }, asset: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    assetId: log.assetId,
    assetTitle: log.asset?.title ?? null,
    actorDisplayName: log.actor.displayName,
    requestId: log.requestId,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString()
  }));
}
