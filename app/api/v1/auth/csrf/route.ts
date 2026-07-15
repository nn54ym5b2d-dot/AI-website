import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { issueCsrfToken, requireSessionAccess } from "@/lib/auth/session";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    const result = await issueCsrfToken(access);
    return apiSuccess(
      { csrfToken: result.csrfToken, expiresAt: result.expiresAt.toISOString() },
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
