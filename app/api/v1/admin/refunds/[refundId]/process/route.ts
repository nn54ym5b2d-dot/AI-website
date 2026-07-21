import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireFinanceAdminAccess } from "@/lib/admin/access";
import { updateRefundProcessing } from "@/lib/transactions/service";
const schema = z.object({ action: z.enum(["submit", "retry", "cancel"]) });
export async function POST(request: Request, context: { params: Promise<{ refundId: string }> }) { const requestId = createRequestId(); try { await requireFinanceAdminAccess(request, true); const { refundId } = await context.params; const input = parseInput(schema, await readJson(request)); return apiSuccess(await updateRefundProcessing(refundId, input.action), requestId); } catch (error) { return apiErrorResponse(error, requestId); } }
