import { ApiError } from "@/lib/api/http";
import { canAccessObserverDashboard } from "@/lib/auth/roles";
import { requireSessionAccess, toRoleContext } from "@/lib/auth/session";

export async function requireObserverAccess(request: Request) {
  const access = await requireSessionAccess(request);
  if (!canAccessObserverDashboard(toRoleContext(access)) || !access.observerProfile || access.observerProfile.status !== "active") {
    throw new ApiError(403, "FORBIDDEN", "只有有效外部观察员可以查看只读经营汇总。");
  }
  return access as typeof access & { observerProfile: NonNullable<typeof access.observerProfile> };
}
