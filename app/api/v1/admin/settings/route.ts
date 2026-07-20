import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSettingsAccess } from "@/lib/admin/access";
import { getSystemSettings, updateSystemSettings } from "@/lib/settings/service";

const rate = z.number().min(0).max(1).transform((value) => value.toFixed(4));
const settingsSchema = z.object({
  certificationFeeCents: z.number().int().min(0).max(1_000_000),
  assetPriceRules: z.object({
    person: z.number().int().min(1).max(10_000_000),
    object: z.number().int().min(1).max(10_000_000),
    scene: z.number().int().min(1).max(10_000_000)
  }),
  uploaderShareRate: rate,
  platformShareRate: rate,
  observerShareRate: rate,
  downloadEligibilityDays: z.number().int().min(1).max(3650),
  signedDownloadUrlTtlMinutes: z.number().int().min(1).max(60)
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSettingsAccess(request);
    return apiSuccess({ ...(await getSystemSettings()), canEdit: access.adminRoles.includes("super_admin") }, requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSettingsAccess(request, true);
    const input = parseInput(settingsSchema, await readJson(request));
    return apiSuccess(await updateSystemSettings(access, input, requestId), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
