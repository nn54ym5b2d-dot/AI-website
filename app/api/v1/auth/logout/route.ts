import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import {
  clearSessionCookie,
  requireSessionAccess,
  revokeSession,
  validateCsrf
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    validateCsrf(request, access);
    await revokeSession(access.sessionId);
    const response = apiSuccess({ loggedOut: true }, requestId);
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
