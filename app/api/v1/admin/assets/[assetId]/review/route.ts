import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { reviewAdminAsset } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
const reviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), reason: z.string().trim().max(500).optional() }).strict(),
  z.object({ decision: z.literal("reject"), reason: z.string().trim().min(2).max(500) }).strict()
]);
type Context = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { assetId } = await context.params;
    const input = parseInput(reviewSchema, await readJson(request));
    return apiSuccess(await reviewAdminAsset(access, parseInput(idSchema, assetId), input, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
