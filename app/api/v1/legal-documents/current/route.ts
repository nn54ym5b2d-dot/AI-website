import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { getCurrentLegalDocument } from "@/lib/auth/service";

const querySchema = z.object({
  type: z.enum(["terms_of_service", "privacy_policy", "commercial_license"])
});

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const url = new URL(request.url);
    const { type } = parseInput(querySchema, { type: url.searchParams.get("type") });
    const document = await getCurrentLegalDocument(type);
    return apiSuccess(
      {
        id: document.id,
        version: document.version,
        title: document.title,
        effectiveAt: document.effectiveAt.toISOString(),
        content: document.content
      },
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
