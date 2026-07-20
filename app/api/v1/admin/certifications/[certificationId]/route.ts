import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { getCertification } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
type Context = { params: Promise<{ certificationId: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    await requireContentAdminAccess(request);
    const { certificationId } = await context.params;
    return apiSuccess(await getCertification(parseInput(idSchema, certificationId)), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
