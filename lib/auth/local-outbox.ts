import { readFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "@/lib/api/http";

type LocalOutboxRecord = {
  challengeId: string;
  method: "phone" | "email";
  identifier: string;
  verificationCode: string;
  expiresAt: string;
};

export type LocalOutboxDelivery = Omit<LocalOutboxRecord, "challengeId"> & {
  expired: boolean;
};

export function isLocalAuthProviderEnabled() {
  return (
    (process.env.AUTH_PROVIDER ?? "local") === "local" &&
    (process.env.NODE_ENV !== "production" || process.env.AUTH_LOCAL_ENABLED === "true")
  );
}

export function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isLoopbackHostHeader(host: string | null) {
  if (!host) return false;
  try {
    return isLoopbackHostname(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

export function assertLocalOutboxRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  if (!isLocalAuthProviderEnabled() || !isLoopbackHostname(hostname)) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "本地验证码箱仅限本机测试环境。");
  }
}

function isLocalOutboxRecord(value: unknown): value is LocalOutboxRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<LocalOutboxRecord>;
  return (
    typeof record.challengeId === "string" &&
    (record.method === "phone" || record.method === "email") &&
    typeof record.identifier === "string" &&
    /^\d{6}$/.test(record.verificationCode ?? "") &&
    typeof record.expiresAt === "string" &&
    !Number.isNaN(Date.parse(record.expiresAt))
  );
}

export async function readLocalAuthOutbox(limit = 20, now = new Date()) {
  const configuredPath = process.env.AUTH_LOCAL_OUTBOX_PATH ?? ".local/auth-outbox.jsonl";
  const outboxPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);

  try {
    const lines = (await readFile(outboxPath, "utf8")).split("\n").filter(Boolean);
    return lines
      .slice(-Math.max(1, Math.min(limit, 100)))
      .reverse()
      .flatMap((line): LocalOutboxDelivery[] => {
        try {
          const parsed: unknown = JSON.parse(line);
          if (!isLocalOutboxRecord(parsed)) return [];
          return [{
            method: parsed.method,
            identifier: parsed.identifier,
            verificationCode: parsed.verificationCode,
            expiresAt: parsed.expiresAt,
            expired: Date.parse(parsed.expiresAt) <= now.getTime()
          }];
        } catch {
          return [];
        }
      });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
