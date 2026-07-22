import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { GET as getMe } from "../app/api/v1/me/route.ts";
import { GET as listUsers } from "../app/api/v1/admin/users/route.ts";
import { PATCH as patchUser } from "../app/api/v1/admin/users/[userId]/route.ts";
import { GET as listObserverAccounts, POST as createObserverAccount } from "../app/api/v1/admin/observer-accounts/route.ts";
import { PATCH as patchObserverAccount } from "../app/api/v1/admin/observer-accounts/[observerId]/route.ts";
import { GET as getObserverDashboard } from "../app/api/v1/observer/dashboard/route.ts";
import { GET as getObserverAssetsSummary } from "../app/api/v1/observer/assets-summary/route.ts";
import { GET as getObserverShareRecords } from "../app/api/v1/observer/share-records/route.ts";
import { createSession, getSessionAccessByToken } from "../lib/auth/session.ts";
import { updateAdminUser } from "../lib/admin/users.ts";
import { getPrisma } from "../lib/db/prisma.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
type Envelope<T> = { data: T; error?: { code: string; message: string } };

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`${appUrl}${path}`, { headers });
}
function patchRequest(path: string, body: unknown, headers: Record<string, string>) {
  return new Request(`${appUrl}${path}`, { method: "PATCH", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function postRequest(path: string, body: unknown, headers: Record<string, string>) {
  return new Request(`${appUrl}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
async function body<T>(response: Response) { return await response.json() as Envelope<T>; }
async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id);
  const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(request("/api/v1/auth/csrf", { cookie }));
  return { user, token: session.token, cookie, csrfToken: (await body<{ csrfToken: string }>(csrfResponse)).data.csrfToken };
}
function writeHeaders(session: { cookie: string; csrfToken: string }) {
  return { cookie: session.cookie, origin: appUrl, "x-csrf-token": session.csrfToken };
}

test("T015 管理员分级、最后超级管理员保护和账号禁用即时生效", { skip: !shouldRun }, async () => {
  const admin = await sessionFor("admin@example.test");
  const operator = await sessionFor("operator@example.test");
  const finance = await sessionFor("finance@example.test");

  const operatorWrite = await patchUser(
    patchRequest(`/api/v1/admin/users/${admin.user.id}`, { status: "disabled" }, writeHeaders(operator)),
    { params: Promise.resolve({ userId: admin.user.id }) }
  );
  assert.equal(operatorWrite.status, 403);
  assert.equal((await listUsers(request("/api/v1/admin/users", { cookie: finance.cookie }))).status, 403);

  const removeOnlySuper = await patchUser(
    patchRequest(`/api/v1/admin/users/${admin.user.id}`, { roles: ["admin"], adminRoles: ["operator"] }, writeHeaders(admin)),
    { params: Promise.resolve({ userId: admin.user.id }) }
  );
  assert.equal(removeOnlySuper.status, 409);
  assert.match((await body<never>(removeOnlySuper)).error?.message ?? "", /最后一名有效超级管理员/);

  const tempSuper = await getPrisma().user.create({
    data: {
      email: "t015-concurrent-super@example.test",
      displayName: "T015 并发超级管理员",
      primaryLoginMethod: "email",
      roleMemberships: { create: { role: "admin" } },
      adminRoleAssignments: { create: { adminRole: "super_admin", createdByUserId: admin.user.id } }
    }
  });
  const fixedAccess = await getSessionAccessByToken(admin.token);
  assert.ok(fixedAccess);
  const concurrentResults = await Promise.allSettled([
    updateAdminUser(fixedAccess, admin.user.id, { roles: ["admin"], adminRoles: ["operator"] }, "req_t015_concurrent_1"),
    updateAdminUser(fixedAccess, tempSuper.id, { roles: ["admin"], adminRoles: ["operator"] }, "req_t015_concurrent_2")
  ]);
  assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrentResults.filter((result) => result.status === "rejected").length, 1);
  const effectiveSupers = await getPrisma().adminRoleAssignment.count({
    where: { adminRole: "super_admin", status: "active", user: { status: "active", roleMemberships: { some: { role: "admin", status: "active" } } } }
  });
  assert.equal(effectiveSupers, 1);
  await getPrisma().userRoleMembership.upsert({ where: { userId_role: { userId: admin.user.id, role: "admin" } }, update: { status: "active" }, create: { userId: admin.user.id, role: "admin" } });
  await getPrisma().adminRoleAssignment.upsert({ where: { userId_adminRole: { userId: admin.user.id, adminRole: "super_admin" } }, update: { status: "active" }, create: { userId: admin.user.id, adminRole: "super_admin", createdByUserId: admin.user.id } });
  await getPrisma().user.delete({ where: { id: tempSuper.id } });

  const temporaryUser = await getPrisma().user.create({
    data: { email: "t015-disable@example.test", displayName: "T015 禁用测试", primaryLoginMethod: "email", roleMemberships: { create: { role: "buyer" } } }
  });
  const temporarySession = await createSession(temporaryUser.id);
  const disabled = await patchUser(
    patchRequest(`/api/v1/admin/users/${temporaryUser.id}`, { status: "disabled", roles: ["buyer"], adminRoles: [] }, writeHeaders(admin)),
    { params: Promise.resolve({ userId: temporaryUser.id }) }
  );
  assert.equal(disabled.status, 200);
  const disabledMe = await getMe(request("/api/v1/me", { cookie: `yuansu_session=${encodeURIComponent(temporarySession.token)}` }));
  assert.equal(disabledMe.status, 401);
  const revokedSession = await getPrisma().userSession.findUniqueOrThrow({ where: { id: temporarySession.sessionId } });
  assert.ok(revokedSession.revokedAt);
  await getPrisma().user.delete({ where: { id: temporaryUser.id } });
});

test("T015 观察员账号生命周期、只读汇总和敏感边界使用真实 PostgreSQL", { skip: !shouldRun }, async () => {
  const admin = await sessionFor("admin@example.test");
  const operator = await sessionFor("operator@example.test");
  const observer = await sessionFor("observer@example.test");

  const operatorCreate = await createObserverAccount(postRequest("/api/v1/admin/observer-accounts", { email: "forbidden@example.test", displayName: "禁止创建", partnerName: "禁止合作方" }, writeHeaders(operator)));
  assert.equal(operatorCreate.status, 403);

  const createdResponse = await createObserverAccount(postRequest("/api/v1/admin/observer-accounts", {
    email: "t015-observer@example.test",
    displayName: "T015 外部观察员",
    partnerName: "T015 测试合作方"
  }, writeHeaders(admin)));
  assert.equal(createdResponse.status, 201);
  const created = (await body<{ id: string; userId: string; status: string }>(createdResponse)).data;
  assert.equal(created.status, "active");
  const createdUser = await getPrisma().user.findUniqueOrThrow({ where: { id: created.userId }, include: { roleMemberships: true, adminRoleAssignments: true, observerProfile: true } });
  assert.deepEqual(createdUser.roleMemberships.filter((item) => item.status === "active").map((item) => item.role), ["observer"]);
  assert.equal(createdUser.adminRoleAssignments.length, 0);
  assert.equal(Number(createdUser.observerProfile?.defaultShareRate), 0);

  const dashboardResponse = await getObserverDashboard(request("/api/v1/observer/dashboard?periodType=month", { cookie: observer.cookie }));
  assert.equal(dashboardResponse.status, 200);
  const dashboardText = JSON.stringify(await dashboardResponse.json());
  for (const forbiddenField of ["email", "phone", "orderNo", "providerTradeNo", "cosObjectKey", "assetId", "downloadId", "auditLog"]) {
    assert.equal(dashboardText.includes(forbiddenField), false, `${forbiddenField} must not be exposed`);
  }
  const assetsResponse = await getObserverAssetsSummary(request("/api/v1/observer/assets-summary?periodType=month", { cookie: observer.cookie }));
  assert.equal(assetsResponse.status, 200);
  const assetPayload = await body<{ assetTypes: Array<{ assetType: string }> }>(assetsResponse);
  assert.deepEqual(new Set(assetPayload.data.assetTypes.map((item) => item.assetType)), new Set(["person", "object", "scene"]));
  const shareResponse = await getObserverShareRecords(request("/api/v1/observer/share-records?periodType=month", { cookie: observer.cookie }));
  const sharePayload = await body<{ records: Array<{ shareRate: number; expectedShareAmountCents: number; settledShareAmountCents: number; pendingShareAmountCents: number }> }>(shareResponse);
  assert.equal(sharePayload.data.records[0]?.shareRate, 0);
  assert.equal(sharePayload.data.records[0]?.expectedShareAmountCents, 0);
  assert.equal(sharePayload.data.records[0]?.settledShareAmountCents, 0);
  assert.equal(sharePayload.data.records[0]?.pendingShareAmountCents, 0);
  assert.ok(await getPrisma().platformMetricSnapshot.findFirst({ where: { periodType: "month" } }));

  const tooLong = await getObserverDashboard(request("/api/v1/observer/dashboard?periodType=custom&startAt=2025-01-01T00%3A00%3A00.000Z&endAt=2026-01-02T00%3A00%3A00.000Z", { cookie: observer.cookie }));
  assert.equal(tooLong.status, 422);
  assert.match((await body<never>(tooLong)).error?.message ?? "", /不能超过一年/);
  assert.equal((await listObserverAccounts(request("/api/v1/admin/observer-accounts", { cookie: observer.cookie }))).status, 403);
  assert.equal((await listUsers(request("/api/v1/admin/users", { cookie: observer.cookie }))).status, 403);

  const createdSession = await createSession(created.userId);
  const disabled = await patchObserverAccount(
    patchRequest(`/api/v1/admin/observer-accounts/${created.id}`, { status: "disabled" }, writeHeaders(admin)),
    { params: Promise.resolve({ observerId: created.id }) }
  );
  assert.equal(disabled.status, 200);
  const oldSessionDashboard = await getObserverDashboard(request("/api/v1/observer/dashboard?periodType=day", { cookie: `yuansu_session=${encodeURIComponent(createdSession.token)}` }));
  assert.equal(oldSessionDashboard.status, 401);
  const revoked = await patchObserverAccount(
    patchRequest(`/api/v1/admin/observer-accounts/${created.id}`, { status: "revoked" }, writeHeaders(admin)),
    { params: Promise.resolve({ observerId: created.id }) }
  );
  assert.equal(revoked.status, 200);
  const reactivate = await patchObserverAccount(
    patchRequest(`/api/v1/admin/observer-accounts/${created.id}`, { status: "active" }, writeHeaders(admin)),
    { params: Promise.resolve({ observerId: created.id }) }
  );
  assert.equal(reactivate.status, 409);
  assert.ok(await getPrisma().auditLog.findFirst({ where: { action: "observer_account.revoked", targetId: created.id } }));
  await getPrisma().user.delete({ where: { id: created.userId } });
});
