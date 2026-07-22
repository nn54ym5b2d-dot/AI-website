import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { POST as createOrder } from "../app/api/v1/orders/route.ts";
import { POST as createOrderPayment } from "../app/api/v1/orders/[orderId]/payments/route.ts";
import { POST as paymentWebhook } from "../app/api/v1/webhooks/payments/local-test/route.ts";
import { POST as prepareBundle } from "../app/api/v1/authorizations/[authorizationId]/download-links/route.ts";
import { GET as requestDownload } from "../app/api/v1/download-links/[downloadLinkId]/file/route.ts";
import { GET as downloadLocalBundle } from "../app/api/v1/download-bundles/[bundleFileId]/local-test/route.ts";
import { GET as listDownloads } from "../app/api/v1/downloads/route.ts";
import { GET as listUploaderRevenue } from "../app/api/v1/uploader/revenue/route.ts";
import { GET as getUploaderRevenueSummary } from "../app/api/v1/uploader/revenue/summary/route.ts";
import { GET as listAdminRevenue } from "../app/api/v1/admin/revenue/route.ts";
import { POST as revokeAuthorization } from "../app/api/v1/admin/authorizations/[authorizationId]/revoke/route.ts";
import { createSession } from "../lib/auth/session.ts";
import { createLocalTestEvent } from "../lib/transactions/test-provider.ts";
import { getPrisma } from "../lib/db/prisma.ts";
import { listPublicAssets } from "../lib/domain/materials.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
type Envelope<T> = { data: T; error?: { code: string; message: string } };
async function body<T>(response: Response) { return await response.json() as Envelope<T>; }
async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id);
  const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(new Request(`${appUrl}/api/v1/auth/csrf`, { headers: { cookie } }));
  return { user, cookie, csrfToken: (await body<{ csrfToken: string }>(csrfResponse)).data.csrfToken };
}
function headers(session: { cookie: string; csrfToken: string }, extra: Record<string, string> = {}) { return { cookie: session.cookie, origin: appUrl, "x-csrf-token": session.csrfToken, ...extra }; }
function jsonRequest(path: string, value: unknown, requestHeaders: Record<string, string>) { return new Request(`${appUrl}${path}`, { method: "POST", headers: { "content-type": "application/json", ...requestHeaders }, body: JSON.stringify(value) }); }

test("T014 私有 ZIP、短时地址、下载记录、热门排序和收益冲正形成真实闭环", { skip: !shouldRun }, async () => {
  const buyer = await sessionFor("buyer@example.test");
  const admin = await sessionFor("admin@example.test");
  const operator = await sessionFor("operator@example.test");
  const finance = await sessionFor("finance@example.test");
  const uploader = await sessionFor("asset-uploader@example.test");
  const objectAssetId = "10000000-0000-4000-8000-000000000002";

  const uploaderRoles = await getPrisma().userRoleMembership.findMany({
    where: { userId: uploader.user.id, status: "active" },
    select: { role: true }
  });
  assert.deepEqual(new Set(uploaderRoles.map(({ role }) => role)), new Set(["buyer", "uploader"]));

  const orderResponse = await createOrder(jsonRequest("/api/v1/orders", { assetIds: [objectAssetId] }, headers(buyer, { "idempotency-key": "t014-order-object" })));
  assert.equal(orderResponse.status, 201);
  const order = (await body<{ id: string; items: Array<{ id: string }> }>(orderResponse)).data;
  const paymentResponse = await createOrderPayment(jsonRequest(`/api/v1/orders/${order.id}/payments`, { provider: "wechat_pay" }, headers(buyer, { "idempotency-key": "t014-payment-object" })), { params: Promise.resolve({ orderId: order.id }) });
  const payment = (await body<{ paymentNo: string; amountCents: number; provider: "wechat_pay" }>(paymentResponse)).data;
  const fixture = createLocalTestEvent({ eventType: "payment.succeeded", provider: payment.provider, resourceNo: payment.paymentNo, amountCents: payment.amountCents });
  assert.equal((await paymentWebhook(new Request(`${appUrl}/api/v1/webhooks/payments/local-test`, { method: "POST", headers: { "content-type": "application/json", "x-yuansu-test-signature": fixture.signature }, body: fixture.rawBody }))).status, 200);

  const authorization = await getPrisma().authorizationRecord.findUniqueOrThrow({ where: { orderItemId: order.items[0].id }, include: { downloadLinks: true } });
  const prepareResponse = await prepareBundle(jsonRequest(`/api/v1/authorizations/${authorization.id}/download-links`, {}, headers(buyer)), { params: Promise.resolve({ authorizationId: authorization.id }) });
  assert.equal(prepareResponse.status, 200);
  const prepared = (await body<{ id: string; bundleStatus: string }>(prepareResponse)).data;
  assert.equal(prepared.bundleStatus, "ready");

  const firstRedirect = await requestDownload(new Request(`${appUrl}/api/v1/download-links/${prepared.id}/file`, { headers: { cookie: buyer.cookie, "user-agent": "T014 test" } }), { params: Promise.resolve({ downloadLinkId: prepared.id }) });
  assert.equal(firstRedirect.status, 302);
  const location = firstRedirect.headers.get("location");
  assert.ok(location);
  const bundleFileId = (await getPrisma().downloadLink.findUniqueOrThrow({ where: { id: prepared.id } })).downloadBundleFileId;
  assert.ok(bundleFileId);
  const bundleResponse = await downloadLocalBundle(new Request(location), { params: Promise.resolve({ bundleFileId }) });
  assert.equal(bundleResponse.status, 200);
  const zip = Buffer.from(await bundleResponse.arrayBuffer());
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  const visibleZipContent = zip.toString("utf8");
  assert.match(visibleZipContent, /object-lamp\.svg/);
  assert.doesNotMatch(visibleZipContent, /person-front\.svg|scene-factory\.svg/);

  const secondRedirect = await requestDownload(new Request(`${appUrl}/api/v1/download-links/${prepared.id}/file`, { headers: { cookie: buyer.cookie } }), { params: Promise.resolve({ downloadLinkId: prepared.id }) });
  assert.equal(secondRedirect.status, 302);
  const activeLink = await getPrisma().downloadLink.findUniqueOrThrow({ where: { id: prepared.id } });
  assert.equal(activeLink.status, "active");
  assert.equal(await getPrisma().download.count({ where: { downloadLinkId: prepared.id } }), 2);
  assert.equal((await listDownloads(new Request(`${appUrl}/api/v1/downloads`, { headers: { cookie: buyer.cookie } }))).status, 200);

  const popular = await listPublicAssets({ sort: "popular", limit: 20 });
  assert.equal(popular.data[0].id, objectAssetId);

  const uploaderRevenueResponse = await listUploaderRevenue(new Request(`${appUrl}/api/v1/uploader/revenue`, { headers: { cookie: uploader.cookie } }));
  assert.equal(uploaderRevenueResponse.status, 200);
  const uploaderRecords = (await body<Array<{ uploaderAmountCents: number }>>(uploaderRevenueResponse)).data;
  assert.ok(uploaderRecords.some((record) => record.uploaderAmountCents > 0));
  const uploaderSummaryResponse = await getUploaderRevenueSummary(new Request(`${appUrl}/api/v1/uploader/revenue/summary`, { headers: { cookie: uploader.cookie } }));
  assert.equal(uploaderSummaryResponse.status, 200);
  const uploaderSummary = (await body<{ totalPurchaseCount: number; totalPurchaseRevenueCents: number; products: Array<{ assetId: string; purchaseCount: number; purchaseRevenueCents: number }> }>(uploaderSummaryResponse)).data;
  const objectSalesBeforeRevoke = uploaderSummary.products.find((product) => product.assetId === objectAssetId);
  assert.ok(objectSalesBeforeRevoke);
  assert.ok(objectSalesBeforeRevoke.purchaseCount >= 1);
  assert.ok(objectSalesBeforeRevoke.purchaseRevenueCents >= 800);
  assert.ok(uploaderSummary.totalPurchaseCount >= objectSalesBeforeRevoke.purchaseCount);
  assert.ok(uploaderSummary.totalPurchaseRevenueCents >= objectSalesBeforeRevoke.purchaseRevenueCents);
  assert.equal((await getUploaderRevenueSummary(new Request(`${appUrl}/api/v1/uploader/revenue/summary`, { headers: { cookie: buyer.cookie } }))).status, 403);
  const operatorRevenue = (await body<Array<{ orderNo: string | null; platformAmountCents: number | null }>>(await listAdminRevenue(new Request(`${appUrl}/api/v1/admin/revenue`, { headers: { cookie: operator.cookie } })))).data;
  const financeRevenue = (await body<Array<{ orderNo: string | null; platformAmountCents: number | null }>>(await listAdminRevenue(new Request(`${appUrl}/api/v1/admin/revenue`, { headers: { cookie: finance.cookie } })))).data;
  assert.equal(operatorRevenue[0].orderNo, null);
  assert.equal(operatorRevenue[0].platformAmountCents, null);
  assert.ok(financeRevenue[0].orderNo);
  assert.equal(typeof financeRevenue[0].platformAmountCents, "number");

  const revokeRequest = jsonRequest(`/api/v1/admin/authorizations/${authorization.id}/revoke`, { reason: "T014 特殊争议撤销测试" }, headers(admin));
  assert.equal((await revokeAuthorization(revokeRequest, { params: Promise.resolve({ authorizationId: authorization.id }) })).status, 200);
  const repeatedRevoke = await revokeAuthorization(jsonRequest(`/api/v1/admin/authorizations/${authorization.id}/revoke`, { reason: "T014 特殊争议撤销测试" }, headers(admin)), { params: Promise.resolve({ authorizationId: authorization.id }) });
  assert.equal(repeatedRevoke.status, 200);
  assert.equal((await getPrisma().downloadLink.findUniqueOrThrow({ where: { id: prepared.id } })).status, "revoked");
  assert.equal(await getPrisma().revenueRecord.count({ where: { orderItemId: order.items[0].id, recordType: "reversal" } }), 1);
  const uploaderSummaryAfterRevoke = (await body<{ products: Array<{ assetId: string; purchaseCount: number; purchaseRevenueCents: number }> }>(await getUploaderRevenueSummary(new Request(`${appUrl}/api/v1/uploader/revenue/summary`, { headers: { cookie: uploader.cookie } })))).data;
  const objectSalesAfterRevoke = uploaderSummaryAfterRevoke.products.find((product) => product.assetId === objectAssetId);
  assert.equal(objectSalesAfterRevoke?.purchaseCount ?? 0, objectSalesBeforeRevoke.purchaseCount - 1);
  assert.equal(objectSalesAfterRevoke?.purchaseRevenueCents ?? 0, objectSalesBeforeRevoke.purchaseRevenueCents - 800);
  assert.equal((await requestDownload(new Request(`${appUrl}/api/v1/download-links/${prepared.id}/file`, { headers: { cookie: buyer.cookie } }), { params: Promise.resolve({ downloadLinkId: prepared.id }) })).status, 410);
  assert.equal((await downloadLocalBundle(new Request(location), { params: Promise.resolve({ bundleFileId }) })).status, 410);
});
