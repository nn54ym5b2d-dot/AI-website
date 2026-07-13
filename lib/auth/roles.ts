import type { AdminRole, RoleContext, UserRole } from "@/types/domain";

const adminRoles = new Set<AdminRole>(["super_admin", "operator", "finance"]);
const contentAdminRoles = new Set<AdminRole>(["super_admin", "operator"]);
const financeActionRoles = new Set<AdminRole>(["super_admin", "finance"]);
const superAdminRoles = new Set<AdminRole>(["super_admin"]);

function hasAdminRole(context: RoleContext, allowedRoles: ReadonlySet<AdminRole>) {
  return (
    context.userRoles.has("admin") &&
    [...context.adminRoles].some((role) => adminRoles.has(role) && allowedRoles.has(role))
  );
}

export function isAdminRole(role: UserRole) {
  return role === "admin";
}

export function canAccessAdmin(context: RoleContext) {
  return hasAdminRole(context, adminRoles);
}

export function canAccessObserverDashboard(context: RoleContext) {
  return context.userRoles.has("observer");
}

export function canReviewAsset(context: RoleContext) {
  return hasAdminRole(context, contentAdminRoles);
}

export function canManageAssetListing(context: RoleContext) {
  return hasAdminRole(context, contentAdminRoles);
}

export function canManageCertification(context: RoleContext) {
  return hasAdminRole(context, contentAdminRoles);
}

export function canManageInvitations(context: RoleContext) {
  return hasAdminRole(context, contentAdminRoles);
}

export function canConfirmRefund(context: RoleContext) {
  return hasAdminRole(context, financeActionRoles);
}

export function canManageSystemSettings(context: RoleContext) {
  return hasAdminRole(context, superAdminRoles);
}

export function canManageAdminRoles(context: RoleContext) {
  return hasAdminRole(context, superAdminRoles);
}
