import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";

const VIEW_TTL_SECONDS = 5 * 60;

type SensitiveFileTokenPayload = {
  fileId: string;
  userId: string;
  expiresAt: number;
};

function signature(payload: string) {
  return createHmac("sha256", getAuthConfig().authSecret).update(payload).digest("base64url");
}

export function createSensitiveFileViewToken(fileId: string, userId: string) {
  const payload: SensitiveFileTokenPayload = {
    fileId,
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + VIEW_TTL_SECONDS
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${encoded}.${signature(encoded)}`,
    expiresAt: new Date(payload.expiresAt * 1000)
  };
}

export function verifySensitiveFileViewToken(token: string, fileId: string, userId: string) {
  const [encoded, receivedSignature] = token.split(".");
  if (!encoded || !receivedSignature) {
    throw new ApiError(403, "FORBIDDEN", "敏感文件查看地址无效。 ");
  }

  const expectedSignature = signature(encoded);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new ApiError(403, "FORBIDDEN", "敏感文件查看地址无效。 ");
  }

  let payload: SensitiveFileTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(403, "FORBIDDEN", "敏感文件查看地址无效。 ");
  }

  if (
    payload.fileId !== fileId ||
    payload.userId !== userId ||
    payload.expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    throw new ApiError(403, "FORBIDDEN", "敏感文件查看地址已失效。 ");
  }

  return payload;
}
