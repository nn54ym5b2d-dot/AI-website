import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { listBuyerAuthorizations } from "@/lib/transactions/service";
export async function GET(request: Request) { const requestId = createRequestId(); try { return apiSuccess(await listBuyerAuthorizations(await requireSessionAccess(request)), requestId); } catch (error) { return apiErrorResponse(error, requestId); } }
