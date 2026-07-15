import { appendFile, chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AuthProvider } from "@/generated/prisma/client";
import { safeEqual } from "@/lib/auth/crypto";

export type ChallengeDelivery = {
  challengeId: string;
  method: Extract<AuthProvider, "phone" | "email">;
  identifier: string;
  verificationCode: string;
  expiresAt: Date;
};

export type WechatIdentity = {
  subject: string;
  displayName?: string;
};

export interface AuthProviderAdapter {
  deliverChallenge(delivery: ChallengeDelivery): Promise<void>;
  exchangeWechatCode(code: string, redirectUri: string): Promise<WechatIdentity>;
}

export class AuthProviderUnavailableError extends Error {}

class LocalAuthProvider implements AuthProviderAdapter {
  async deliverChallenge(delivery: ChallengeDelivery) {
    const configuredPath = process.env.AUTH_LOCAL_OUTBOX_PATH ?? ".local/auth-outbox.jsonl";
    const outboxPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);

    await mkdir(path.dirname(outboxPath), { recursive: true, mode: 0o700 });
    await appendFile(
      outboxPath,
      `${JSON.stringify({
        challengeId: delivery.challengeId,
        method: delivery.method,
        identifier: delivery.identifier,
        verificationCode: delivery.verificationCode,
        expiresAt: delivery.expiresAt.toISOString()
      })}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
    await chmod(outboxPath, 0o600);
  }

  async exchangeWechatCode(code: string, _redirectUri: string) {
    const expectedCode = process.env.AUTH_LOCAL_WECHAT_CODE;
    const subject = process.env.AUTH_LOCAL_WECHAT_SUBJECT;

    if (!expectedCode || !subject || !safeEqual(code, expectedCode)) {
      throw new AuthProviderUnavailableError("Local WeChat test identity is not configured.");
    }

    return { subject };
  }
}

export function getAuthProvider(): AuthProviderAdapter {
  const localEnabled =
    process.env.NODE_ENV !== "production" || process.env.AUTH_LOCAL_ENABLED === "true";
  if ((process.env.AUTH_PROVIDER ?? "local") === "local" && localEnabled) {
    return new LocalAuthProvider();
  }

  throw new AuthProviderUnavailableError("No authentication delivery provider is available.");
}
