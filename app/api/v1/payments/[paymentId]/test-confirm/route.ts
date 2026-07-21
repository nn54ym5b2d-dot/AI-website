import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";
import { createLocalTestEvent } from "@/lib/transactions/test-provider";
import { getPaymentForTestConfirmation, processLocalTestWebhook } from "@/lib/transactions/service";
export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const requestId = createRequestId();
  try { const access = await requireSessionAccess(request); validateCsrf(request, access); const { paymentId } = await context.params; const payment = await getPaymentForTestConfirmation(access, paymentId); const fixture = createLocalTestEvent({ eventType: "payment.succeeded", provider: payment.provider, resourceNo: payment.paymentNo, amountCents: payment.amountCents }); return apiSuccess({ ...(await processLocalTestWebhook(fixture.rawBody, fixture.signature)), providerMode: "local_test", eventId: fixture.event.eventId }, requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
