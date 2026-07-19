import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { getPublicAsset } from "@/lib/domain/materials";

const paramsSchema = z.object({ assetId: z.uuid() });

type AssetRouteContext = { params: Promise<{ assetId: string }> };

export async function GET(_request: Request, context: AssetRouteContext) {
  const requestId = createRequestId();
  try {
    const { assetId } = parseInput(paramsSchema, await context.params);
    return apiSuccess(await getPublicAsset(assetId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
