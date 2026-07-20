import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { getAccountSummary } from "@/lib/account/summary";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    return apiSuccess(await getAccountSummary(access), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
