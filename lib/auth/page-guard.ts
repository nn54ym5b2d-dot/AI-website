import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RouteAudience } from "@/lib/domain/navigation";
import { getAuthConfig } from "@/lib/auth/config";
import { getSessionAccessByToken, toRoleContext } from "@/lib/auth/session";
import {
  canAccessAdmin,
  canAccessObserverDashboard,
  canPurchase,
  canUpload
} from "@/lib/auth/roles";

export async function getPageAccess() {
  const config = getAuthConfig();
  const cookieStore = await cookies();
  return getSessionAccessByToken(cookieStore.get(config.sessionCookieName)?.value ?? null);
}

export async function requirePageAccess(nextPath: string) {
  const access = await getPageAccess();
  if (!access) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return access;
}

export function canAccessAudience(
  access: Awaited<ReturnType<typeof requirePageAccess>>,
  audiences: RouteAudience[]
) {
  const context = toRoleContext(access);
  return audiences.some((audience) => {
    if (audience === "public") return true;
    if (audience === "buyer") return canPurchase(context);
    if (audience === "uploader") return canUpload(context);
    if (audience === "observer") return canAccessObserverDashboard(context);
    return context.userRoles.has("admin") && context.adminRoles.has(audience);
  });
}

export async function requireAudience(nextPath: string, audiences: RouteAudience[]) {
  const access = await requirePageAccess(nextPath);
  if (!canAccessAudience(access, audiences)) {
    redirect("/forbidden");
  }
  return access;
}

export async function requireAdminPage(nextPath: string) {
  const access = await requirePageAccess(nextPath);
  if (!canAccessAdmin(toRoleContext(access))) {
    redirect("/forbidden");
  }
  return access;
}
