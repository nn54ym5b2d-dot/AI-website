import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";
import { cancelBuyerOrder } from "@/lib/transactions/service";
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const requestId = createRequestId();
  try { const access = await requireSessionAccess(request); validateCsrf(request, access); const { orderId } = await context.params; return apiSuccess(await cancelBuyerOrder(access, orderId), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
