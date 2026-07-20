import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { completeAssetUpload } from "@/lib/uploader/assets";

const paramsSchema = z.object({ assetId: z.string().uuid(), uploadId: z.string().uuid() });
const completeSchema = z.object({ etag: z.string().trim().max(200).optional() });

type RouteContext = { params: Promise<{ assetId: string; uploadId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const params = parseInput(paramsSchema, await context.params);
    parseInput(completeSchema, await readJson(request));
    return apiSuccess(
      await completeAssetUpload(access, params.assetId, params.uploadId),
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
