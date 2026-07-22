import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSuperAdminAccess, requireUserReadAccess } from "@/lib/admin/access";
import { getAdminUser } from "@/lib/admin/foundation";
import { updateAdminUser } from "@/lib/admin/users";

type Context = { params: Promise<{ userId: string }> };
export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireUserReadAccess(request);
    const userId = parseInput(z.string().uuid(), (await context.params).userId);
    return apiSuccess(await getAdminUser(access, userId), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}

const updateSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  roles: z.array(z.enum(["buyer", "uploader", "admin"])).max(3).optional(),
  adminRoles: z.array(z.enum(["super_admin", "operator", "finance"])).max(3).optional()
}).refine((value) => value.status !== undefined || value.roles !== undefined || value.adminRoles !== undefined, {
  message: "至少提交一个需要修改的字段。"
});

export async function PATCH(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireSuperAdminAccess(request, true);
    const userId = parseInput(z.string().uuid(), (await context.params).userId);
    const input = parseInput(updateSchema, await readJson(request));
    return apiSuccess(await updateAdminUser(access, userId, input, requestId), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
