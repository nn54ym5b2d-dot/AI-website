import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireAdminReadAccess } from "@/lib/admin/access";
import { revokeAuthorization } from "@/lib/revenue/service";

const schema = z.object({ reason: z.string().trim().min(4).max(500) });
type Props = { params: Promise<{ authorizationId: string }> };

export async function POST(request: Request, { params }: Props) {
  const requestId = createRequestId();
  try {
    const access = await requireAdminReadAccess(request, true);
    const input = parseInput(schema, await readJson(request));
    const { authorizationId } = await params;
    return apiSuccess(await revokeAuthorization(access, authorizationId, input.reason, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
