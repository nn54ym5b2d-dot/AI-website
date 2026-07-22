import {
  apiErrorResponse,
  apiSuccess,
  createRequestId
} from "@/lib/api/http";
import {
  assertLocalOutboxRequest,
  readLocalAuthOutbox
} from "@/lib/auth/local-outbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    assertLocalOutboxRequest(request);
    const deliveries = await readLocalAuthOutbox();
    return apiSuccess(
      { deliveries, refreshedAt: new Date().toISOString() },
      requestId,
      { headers: { "cache-control": "no-store", pragma: "no-cache" } }
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
