import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { completeCertificationFileUpload } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
type Context = { params: Promise<{ certificationId: string; uploadId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { certificationId, uploadId } = await context.params;
    return apiSuccess(
      await completeCertificationFileUpload(
        access,
        parseInput(idSchema, certificationId),
        parseInput(idSchema, uploadId),
        requestId
      ),
      requestId
    );
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
