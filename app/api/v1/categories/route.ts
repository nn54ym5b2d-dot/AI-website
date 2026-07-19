import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { listPublicCategories } from "@/lib/domain/materials";

export async function GET() {
  const requestId = createRequestId();
  try {
    return apiSuccess(await listPublicCategories(), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
