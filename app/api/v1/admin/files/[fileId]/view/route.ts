import { z } from "zod";
import { apiErrorResponse, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { getSensitiveFile } from "@/lib/admin/assets";
import { createSensitiveFileViewToken } from "@/lib/admin/sensitive-file-token";

const idSchema = z.string().uuid();
type Context = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request);
    const { fileId: rawFileId } = await context.params;
    const fileId = parseInput(idSchema, rawFileId);
    await getSensitiveFile(access, fileId, requestId);
    const { token } = createSensitiveFileViewToken(fileId, access.user.id);
    const target = new URL(`/api/v1/admin/files/${fileId}/local-view`, request.url);
    target.searchParams.set("token", token);
    return Response.redirect(target, 302);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
