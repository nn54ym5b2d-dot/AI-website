import { z } from "zod";
import {
  apiErrorResponse,
  apiPaginatedSuccess,
  createRequestId
} from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { listPublicAssets } from "@/lib/domain/materials";

const listedAfterSchema = z
  .string()
  .max(40)
  .refine((value) => Number.isFinite(Date.parse(value)), "上架时间格式无效")
  .transform((value) => new Date(value).toISOString());

const querySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    type: z.enum(["person", "object", "scene"]).optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    minPriceCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
    maxPriceCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
    listedAfter: listedAfterSchema.optional(),
    sort: z.enum(["newest", "popular", "price_asc", "price_desc"]).default("newest"),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .refine(
    (value) =>
      value.minPriceCents === undefined ||
      value.maxPriceCents === undefined ||
      value.minPriceCents <= value.maxPriceCents,
    { message: "最低价格不能高于最高价格", path: ["minPriceCents"] }
  );

function optionalParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value : undefined;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const params = new URL(request.url).searchParams;
    const filters = parseInput(querySchema, {
      q: optionalParam(params, "q"),
      type: optionalParam(params, "type"),
      tag: optionalParam(params, "tag"),
      minPriceCents: optionalParam(params, "minPriceCents"),
      maxPriceCents: optionalParam(params, "maxPriceCents"),
      listedAfter: optionalParam(params, "listedAfter"),
      sort: optionalParam(params, "sort"),
      cursor: optionalParam(params, "cursor"),
      limit: optionalParam(params, "limit")
    });
    const result = await listPublicAssets(filters);
    return apiPaginatedSuccess(result.data, result.meta, requestId);
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
