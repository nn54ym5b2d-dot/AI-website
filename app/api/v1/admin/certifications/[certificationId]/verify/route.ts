import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { verifyCertification } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
const verifySchema = z.object({
  status: z.enum(["certifying", "certified", "exception"]),
  governmentSiteName: z.string().trim().max(120).nullable().optional(),
  certificateNo: z.string().trim().max(120).nullable().optional(),
  credential: z.string().trim().max(500).nullable().optional(),
  certificateFileId: z.string().uuid().nullable().optional(),
  snapshotFileId: z.string().uuid().nullable().optional(),
  issuedAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional()
}).strict();
type Context = { params: Promise<{ certificationId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { certificationId } = await context.params;
    const input = parseInput(verifySchema, await readJson(request));
    return apiSuccess(await verifyCertification(access, parseInput(idSchema, certificationId), input, requestId), requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
