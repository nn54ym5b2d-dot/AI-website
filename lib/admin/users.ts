import { Prisma, type AdminRole, type UserRole } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

const managedBaseRoles = ["buyer", "uploader", "admin"] as const satisfies readonly UserRole[];
const managedAdminRoles = ["super_admin", "operator", "finance"] as const satisfies readonly AdminRole[];

export type AdminUserUpdate = {
  status?: "active" | "disabled";
  roles?: Array<(typeof managedBaseRoles)[number]>;
  adminRoles?: AdminRole[];
};

function sorted<T extends string>(values: readonly T[]) {
  return [...new Set(values)].sort();
}

function effectiveSuperAdmin(user: {
  status: string;
  roleMemberships: Array<{ role: UserRole; status: string }>;
  adminRoleAssignments: Array<{ adminRole: AdminRole; status: string }>;
}) {
  return user.status === "active"
    && user.roleMemberships.some((item) => item.role === "admin" && item.status === "active")
    && user.adminRoleAssignments.some((item) => item.adminRole === "super_admin" && item.status === "active");
}

export async function updateAdminUser(
  access: SessionAccess,
  userId: string,
  input: AdminUserUpdate,
  requestId: string
) {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(9150015)`;
    const user = await transaction.user.findUnique({
      where: { id: userId },
      include: { roleMemberships: true, adminRoleAssignments: true, uploaderProfile: true }
    });
    if (!user) throw new ApiError(404, "RESOURCE_NOT_FOUND", "用户不存在。");
    if (user.status === "deleted") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "已删除账号不能通过用户管理重新启用。");
    }

    const currentManagedRoles = user.roleMemberships
      .filter((item) => item.status === "active" && managedBaseRoles.includes(item.role as never))
      .map((item) => item.role as (typeof managedBaseRoles)[number]);
    const nextRoles = input.roles ? sorted(input.roles) : sorted(currentManagedRoles);
    const currentAdminRoles = user.adminRoleAssignments
      .filter((item) => item.status === "active")
      .map((item) => item.adminRole);
    const nextAdminRoles = input.adminRoles ? sorted(input.adminRoles) : sorted(currentAdminRoles);
    const nextStatus = input.status ?? (user.status as "active" | "disabled");

    if (nextRoles.includes("uploader") && !nextRoles.includes("buyer")) {
      throw new ApiError(422, "VALIDATION_ERROR", "上传者必须同时保留购买者角色。");
    }
    if (nextRoles.includes("uploader") && !user.uploaderProfile) {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "没有上传者资料的账号不能直接授予上传者角色，请先走邀请码流程。");
    }
    if (nextAdminRoles.length > 0 && !nextRoles.includes("admin")) {
      throw new ApiError(422, "VALIDATION_ERROR", "后台子角色必须同时具有管理员基础角色。");
    }
    if (nextRoles.includes("admin") && nextAdminRoles.length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "管理员基础角色至少需要一个有效后台子角色。");
    }

    const wasEffectiveSuperAdmin = effectiveSuperAdmin(user);
    const willBeEffectiveSuperAdmin = nextStatus === "active"
      && nextRoles.includes("admin")
      && nextAdminRoles.includes("super_admin");
    if (wasEffectiveSuperAdmin && !willBeEffectiveSuperAdmin) {
      const effectiveSuperAdminCount = await transaction.adminRoleAssignment.count({
        where: {
          adminRole: "super_admin",
          status: "active",
          user: {
            status: "active",
            roleMemberships: { some: { role: "admin", status: "active" } }
          }
        }
      });
      if (effectiveSuperAdminCount <= 1) {
        throw new ApiError(409, "STATE_TRANSITION_INVALID", "不能停用或移除最后一名有效超级管理员。");
      }
    }

    await transaction.user.update({ where: { id: userId }, data: { status: nextStatus } });
    if (nextStatus === "disabled") {
      await transaction.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    if (input.roles) {
      for (const role of managedBaseRoles) {
        await transaction.userRoleMembership.upsert({
          where: { userId_role: { userId, role } },
          update: { status: nextRoles.includes(role) ? "active" : "disabled" },
          create: { userId, role, status: nextRoles.includes(role) ? "active" : "disabled" }
        });
      }
    }
    if (input.adminRoles || input.roles) {
      for (const adminRole of managedAdminRoles) {
        await transaction.adminRoleAssignment.upsert({
          where: { userId_adminRole: { userId, adminRole } },
          update: { status: nextAdminRoles.includes(adminRole) ? "active" : "disabled" },
          create: {
            userId,
            adminRole,
            status: nextAdminRoles.includes(adminRole) ? "active" : "disabled",
            createdByUserId: access.user.id
          }
        });
      }
    }

    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "user.access.updated",
        targetType: "user",
        targetId: userId,
        requestId,
        metadata: {
          before: {
            status: user.status,
            roles: sorted(currentManagedRoles),
            adminRoles: sorted(currentAdminRoles)
          },
          after: { status: nextStatus, roles: nextRoles, adminRoles: nextAdminRoles }
        } satisfies Prisma.InputJsonValue
      }
    });

    return { id: userId, status: nextStatus, roles: nextRoles, adminRoles: nextAdminRoles };
  });
}

export async function getAdminUserSummary() {
  const prisma = getPrisma();
  const [total, active, disabled, buyers, uploaders, admins] = await Promise.all([
    prisma.user.count({ where: { status: { not: "deleted" } } }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "disabled" } }),
    prisma.userRoleMembership.count({ where: { role: "buyer", status: "active", user: { status: "active" } } }),
    prisma.userRoleMembership.count({ where: { role: "uploader", status: "active", user: { status: "active" } } }),
    prisma.userRoleMembership.count({ where: { role: "admin", status: "active", user: { status: "active" } } })
  ]);
  return { total, active, disabled, buyers, uploaders, admins };
}
