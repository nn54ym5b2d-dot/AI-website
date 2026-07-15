import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { activateUploaderInvite } from "@/lib/auth/service";
import { requireSessionAccess, validateCsrf } from "@/lib/auth/session";

const activateSchema = z.object({
  code: z.string().min(8).max(100),
  uploaderDisplayName: z.string().min(2).max(40)
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    validateCsrf(request, access);
    const input = parseInput(activateSchema, await readJson(request));
    const result = await activateUploaderInvite(access, input);
    return apiSuccess(
      {
        uploaderProfile: {
          id: result.uploaderProfile.id,
          displayName: result.uploaderProfile.displayName,
          status: result.uploaderProfile.status
        },
        roles: result.roles
      },
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
