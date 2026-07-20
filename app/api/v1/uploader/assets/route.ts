import { z } from "zod";
import {
  apiErrorResponse,
  apiPaginatedSuccess,
  apiSuccess,
  createRequestId,
  readJson
} from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { createUploaderAsset, listUploaderAssets } from "@/lib/uploader/assets";

const createAssetSchema = z.object({
  type: z.enum(["person", "object", "scene"]),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(10).default([])
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request);
    const assets = await listUploaderAssets(access);
    return apiPaginatedSuccess(assets, { nextCursor: null, hasMore: false }, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const input = parseInput(createAssetSchema, await readJson(request));
    const asset = await createUploaderAsset(access, input);
    return apiSuccess(asset, requestId, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
