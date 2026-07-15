import { ZodError, type ZodType } from "zod";
import { ApiError } from "@/lib/api/http";

export function parseInput<T>(schema: ZodType<T>, value: unknown) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(422, "VALIDATION_ERROR", "请求字段不符合要求。 ", {
        fields: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      });
    }
    throw error;
  }
}
