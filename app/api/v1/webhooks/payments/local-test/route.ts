import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { processLocalTestWebhook } from "@/lib/transactions/service";
export async function POST(request: Request) {
  const requestId = createRequestId();
  try { const rawBody = await request.text(); return apiSuccess(await processLocalTestWebhook(rawBody, request.headers.get("x-yuansu-test-signature")), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
