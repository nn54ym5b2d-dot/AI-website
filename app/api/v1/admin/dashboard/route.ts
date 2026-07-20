import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireAdminReadAccess } from "@/lib/admin/access";
import { getAdminDashboard } from "@/lib/admin/assets";
import { getTransactionMetrics } from "@/lib/transactions/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireAdminReadAccess(request);
    const contentAdmin = access.adminRoles.some((role) => role === "super_admin" || role === "operator");
    return apiSuccess({ content: contentAdmin ? await getAdminDashboard() : null, transactions: await getTransactionMetrics() }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
