import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireAdminReadAccess } from "@/lib/admin/access";
import { listAdminOrders } from "@/lib/transactions/service";
export async function GET(request: Request) { const requestId = createRequestId(); try { await requireAdminReadAccess(request); return apiSuccess(await listAdminOrders(), requestId); } catch (error) { return apiErrorResponse(error, requestId); } }
