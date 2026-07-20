import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUserReadAccess } from "@/lib/admin/access";
import { getAdminUser } from "@/lib/admin/foundation";

type Context = { params: Promise<{ userId: string }> };
export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireUserReadAccess(request);
    const userId = parseInput(z.string().uuid(), (await context.params).userId);
    return apiSuccess(await getAdminUser(access, userId), requestId);
  } catch (error) { return apiErrorResponse(error, requestId); }
}
