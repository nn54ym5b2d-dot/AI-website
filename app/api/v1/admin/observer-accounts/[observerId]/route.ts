import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSuperAdminAccess } from "@/lib/admin/access";
import { updateObserverAccount } from "@/lib/admin/observers";

type Context = { params: Promise<{ observerId: string }> };
const updateSchema = z.object({
  partnerName: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["active", "disabled", "revoked"]).optional()
}).refine((value) => value.partnerName !== undefined || value.status !== undefined, {
  message: "至少提交一个需要修改的字段。"
});

export async function PATCH(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireSuperAdminAccess(request, true);
    const observerId = parseInput(z.string().uuid(), (await context.params).observerId);
    const input = parseInput(updateSchema, await readJson(request));
    return apiSuccess(await updateObserverAccount(access, observerId, input, requestId), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
