import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { registerWithChallenge } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

const registerSchema = z.object({
  challengeId: z.uuid(),
  verificationCode: z.string().regex(/^\d{6}$/),
  displayName: z.string().min(2).max(40),
  acceptedTermsVersion: z.string().min(1).max(50)
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = parseInput(registerSchema, await readJson(request));
    const result = await registerWithChallenge({ ...input, requestId });
    const response = apiSuccess(
      {
        user: {
          id: result.user.id,
          displayName: result.user.displayName,
          avatarUrl: result.user.avatarUrl,
          primaryLoginMethod: result.user.primaryLoginMethod
        },
        roles: result.roles,
        adminRoles: []
      },
      requestId,
      { status: 201 }
    );
    setSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
