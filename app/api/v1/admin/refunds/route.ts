import { z } from "zod";
import { apiErrorResponse, apiSuccess, createRequestId, readJson } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireFinanceAdminAccess } from "@/lib/admin/access";
import { createAdminRefund, listAdminRefunds } from "@/lib/transactions/service";
const schema = z.object({ paymentId: z.uuid().optional(), items: z.array(z.object({ orderItemId: z.uuid(), amountCents: z.number().int().positive() })).optional(), certificationRefundRequestId: z.uuid().optional(), reason: z.string().trim().min(2).max(500) });
export async function GET(request: Request) { const requestId = createRequestId(); try { await requireFinanceAdminAccess(request); return apiSuccess(await listAdminRefunds(), requestId); } catch (error) { return apiErrorResponse(error, requestId); } }
export async function POST(request: Request) { const requestId = createRequestId(); try { const access = await requireFinanceAdminAccess(request, true); const input = parseInput(schema, await readJson(request)); return apiSuccess(await createAdminRefund(access, input), requestId, { status: 201 }); } catch (error) { return apiErrorResponse(error, requestId); } }
