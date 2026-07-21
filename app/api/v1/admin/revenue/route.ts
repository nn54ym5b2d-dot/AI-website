import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireAdminReadAccess } from "@/lib/admin/access";
import { listAdminRevenue } from "@/lib/revenue/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireAdminReadAccess(request);
    return apiSuccess(await listAdminRevenue(access), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
