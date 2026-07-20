import { z } from "zod";
import { apiErrorResponse, apiPaginatedSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { listCertifications } from "@/lib/admin/assets";

const querySchema = z.object({
  status: z.enum(["not_started", "pending_payment", "pending_review", "certifying", "certified", "exception"]).optional(),
  assetType: z.enum(["person", "object", "scene"]).optional()
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    const url = new URL(request.url);
    const input = parseInput(querySchema, {
      status: url.searchParams.get("status") || undefined,
      assetType: url.searchParams.get("assetType") || undefined
    });
    return apiPaginatedSuccess(await listCertifications(input), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
