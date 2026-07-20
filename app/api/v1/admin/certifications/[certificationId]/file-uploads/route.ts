import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { createCertificationFileUpload } from "@/lib/admin/assets";

const idSchema = z.string().uuid();
const uploadSchema = z.object({
  fileType: z.enum(["certificate_file", "certificate_snapshot"]),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().positive().max(10_000_000),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/)
}).strict();
type Context = { params: Promise<{ certificationId: string }> };

export async function POST(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request, true);
    const { certificationId } = await context.params;
    const input = parseInput(uploadSchema, await readJson(request));
    return apiSuccess(await createCertificationFileUpload(access, parseInput(idSchema, certificationId), input, requestId), requestId, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
