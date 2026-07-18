import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { getUserRoleSummary, loginWithWechat } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

const wechatSchema = z.object({
  code: z.string().min(1).max(500),
  redirectUri: z.url(),
  acceptedTermsVersion: z.string().min(1).max(50).optional(),
  phoneChallengeId: z.uuid().optional(),
  phoneVerificationCode: z.string().regex(/^\d{6}$/).optional()
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = parseInput(wechatSchema, await readJson(request));
    const result = await loginWithWechat({ ...input, requestId });
    const roleSummary = await getUserRoleSummary(result.user.id);
    const response = apiSuccess(
      {
        user: {
          id: result.user.id,
          displayName: result.user.displayName,
          avatarUrl: result.user.avatarUrl,
          primaryLoginMethod: result.user.primaryLoginMethod
        },
        ...roleSummary,
        isNewUser: result.isNewUser
      },
      requestId,
      { status: result.isNewUser ? 201 : 200 }
    );
    setSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
