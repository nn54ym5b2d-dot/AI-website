import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireInvitationAdminAccess } from "@/lib/admin/access";
import { revealInviteCode } from "@/lib/admin/foundation";

type Context = { params: Promise<{ inviteId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireInvitationAdminAccess(request, true);
    const inviteId = parseInput(z.string().uuid(), (await context.params).inviteId);
    return apiSuccess(await revealInviteCode(access, inviteId, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
