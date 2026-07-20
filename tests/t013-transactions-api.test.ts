import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { POST as createOrder } from "../app/api/v1/orders/route.ts";
import { POST as createOrderPayment } from "../app/api/v1/orders/[orderId]/payments/route.ts";
import { POST as createCertificationPayment } from "../app/api/v1/certification-fee-charges/[chargeId]/payments/route.ts";
import { POST as paymentWebhook } from "../app/api/v1/webhooks/payments/local-test/route.ts";
import { POST as createRefund } from "../app/api/v1/admin/refunds/route.ts";
import { POST as refundTestConfirm } from "../app/api/v1/admin/refunds/[refundId]/test-confirm/route.ts";
import { createSession } from "../lib/auth/session.ts";
import { createLocalTestEvent, signLocalTestPayload } from "../lib/transactions/test-provider.ts";
import { getPrisma } from "../lib/db/prisma.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
type Envelope<T> = { data: T; error?: { code: string; message: string } };
async function body<T>(response: Response) { return await response.json() as Envelope<T>; }
async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id); const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(new Request(`${appUrl}/api/v1/auth/csrf`, { headers: { cookie } }));
  return { user, cookie, csrfToken: (await body<{ csrfToken: string }>(csrfResponse)).data.csrfToken };
}
function writeHeaders(session: { cookie: string; csrfToken: string }, extra: Record<string, string> = {}) { return { cookie: session.cookie, origin: appUrl, "x-csrf-token": session.csrfToken, ...extra }; }
function jsonRequest(path: string, value: unknown, headers: Record<string, string>) { return new Request(`${appUrl}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(value) }); }
function webhookRequest(rawBody: string, signature: string) { return new Request(`${appUrl}/api/v1/webhooks/payments/local-test`, { method: "POST", headers: { "content-type": "application/json", "x-yuansu-test-signature": signature }, body: rawBody }); }

test("T013 多素材订单、支付回调、授权与按完整明细退款保持幂等", { skip: !shouldRun }, async () => {
  const buyer = await sessionFor("buyer@example.test");
  const finance = await sessionFor("finance@example.test");
  const assetIds = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000003"];
  const createdResponse = await createOrder(jsonRequest("/api/v1/orders", { assetIds }, writeHeaders(buyer, { "idempotency-key": "t013-order-1" })));
  assert.equal(createdResponse.status, 201);
  const order = (await body<{ id: string; orderNo: string; totalAmountCents: number; items: Array<{ id: string; priceCents: number }> }>(createdResponse)).data;
  assert.equal(order.items.length, 2); assert.equal(order.totalAmountCents, order.items.reduce((sum, item) => sum + item.priceCents, 0));

  const paymentResponse = await createOrderPayment(jsonRequest(`/api/v1/orders/${order.id}/payments`, { provider: "wechat_pay" }, writeHeaders(buyer, { "idempotency-key": "t013-payment-1" })), { params: Promise.resolve({ orderId: order.id }) });
  assert.equal(paymentResponse.status, 201);
  const payment = (await body<{ id: string; paymentNo: string; amountCents: number; provider: "wechat_pay" }>(paymentResponse)).data;

  const invalidSignature = await paymentWebhook(webhookRequest("{}", "0".repeat(64)));
  assert.equal(invalidSignature.status, 401);
  const wrongFixture = createLocalTestEvent({ eventType: "payment.succeeded", provider: payment.provider, resourceNo: payment.paymentNo, amountCents: payment.amountCents + 1 });
  const wrongAmount = await paymentWebhook(webhookRequest(wrongFixture.rawBody, wrongFixture.signature));
  assert.equal(wrongAmount.status, 409);

  const fixture = createLocalTestEvent({ eventType: "payment.succeeded", provider: payment.provider, resourceNo: payment.paymentNo, amountCents: payment.amountCents });
  const confirmed = await paymentWebhook(webhookRequest(fixture.rawBody, fixture.signature));
  const repeated = await paymentWebhook(webhookRequest(fixture.rawBody, fixture.signature));
  assert.equal(confirmed.status, 200); assert.equal(repeated.status, 200);
  assert.equal(await getPrisma().authorizationRecord.count({ where: { orderId: order.id } }), 2);
  assert.equal(await getPrisma().downloadLink.count({ where: { authorizationRecord: { orderId: order.id } } }), 2);
  assert.equal(await getPrisma().revenueRecord.count({ where: { orderItem: { orderId: order.id }, recordType: "initial" } }), 2);
  assert.equal(await getPrisma().webhookEvent.count({ where: { providerEventId: fixture.event.eventId } }), 1);

  const duplicatePurchase = await createOrder(jsonRequest("/api/v1/orders", { assetIds: [assetIds[0]] }, writeHeaders(buyer, { "idempotency-key": "t013-order-duplicate" })));
  assert.equal(duplicatePurchase.status, 409);
  const wrongRefund = await createRefund(jsonRequest("/api/v1/admin/refunds", { paymentId: payment.id, items: [{ orderItemId: order.items[0].id, amountCents: order.items[0].priceCents - 1 }], reason: "金额拆分测试" }, writeHeaders(finance)));
  assert.equal(wrongRefund.status, 422);
  const refundResponse = await createRefund(jsonRequest("/api/v1/admin/refunds", { paymentId: payment.id, items: [{ orderItemId: order.items[0].id, amountCents: order.items[0].priceCents }], reason: "完整明细退款测试" }, writeHeaders(finance)));
  assert.equal(refundResponse.status, 201);
  const refund = (await body<{ id: string }>(refundResponse)).data;
  const refundConfirmed = await refundTestConfirm(jsonRequest(`/api/v1/admin/refunds/${refund.id}/test-confirm`, {}, writeHeaders(finance)), { params: Promise.resolve({ refundId: refund.id }) });
  assert.equal(refundConfirmed.status, 200);
  const partialOrder = await getPrisma().order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(partialOrder.status, "partial_refunded");
  assert.equal(await getPrisma().authorizationRecord.count({ where: { orderId: order.id, status: "revoked" } }), 1);
  assert.equal(await getPrisma().authorizationRecord.count({ where: { orderId: order.id, status: "active" } }), 1);
  assert.equal(await getPrisma().revenueRecord.count({ where: { orderItemId: order.items[0].id, recordType: "reversal" } }), 1);
});

test("T013 认证上传费成功后才进入审核，退款待办经签名回调后完成", { skip: !shouldRun }, async () => {
  const uploader = await sessionFor("asset-uploader@example.test"); const finance = await sessionFor("finance@example.test"); const admin = await sessionFor("admin@example.test");
  const profile = await getPrisma().uploaderProfile.findUniqueOrThrow({ where: { userId: uploader.user.id } });
  const asset = await getPrisma().asset.create({ data: { uploaderProfileId: profile.id, assetType: "object", title: "T013 认证费测试素材", priceCents: 1000, reviewStatus: "draft", listingStatus: "unlisted", certificationStatus: "pending_payment", submittedAt: new Date() } });
  const charge = await getPrisma().certificationFeeCharge.create({ data: { assetId: asset.id, uploaderUserId: uploader.user.id, amountCents: 1000, settingsSnapshot: { certificationFeeCents: 1000 } } });
  const paymentResponse = await createCertificationPayment(jsonRequest(`/api/v1/certification-fee-charges/${charge.id}/payments`, { provider: "alipay" }, writeHeaders(uploader, { "idempotency-key": "t013-cert-payment" })), { params: Promise.resolve({ chargeId: charge.id }) });
  const payment = (await body<{ paymentNo: string; amountCents: number; provider: "alipay" }>(paymentResponse)).data;
  assert.equal((await getPrisma().asset.findUniqueOrThrow({ where: { id: asset.id } })).reviewStatus, "draft");
  const fixture = createLocalTestEvent({ eventType: "payment.succeeded", provider: payment.provider, resourceNo: payment.paymentNo, amountCents: payment.amountCents });
  assert.equal((await paymentWebhook(webhookRequest(fixture.rawBody, fixture.signature))).status, 200);
  const paidAsset = await getPrisma().asset.findUniqueOrThrow({ where: { id: asset.id } });
  assert.equal(paidAsset.reviewStatus, "pending_review"); assert.equal(paidAsset.certificationStatus, "pending_review");

  const request = await getPrisma().certificationRefundRequest.create({ data: { assetId: asset.id, certificationFeeChargeId: charge.id, amountCents: 1000, reason: "认证费原路退款测试", requestedByUserId: admin.user.id } });
  const refundResponse = await createRefund(jsonRequest("/api/v1/admin/refunds", { certificationRefundRequestId: request.id, reason: request.reason }, writeHeaders(finance)));
  assert.equal(refundResponse.status, 201);
  const refund = (await body<{ id: string }>(refundResponse)).data;
  assert.equal((await getPrisma().certificationRefundRequest.findUniqueOrThrow({ where: { id: request.id } })).status, "pending");
  assert.equal((await refundTestConfirm(jsonRequest(`/api/v1/admin/refunds/${refund.id}/test-confirm`, {}, writeHeaders(finance)), { params: Promise.resolve({ refundId: refund.id }) })).status, 200);
  assert.equal((await getPrisma().certificationRefundRequest.findUniqueOrThrow({ where: { id: request.id } })).status, "success");
  assert.equal((await getPrisma().certificationFeeCharge.findUniqueOrThrow({ where: { id: charge.id } })).status, "refunded");

  const tamperedRaw = JSON.stringify({ ...fixture.event, amountCents: 1 });
  assert.notEqual(signLocalTestPayload(fixture.rawBody), signLocalTestPayload(tamperedRaw));
});
