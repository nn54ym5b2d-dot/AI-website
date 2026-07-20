import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { GET as listInvites, POST as createInvite } from "../app/api/v1/admin/invite-codes/route.ts";
import { POST as disableInvite } from "../app/api/v1/admin/invite-codes/[inviteId]/disable/route.ts";
import { POST as revealInvite } from "../app/api/v1/admin/invite-codes/[inviteId]/reveal/route.ts";
import { GET as getSettings, PATCH as patchSettings } from "../app/api/v1/admin/settings/route.ts";
import { GET as getProfile, PATCH as patchProfile } from "../app/api/v1/uploader/profile/route.ts";
import { GET as getPublicAsset } from "../app/api/v1/assets/[assetId]/route.ts";
import { createSession } from "../lib/auth/session.ts";
import { hashInviteCode } from "../lib/auth/crypto.ts";
import { getPrisma } from "../lib/db/prisma.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
type Envelope<T> = { data: T; error?: { code: string; message: string } };
function request(path: string, headers: Record<string, string> = {}) { return new Request(`${appUrl}${path}`, { headers }); }
function jsonRequest(path: string, body: unknown, headers: Record<string, string>) { return new Request(`${appUrl}${path}`, { method: "PATCH", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }); }
async function body<T>(response: Response) { return await response.json() as Envelope<T>; }
async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id); const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(request("/api/v1/auth/csrf", { cookie }));
  return { cookie, csrfToken: (await body<{ csrfToken: string }>(csrfResponse)).data.csrfToken };
}
function writeHeaders(session: { cookie: string; csrfToken: string }) { return { cookie: session.cookie, origin: appUrl, "x-csrf-token": session.csrfToken }; }
const defaults = { certificationFeeCents: 1000, assetPriceRules: { person: 5000, object: 1000, scene: 5000 }, uploaderShareRate: 0.8, platformShareRate: 0.2, observerShareRate: 0, downloadEligibilityDays: 365, signedDownloadUrlTtlMinutes: 10 };

test("T012A 邀请码、系统设置、上传者资料和公开认证摘要遵守服务端边界", { skip: !shouldRun }, async () => {
  const admin = await sessionFor("admin@example.test");
  const operator = await sessionFor("operator@example.test");
  const finance = await sessionFor("finance@example.test");
  const uploader = await sessionFor("asset-uploader@example.test");

  const financeSettings = await getSettings(request("/api/v1/admin/settings", { cookie: finance.cookie }));
  assert.equal(financeSettings.status, 200);
  assert.equal((await body<{ canEdit: boolean }>(financeSettings)).data.canEdit, false);
  const forbiddenPatch = await patchSettings(jsonRequest("/api/v1/admin/settings", defaults, writeHeaders(finance)));
  assert.equal(forbiddenPatch.status, 403);

  const changed = { ...defaults, assetPriceRules: { ...defaults.assetPriceRules, object: 1200 } };
  const changedResponse = await patchSettings(jsonRequest("/api/v1/admin/settings", changed, writeHeaders(admin)));
  assert.equal(changedResponse.status, 200);
  assert.equal((await body<{ assetPriceRules: { object: number } }>(changedResponse)).data.assetPriceRules.object, 1200);
  const settingsAudit = await getPrisma().auditLog.findFirst({ where: { action: "system_settings.updated" }, orderBy: { createdAt: "desc" } });
  assert.ok(settingsAudit);

  const createRequest = new Request(`${appUrl}/api/v1/admin/invite-codes`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: JSON.stringify({ note: "T012A 自动化测试" }) });
  const createdResponse = await createInvite(createRequest);
  assert.equal(createdResponse.status, 201);
  const created = (await body<{ id: string; code: string }>(createdResponse)).data;
  assert.match(created.code, /^YSK-[0-9A-F]{16}$/);
  const listResponse = await listInvites(request("/api/v1/admin/invite-codes", { cookie: operator.cookie }));
  const listText = JSON.stringify(await listResponse.json());
  assert.equal(listText.includes(created.code), false);
  assert.equal(listText.includes("••••"), true);
  const revealResponse = await revealInvite(new Request(`${appUrl}/api/v1/admin/invite-codes/${created.id}/reveal`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: "{}" }), { params: Promise.resolve({ inviteId: created.id }) });
  assert.equal(revealResponse.status, 200);
  assert.equal((await body<{ code: string }>(revealResponse)).data.code, created.code);
  const revealAudit = await getPrisma().auditLog.findFirstOrThrow({ where: { action: "invite_code.revealed", targetId: created.id }, orderBy: { createdAt: "desc" } });
  assert.equal(JSON.stringify(revealAudit.metadata).includes(created.code), false);
  const seededAdmin = await getPrisma().user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  const legacyInvite = await getPrisma().inviteCode.create({ data: { codeHash: hashInviteCode("YSK-LEGACY-UNRECOVERABLE"), displayPrefix: "YSK-LEGAC", createdByUserId: seededAdmin.id } });
  const legacyReveal = await revealInvite(new Request(`${appUrl}/api/v1/admin/invite-codes/${legacyInvite.id}/reveal`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: "{}" }), { params: Promise.resolve({ inviteId: legacyInvite.id }) });
  assert.equal(legacyReveal.status, 409);
  const disabled = await disableInvite(new Request(`${appUrl}/api/v1/admin/invite-codes/${created.id}/disable`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: "{}" }), { params: Promise.resolve({ inviteId: created.id }) });
  assert.equal(disabled.status, 200);
  const concurrentCreateResponse = await createInvite(new Request(`${appUrl}/api/v1/admin/invite-codes`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: JSON.stringify({ note: "并发禁用测试" }) }));
  const concurrentInvite = (await body<{ id: string }>(concurrentCreateResponse)).data;
  const concurrentRequest = () => disableInvite(new Request(`${appUrl}/api/v1/admin/invite-codes/${concurrentInvite.id}/disable`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: "{}" }), { params: Promise.resolve({ inviteId: concurrentInvite.id }) });
  const concurrentResults = await Promise.all([concurrentRequest(), concurrentRequest()]);
  assert.deepEqual(concurrentResults.map((response) => response.status).sort(), [200, 409]);
  const usedInvite = await getPrisma().inviteCode.findFirstOrThrow({ where: { status: "used" } });
  const usedDisable = await disableInvite(new Request(`${appUrl}/api/v1/admin/invite-codes/${usedInvite.id}/disable`, { method: "POST", headers: { "content-type": "application/json", ...writeHeaders(operator) }, body: "{}" }), { params: Promise.resolve({ inviteId: usedInvite.id }) });
  assert.equal(usedDisable.status, 409);

  const profileResponse = await getProfile(request("/api/v1/uploader/profile", { cookie: uploader.cookie }));
  assert.equal(profileResponse.status, 200);
  const originalProfile = (await body<{ displayName: string; bio: string | null }>(profileResponse)).data;
  const updatedProfile = await patchProfile(jsonRequest("/api/v1/uploader/profile", { displayName: "T012A 测试上传者", bio: "真实资料 API 测试" }, writeHeaders(uploader)));
  assert.equal(updatedProfile.status, 200);
  assert.equal((await body<{ displayName: string }>(updatedProfile)).data.displayName, "T012A 测试上传者");

  const publicResponse = await getPublicAsset(request("/api/v1/assets/10000000-0000-4000-8000-000000000001"), { params: Promise.resolve({ assetId: "10000000-0000-4000-8000-000000000001" }) });
  assert.equal(publicResponse.status, 200);
  const publicText = JSON.stringify(await publicResponse.json());
  assert.equal(publicText.includes("certificateNo"), true);
  assert.equal(publicText.includes("certificateFileId"), false);
  assert.equal(publicText.includes("credential"), false);
  assert.equal(publicText.includes("notes"), false);
  assert.equal(publicText.includes("cosObjectKey"), false);

  await patchSettings(jsonRequest("/api/v1/admin/settings", defaults, writeHeaders(admin)));
  await getPrisma().uploaderProfile.updateMany({ where: { displayName: "T012A 测试上传者" }, data: { displayName: originalProfile.displayName, bio: originalProfile.bio } });
});
