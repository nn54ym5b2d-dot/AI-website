import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireAdminReadAccess } from "@/lib/admin/access";
import { getAdminDashboard } from "@/lib/admin/assets";
import { getTransactionMetrics } from "@/lib/transactions/service";
import { getAdminUserSummary } from "@/lib/admin/users";
import { getObserverAccountSummary } from "@/lib/admin/observers";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireAdminReadAccess(request);
    const contentAdmin = access.adminRoles.some((role) => role === "super_admin" || role === "operator");
    const superAdmin = access.adminRoles.includes("super_admin");
    const [content, transactions, users, observers] = await Promise.all([
      contentAdmin ? getAdminDashboard() : null,
      getTransactionMetrics(),
      contentAdmin ? getAdminUserSummary() : null,
      superAdmin ? getObserverAccountSummary() : null
    ]);
    return apiSuccess({ content, transactions, users, observers }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
