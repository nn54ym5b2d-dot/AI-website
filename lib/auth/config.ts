export type AuthConfig = {
  appUrl: string;
  authSecret: string;
  provider: "local";
  sessionCookieName: string;
  sessionTtlSeconds: number;
  challengeTtlSeconds: number;
  csrfTtlSeconds: number;
};

export function getAuthConfig(): AuthConfig {
  const authSecret = process.env.AUTH_SECRET;
  const provider = process.env.AUTH_PROVIDER ?? "local";

  if (!authSecret || authSecret.length < 24) {
    throw new Error("AUTH_SECRET must contain at least 24 characters.");
  }

  if (provider !== "local") {
    throw new Error(`Unsupported AUTH_PROVIDER: ${provider}`);
  }

  if (
    process.env.NODE_ENV === "production" &&
    provider === "local" &&
    process.env.AUTH_LOCAL_ENABLED !== "true"
  ) {
    throw new Error("The local auth provider cannot run in production.");
  }

  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    authSecret,
    provider,
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "yuansu_session",
    sessionTtlSeconds: 60 * 60 * 24 * 7,
    challengeTtlSeconds: 60 * 10,
    csrfTtlSeconds: 60 * 30
  };
}
