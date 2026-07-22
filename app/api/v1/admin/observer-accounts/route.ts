import { z } from "zod";
import { apiErrorResponse, apiPaginatedSuccess, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireSuperAdminAccess } from "@/lib/admin/access";
import { createObserverAccount, listObserverAccounts } from "@/lib/admin/observers";

const createSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().trim().min(2).max(80),
  partnerName: z.string().trim().min(2).max(120)
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    await requireSuperAdminAccess(request);
    return apiPaginatedSuccess(await listObserverAccounts(), { nextCursor: null, hasMore: false }, requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSuperAdminAccess(request, true);
    const input = parseInput(createSchema, await readJson(request));
    return apiSuccess(await createObserverAccount(access, input, requestId), requestId, { status: 201 });
  } catch (error) { return apiErrorResponse(error, requestId); }
}
