import { z } from "zod";
import { ApiError, apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";
import { createOrderPayment } from "@/lib/transactions/service";
const schema = z.object({ provider: z.enum(["wechat_pay", "alipay"]) });
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const requestId = createRequestId();
  try { const access = await requireSessionAccess(request); validateCsrf(request, access); const key = request.headers.get("idempotency-key"); if (!key) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "请提供 Idempotency-Key。"); const { orderId } = await context.params; const input = parseInput(schema, await readJson(request)); return apiSuccess(await createOrderPayment(access, orderId, input.provider, key), requestId, { status: 201 }); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
