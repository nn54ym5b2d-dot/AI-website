import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { getAdminAsset, updateAdminAsset } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
const updateSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(10).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "至少提供一个要修改的字段");
type Context = { params: Promise<{ assetId: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    const { assetId } = await context.params;
    return apiSuccess(await getAdminAsset(parseInput(idSchema, assetId)), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}

export async function PATCH(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { assetId } = await context.params;
    const input = parseInput(updateSchema, await readJson(request));
    return apiSuccess(await updateAdminAsset(access, parseInput(idSchema, assetId), input, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
