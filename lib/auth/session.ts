import type { NextResponse } from "next/server";
import type { AdminRole, UserRole } from "@/generated/prisma/client";
import type { RoleContext } from "@/types/domain";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";
import { createOpaqueToken, hashWithSecret, safeEqual } from "@/lib/auth/crypto";
import { getPrisma } from "@/lib/db/prisma";

export type SessionAccess = {
  sessionId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    primaryLoginMethod: "phone" | "email" | "wechat";
  };
  roles: UserRole[];
  adminRoles: AdminRole[];
  uploaderProfile: {
    id: string;
    displayName: string;
    status: "active" | "disabled" | "deleted";
  } | null;
  observerProfile: {
    id: string;
    partnerName: string;
    status: "active" | "disabled" | "deleted";
  } | null;
  csrfTokenHash: string | null;
  csrfExpiresAt: Date | null;
};

function parseCookie(header: string | null, name: string) {
  if (!header) {
    return null;
  }

  for (const segment of header.split(";")) {
    const [cookieName, ...valueParts] = segment.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function activeRoles<T extends { status: string }>(records: T[]) {
  return records.filter((record) => record.status === "active");
}

export async function createSession(userId: string) {
  const config = getAuthConfig();
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);
  const session = await getPrisma().userSession.create({
    data: {
      userId,
      tokenHash: hashWithSecret(token, config.authSecret),
      expiresAt
    }
  });

  return { sessionId: session.id, token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  const config = getAuthConfig();
  response.cookies.set(config.sessionCookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(response: NextResponse) {
  const config = getAuthConfig();
  response.cookies.set(config.sessionCookieName, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

export async function getSessionAccessByToken(token: string | null): Promise<SessionAccess | null> {
  const config = getAuthConfig();

  if (!token) {
    return null;
  }

  const session = await getPrisma().userSession.findUnique({
    where: { tokenHash: hashWithSecret(token, config.authSecret) },
    include: {
      user: {
        include: {
          roleMemberships: true,
          adminRoleAssignments: true,
          uploaderProfile: true,
          observerProfile: true
        }
      }
    }
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "active"
  ) {
    return null;
  }

  const roles = activeRoles(session.user.roleMemberships).map((membership) => membership.role);
  const adminRoles = roles.includes("admin")
    ? activeRoles(session.user.adminRoleAssignments).map((assignment) => assignment.adminRole)
    : [];
  const uploaderProfile = session.user.uploaderProfile;
  const observerProfile = session.user.observerProfile;

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      primaryLoginMethod: session.user.primaryLoginMethod
    },
    roles,
    adminRoles,
    uploaderProfile:
      roles.includes("uploader") && uploaderProfile
        ? {
            id: uploaderProfile.id,
            displayName: uploaderProfile.displayName,
            status: uploaderProfile.status
          }
        : null,
    observerProfile:
      roles.includes("observer") && observerProfile
        ? {
            id: observerProfile.id,
            partnerName: observerProfile.partnerName,
            status: observerProfile.status
          }
        : null,
    csrfTokenHash: session.csrfTokenHash,
    csrfExpiresAt: session.csrfExpiresAt
  };
}

export async function getSessionAccess(request: Request): Promise<SessionAccess | null> {
  const config = getAuthConfig();
  const token = parseCookie(request.headers.get("cookie"), config.sessionCookieName);
  return getSessionAccessByToken(token);
}

export async function requireSessionAccess(request: Request) {
  const access = await getSessionAccess(request);

  if (!access) {
    throw new ApiError(401, "AUTH_REQUIRED", "请先登录。 ");
  }

  return access;
}

export function toRoleContext(access: SessionAccess): RoleContext {
  return {
    userRoles: new Set(access.roles),
    adminRoles: new Set(access.adminRoles)
  };
}

export async function issueCsrfToken(access: SessionAccess) {
  const config = getAuthConfig();
  const csrfToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + config.csrfTtlSeconds * 1000);

  await getPrisma().userSession.update({
    where: { id: access.sessionId },
    data: {
      csrfTokenHash: hashWithSecret(csrfToken, config.authSecret),
      csrfExpiresAt: expiresAt,
      lastSeenAt: new Date()
    }
  });

  return { csrfToken, expiresAt };
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isAllowedRequestOrigin(requestOrigin: string | null, expectedOrigin: string) {
  if (requestOrigin === expectedOrigin) {
    return true;
  }

  if (!requestOrigin || process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const requestUrl = new URL(requestOrigin);
    const expectedUrl = new URL(expectedOrigin);
    return (
      requestUrl.protocol === expectedUrl.protocol &&
      requestUrl.port === expectedUrl.port &&
      isLoopbackHostname(requestUrl.hostname) &&
      isLoopbackHostname(expectedUrl.hostname)
    );
  } catch {
    return false;
  }
}

export function validateCsrf(request: Request, access: SessionAccess) {
  const config = getAuthConfig();
  const requestOrigin = request.headers.get("origin");
  const expectedOrigin = new URL(config.appUrl).origin;
  const csrfToken = request.headers.get("x-csrf-token");

  if (
    !isAllowedRequestOrigin(requestOrigin, expectedOrigin) ||
    !csrfToken ||
    !access.csrfTokenHash ||
    !access.csrfExpiresAt ||
    access.csrfExpiresAt <= new Date() ||
    !safeEqual(hashWithSecret(csrfToken, config.authSecret), access.csrfTokenHash)
  ) {
    throw new ApiError(400, "CSRF_VALIDATION_FAILED", "请求安全校验失败，请刷新后重试。 ");
  }
}

export async function revokeSession(sessionId: string) {
  await getPrisma().userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
}
