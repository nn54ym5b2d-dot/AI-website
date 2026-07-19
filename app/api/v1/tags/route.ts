import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { listPublicTags } from "@/lib/domain/materials";

const querySchema = z.object({
  q: z.string().trim().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const params = new URL(request.url).searchParams;
    const query = parseInput(querySchema, {
      q: params.get("q")?.trim() || undefined,
      limit: params.get("limit")?.trim() || undefined
    });
    return apiSuccess(await listPublicTags(query), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
