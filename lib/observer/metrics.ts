import { Prisma, type AssetType, type SnapshotPeriodType } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export type ObserverPeriod = {
  periodType: SnapshotPeriodType;
  start: Date;
  end: Date;
};

const DAY_MS = 86_400_000;

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function validDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveObserverPeriod(searchParams: URLSearchParams, now = new Date()): ObserverPeriod {
  const periodType = searchParams.get("periodType") ?? "day";
  if (!(["day", "week", "month", "custom"] as const).includes(periodType as never)) {
    throw new ApiError(422, "VALIDATION_ERROR", "periodType 仅支持 day、week、month 或 custom。");
  }
  if (periodType === "custom") {
    const start = validDate(searchParams.get("startAt"));
    const end = validDate(searchParams.get("endAt"));
    if (!start || !end) throw new ApiError(422, "VALIDATION_ERROR", "自定义区间必须提供有效的 startAt 和 endAt。");
    if (end <= start) throw new ApiError(422, "VALIDATION_ERROR", "统计结束时间必须晚于开始时间。");
    const maximumEnd = new Date(start);
    maximumEnd.setUTCFullYear(maximumEnd.getUTCFullYear() + 1);
    if (end > maximumEnd) throw new ApiError(422, "VALIDATION_ERROR", "自定义统计区间不能超过一年。");
    return { periodType: "custom", start, end };
  }

  if (periodType === "month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { periodType, start, end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
  }
  const dayStart = startOfUtcDay(now);
  if (periodType === "week") {
    const daysSinceMonday = (dayStart.getUTCDay() + 6) % 7;
    const start = new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
    return { periodType, start, end: new Date(start.getTime() + 7 * DAY_MS) };
  }
  return { periodType: "day", start: dayStart, end: new Date(dayStart.getTime() + DAY_MS) };
}

function range(start: Date, end: Date) {
  return { gte: start, lt: end };
}

async function buildSnapshot(transaction: Prisma.TransactionClient, period: ObserverPeriod) {
  const dateRange = range(period.start, period.end);
  const assetTypes = ["person", "object", "scene"] as const satisfies readonly AssetType[];
  const totalUploadedAssets = await transaction.asset.count({ where: { createdAt: { lt: period.end }, deletedAt: null } });
  const newUploadedAssets = await transaction.asset.count({ where: { createdAt: dateRange, deletedAt: null } });
  const listedAssets = await transaction.asset.count({ where: { listedAt: dateRange, deletedAt: null } });
  const delistedAssets = await transaction.asset.count({ where: { listingStatus: "delisted", updatedAt: dateRange, deletedAt: null } });
  const pendingReviewAssets = await transaction.asset.count({ where: { reviewStatus: "pending_review", submittedAt: dateRange, deletedAt: null } });
  const certifiedAssets = await transaction.certificationRecord.count({ where: { status: "certified", verifiedAt: dateRange } });
  const certificationExceptionAssets = await transaction.certificationRecord.count({ where: { status: "exception", updatedAt: dateRange } });
  const totalDownloads = await transaction.download.count({ where: { downloadedAt: dateRange } });
  const paidOrderAggregate = await transaction.order.aggregate({ where: { paidAt: dateRange }, _count: { id: true }, _sum: { totalAmountCents: true } });
  const successfulRefundAggregate = await transaction.refund.aggregate({ where: { purpose: "asset_purchase", status: "success", processedAt: dateRange }, _sum: { amountCents: true } });
  const refundedOrders = await transaction.refund.findMany({ where: { purpose: "asset_purchase", status: "success", processedAt: dateRange, orderId: { not: null } }, distinct: ["orderId"], select: { orderId: true } });
  const authorizationRecordCount = await transaction.authorizationRecord.count({ where: { grantedAt: dateRange } });
  const purchaseCount = await transaction.revenueRecord.count({ where: { recordType: "initial", status: { not: "reversed" }, createdAt: dateRange } });
  const revenueAggregate = await transaction.revenueRecord.aggregate({ where: { createdAt: dateRange }, _sum: { grossAmountCents: true, uploaderAmountCents: true, platformAmountCents: true } });
  const transactionRevenuePaidAggregate = await transaction.revenueRecord.aggregate({ where: { recordType: "initial", createdAt: dateRange }, _sum: { grossAmountCents: true } });
  const transactionRevenueRefundAggregate = await transaction.revenueRecord.aggregate({ where: { recordType: "reversal", createdAt: dateRange }, _sum: { grossAmountCents: true } });
  const uploadFeePaidAggregate = await transaction.payment.aggregate({ where: { purpose: "certification_fee", status: { in: ["success", "refunded"] }, paidAt: dateRange }, _sum: { amountCents: true } });
  const uploadFeeRefundAggregate = await transaction.refund.aggregate({ where: { purpose: "certification_fee", status: "success", processedAt: dateRange }, _sum: { amountCents: true } });

  const typeMetrics: Array<{ assetType: AssetType; uploadedAssets: number; listedAssets: number; certifiedAssets: number; purchaseCount: number; transactionRevenueCents: number; downloads: number }> = [];
  const typeCounts: Array<{ assetType: AssetType; count: number }> = [];
  for (const assetType of assetTypes) {
    typeMetrics.push({
      assetType,
      uploadedAssets: await transaction.asset.count({ where: { assetType, createdAt: dateRange, deletedAt: null } }),
      listedAssets: await transaction.asset.count({ where: { assetType, listedAt: dateRange, deletedAt: null } }),
      certifiedAssets: await transaction.certificationRecord.count({ where: { status: "certified", verifiedAt: dateRange, asset: { assetType } } }),
      purchaseCount: await transaction.revenueRecord.count({ where: { recordType: "initial", status: { not: "reversed" }, createdAt: dateRange, orderItem: { assetTypeSnapshot: assetType } } }),
      transactionRevenueCents: (await transaction.revenueRecord.aggregate({ where: { createdAt: dateRange, orderItem: { assetTypeSnapshot: assetType } }, _sum: { grossAmountCents: true } }))._sum.grossAmountCents ?? 0,
      downloads: await transaction.download.count({ where: { downloadedAt: dateRange, asset: { assetType } } })
    });
    typeCounts.push({ assetType, count: await transaction.asset.count({ where: { assetType, createdAt: { lt: period.end }, deletedAt: null } }) });
  }

  const paidAmount = paidOrderAggregate._sum.totalAmountCents ?? 0;
  const refundAmount = successfulRefundAggregate._sum.amountCents ?? 0;
  const transactionRevenuePaidCents = transactionRevenuePaidAggregate._sum.grossAmountCents ?? 0;
  const transactionRevenueRefundCents = Math.max(0, -(transactionRevenueRefundAggregate._sum.grossAmountCents ?? 0));
  const uploadFeePaidCents = uploadFeePaidAggregate._sum.amountCents ?? 0;
  const uploadFeeRefundCents = uploadFeeRefundAggregate._sum.amountCents ?? 0;
  const data = {
    totalUploadedAssets,
    newUploadedAssets,
    listedAssets,
    delistedAssets,
    pendingReviewAssets,
    certifiedAssets,
    certificationExceptionAssets,
    personAssetCount: typeCounts.find((item) => item.assetType === "person")?.count ?? 0,
    objectAssetCount: typeCounts.find((item) => item.assetType === "object")?.count ?? 0,
    sceneAssetCount: typeCounts.find((item) => item.assetType === "scene")?.count ?? 0,
    totalDownloads,
    paidDownloads: totalDownloads,
    paidOrderCount: paidOrderAggregate._count.id,
    refundedOrderCount: refundedOrders.length,
    authorizationRecordCount,
    purchaseCount,
    grossOrderAmountCents: paidAmount,
    paidOrderAmountCents: paidAmount,
    refundAmountCents: refundAmount,
    netRevenueCents: revenueAggregate._sum.grossAmountCents ?? paidAmount - refundAmount,
    platformShareAmountCents: revenueAggregate._sum.platformAmountCents ?? 0,
    uploaderShareAmountCents: revenueAggregate._sum.uploaderAmountCents ?? 0,
    transactionRevenuePaidCents,
    transactionRevenueRefundCents,
    uploadFeePaidCents,
    uploadFeeRefundCents,
    uploadRevenueCents: uploadFeePaidCents - uploadFeeRefundCents
  };
  const snapshot = await transaction.platformMetricSnapshot.upsert({
    where: { periodType_periodStart_periodEnd: { periodType: period.periodType, periodStart: period.start, periodEnd: period.end } },
    update: data,
    create: { periodType: period.periodType, periodStart: period.start, periodEnd: period.end, ...data }
  });
  for (const metric of typeMetrics) {
    await transaction.platformAssetTypeMetricSnapshot.upsert({
      where: { metricSnapshotId_assetType: { metricSnapshotId: snapshot.id, assetType: metric.assetType } },
      update: metric,
      create: { metricSnapshotId: snapshot.id, ...metric }
    });
  }
  return snapshot;
}

async function snapshotFor(access: SessionAccess & { observerProfile: NonNullable<SessionAccess["observerProfile"]> }, period: ObserverPeriod) {
  return getPrisma().$transaction(async (transaction) => {
    const snapshot = await buildSnapshot(transaction, period);
    await transaction.observerShareRecord.upsert({
      where: { observerProfileId_metricSnapshotId: { observerProfileId: access.observerProfile.id, metricSnapshotId: snapshot.id } },
      update: { periodStart: period.start, periodEnd: period.end, shareBaseAmountCents: snapshot.netRevenueCents, shareRate: new Prisma.Decimal(0), expectedShareAmountCents: 0, settledShareAmountCents: 0, pendingShareAmountCents: 0 },
      create: { observerProfileId: access.observerProfile.id, metricSnapshotId: snapshot.id, periodStart: period.start, periodEnd: period.end, shareBaseAmountCents: snapshot.netRevenueCents, shareRate: new Prisma.Decimal(0) }
    });
    return transaction.platformMetricSnapshot.findUniqueOrThrow({
      where: { id: snapshot.id },
      include: {
        assetTypeSnapshots: { orderBy: { assetType: "asc" } },
        observerShareRecords: { where: { observerProfileId: access.observerProfile.id } }
      }
    });
  });
}

function periodView(period: ObserverPeriod) {
  return { periodType: period.periodType, startAt: period.start.toISOString(), endAt: period.end.toISOString() };
}

function moneyView(snapshot: Awaited<ReturnType<typeof snapshotFor>>) {
  return {
    grossOrderAmountCents: snapshot.grossOrderAmountCents,
    paidOrderAmountCents: snapshot.paidOrderAmountCents,
    refundAmountCents: snapshot.refundAmountCents,
    netRevenueCents: snapshot.netRevenueCents,
    platformShareAmountCents: snapshot.platformShareAmountCents,
    uploaderShareAmountCents: snapshot.uploaderShareAmountCents,
    transactionRevenuePaidCents: snapshot.transactionRevenuePaidCents,
    transactionRevenueRefundCents: snapshot.transactionRevenueRefundCents,
    transactionRevenueCents: snapshot.netRevenueCents,
    uploadFeePaidCents: snapshot.uploadFeePaidCents,
    uploadFeeRefundCents: snapshot.uploadFeeRefundCents,
    uploadRevenueCents: snapshot.uploadRevenueCents,
    currency: "CNY" as const
  };
}

function shareView(snapshot: Awaited<ReturnType<typeof snapshotFor>>) {
  const record = snapshot.observerShareRecords[0];
  return {
    shareBaseAmountCents: record?.shareBaseAmountCents ?? snapshot.netRevenueCents,
    shareRate: 0,
    expectedShareAmountCents: 0,
    settledShareAmountCents: 0,
    pendingShareAmountCents: 0,
    status: record?.status ?? "pending_confirm"
  };
}

export async function getObserverDashboard(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return {
    period: periodView(period),
    partner: { name: access.observerProfile.partnerName },
    metrics: {
      uploadedAssets: snapshot.newUploadedAssets,
      certifiedListedAssets: snapshot.listedAssets,
      purchases: snapshot.purchaseCount,
      downloads: snapshot.totalDownloads,
      paidOrders: snapshot.paidOrderCount
    },
    revenue: moneyView(snapshot),
    share: shareView(snapshot)
  };
}

export async function getObserverPlatformMetrics(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return {
    period: periodView(period),
    metrics: {
      totalUploadedAssets: snapshot.totalUploadedAssets,
      newUploadedAssets: snapshot.newUploadedAssets,
      listedAssets: snapshot.listedAssets,
      delistedAssets: snapshot.delistedAssets,
      pendingReviewAssets: snapshot.pendingReviewAssets,
      certifiedAssets: snapshot.certifiedAssets,
      certificationExceptionAssets: snapshot.certificationExceptionAssets,
      totalDownloads: snapshot.totalDownloads,
      paidDownloads: snapshot.paidDownloads,
      paidOrderCount: snapshot.paidOrderCount,
      refundedOrderCount: snapshot.refundedOrderCount,
      authorizationRecordCount: snapshot.authorizationRecordCount,
      purchaseCount: snapshot.purchaseCount
    },
    revenue: moneyView(snapshot)
  };
}

export async function getObserverAssetsSummary(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return {
    period: periodView(period),
    assetTypes: snapshot.assetTypeSnapshots.map((item) => ({
      assetType: item.assetType,
      uploadedAssets: item.uploadedAssets,
      certifiedListedAssets: item.listedAssets,
      purchases: item.purchaseCount,
      transactionRevenueCents: item.transactionRevenueCents,
      downloads: item.downloads
    }))
  };
}

export async function getObserverDownloadsSummary(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return {
    period: periodView(period),
    totalDownloads: snapshot.totalDownloads,
    paidDownloads: snapshot.paidDownloads,
    byAssetType: snapshot.assetTypeSnapshots.map((item) => ({ assetType: item.assetType, downloads: item.downloads }))
  };
}

export async function getObserverRevenueSummary(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return { period: periodView(period), ...moneyView(snapshot) };
}

export async function getObserverShareRecords(access: Parameters<typeof snapshotFor>[0], period: ObserverPeriod) {
  const snapshot = await snapshotFor(access, period);
  return { period: periodView(period), records: [{ id: snapshot.observerShareRecords[0]?.id, ...shareView(snapshot) }] };
}
