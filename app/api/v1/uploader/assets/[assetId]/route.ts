import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { getUploaderAsset, updateUploaderAsset } from "@/lib/uploader/assets";

const assetIdSchema = z.string().uuid();
const updateAssetSchema = z
  .object({
    title: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(10).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "至少提供一个要修改的字段");

type RouteContext = { params: Promise<{ assetId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request);
    const { assetId: rawAssetId } = await context.params;
    const assetId = parseInput(assetIdSchema, rawAssetId);
    return apiSuccess(await getUploaderAsset(access, assetId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const { assetId: rawAssetId } = await context.params;
    const assetId = parseInput(assetIdSchema, rawAssetId);
    const input = parseInput(updateAssetSchema, await readJson(request));
    return apiSuccess(await updateUploaderAsset(access, assetId, input), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
