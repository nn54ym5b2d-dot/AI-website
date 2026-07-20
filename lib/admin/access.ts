import { ApiError } from "@/lib/api/http";
import { canManageCertification, canReviewAsset } from "@/lib/auth/roles";
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
