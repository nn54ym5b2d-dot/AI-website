import { ApiError } from "@/lib/api/http";
import {
  canAccessAdmin,
  canManageCertification,
  canManageInvitations,
  canManageSystemSettings,
  canConfirmRefund,
  canReviewAsset
} from "@/lib/auth/roles";
import {
  requireSessionAccess,
  toRoleContext,
  validateCsrf,
  type SessionAccess
} from "@/lib/auth/session";

export type ContentAdminAccess = SessionAccess;

export async function requireContentAdminAccess(request: Request, write = false) {
  const access = await requireSessionAccess(request);
  if (write) {
    validateCsrf(request, access);
  }

  const context = toRoleContext(access);
  if (!canReviewAsset(context) || !canManageCertification(context)) {
    throw new ApiError(403, "FORBIDDEN", "只有超级管理员或运营管理员可以处理素材审核与认证。 ");
  }

  return access;
}

export async function requireFinanceAdminAccess(request: Request, write = false) {
  const access = await requireAdminReadAccess(request, write);
  if (!canConfirmRefund(toRoleContext(access))) {
    throw new ApiError(403, "FORBIDDEN", "只有超级管理员或财务管理员可以处理退款。");
  }
  return access;
}

export async function requireAdminReadAccess(request: Request, write = false) {
  const access = await requireSessionAccess(request);
  if (write) validateCsrf(request, access);
  if (!canAccessAdmin(toRoleContext(access))) {
    throw new ApiError(403, "FORBIDDEN", "当前账号没有管理后台权限。");
  }
  return access;
}

export async function requireInvitationAdminAccess(request: Request, write = false) {
  const access = await requireSessionAccess(request);
  if (write) validateCsrf(request, access);
  if (!canManageInvitations(toRoleContext(access))) {
    throw new ApiError(403, "FORBIDDEN", "只有超级管理员或运营管理员可以管理邀请码。");
  }
  return access;
}

export async function requireUserReadAccess(request: Request) {
  return requireInvitationAdminAccess(request);
}

export async function requireSettingsAccess(request: Request, write = false) {
  const access = await requireAdminReadAccess(request, write);
  if (write && !canManageSystemSettings(toRoleContext(access))) {
    throw new ApiError(403, "FORBIDDEN", "只有超级管理员可以修改系统设置。");
  }
  return access;
}
