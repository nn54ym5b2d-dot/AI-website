import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { getBuyerOrder } from "@/lib/transactions/service";
export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const requestId = createRequestId();
  try { const { orderId } = await context.params; return apiSuccess(await getBuyerOrder(await requireSessionAccess(request), orderId), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
