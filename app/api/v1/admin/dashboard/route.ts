import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { getAdminDashboard } from "@/lib/admin/assets";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    return apiSuccess(await getAdminDashboard(), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
