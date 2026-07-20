import { ApiError } from "@/lib/api/http";
import { hashContent } from "@/lib/auth/crypto";

export const LOCAL_ASSET_STORAGE_PROVIDER = "local_test";
export const LOCAL_DERIVATIVE_PROVIDER = "local_test_metadata_derivative";
export const LOCAL_WATERMARK_TEMPLATE_VERSION = "t011-local-metadata-v1";

type UploadTargetInput = {
  intentId: string;
  assetId: string;
  fileName: string;
  fileType:
    | "original"
    | "person_proof"
    | "supporting_proof"
    | "certificate_file"
    | "certificate_snapshot";
  expiresAt: Date;
};

type StoredUploadIntent = {
  id: string;
  provider: string;
  status: string;
  expiresAt: Date;
  finalBucket: string;
  finalRegion: string;
  finalObjectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256: string;
};

function normalizedFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  return normalized || "upload.bin";
}

function requireLocalTestProvider(provider: string, enabled: boolean) {
  if (provider !== LOCAL_ASSET_STORAGE_PROVIDER || !enabled) {
    throw new ApiError(
      503,
      "UPSTREAM_UNAVAILABLE",
      "素材存储 provider 尚未配置；当前没有伪装为真实 COS。"
    );
  }
}

export function getAssetProviderConfig() {
  const provider = process.env.ASSET_STORAGE_PROVIDER ?? LOCAL_ASSET_STORAGE_PROVIDER;
  const localEnabled =
    process.env.ASSET_LOCAL_TEST_ENABLED === "true" || process.env.NODE_ENV !== "production";
  requireLocalTestProvider(provider, localEnabled);

  return {
    provider,
    localTest: true as const,
    disclosure: "本地元数据测试 provider；不会上传文件正文，也不代表腾讯云 COS 已接通。"
  };
}

export function createUploadTarget(input: UploadTargetInput) {
  const config = getAssetProviderConfig();
  const fileName = normalizedFileName(input.fileName);
  const purpose =
    input.fileType === "person_proof"
      ? "person-proof"
      : input.fileType === "supporting_proof"
        ? "supporting-proof"
        : input.fileType === "certificate_file"
          ? "certificate-file"
          : input.fileType === "certificate_snapshot"
            ? "certificate-snapshot"
            : "original";

  return {
    provider: config.provider,
    providerMode: "metadata_only" as const,
    providerDisclosure: config.disclosure,
    uploadUrl: `local-test://upload/${input.intentId}`,
    method: "PUT" as const,
    requiredHeaders: {},
    staging: {
      bucket: "local-upload-staging",
      region: "local",
      objectKey: `t011/staging/${input.intentId}/${fileName}`
    },
    final: {
      bucket: "local-private-assets",
      region: "local",
      objectKey: `t011/final/${input.assetId}/${purpose}/${input.intentId}/${fileName}`
    },
    expiresAt: input.expiresAt
  };
}

export function verifyAndFinalizeUpload(intent: StoredUploadIntent) {
  const config = getAssetProviderConfig();
  if (intent.provider !== config.provider) {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "上传 provider 与当前配置不一致。 ");
  }
  if (intent.status !== "pending") {
    throw new ApiError(409, "STATE_TRANSITION_INVALID", "上传意图当前不能再次完成。 ");
  }
  if (intent.expiresAt <= new Date()) {
    throw new ApiError(410, "UPLOAD_INTENT_EXPIRED", "上传意图已过期，请重新申请。 ");
  }

  return {
    provider: config.provider,
    verificationMode: "declared_metadata_only" as const,
    providerDisclosure: config.disclosure,
    finalObject: {
      bucket: intent.finalBucket,
      region: intent.finalRegion,
      objectKey: intent.finalObjectKey,
      fileName: intent.fileName,
      mimeType: intent.mimeType,
      sizeBytes: intent.sizeBytes,
      sha256: intent.sha256
    }
  };
}

export function createLocalDerivativeObjects(input: {
  assetId: string;
  jobId: string;
  sourceFileId: string;
  sourceFileHash: string;
  sourceSizeBytes: bigint;
  watermarkTemplateVersion: string;
}) {
  getAssetProviderConfig();
  const baseKey = `t011/derivatives/${input.assetId}/${input.jobId}`;
  const makeDescriptor = (variant: "preview" | "thumbnail") => ({
    fileType: variant,
    accessScope: "public_preview" as const,
    bucket: "local-watermarked-derivatives",
    region: "local",
    objectKey: `${baseKey}/${variant}.webp`,
    fileHash: hashContent(
      `${input.sourceFileHash}:${input.sourceFileId}:${variant}:${input.watermarkTemplateVersion}`
    ),
    fileSizeBytes:
      variant === "preview"
        ? input.sourceSizeBytes > 1_500_000n
          ? 1_500_000n
          : input.sourceSizeBytes
        : input.sourceSizeBytes > 350_000n
          ? 350_000n
          : input.sourceSizeBytes,
    mimeType: "image/webp",
    metadata: {
      processingStatus: "ready",
      sourceFileId: input.sourceFileId,
      watermarkTemplateVersion: input.watermarkTemplateVersion,
      processingProvider: LOCAL_DERIVATIVE_PROVIDER,
      processingMode: "metadata_only",
      providerDisclosure:
        "本地测试仅生成独立对象元数据；真实水印图片处理和 CDN 在 T017 接入。"
    }
  });

  return [makeDescriptor("preview"), makeDescriptor("thumbnail")];
}
