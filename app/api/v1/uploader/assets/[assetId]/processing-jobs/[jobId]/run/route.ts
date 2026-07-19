import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireUploaderAccess } from "@/lib/uploader/access";
import { runAssetDerivativeJob } from "@/lib/uploader/assets";

const paramsSchema = z.object({ assetId: z.string().uuid(), jobId: z.string().uuid() });
const bodySchema = z.object({});

type RouteContext = { params: Promise<{ assetId: string; jobId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  try {
    const access = await requireUploaderAccess(request, true);
    const params = parseInput(paramsSchema, await context.params);
    parseInput(bodySchema, await readJson(request));
    return apiSuccess(
      await runAssetDerivativeJob(access, params.assetId, params.jobId),
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
