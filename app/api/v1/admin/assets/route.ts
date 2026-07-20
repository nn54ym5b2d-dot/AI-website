import { z } from "zod";
import { apiErrorResponse, apiPaginatedSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { listAdminAssets } from "@/lib/admin/assets";

const querySchema = z.object({
  type: z.enum(["person", "object", "scene"]).optional(),
  reviewStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  certificationStatus: z.enum(["not_started", "pending_payment", "pending_review", "certifying", "certified", "exception"]).optional(),
  listingStatus: z.enum(["unlisted", "listed", "delisted"]).optional(),
  query: z.string().trim().max(100).optional()
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    const url = new URL(request.url);
    const input = parseInput(querySchema, {
      type: url.searchParams.get("type") || undefined,
      reviewStatus: url.searchParams.get("reviewStatus") || undefined,
      certificationStatus: url.searchParams.get("certificationStatus") || undefined,
      listingStatus: url.searchParams.get("listingStatus") || undefined,
      query: url.searchParams.get("query") || undefined
    });
    return apiPaginatedSuccess(await listAdminAssets(input), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
