import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson, ApiError } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";
import { addAssetsToDraftOrder, listBuyerOrders } from "@/lib/transactions/service";

const schema = z.object({ assetIds: z.array(z.uuid()).min(1).max(50) });
export async function GET(request: Request) {
  const requestId = createRequestId();
  try { return apiSuccess(await listBuyerOrders(await requireSessionAccess(request)), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request); validateCsrf(request, access);
    const key = request.headers.get("idempotency-key");
    if (!key) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "请提供 Idempotency-Key。");
    const input = parseInput(schema, await readJson(request));
    return apiSuccess(await addAssetsToDraftOrder(access, input.assetIds, key), requestId, { status: 201 });
  } catch (error) { return apiErrorResponse(error, requestId); }
}
