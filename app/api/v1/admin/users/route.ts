import { apiErrorResponse, apiPaginatedSuccess, createRequestId } from "@/lib/api/http";
import { requireUserReadAccess } from "@/lib/admin/access";
import { listAdminUsers } from "@/lib/admin/foundation";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireUserReadAccess(request);
    return apiPaginatedSuccess(await listAdminUsers(access), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
