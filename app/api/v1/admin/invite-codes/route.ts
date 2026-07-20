import { z } from "zod";
import { apiErrorResponse, apiPaginatedSuccess, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireInvitationAdminAccess } from "@/lib/admin/access";
import { createInviteCode, listInviteCodes } from "@/lib/admin/foundation";

const createSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional()
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireInvitationAdminAccess(request);
    return apiPaginatedSuccess(await listInviteCodes(), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireInvitationAdminAccess(request, true);
    const input = parseInput(createSchema, await readJson(request));
    return apiSuccess(await createInviteCode(access, input, requestId), requestId, { status: 201 });
  } catch (error) { return apiErrorResponse(error, requestId); }
}
