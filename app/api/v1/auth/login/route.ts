import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { getUserRoleSummary, loginWithChallenge } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  challengeId: z.uuid(),
  verificationCode: z.string().regex(/^\d{6}$/)
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = parseInput(loginSchema, await readJson(request));
    const result = await loginWithChallenge(input);
    const roleSummary = await getUserRoleSummary(result.user.id);
    const response = apiSuccess(
      {
        user: {
          id: result.user.id,
          displayName: result.user.displayName,
          avatarUrl: result.user.avatarUrl,
          primaryLoginMethod: result.user.primaryLoginMethod
        },
        ...roleSummary
      },
      requestId
    );
    setSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
