import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    return apiSuccess(
      {
        user: access.user,
        roles: access.roles,
        adminRoles: access.adminRoles,
        uploaderProfile: access.uploaderProfile,
        observerProfile: access.observerProfile
      },
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
