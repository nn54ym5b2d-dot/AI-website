import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";

export const LOCAL_DOWNLOAD_BUNDLE_PROVIDER = "local_test_private_zip";
const FIXTURE_PREFIX = "fixtures/local-private-storage/originals/";
const BUNDLE_PREFIX = ".local/download-bundles/";

export type BundleManifestEntry = {
  id: string;
  sha256: string;
  sizeBytes: string;
  mimeType: string;
  originalFileName?: string;
};

type StoredOriginal = {
  id: string;
  assetId: string;
  fileType: string;
  fileHash: string;
  fileSizeBytes: bigint;
  mimeType: string;
  metadata: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeFileName(value: string, index: number, mimeType: string) {
  const cleaned = path.basename(value).replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-120);
  if (cleaned) return cleaned;
  const extension = mimeType === "image/svg+xml" ? "svg" : mimeType === "image/png" ? "png" : "bin";
  return `original-${String(index + 1).padStart(2, "0")}.${extension}`;
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(input: Buffer) {
  let crc = 0xffffffff;
  for (const byte of input) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: Array<{ name: string; body: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const checksum = crc32(entry.body);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.body.byteLength, 18);
    localHeader.writeUInt32LE(entry.body.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localParts.push(localHeader, name, entry.body);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(entry.body.byteLength, 20);
    centralHeader.writeUInt32LE(entry.body.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.byteLength + name.byteLength + entry.body.byteLength;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, central, end]);
}

async function readVerifiedFixture(source: StoredOriginal, manifest: BundleManifestEntry) {
  if (source.assetId.length === 0 || source.fileType !== "original" || source.id !== manifest.id) {
    throw new ApiError(409, "RESOURCE_CONFLICT", "授权原文件清单与素材文件不一致。");
  }
  const metadata = record(source.metadata);
  const relativePath = metadata.localFixtureRelativePath;
  if (metadata.storageProvider !== "local_private_fixture" || typeof relativePath !== "string" || !relativePath.startsWith(FIXTURE_PREFIX)) {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "该原文件正文尚未进入受控本地存储，不能伪造 ZIP。");
  }
  const allowedRoot = path.join(process.cwd(), "fixtures", "local-private-storage", "originals");
  const absolutePath = path.join(allowedRoot, path.basename(relativePath));
  if (path.dirname(absolutePath) !== allowedRoot) {
    throw new ApiError(409, "RESOURCE_CONFLICT", "本地测试原文件路径无效。");
  }
  const body = await readFile(absolutePath);
  const digest = createHash("sha256").update(body).digest("hex");
  if (digest !== manifest.sha256 || digest !== source.fileHash || BigInt(body.byteLength) !== BigInt(manifest.sizeBytes) || BigInt(body.byteLength) !== source.fileSizeBytes || source.mimeType !== manifest.mimeType) {
    throw new ApiError(409, "RESOURCE_CONFLICT", "原文件正文与授权时不可变清单不一致。");
  }
  return body;
}

export async function createLocalDownloadBundle(input: {
  assetId: string;
  downloadLinkId: string;
  manifest: BundleManifestEntry[];
  sourceFiles: StoredOriginal[];
}) {
  if (!input.manifest.length || input.manifest.length !== input.sourceFiles.length) {
    throw new ApiError(409, "ASSET_FILES_INCOMPLETE", "授权原文件清单不完整，不能生成 ZIP。");
  }
  const byId = new Map(input.sourceFiles.map((file) => [file.id, file]));
  const names = new Set<string>();
  const entries: Array<{ name: string; body: Buffer }> = [];
  for (const [index, manifest] of input.manifest.entries()) {
    const source = byId.get(manifest.id);
    if (!source || source.assetId !== input.assetId) {
      throw new ApiError(409, "RESOURCE_CONFLICT", "ZIP 清单包含不属于该素材的文件。");
    }
    let name = safeFileName(manifest.originalFileName ?? "", index, manifest.mimeType);
    if (names.has(name)) name = `${String(index + 1).padStart(2, "0")}-${name}`;
    names.add(name);
    entries.push({ name, body: await readVerifiedFixture(source, manifest) });
  }

  const body = createStoredZip(entries);
  const fileId = randomUUID();
  const relativePath = `${BUNDLE_PREFIX}${fileId}.zip`;
  const bundleRoot = path.join(process.cwd(), ".local", "download-bundles");
  const absolutePath = path.join(bundleRoot, `${fileId}.zip`);
  await mkdir(bundleRoot, { recursive: true, mode: 0o700 });
  const temporaryPath = `${absolutePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, body, { mode: 0o600 });
  await rename(temporaryPath, absolutePath);
  return {
    fileId,
    bucket: "local-private-download-bundles",
    region: "local",
    objectKey: `t014/bundles/${input.downloadLinkId}/${fileId}.zip`,
    fileHash: createHash("sha256").update(body).digest("hex"),
    fileSizeBytes: BigInt(body.byteLength),
    mimeType: "application/zip",
    metadata: {
      storageProvider: LOCAL_DOWNLOAD_BUNDLE_PROVIDER,
      providerMode: "local_private_fixture_files",
      providerDisclosure: "本地受控 ZIP provider；真实 COS 在 T017 接入。",
      localBundleRelativePath: relativePath,
      manifest: input.manifest,
      entryNames: entries.map((entry) => entry.name)
    }
  };
}

function bundleSignature(fileId: string, expiresAtEpochSeconds: number) {
  return createHmac("sha256", getAuthConfig().authSecret)
    .update(`${fileId}:${expiresAtEpochSeconds}`)
    .digest("base64url");
}

export function createLocalBundleSignedPath(fileId: string, ttlMinutes: number) {
  const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  const signature = bundleSignature(fileId, expiresAtEpochSeconds);
  return {
    path: `/api/v1/download-bundles/${fileId}/local-test?expires=${expiresAtEpochSeconds}&signature=${encodeURIComponent(signature)}`,
    expiresAt: new Date(expiresAtEpochSeconds * 1000)
  };
}

export function verifyLocalBundleSignature(fileId: string, expiresValue: string | null, signatureValue: string | null) {
  const expiresAtEpochSeconds = Number(expiresValue);
  if (!Number.isSafeInteger(expiresAtEpochSeconds) || expiresAtEpochSeconds <= Math.floor(Date.now() / 1000) || !signatureValue) {
    throw new ApiError(410, "DOWNLOAD_LINK_EXPIRED", "本次 ZIP 短时地址已过期。");
  }
  const expected = Buffer.from(bundleSignature(fileId, expiresAtEpochSeconds));
  const actual = Buffer.from(signatureValue);
  if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) {
    throw new ApiError(403, "FORBIDDEN", "ZIP 短时地址签名无效。");
  }
}

export async function readLocalBundle(metadataValue: unknown) {
  const metadata = record(metadataValue);
  const relativePath = metadata.localBundleRelativePath;
  if (metadata.storageProvider !== LOCAL_DOWNLOAD_BUNDLE_PROVIDER || typeof relativePath !== "string" || !relativePath.startsWith(BUNDLE_PREFIX)) {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "ZIP 存储 provider 不可用。");
  }
  const allowedRoot = path.join(process.cwd(), ".local", "download-bundles");
  const absolutePath = path.join(allowedRoot, path.basename(relativePath));
  if (path.dirname(absolutePath) !== allowedRoot) {
    throw new ApiError(403, "FORBIDDEN", "ZIP 本地存储路径无效。");
  }
  return readFile(absolutePath);
}
