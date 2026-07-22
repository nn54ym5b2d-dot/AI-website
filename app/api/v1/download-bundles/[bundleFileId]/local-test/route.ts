import { ApiError, apiErrorResponse, createRequestId } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { readLocalBundle, verifyLocalBundleSignature } from "@/lib/storage/download-bundle-provider";

type Props = { params: Promise<{ bundleFileId: string }> };

export async function GET(request: Request, { params }: Props) {
  const requestId = createRequestId();
  try {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "本地 ZIP provider 未启用。");
    }
    const { bundleFileId } = await params;
    const query = new URL(request.url).searchParams;
    verifyLocalBundleSignature(bundleFileId, query.get("expires"), query.get("signature"));
    const link = await getPrisma().downloadLink.findFirst({
      where: { downloadBundleFileId: bundleFileId },
      include: { authorizationRecord: true, downloadBundleFile: true }
    });
    if (!link?.downloadBundleFile || link.downloadBundleFile.fileType !== "download_bundle" || link.downloadBundleFile.accessScope !== "signed_download_only" || link.downloadBundleFile.deletedAt) {
      throw new ApiError(404, "RESOURCE_NOT_FOUND", "ZIP 素材包不存在。");
    }
    if (link.authorizationRecord.status !== "active") {
      throw new ApiError(410, "AUTHORIZATION_REVOKED", "该素材授权已撤销。");
    }
    if (link.status === "revoked") {
      throw new ApiError(410, "DOWNLOAD_LINK_REVOKED", "平台下载入口已撤销。");
    }
    if (link.status !== "active" || link.expiresAt <= new Date()) {
      throw new ApiError(410, "DOWNLOAD_LINK_EXPIRED", "平台下载资格已过期。");
    }
    const file = link.downloadBundleFile;
    const body = await readLocalBundle(file.metadata);
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="yuansu-${file.assetId}.zip"`,
        "content-length": String(body.byteLength),
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
