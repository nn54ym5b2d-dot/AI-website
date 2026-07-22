import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import type { SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getSystemSettings, settingsSnapshot } from "@/lib/settings/service";
import { reverseRevenueForOrderItem } from "@/lib/revenue/service";
import {
  LOCAL_TEST_MERCHANT_ID,
  type LocalTestEvent,
  verifyLocalTestEvent
} from "@/lib/transactions/test-provider";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function businessNo(prefix: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function maskTradeNo(value: string | null) {
  if (!value) return null;
  return value.length <= 8 ? "••••" : `${value.slice(0, 5)}••••${value.slice(-4)}`;
}

function ensureBuyer(access: SessionAccess) {
  if (!access.roles.includes("buyer")) {
    throw new ApiError(403, "FORBIDDEN", "当前账号没有购买权限。");
  }
}

function originalFileName(metadata: Prisma.JsonValue, index: number, mimeType: string) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.originalFileName === "string") {
    return metadata.originalFileName;
  }
  const extension = mimeType === "image/svg+xml" ? "svg" : mimeType === "image/png" ? "png" : "bin";
  return `original-${String(index + 1).padStart(2, "0")}.${extension}`;
}

type PaymentView = {
  id: string; paymentNo: string; purpose: "asset_purchase" | "certification_fee"; provider: "wechat_pay" | "alipay"; providerMode: string;
  amountCents: number; currency: string; status: string; providerTradeNo: string | null;
  paidAt: Date | null; createdAt: Date;
};

type OrderItemView = {
  id: string; assetId: string; assetTitleSnapshot: string; assetTypeSnapshot: string;
  certificationStatusSnapshot: string; priceCents: number; currency: string;
  authorization?: { status: string } | null;
};

type OrderView = {
  id: string; orderNo: string; status: string; totalAmountCents: number; currency: string;
  paidAt: Date | null; cancelledAt: Date | null; createdAt: Date;
  items?: OrderItemView[]; payments?: PaymentView[];
};

function serializeOrder(order: OrderView) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    totalAmountCents: order.totalAmountCents,
    currency: order.currency,
    paidAt: order.paidAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      assetId: item.assetId,
      title: item.assetTitleSnapshot,
      assetType: item.assetTypeSnapshot,
      certificationStatus: item.certificationStatusSnapshot,
      priceCents: item.priceCents,
      currency: item.currency,
      authorizationStatus: item.authorization?.status ?? null
    })),
    payments: (order.payments ?? []).map(serializePayment)
  };
}

function serializePayment(payment: PaymentView) {
  return {
    id: payment.id,
    paymentNo: payment.paymentNo,
    purpose: payment.purpose,
    provider: payment.provider,
    providerMode: payment.providerMode,
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: payment.status,
    providerTradeNo: maskTradeNo(payment.providerTradeNo),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString()
  };
}

const orderInclude = {
  items: { include: { authorization: { select: { status: true } } }, orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { createdAt: "desc" as const } }
};

export async function addAssetsToDraftOrder(
  access: SessionAccess,
  assetIds: string[],
  idempotencyKey: string
) {
  ensureBuyer(access);
  if (assetIds.length < 1 || assetIds.length > 50 || new Set(assetIds).size !== assetIds.length) {
    throw new ApiError(422, "VALIDATION_ERROR", "待购素材必须为 1-50 个且不能重复。");
  }
  const endpoint = "POST:/api/v1/orders";
  const idempotencyKeyHash = hash(idempotencyKey);
  const requestHash = hash(JSON.stringify(assetIds));

  return getPrisma().$transaction(async (transaction) => {
    const replay = await transaction.idempotencyRecord.findUnique({
      where: { userId_endpoint_idempotencyKeyHash: { userId: access.user.id, endpoint, idempotencyKeyHash } }
    });
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "同一幂等键不能用于不同待购内容。");
      }
      const existing = await transaction.order.findFirst({ where: { id: replay.responseResourceId, buyerUserId: access.user.id }, include: orderInclude });
      if (!existing) throw new ApiError(409, "RESOURCE_CONFLICT", "幂等记录关联订单已失效。");
      return { ...serializeOrder(existing), idempotentReplay: true };
    }

    const activeAuthorizations = await transaction.authorizationRecord.findMany({
      where: { buyerUserId: access.user.id, assetId: { in: assetIds }, status: "active" },
      select: { assetId: true }
    });
    if (activeAuthorizations.length) {
      throw new ApiError(409, "ALREADY_AUTHORIZED", "待购清单中包含已拥有有效授权的素材。", {
        assetIds: activeAuthorizations.map((record) => record.assetId)
      });
    }
    const assets = await transaction.asset.findMany({
      where: {
        id: { in: assetIds },
        deletedAt: null,
        reviewStatus: "approved",
        listingStatus: "listed",
        certificationStatus: "certified",
        files: { some: { fileType: "preview", accessScope: "public_preview", deletedAt: null } }
      },
      select: { id: true, title: true, assetType: true, certificationStatus: true, uploaderProfileId: true }
    });
    if (assets.length !== assetIds.length) {
      throw new ApiError(409, "ASSET_NOT_PURCHASABLE", "部分素材已下架、未认证或当前不可购买。");
    }
    const settings = await getSystemSettings(transaction);
    let order = await transaction.order.findFirst({
      where: { buyerUserId: access.user.id, status: "pending_payment", payments: { none: {} } },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });
    const existingAssetIds = new Set(order?.items.map((item) => item.assetId) ?? []);
    const newAssets = assets.filter((asset) => !existingAssetIds.has(asset.id));
    if (!order) {
      order = await transaction.order.create({
        data: {
          orderNo: businessNo("ORD"),
          buyerUserId: access.user.id,
          totalAmountCents: 1,
          settingsSnapshot: settingsSnapshot(settings)
        },
        include: { items: true }
      });
    }
    if (newAssets.length) {
      await transaction.orderItem.createMany({
        data: newAssets.map((asset) => ({
          orderId: order!.id,
          assetId: asset.id,
          uploaderProfileId: asset.uploaderProfileId,
          assetTitleSnapshot: asset.title,
          assetTypeSnapshot: asset.assetType,
          certificationStatusSnapshot: asset.certificationStatus,
          priceCents: settings.assetPriceRules[asset.assetType],
          currency: "CNY"
        }))
      });
    }
    const total = await transaction.orderItem.aggregate({ where: { orderId: order.id }, _sum: { priceCents: true } });
    const updated = await transaction.order.update({
      where: { id: order.id },
      data: { totalAmountCents: total._sum.priceCents ?? 0 },
      include: orderInclude
    });
    await transaction.idempotencyRecord.create({
      data: {
        userId: access.user.id,
        endpoint,
        idempotencyKeyHash,
        requestHash,
        responseResourceId: updated.id,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS)
      }
    });
    return { ...serializeOrder(updated), idempotentReplay: false };
  });
}

export async function listBuyerOrders(access: SessionAccess) {
  ensureBuyer(access);
  const orders = await getPrisma().order.findMany({
    where: { buyerUserId: access.user.id },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return orders.map(serializeOrder);
}

export async function getBuyerOrder(access: SessionAccess, orderId: string) {
  ensureBuyer(access);
  const order = await getPrisma().order.findFirst({ where: { id: orderId, buyerUserId: access.user.id }, include: orderInclude });
  if (!order) throw new ApiError(404, "RESOURCE_NOT_FOUND", "订单不存在。");
  return serializeOrder(order);
}

export async function cancelBuyerOrder(access: SessionAccess, orderId: string) {
  ensureBuyer(access);
  const updated = await getPrisma().order.updateMany({
    where: { id: orderId, buyerUserId: access.user.id, status: "pending_payment", payments: { none: { status: "success" } } },
    data: { status: "cancelled", cancelledAt: new Date() }
  });
  if (updated.count !== 1) throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前订单不能取消。");
  return getBuyerOrder(access, orderId);
}

async function createPaymentRecord(input: {
  access: SessionAccess;
  purpose: "asset_purchase" | "certification_fee";
  provider: "wechat_pay" | "alipay";
  orderId?: string;
  certificationFeeChargeId?: string;
  amountCents: number;
  idempotencyKey: string;
}) {
  const endpoint = input.purpose === "asset_purchase" ? `POST:/api/v1/orders/${input.orderId}/payments` : `POST:/api/v1/certification-fee-charges/${input.certificationFeeChargeId}/payments`;
  const keyHash = hash(input.idempotencyKey);
  const requestHash = hash(JSON.stringify({ provider: input.provider }));
  return getPrisma().$transaction(async (transaction) => {
    const replay = await transaction.idempotencyRecord.findUnique({
      where: { userId_endpoint_idempotencyKeyHash: { userId: input.access.user.id, endpoint, idempotencyKeyHash: keyHash } }
    });
    if (replay) {
      if (replay.requestHash !== requestHash) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "同一幂等键不能更换支付方式。");
      const existing = await transaction.payment.findUnique({ where: { id: replay.responseResourceId } });
      if (!existing) throw new ApiError(409, "RESOURCE_CONFLICT", "幂等记录关联支付已失效。");
      return { ...serializePayment(existing), idempotentReplay: true, paymentAction: { type: "local_test_confirm", paymentId: existing.id } };
    }
    const alreadyPaid = await transaction.payment.findFirst({
      where: {
        ...(input.orderId ? { orderId: input.orderId } : { certificationFeeChargeId: input.certificationFeeChargeId }),
        status: { in: ["success", "refunded"] }
      }
    });
    if (alreadyPaid) throw new ApiError(409, "PAYMENT_ALREADY_SUCCESS", "该业务单已支付成功。");
    const payment = await transaction.payment.create({
      data: {
        paymentNo: businessNo("PAY"),
        purpose: input.purpose,
        orderId: input.orderId,
        certificationFeeChargeId: input.certificationFeeChargeId,
        payerUserId: input.access.user.id,
        provider: input.provider,
        providerMode: "local_test",
        merchantId: LOCAL_TEST_MERCHANT_ID,
        amountCents: input.amountCents,
        currency: "CNY"
      }
    });
    await transaction.idempotencyRecord.create({
      data: { userId: input.access.user.id, endpoint, idempotencyKeyHash: keyHash, requestHash, responseResourceId: payment.id, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) }
    });
    return { ...serializePayment(payment), idempotentReplay: false, paymentAction: { type: "local_test_confirm", paymentId: payment.id } };
  });
}

export async function createOrderPayment(access: SessionAccess, orderId: string, provider: "wechat_pay" | "alipay", idempotencyKey: string) {
  ensureBuyer(access);
  const order = await getPrisma().order.findFirst({ where: { id: orderId, buyerUserId: access.user.id } });
  if (!order) throw new ApiError(404, "RESOURCE_NOT_FOUND", "订单不存在。");
  if (order.status !== "pending_payment") throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前订单不能发起支付。");
  return createPaymentRecord({ access, purpose: "asset_purchase", provider, orderId, amountCents: order.totalAmountCents, idempotencyKey });
}

export async function createCertificationFeePayment(access: SessionAccess, chargeId: string, provider: "wechat_pay" | "alipay", idempotencyKey: string) {
  const charge = await getPrisma().certificationFeeCharge.findFirst({ where: { id: chargeId, uploaderUserId: access.user.id }, include: { asset: true } });
  if (!charge) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证上传费记录不存在。");
  if (charge.status !== "pending" || charge.asset.certificationStatus !== "pending_payment") {
    throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前认证上传费不能发起支付。");
  }
  return createPaymentRecord({ access, purpose: "certification_fee", provider, certificationFeeChargeId: chargeId, amountCents: charge.amountCents, idempotencyKey });
}

export async function getCertificationFeeCheckout(access: SessionAccess, chargeId: string) {
  const charge = await getPrisma().certificationFeeCharge.findFirst({
    where: { id: chargeId, uploaderUserId: access.user.id },
    include: { asset: { select: { id: true, title: true, assetType: true, reviewStatus: true, certificationStatus: true } }, payments: { orderBy: { createdAt: "desc" }, take: 10 } }
  });
  if (!charge) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证上传费记录不存在。");
  return { id: charge.id, amountCents: charge.amountCents, currency: charge.currency, status: charge.status, paidAt: charge.paidAt?.toISOString() ?? null, asset: charge.asset, payments: charge.payments.map(serializePayment) };
}

export async function getOwnedPayment(access: SessionAccess, paymentId: string) {
  const payment = await getPrisma().payment.findFirst({ where: { id: paymentId, payerUserId: access.user.id } });
  if (!payment) throw new ApiError(404, "RESOURCE_NOT_FOUND", "支付记录不存在。");
  return serializePayment(payment);
}

function snapshotNumber(snapshot: unknown, key: string, fallback: number) {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const value = (snapshot as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

async function processPaymentSucceeded(event: LocalTestEvent, rawBody: string) {
  return getPrisma().$transaction(async (transaction) => {
    const duplicate = await transaction.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } } });
    if (duplicate) return { acknowledged: true, idempotentReplay: true };
    const payment = await transaction.payment.findUnique({
      where: { paymentNo: event.resourceNo },
      include: {
        order: { include: { items: { include: { asset: { include: { files: { where: { fileType: "original", deletedAt: null }, orderBy: { createdAt: "asc" } } } } } } } },
        certificationFeeCharge: { include: { asset: true } }
      }
    });
    if (!payment || payment.provider !== event.provider || payment.merchantId !== event.merchantId || payment.currency !== event.currency || payment.amountCents !== event.amountCents) {
      throw new ApiError(409, "PAYMENT_AMOUNT_MISMATCH", "支付回调金额、商户、币种或业务单不匹配。");
    }
    if (payment.status === "success" || payment.status === "refunded") {
      await transaction.webhookEvent.create({ data: { provider: event.provider, providerEventId: event.eventId, eventType: event.eventType, paymentId: payment.id, payloadHash: hash(rawBody) } });
      return { acknowledged: true, idempotentReplay: true };
    }
    if (payment.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前支付状态不能确认成功。");
    const now = new Date();
    await transaction.payment.update({ where: { id: payment.id }, data: { status: "success", providerTradeNo: event.providerTradeNo, paidAt: now, providerPayloadSummary: { eventId: event.eventId, eventType: event.eventType, payloadHash: hash(rawBody) } } });

    if (payment.purpose === "asset_purchase" && payment.order) {
      const license = await transaction.legalDocumentVersion.findFirst({ where: { documentType: "commercial_license", effectiveAt: { lte: now }, OR: [{ retiredAt: null }, { retiredAt: { gt: now } }] }, orderBy: { effectiveAt: "desc" } });
      if (!license) throw new ApiError(409, "RESOURCE_CONFLICT", "当前商业授权文本不可用。");
      const fallbackSettings = await getSystemSettings(transaction);
      const eligibilityDays = snapshotNumber(payment.order.settingsSnapshot, "downloadEligibilityDays", fallbackSettings.downloadEligibilityDays);
      const uploaderRate = snapshotNumber(payment.order.settingsSnapshot, "uploaderShareRate", Number(fallbackSettings.uploaderShareRate));
      const platformRate = snapshotNumber(payment.order.settingsSnapshot, "platformShareRate", Number(fallbackSettings.platformShareRate));
      for (const item of payment.order.items) {
        const authorization = await transaction.authorizationRecord.create({
          data: {
            buyerUserId: payment.payerUserId,
            orderId: payment.order.id,
            orderItemId: item.id,
            assetId: item.assetId,
            licenseVersion: license.version,
            licenseTextSnapshot: license.content,
            certificationStatusSnapshot: item.certificationStatusSnapshot,
            assetFileManifestSnapshot: item.asset.files.map((file, index) => ({ id: file.id, sha256: file.fileHash, sizeBytes: file.fileSizeBytes.toString(), mimeType: file.mimeType, originalFileName: originalFileName(file.metadata, index, file.mimeType) }))
          }
        });
        await transaction.downloadLink.create({ data: { authorizationRecordId: authorization.id, requestedByUserId: payment.payerUserId, eligibilityDaysSnapshot: eligibilityDays, expiresAt: new Date(now.getTime() + eligibilityDays * 86400000), bundleStatus: "pending", status: "active" } });
        const uploaderAmountCents = Math.floor(item.priceCents * uploaderRate);
        await transaction.revenueRecord.create({ data: { orderItemId: item.id, recordType: "initial", assetId: item.assetId, uploaderProfileId: item.uploaderProfileId, grossAmountCents: item.priceCents, uploaderAmountCents, platformAmountCents: item.priceCents - uploaderAmountCents, uploaderShareRate: new Prisma.Decimal(uploaderRate), platformShareRate: new Prisma.Decimal(platformRate), status: "recorded" } });
      }
      await transaction.order.update({ where: { id: payment.order.id }, data: { status: "paid", paidAt: now } });
    } else if (payment.purpose === "certification_fee" && payment.certificationFeeCharge) {
      await transaction.certificationFeeCharge.update({ where: { id: payment.certificationFeeCharge.id }, data: { status: "success", paidAt: now } });
      await transaction.asset.update({ where: { id: payment.certificationFeeCharge.assetId }, data: { reviewStatus: "pending_review", certificationStatus: "pending_review" } });
    } else {
      throw new ApiError(409, "RESOURCE_CONFLICT", "支付用途与业务关联不完整。");
    }
    await transaction.webhookEvent.create({ data: { provider: event.provider, providerEventId: event.eventId, eventType: event.eventType, paymentId: payment.id, payloadHash: hash(rawBody) } });
    return { acknowledged: true, idempotentReplay: false };
  });
}

async function processRefundSucceeded(event: LocalTestEvent, rawBody: string) {
  return getPrisma().$transaction(async (transaction) => {
    const duplicate = await transaction.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } } });
    if (duplicate) return { acknowledged: true, idempotentReplay: true };
    const refund = await transaction.refund.findUnique({
      where: { refundNo: event.resourceNo },
      include: { payment: true, items: { include: { orderItem: { include: { authorization: { include: { downloadLinks: true } }, revenueRecords: true } } } }, certificationRefundRequest: true }
    });
    if (!refund || refund.payment.provider !== event.provider || refund.payment.merchantId !== event.merchantId || refund.currency !== event.currency || refund.amountCents !== event.amountCents) {
      throw new ApiError(409, "PAYMENT_AMOUNT_MISMATCH", "退款回调金额、商户、币种或业务单不匹配。");
    }
    if (refund.status === "success") {
      await transaction.webhookEvent.create({ data: { provider: event.provider, providerEventId: event.eventId, eventType: event.eventType, refundId: refund.id, payloadHash: hash(rawBody) } });
      return { acknowledged: true, idempotentReplay: true };
    }
    if (refund.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前退款状态不能确认成功。");
    const now = new Date();
    await transaction.refund.update({ where: { id: refund.id }, data: { status: "success", providerRefundNo: event.providerTradeNo, processedAt: now } });
    if (refund.purpose === "asset_purchase" && refund.orderId) {
      for (const refundItem of refund.items) {
        const authorization = refundItem.orderItem.authorization;
        if (authorization) {
          await transaction.authorizationRecord.update({ where: { id: authorization.id }, data: { status: "revoked", revokedAt: now, revokeReason: `订单明细退款：${refund.refundNo}` } });
          await transaction.downloadLink.updateMany({ where: { authorizationRecordId: authorization.id }, data: { status: "revoked" } });
        }
        await reverseRevenueForOrderItem(transaction, refundItem.orderItemId);
      }
      const orderItemCount = await transaction.orderItem.count({ where: { orderId: refund.orderId } });
      const refundedItemCount = await transaction.refundItem.count({ where: { orderItem: { orderId: refund.orderId }, refund: { status: "success" } } });
      const fullyRefunded = refundedItemCount >= orderItemCount;
      await transaction.order.update({ where: { id: refund.orderId }, data: { status: fullyRefunded ? "refunded" : "partial_refunded" } });
      if (fullyRefunded) await transaction.payment.update({ where: { id: refund.paymentId }, data: { status: "refunded" } });
    } else if (refund.purpose === "certification_fee" && refund.certificationFeeChargeId) {
      await transaction.certificationFeeCharge.update({ where: { id: refund.certificationFeeChargeId }, data: { status: "refunded" } });
      await transaction.payment.update({ where: { id: refund.paymentId }, data: { status: "refunded" } });
      if (refund.certificationRefundRequestId) await transaction.certificationRefundRequest.update({ where: { id: refund.certificationRefundRequestId }, data: { status: "success" } });
    }
    await transaction.webhookEvent.create({ data: { provider: event.provider, providerEventId: event.eventId, eventType: event.eventType, refundId: refund.id, payloadHash: hash(rawBody) } });
    return { acknowledged: true, idempotentReplay: false };
  });
}

export async function processLocalTestWebhook(rawBody: string, signature: string | null) {
  const event = verifyLocalTestEvent(rawBody, signature);
  return event.eventType === "payment.succeeded" ? processPaymentSucceeded(event, rawBody) : processRefundSucceeded(event, rawBody);
}

export async function listBuyerAuthorizations(access: SessionAccess) {
  ensureBuyer(access);
  const records = await getPrisma().authorizationRecord.findMany({
    where: { buyerUserId: access.user.id },
    include: { order: { select: { orderNo: true } }, orderItem: { select: { assetTitleSnapshot: true, priceCents: true } }, downloadLinks: true },
    orderBy: { grantedAt: "desc" },
    take: 100
  });
  return records.map((record) => ({ id: record.id, assetId: record.assetId, assetTitle: record.orderItem.assetTitleSnapshot, orderNo: record.order.orderNo, priceCents: record.orderItem.priceCents, licenseVersion: record.licenseVersion, status: record.status, grantedAt: record.grantedAt.toISOString(), revokedAt: record.revokedAt?.toISOString() ?? null, downloadEligibility: record.downloadLinks[0] ? { status: record.downloadLinks[0].status, bundleStatus: record.downloadLinks[0].bundleStatus, expiresAt: record.downloadLinks[0].expiresAt.toISOString(), eligibilityDays: record.downloadLinks[0].eligibilityDaysSnapshot } : null }));
}

export async function listAdminOrders() {
  const orders = await getPrisma().order.findMany({ include: { buyer: { select: { displayName: true } }, ...orderInclude }, orderBy: { createdAt: "desc" }, take: 100 });
  return orders.map((order) => ({ ...serializeOrder(order), buyerDisplayName: order.buyer.displayName }));
}

export async function listAdminPayments() {
  const payments = await getPrisma().payment.findMany({ include: { payer: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return payments.map((payment) => ({ ...serializePayment(payment), payerDisplayName: payment.payer.displayName }));
}

export async function listAdminAuthorizations() {
  const records = await getPrisma().authorizationRecord.findMany({ include: { buyer: { select: { displayName: true } }, order: { select: { orderNo: true } }, orderItem: { select: { assetTitleSnapshot: true } } }, orderBy: { grantedAt: "desc" }, take: 100 });
  return records.map((record) => ({ id: record.id, buyerDisplayName: record.buyer.displayName, orderNo: record.order.orderNo, assetTitle: record.orderItem.assetTitleSnapshot, licenseVersion: record.licenseVersion, status: record.status, grantedAt: record.grantedAt.toISOString(), revokedAt: record.revokedAt?.toISOString() ?? null }));
}

export async function listAdminRefunds() {
  const [refunds, certificationRequests] = await Promise.all([
    getPrisma().refund.findMany({ include: { payment: { select: { provider: true, providerMode: true } }, items: { include: { orderItem: { select: { assetTitleSnapshot: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    getPrisma().certificationRefundRequest.findMany({ where: { refund: null }, include: { asset: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return {
    refunds: refunds.map((refund) => ({ id: refund.id, refundNo: refund.refundNo, purpose: refund.purpose, provider: refund.payment.provider, providerMode: refund.payment.providerMode, amountCents: refund.amountCents, currency: refund.currency, reason: refund.reason, status: refund.status, requestedAt: refund.requestedAt.toISOString(), items: refund.items.map((item) => ({ orderItemId: item.orderItemId, title: item.orderItem.assetTitleSnapshot, amountCents: item.amountCents })) })),
    certificationRequests: certificationRequests.map((request) => ({ id: request.id, assetId: request.assetId, assetTitle: request.asset.title, certificationFeeChargeId: request.certificationFeeChargeId, amountCents: request.amountCents, currency: request.currency, reason: request.reason, status: request.status, requestedAt: request.requestedAt.toISOString() }))
  };
}

export async function createAdminRefund(access: SessionAccess, input: { paymentId?: string; items?: Array<{ orderItemId: string; amountCents: number }>; certificationRefundRequestId?: string; reason: string }) {
  return getPrisma().$transaction(async (transaction) => {
    if (input.certificationRefundRequestId) {
      const request = await transaction.certificationRefundRequest.findUnique({ where: { id: input.certificationRefundRequestId }, include: { refund: true, certificationFeeCharge: { include: { payments: { where: { status: "success" }, orderBy: { paidAt: "desc" }, take: 1 } } } } });
      if (!request) throw new ApiError(404, "RESOURCE_NOT_FOUND", "认证费退款待办不存在。");
      if (request.refund || request.status !== "pending" || !request.certificationFeeCharge.payments[0]) throw new ApiError(409, "STATE_TRANSITION_INVALID", "该认证费退款待办当前不能处理。");
      const payment = request.certificationFeeCharge.payments[0];
      return transaction.refund.create({ data: { refundNo: businessNo("REF"), purpose: "certification_fee", paymentId: payment.id, certificationFeeChargeId: request.certificationFeeChargeId, certificationRefundRequestId: request.id, amountCents: request.amountCents, currency: request.currency, reason: request.reason, requestedByUserId: access.user.id } });
    }
    if (!input.paymentId || !input.items?.length || new Set(input.items.map((item) => item.orderItemId)).size !== input.items.length) {
      throw new ApiError(422, "VALIDATION_ERROR", "购买退款必须选择不重复的完整订单明细。");
    }
    const payment = await transaction.payment.findUnique({ where: { id: input.paymentId }, include: { order: { include: { items: true } } } });
    if (!payment?.order || payment.purpose !== "asset_purchase" || payment.status !== "success") throw new ApiError(409, "STATE_TRANSITION_INVALID", "该支付当前不能发起购买退款。");
    const byId = new Map(payment.order.items.map((item) => [item.id, item]));
    for (const item of input.items) {
      const orderItem = byId.get(item.orderItemId);
      if (!orderItem || item.amountCents !== orderItem.priceCents) throw new ApiError(422, "REFUND_AMOUNT_EXCEEDED", "退款金额必须等于所选订单明细的完整成交金额。");
    }
    const existing = await transaction.refundItem.findFirst({ where: { orderItemId: { in: input.items.map((item) => item.orderItemId) }, refund: { status: { in: ["pending", "success"] } } } });
    if (existing) throw new ApiError(409, "STATE_TRANSITION_INVALID", "部分订单明细已在退款中或已退款。");
    const amountCents = input.items.reduce((sum, item) => sum + item.amountCents, 0);
    return transaction.refund.create({ data: { refundNo: businessNo("REF"), purpose: "asset_purchase", paymentId: payment.id, orderId: payment.order.id, amountCents, reason: input.reason.trim(), requestedByUserId: access.user.id, items: { createMany: { data: input.items } } } });
  });
}

export async function updateRefundProcessing(refundId: string, action: "submit" | "retry" | "cancel") {
  const refund = await getPrisma().refund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!refund) throw new ApiError(404, "RESOURCE_NOT_FOUND", "退款记录不存在。");
  if (action === "cancel") {
    if (refund.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有待处理退款可以取消。");
    return getPrisma().refund.update({ where: { id: refundId }, data: { status: "cancelled" } });
  }
  if (action === "retry" && refund.status !== "failed") throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有失败退款可以重试。");
  if (action === "submit" && refund.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "只有待处理退款可以提交。");
  return getPrisma().refund.update({ where: { id: refundId }, data: { status: "pending" } });
}

export async function getRefundForTestConfirmation(refundId: string) {
  const refund = await getPrisma().refund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!refund) throw new ApiError(404, "RESOURCE_NOT_FOUND", "退款记录不存在。");
  if (refund.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前退款状态不能测试确认。");
  return { id: refund.id, refundNo: refund.refundNo, provider: refund.payment.provider, amountCents: refund.amountCents };
}

export async function getPaymentForTestConfirmation(access: SessionAccess, paymentId: string) {
  const payment = await getPrisma().payment.findFirst({ where: { id: paymentId, payerUserId: access.user.id } });
  if (!payment) throw new ApiError(404, "RESOURCE_NOT_FOUND", "支付记录不存在。");
  if (payment.status !== "pending") throw new ApiError(409, "STATE_TRANSITION_INVALID", "当前支付状态不能测试确认。");
  return payment;
}

export async function getTransactionMetrics() {
  const [orders, paidOrders, payments, pendingRefunds, authorizations, downloads, revenue] = await Promise.all([
    getPrisma().order.count(),
    getPrisma().order.count({ where: { status: { in: ["paid", "partial_refunded", "refunded"] } } }),
    getPrisma().payment.count({ where: { status: "success" } }),
    getPrisma().refund.count({ where: { status: "pending" } }),
    getPrisma().authorizationRecord.count({ where: { status: "active" } }),
    getPrisma().download.count(),
    getPrisma().revenueRecord.aggregate({ _sum: { platformAmountCents: true } })
  ]);
  return { orders, paidOrders, successfulPayments: payments, pendingRefunds, activeAuthorizations: authorizations, downloads, netPlatformRevenueCents: revenue._sum.platformAmountCents ?? 0 };
}
