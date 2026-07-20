import { apiErrorResponse, apiPaginatedSuccess, createRequestId } from "@/lib/api/http";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { listAuditLogs } from "@/lib/admin/assets";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    return apiPaginatedSuccess(await listAuditLogs(), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
