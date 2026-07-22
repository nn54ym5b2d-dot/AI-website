import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type ObserverAccountStatus = "active" | "disabled" | "revoked";

function publicStatus(profileStatus: string, roleStatus: string, userStatus: string): ObserverAccountStatus {
  if (profileStatus === "deleted" || roleStatus === "deleted") return "revoked";
  return profileStatus === "active" && roleStatus === "active" && userStatus === "active" ? "active" : "disabled";
}

const observerAccountInclude = {
  user: {
    include: {
      roleMemberships: { where: { role: "observer" as const }, select: { status: true } }
    }
  }
};

function serializeObserverAccount(account: {
  id: string;
  partnerName: string;
  defaultShareRate: { toString(): string };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    displayName: string;
    email: string | null;
    status: string;
    lastLoginAt: Date | null;
    roleMemberships: Array<{ status: string }>;
  };
}) {
  const membershipStatus = account.user.roleMemberships[0]?.status ?? "disabled";
  return {
    id: account.id,
    userId: account.user.id,
    displayName: account.user.displayName,
    email: account.user.email,
    partnerName: account.partnerName,
    shareRate: Number(account.defaultShareRate.toString()),
    status: publicStatus(account.status, membershipStatus, account.user.status),
    lastLoginAt: account.user.lastLoginAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString()
  };
}

export async function listObserverAccounts() {
  const accounts = await getPrisma().observerProfile.findMany({
    include: observerAccountInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100
  });
  return accounts.map((account) => serializeObserverAccount(account));
}

export async function createObserverAccount(
  access: SessionAccess,
  input: { email: string; displayName: string; partnerName: string },
  requestId: string
) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const partnerName = input.partnerName.trim();
  return getPrisma().$transaction(async (transaction) => {
    const duplicate = await transaction.user.findUnique({ where: { email }, select: { id: true } });
    if (duplicate) throw new ApiError(409, "RESOURCE_CONFLICT", "该邮箱已经绑定其他平台账号。");
    const now = new Date();
    const user = await transaction.user.create({
      data: {
        email,
        displayName,
        primaryLoginMethod: "email",
        authIdentities: {
          create: {
            provider: "email",
            providerSubject: email,
            isVerified: true,
            verifiedAt: now
          }
        },
        roleMemberships: { create: { role: "observer", status: "active" } },
        observerProfile: {
          create: { partnerName, defaultShareRate: new Prisma.Decimal(0), status: "active" }
        }
      },
      include: { observerProfile: true }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "observer_account.created",
        targetType: "observer_profile",
        targetId: user.observerProfile!.id,
        requestId,
        metadata: { userId: user.id, partnerName }
      }
    });
    const account = await transaction.observerProfile.findUniqueOrThrow({
      where: { id: user.observerProfile!.id },
      include: observerAccountInclude
    });
    return serializeObserverAccount(account);
  });
}

export async function updateObserverAccount(
  access: SessionAccess,
  observerId: string,
  input: { partnerName?: string; status?: ObserverAccountStatus },
  requestId: string
) {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(9150016)`;
    const current = await transaction.observerProfile.findUnique({
      where: { id: observerId },
      include: observerAccountInclude
    });
    if (!current) throw new ApiError(404, "RESOURCE_NOT_FOUND", "观察员账号不存在。");
    const membership = current.user.roleMemberships[0];
    const currentStatus = publicStatus(current.status, membership?.status ?? "disabled", current.user.status);
    if (currentStatus === "revoked" && input.status && input.status !== "revoked") {
      throw new ApiError(409, "STATE_TRANSITION_INVALID", "已撤销的观察员权限不能重新启用，请创建新的合作账号。");
    }
    const nextStatus = input.status ?? currentStatus;
    const partnerName = input.partnerName?.trim() || current.partnerName;
    const databaseStatus = nextStatus === "revoked" ? "deleted" : nextStatus;
    await transaction.observerProfile.update({
      where: { id: observerId },
      data: { partnerName, status: databaseStatus }
    });
    await transaction.userRoleMembership.upsert({
      where: { userId_role: { userId: current.user.id, role: "observer" } },
      update: { status: databaseStatus },
      create: { userId: current.user.id, role: "observer", status: databaseStatus }
    });
    await transaction.user.update({
      where: { id: current.user.id },
      data: { status: nextStatus === "active" ? "active" : "disabled" }
    });
    if (nextStatus !== "active") {
      await transaction.userSession.updateMany({
        where: { userId: current.user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: nextStatus === "revoked" ? "observer_account.revoked" : "observer_account.updated",
        targetType: "observer_profile",
        targetId: observerId,
        requestId,
        metadata: {
          before: { partnerName: current.partnerName, status: currentStatus },
          after: { partnerName, status: nextStatus }
        }
      }
    });
    const updated = await transaction.observerProfile.findUniqueOrThrow({
      where: { id: observerId },
      include: observerAccountInclude
    });
    return serializeObserverAccount(updated);
  });
}

export async function getObserverAccountSummary() {
  const accounts = await listObserverAccounts();
  return {
    total: accounts.length,
    active: accounts.filter((account) => account.status === "active").length,
    disabled: accounts.filter((account) => account.status === "disabled").length,
    revoked: accounts.filter((account) => account.status === "revoked").length
  };
}
