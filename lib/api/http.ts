import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_INVALID"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "RATE_LIMITED"
  | "CSRF_VALIDATION_FAILED"
  | "CHALLENGE_INVALID"
  | "CHALLENGE_EXPIRED"
  | "TERMS_ACCEPTANCE_REQUIRED"
  | "PHONE_BINDING_REQUIRED"
  | "INVITE_CODE_INVALID"
  | "INVITE_CODE_USED"
  | "INVITE_CODE_DISABLED"
  | "INVITE_CODE_EXPIRED"
  | "INVITE_CODE_NOT_RECOVERABLE"
  | "INVITE_CODE_DECRYPTION_FAILED"
  | "UPLOADER_ALREADY_ACTIVE"
  | "UPSTREAM_UNAVAILABLE"
  | "STATE_TRANSITION_INVALID"
  | "UPLOAD_FILE_REJECTED"
  | "UPLOAD_INTENT_EXPIRED"
  | "ASSET_FILES_INCOMPLETE"
  | "PERSON_PROOF_REQUIRED"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "ASSET_NOT_PURCHASABLE"
  | "ALREADY_AUTHORIZED"
  | "PAYMENT_ALREADY_SUCCESS"
  | "PAYMENT_SIGNATURE_INVALID"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "REFUND_AMOUNT_EXCEEDED"
  | "AUTHORIZATION_REVOKED"
  | "DOWNLOAD_LINK_EXPIRED"
  | "DOWNLOAD_LINK_REVOKED"
  | "DOWNLOAD_BUNDLE_NOT_READY"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function createRequestId() {
  return `req_${randomUUID().replaceAll("-", "")}`;
}

export function apiSuccess<T>(data: T, requestId: string, init?: ResponseInit) {
  return NextResponse.json({ data, requestId }, init);
}

export function apiPaginatedSuccess<T>(
  data: T[],
  meta: { nextCursor: string | null; hasMore: boolean },
  requestId: string,
  init?: ResponseInit
) {
  return NextResponse.json({ data, meta, requestId }, init);
}

export function apiErrorResponse(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {})
        },
        requestId
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "服务暂时不可用，请稍后重试。"
      },
      requestId
    },
    { status: 500 }
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "请求体必须是有效 JSON。 ");
  }
}
