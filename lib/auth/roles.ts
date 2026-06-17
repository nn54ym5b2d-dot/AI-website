import type { UserRole } from "@/types/domain";

const adminRoles = new Set<UserRole>(["super_admin", "operator", "finance", "observer"]);
const contentAdminRoles = new Set<UserRole>(["super_admin", "operator"]);
const financeActionRoles = new Set<UserRole>(["super_admin", "finance"]);
const platformSummaryRoles = new Set<UserRole>([
  "super_admin",
  "operator",
  "finance",
  "observer"
]);

export function isAdminRole(role: UserRole) {
  return adminRoles.has(role);
}

export function canAccessObserverDashboard(role: UserRole) {
  return platformSummaryRoles.has(role);
}

export function canReviewAsset(role: UserRole) {
  return contentAdminRoles.has(role);
}

export function canManageAssetListing(role: UserRole) {
  return contentAdminRoles.has(role);
}

export function canManageCertification(role: UserRole) {
  return contentAdminRoles.has(role);
}

export function canManageInvitations(role: UserRole) {
  return contentAdminRoles.has(role);
}

export function canConfirmRefund(role: UserRole) {
  return financeActionRoles.has(role);
}

export function canManageSystemSettings(role: UserRole) {
  return role === "super_admin";
}

export function canManageAdminRoles(role: UserRole) {
  return role === "super_admin";
}
