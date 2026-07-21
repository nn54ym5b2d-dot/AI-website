import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";
import { ensureBuyerDownloadBundle } from "@/lib/downloads/service";

type Props = { params: Promise<{ authorizationId: string }> };

export async function POST(request: Request, { params }: Props) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    validateCsrf(request, access);
    const { authorizationId } = await params;
    return apiSuccess(await ensureBuyerDownloadBundle(access, authorizationId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
