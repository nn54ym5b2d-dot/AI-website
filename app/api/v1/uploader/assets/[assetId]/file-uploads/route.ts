import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { createAssetUploadIntent } from "@/lib/uploader/assets";

const paramsSchema = z.object({ assetId: z.string().uuid() });
const uploadIntentSchema = z.object({
  fileType: z.enum(["original", "person_proof"]),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().min(1).max(25_000_000),
  sha256: z.string().regex(/^[0-9a-fA-F]{64}$/)
});

type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const params = parseInput(paramsSchema, await context.params);
    const input = parseInput(uploadIntentSchema, await readJson(request));
    return apiSuccess(
      await createAssetUploadIntent(access, params.assetId, input),
      requestId,
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
