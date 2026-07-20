import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { getUploaderProfile, updateUploaderProfile } from "@/lib/uploader/profile";

const updateSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(500).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, "至少提供一个要修改的字段");

export async function GET(request: Request) {
  const requestId = createRequestId();
  try { return apiSuccess(await getUploaderProfile(await requireUploaderAccess(request)), requestId); }
  catch (error) { return apiErrorResponse(error, requestId); }
}
export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    return apiSuccess(await updateUploaderProfile(access, parseInput(updateSchema, await readJson(request))), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
