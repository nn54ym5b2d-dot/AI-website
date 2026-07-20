import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { updateAssetListing } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
const listingSchema = z.object({
  action: z.enum(["list", "delist"]),
  reason: z.string().trim().max(500).optional()
}).strict();
type Context = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { assetId } = await context.params;
    const input = parseInput(listingSchema, await readJson(request));
    return apiSuccess(await updateAssetListing(access, parseInput(idSchema, assetId), input, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
