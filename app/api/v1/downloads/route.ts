import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { listBuyerDownloadHistory } from "@/lib/downloads/service";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    return apiSuccess(await listBuyerDownloadHistory(await requireSessionAccess(request)), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
