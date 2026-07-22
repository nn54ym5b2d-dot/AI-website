import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireObserverAccess } from "@/lib/observer/access";
import { getObserverShareRecords, resolveObserverPeriod } from "@/lib/observer/metrics";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireObserverAccess(request);
    const period = resolveObserverPeriod(new URL(request.url).searchParams);
    return apiSuccess(await getObserverShareRecords(access, period), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
