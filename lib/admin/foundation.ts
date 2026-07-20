import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";
import { decryptInviteCode, encryptInviteCode, hashInviteCode } from "@/lib/auth/crypto";
import { getPrisma } from "@/lib/db/prisma";
import type { SessionAccess } from "@/lib/auth/session";

function effectiveInviteStatus(invite: { status: string; expiresAt: Date | null; usedByUserId: string | null; uploaderProfile: unknown }) {
  if (invite.usedByUserId || invite.uploaderProfile) return "used";
  if (invite.status === "unused" && invite.expiresAt && invite.expiresAt <= new Date()) return "expired";
  return invite.status;
}
function maskInvite(prefix: string) {
  return `${prefix}••••••••`;
}

export async function listInviteCodes() {
  const invites = await getPrisma().inviteCode.findMany({
    include: {
      createdBy: { select: { displayName: true } },
      usedBy: { select: { displayName: true } },
      uploaderProfile: { select: { id: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100
  });
  return invites.map((invite) => ({
    id: invite.id,
    code: maskInvite(invite.displayPrefix),
    revealable: Boolean(invite.codeCiphertext),
    status: effectiveInviteStatus(invite),
    note: invite.note,
    createdBy: invite.createdBy.displayName,
    usedBy: invite.usedBy?.displayName ?? null,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    usedAt: invite.usedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString()
  }));
}

export async function createInviteCode(
  access: SessionAccess,
  input: { expiresAt?: string | null; note?: string | null },
  requestId: string
) {
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    throw new ApiError(422, "VALIDATION_ERROR", "邀请码过期时间必须晚于当前时间。");
  }
  const code = `YSK-${randomBytes(8).toString("hex").toUpperCase()}`;
  const displayPrefix = code.slice(0, 9);
  const codeCiphertext = encryptInviteCode(code, getAuthConfig().authSecret);
  const invite = await getPrisma().$transaction(async (transaction) => {
    const created = await transaction.inviteCode.create({
      data: {
        codeHash: hashInviteCode(code),
        codeCiphertext,
        displayPrefix,
        note: input.note?.trim() || null,
        expiresAt,
        createdByUserId: access.user.id
      }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "invite_code.created",
        targetType: "invite_code",
        targetId: created.id,
        requestId,
        metadata: { displayPrefix, expiresAt: expiresAt?.toISOString() ?? null, note: input.note?.trim() || null }
      }
    });
    return created;
  });
  return {
    id: invite.id,
    code,
    status: invite.status,
    note: invite.note,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    disclosure: "邀请码已加密保存；管理员之后可通过列表中的眼睛按钮按需查看。"
  };
}

export async function revealInviteCode(access: SessionAccess, inviteId: string, requestId: string) {
  return getPrisma().$transaction(async (transaction) => {
    const invite = await transaction.inviteCode.findUnique({ where: { id: inviteId } });
    if (!invite) throw new ApiError(404, "RESOURCE_NOT_FOUND", "邀请码不存在。");
    if (!invite.codeCiphertext) {
      throw new ApiError(
        409,
        "INVITE_CODE_NOT_RECOVERABLE",
        "该历史邀请码创建时只保存了单向哈希，无法恢复完整内容。"
      );
    }

    let code: string;
    try {
      code = decryptInviteCode(invite.codeCiphertext, getAuthConfig().authSecret);
    } catch {
      throw new ApiError(
        409,
        "INVITE_CODE_DECRYPTION_FAILED",
        "邀请码无法使用当前加密密钥解密，请检查环境配置。"
      );
    }

    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "invite_code.revealed",
        targetType: "invite_code",
        targetId: inviteId,
        requestId,
        metadata: { displayPrefix: invite.displayPrefix }
      }
    });

    return { id: invite.id, code };
  });
}

export async function disableInviteCode(access: SessionAccess, inviteId: string, requestId: string) {
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.inviteCode.updateMany({
      where: {
        id: inviteId,
        status: "unused",
        usedByUserId: null,
        uploaderProfile: { is: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      data: { status: "disabled" }
    });
    if (updated.count !== 1) {
      const existing = await transaction.inviteCode.findUnique({
        where: { id: inviteId },
        include: { uploaderProfile: { select: { id: true } } }
      });
      if (!existing) throw new ApiError(404, "RESOURCE_NOT_FOUND", "邀请码不存在。");
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有尚未使用且仍有效的邀请码可以禁用；已使用邀请码不可恢复。");
    }
    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "invite_code.disabled",
        targetType: "invite_code",
        targetId: inviteId,
        requestId,
        metadata: {}
      }
    });
    return { id: inviteId, status: "disabled" as const };
  });
}

function maskEmail(value: string | null) {
  if (!value) return null;
  const [name, domain] = value.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: string | null) {
  if (!value) return null;
  return value.length > 7 ? `${value.slice(0, 4)}****${value.slice(-4)}` : "****";
}

const userInclude = {
  roleMemberships: { where: { status: "active" as const }, select: { role: true } },
  adminRoleAssignments: { where: { status: "active" as const }, select: { adminRole: true } },
  uploaderProfile: { select: { id: true, displayName: true, status: true } },
  observerProfile: { select: { id: true, partnerName: true, status: true } }
};

function serializeUser(user: Awaited<ReturnType<typeof getPrisma>["user"]["findFirstOrThrow"]> & Record<string, unknown>, revealContacts: boolean) {
  const typed = user as typeof user & {
    roleMemberships: Array<{ role: string }>;
    adminRoleAssignments: Array<{ adminRole: string }>;
    uploaderProfile: { id: string; displayName: string; status: string } | null;
    observerProfile: { id: string; partnerName: string; status: string } | null;
    email: string | null; phone: string | null; createdAt: Date; lastLoginAt: Date | null;
    id: string; displayName: string; status: string;
  };
  return {
    id: typed.id,
    displayName: typed.displayName,
    status: typed.status,
    email: revealContacts ? typed.email : maskEmail(typed.email),
    phone: revealContacts ? typed.phone : maskPhone(typed.phone),
    roles: typed.roleMemberships.map((item) => item.role),
    adminRoles: typed.adminRoleAssignments.map((item) => item.adminRole),
    uploaderProfile: typed.uploaderProfile,
    observerProfile: typed.observerProfile,
    lastLoginAt: typed.lastLoginAt?.toISOString() ?? null,
    createdAt: typed.createdAt.toISOString()
  };
}

export async function listAdminUsers(access: SessionAccess) {
  const users = await getPrisma().user.findMany({ include: userInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  const revealContacts = access.adminRoles.includes("super_admin");
  return users.map((user) => serializeUser(user as never, revealContacts));
}

export async function getAdminUser(access: SessionAccess, userId: string) {
  const user = await getPrisma().user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw new ApiError(404, "RESOURCE_NOT_FOUND", "用户不存在。");
  return serializeUser(user as never, access.adminRoles.includes("super_admin"));
}
