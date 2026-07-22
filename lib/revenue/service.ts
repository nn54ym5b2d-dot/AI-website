import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

function ensureUploader(access: SessionAccess) {
  if (!access.roles.includes("uploader") || !access.uploaderProfile || access.uploaderProfile.status !== "active") {
    throw new ApiError(403, "FORBIDDEN", "只有有效上传者可以查看自己的收益。");
  }
  return access.uploaderProfile;
}

export async function reverseRevenueForOrderItem(transaction: Prisma.TransactionClient, orderItemId: string) {
  const records = await transaction.revenueRecord.findMany({ where: { orderItemId } });
  const initial = records.find((record) => record.recordType === "initial");
  if (!initial) return null;
  const existing = records.find((record) => record.recordType === "reversal" && record.relatedRevenueRecordId === initial.id);
  if (existing) return existing;
  await transaction.revenueRecord.updateMany({ where: { id: initial.id, status: { not: "reversed" } }, data: { status: "reversed" } });
  return transaction.revenueRecord.create({
    data: {
      orderItemId: initial.orderItemId,
      recordType: "reversal",
      assetId: initial.assetId,
      uploaderProfileId: initial.uploaderProfileId,
      grossAmountCents: -initial.grossAmountCents,
      uploaderAmountCents: -initial.uploaderAmountCents,
      platformAmountCents: -initial.platformAmountCents,
      uploaderShareRate: initial.uploaderShareRate,
      platformShareRate: initial.platformShareRate,
      currency: initial.currency,
      status: "recorded",
      relatedRevenueRecordId: initial.id
    }
  });
}

function serializeRevenue(record: {
  id: string;
  recordType: string;
  grossAmountCents: number;
  uploaderAmountCents: number;
  platformAmountCents: number;
  uploaderShareRate: { toString(): string };
  platformShareRate: { toString(): string };
  currency: string;
  status: string;
  relatedRevenueRecordId: string | null;
  createdAt: Date;
  orderItem: { assetTitleSnapshot: string; order: { orderNo: string } };
  uploaderProfile?: { displayName: string };
}) {
  return {
    id: record.id,
    recordType: record.recordType,
    assetTitle: record.orderItem.assetTitleSnapshot,
    orderNo: record.orderItem.order.orderNo,
    uploaderDisplayName: record.uploaderProfile?.displayName ?? null,
    grossAmountCents: record.grossAmountCents,
    uploaderAmountCents: record.uploaderAmountCents,
    platformAmountCents: record.platformAmountCents,
    uploaderShareRate: record.uploaderShareRate.toString(),
    platformShareRate: record.platformShareRate.toString(),
    currency: record.currency,
    status: record.status,
    relatedRevenueRecordId: record.relatedRevenueRecordId,
    createdAt: record.createdAt.toISOString()
  };
}

export async function listUploaderRevenue(access: SessionAccess) {
  const profile = ensureUploader(access);
  const records = await getPrisma().revenueRecord.findMany({
    where: { uploaderProfileId: profile.id },
    include: { orderItem: { select: { assetTitleSnapshot: true, order: { select: { orderNo: true } } } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100
  });
  return records.map(serializeRevenue);
}

export async function getUploaderRevenueSummary(access: SessionAccess) {
  const profile = ensureUploader(access);
  const initialRecords = await getPrisma().revenueRecord.findMany({
    where: { uploaderProfileId: profile.id, recordType: "initial" },
    select: {
      assetId: true,
      uploaderAmountCents: true,
      status: true,
      createdAt: true,
      orderItem: { select: { assetTitleSnapshot: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
  const products = new Map<string, { assetId: string; assetTitle: string; purchaseCount: number; purchaseRevenueCents: number }>();
  for (const record of initialRecords) {
    if (record.status === "reversed") continue;
    const existing = products.get(record.assetId) ?? {
      assetId: record.assetId,
      assetTitle: record.orderItem.assetTitleSnapshot,
      purchaseCount: 0,
      purchaseRevenueCents: 0
    };
    existing.purchaseCount += 1;
    existing.purchaseRevenueCents += record.uploaderAmountCents;
    products.set(record.assetId, existing);
  }
  const productSales = [...products.values()].sort((left, right) =>
    right.purchaseCount - left.purchaseCount
    || right.purchaseRevenueCents - left.purchaseRevenueCents
    || left.assetTitle.localeCompare(right.assetTitle, "zh-CN")
  );
  return {
    totalPurchaseCount: productSales.reduce((sum, product) => sum + product.purchaseCount, 0),
    totalPurchaseRevenueCents: productSales.reduce((sum, product) => sum + product.purchaseRevenueCents, 0),
    products: productSales,
    currency: "CNY" as const
  };
}

export async function listAdminRevenue(access: SessionAccess) {
  const records = await getPrisma().revenueRecord.findMany({
    include: {
      uploaderProfile: { select: { displayName: true } },
      orderItem: { select: { assetTitleSnapshot: true, order: { select: { orderNo: true } } } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200
  });
  const canSeeFinancialDetail = access.adminRoles.includes("super_admin") || access.adminRoles.includes("finance");
  return records.map((record) => {
    const serialized = serializeRevenue(record);
    return canSeeFinancialDetail
      ? serialized
      : {
          id: serialized.id,
          recordType: serialized.recordType,
          assetTitle: serialized.assetTitle,
          uploaderDisplayName: serialized.uploaderDisplayName,
          uploaderAmountCents: serialized.uploaderAmountCents,
          currency: serialized.currency,
          status: serialized.status,
          createdAt: serialized.createdAt,
          orderNo: null,
          grossAmountCents: null,
          platformAmountCents: null,
          uploaderShareRate: null,
          platformShareRate: null,
          relatedRevenueRecordId: null
        };
  });
}

export async function getPlatformRevenueSummary() {
  const records = await getPrisma().revenueRecord.findMany({
    select: { grossAmountCents: true, uploaderAmountCents: true, platformAmountCents: true }
  });
  return {
    netGrossAmountCents: records.reduce((sum, record) => sum + record.grossAmountCents, 0),
    netUploaderAmountCents: records.reduce((sum, record) => sum + record.uploaderAmountCents, 0),
    netPlatformAmountCents: records.reduce((sum, record) => sum + record.platformAmountCents, 0),
    recordCount: records.length
  };
}

export async function revokeAuthorization(access: SessionAccess, authorizationId: string, reason: string, requestId: string) {
  if (!access.adminRoles.includes("super_admin")) {
    throw new ApiError(403, "FORBIDDEN", "只有超级管理员可以特殊撤销授权。");
  }
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 4 || trimmedReason.length > 500) {
    throw new ApiError(422, "VALIDATION_ERROR", "撤销原因需为 4-500 个字符。");
  }
  return getPrisma().$transaction(async (transaction) => {
    const authorization = await transaction.authorizationRecord.findUnique({ where: { id: authorizationId } });
    if (!authorization) throw new ApiError(404, "RESOURCE_NOT_FOUND", "授权记录不存在。");
    if (authorization.status === "revoked") return { id: authorization.id, status: authorization.status, idempotentReplay: true };
    const now = new Date();
    await transaction.authorizationRecord.update({ where: { id: authorization.id }, data: { status: "revoked", revokedAt: now, revokedByUserId: access.user.id, revokeReason: trimmedReason } });
    await transaction.downloadLink.updateMany({ where: { authorizationRecordId: authorization.id }, data: { status: "revoked" } });
    await reverseRevenueForOrderItem(transaction, authorization.orderItemId);
    await transaction.auditLog.create({ data: { actorUserId: access.user.id, action: "authorization.revoked", targetType: "authorization_record", targetId: authorization.id, requestId, metadata: { reason: trimmedReason } } });
    return { id: authorization.id, status: "revoked" as const, idempotentReplay: false };
  });
}
