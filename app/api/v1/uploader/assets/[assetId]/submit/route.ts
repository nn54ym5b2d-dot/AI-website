import { z } from "zod";
import { ApiError, apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { submitUploaderAsset } from "@/lib/uploader/assets";

const paramsSchema = z.object({ assetId: z.string().uuid() });
const bodySchema = z.object({});
const idempotencyKeySchema = z.string().trim().min(8).max(200);

type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const params = parseInput(paramsSchema, await context.params);
    parseInput(bodySchema, await readJson(request));
    const rawKey = request.headers.get("idempotency-key");
    if (!rawKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "提交素材需要幂等键。 ");
    }
    const idempotencyKey = parseInput(idempotencyKeySchema, rawKey);
    return apiSuccess(
      await submitUploaderAsset(access, params.assetId, idempotencyKey),
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
