import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { getOwnedPayment } from "@/lib/transactions/service";
export async function GET(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const requestId = createRequestId();
  try { const { paymentId } = await context.params; return apiSuccess(await getOwnedPayment(await requireSessionAccess(request), paymentId), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
