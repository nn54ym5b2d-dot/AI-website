import type { UserRole } from "@/types/domain";

const adminRoles: UserRole[] = ["super_admin", "operator", "finance", "observer"];

export function isAdminRole(role: UserRole) {
  return adminRoles.includes(role);
}

export function canAccessObserverDashboard(role: UserRole) {
  return role === "observer" || role === "super_admin" || role === "operator";
}

export function canMutateAdminData(role: UserRole) {
  return role === "super_admin" || role === "operator" || role === "finance";
}
