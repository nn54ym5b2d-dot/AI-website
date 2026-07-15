import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { createAuthChallenge } from "@/lib/auth/service";

const challengeSchema = z.object({
  method: z.enum(["phone", "email"]),
  identifier: z.string().min(3).max(254),
  purpose: z.enum(["register", "login"])
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = parseInput(challengeSchema, await readJson(request));
    const result = await createAuthChallenge(input);
    return apiSuccess(
      {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt.toISOString(),
        resendAfterSeconds: result.resendAfterSeconds
      },
      requestId,
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
