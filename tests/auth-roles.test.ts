import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessAdmin,
  canAccessObserverDashboard,
  canConfirmRefund,
  canManageAdminRoles,
  canManageAssetListing,
  canManageSystemSettings,
  canReviewAsset
} from "../lib/auth/roles.ts";
import type { AdminRole, RoleContext, UserRole } from "../types/domain.ts";

function context(userRoles: UserRole[], adminRoles: AdminRole[] = []): RoleContext {
  return {
    userRoles: new Set(userRoles),
    adminRoles: new Set(adminRoles)
  };
}

test("观察员不是管理员，但可以访问观察员看板", () => {
  const observer = context(["observer"]);

  assert.equal(canAccessAdmin(observer), false);
  assert.equal(canAccessObserverDashboard(observer), true);
  assert.equal(canReviewAsset(observer), false);
  assert.equal(canConfirmRefund(observer), false);
});

test("只有 admin 基础身份、没有有效后台子角色时不能进入后台", () => {
  const incompleteAdmin = context(["admin"]);

  assert.equal(canAccessAdmin(incompleteAdmin), false);
  assert.equal(canAccessObserverDashboard(incompleteAdmin), false);
});

test("运营管理员可管理内容，但不能确认退款或修改系统设置", () => {
  const operator = context(["admin"], ["operator"]);

  assert.equal(canAccessAdmin(operator), true);
  assert.equal(canReviewAsset(operator), true);
  assert.equal(canManageAssetListing(operator), true);
  assert.equal(canConfirmRefund(operator), false);
  assert.equal(canManageSystemSettings(operator), false);
});

test("财务管理员可确认退款，但不能管理内容", () => {
  const finance = context(["admin"], ["finance"]);

  assert.equal(canAccessAdmin(finance), true);
  assert.equal(canConfirmRefund(finance), true);
  assert.equal(canReviewAsset(finance), false);
  assert.equal(canManageAssetListing(finance), false);
});

test("超级管理员拥有全部后台权限，但仍需 admin 基础身份", () => {
  const superAdmin = context(["admin"], ["super_admin"]);
  const invalidSuperAdmin = context(["buyer"], ["super_admin"]);

  assert.equal(canAccessAdmin(superAdmin), true);
  assert.equal(canReviewAsset(superAdmin), true);
  assert.equal(canConfirmRefund(superAdmin), true);
  assert.equal(canManageSystemSettings(superAdmin), true);
  assert.equal(canManageAdminRoles(superAdmin), true);
  assert.equal(canAccessObserverDashboard(superAdmin), false);
  assert.equal(canAccessAdmin(invalidSuperAdmin), false);
});
