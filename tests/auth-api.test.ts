import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GET as getCurrentTerms } from "../app/api/v1/legal-documents/current/route.ts";
import { POST as createChallenge } from "../app/api/v1/auth/challenges/route.ts";
import { POST as register } from "../app/api/v1/auth/register/route.ts";
import { POST as login } from "../app/api/v1/auth/login/route.ts";
import { POST as loginWithWechat } from "../app/api/v1/auth/wechat/route.ts";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { POST as logout } from "../app/api/v1/auth/logout/route.ts";
import { GET as getMe } from "../app/api/v1/me/route.ts";
import { POST as activateInvite } from "../app/api/v1/invites/activate/route.ts";
import { disconnectPrisma, getPrisma } from "../lib/db/prisma.ts";
import { hashInviteCode } from "../lib/auth/crypto.ts";
import {
  ensureLocalUploaderInvite,
  LEGACY_LOCAL_UPLOADER_INVITE_CODE,
  LOCAL_UPLOADER_INVITE_CODE
} from "../lib/auth/local-invite-seed.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${appUrl}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(`${appUrl}${url}`, { headers });
}

async function body<T>(response: Response) {
  return (await response.json()) as T;
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/yuansu_session=([^;]+)/);
  assert.ok(match, "session cookie must be set");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);
  return `yuansu_session=${match[1]}`;
}

async function deliveredCode(challengeId: string) {
  const outboxPath = path.resolve(
    process.cwd(),
    process.env.AUTH_LOCAL_OUTBOX_PATH ?? ".local/test-auth-outbox.jsonl"
  );
  const lines = (await readFile(outboxPath, "utf8")).trim().split("\n").reverse();
  for (const line of lines) {
    const delivery = JSON.parse(line) as { challengeId: string; verificationCode: string };
    if (delivery.challengeId === challengeId) return delivery.verificationCode;
  }
  throw new Error(`No local auth delivery found for ${challengeId}.`);
}

async function challenge(method: "email" | "phone", identifier: string, purpose: "register" | "login") {
  const response = await createChallenge(
    jsonRequest("/api/v1/auth/challenges", { method, identifier, purpose })
  );
  assert.equal(response.status, 201);
  const payload = await body<{ data: { challengeId: string } }>(response);
  return {
    challengeId: payload.data.challengeId,
    verificationCode: await deliveredCode(payload.data.challengeId)
  };
}

async function csrf(cookie: string) {
  const response = await getCsrf(request("/api/v1/auth/csrf", { cookie }));
  assert.equal(response.status, 200);
  return (await body<{ data: { csrfToken: string } }>(response)).data.csrfToken;
}

async function loginSeededUser(identifier: string) {
  const credentials = await challenge("email", identifier, "login");
  const response = await login(jsonRequest("/api/v1/auth/login", credentials));
  assert.equal(response.status, 200);
  return { response, cookie: sessionCookie(response) };
}

test("身份 API 使用真实 PostgreSQL 完成注册、条款审计、会话、邀请码和退出", { skip: !shouldRun }, async () => {
  const termsResponse = await getCurrentTerms(
    request("/api/v1/legal-documents/current?type=terms_of_service")
  );
  assert.equal(termsResponse.status, 200);
  const termsVersion = (await body<{ data: { version: string } }>(termsResponse)).data.version;

  const credentials = await challenge("email", "new-user@example.test", "register");
  const missingPhoneResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...credentials,
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(missingPhoneResponse.status, 422);
  assert.equal(
    (await body<{ error: { code: string } }>(missingPhoneResponse)).error.code,
    "PHONE_BINDING_REQUIRED"
  );

  const phoneCredentials = await challenge("phone", "+8613800000001", "register");
  const registerResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...credentials,
      phoneChallengeId: phoneCredentials.challengeId,
      phoneVerificationCode: phoneCredentials.verificationCode,
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(registerResponse.status, 201);
  const cookie = sessionCookie(registerResponse);
  const registeredUser = await getPrisma().user.findUnique({
    where: { email: "new-user@example.test" },
    include: { termsAcceptances: true, authIdentities: true }
  });
  assert.equal(registeredUser?.phone, "+8613800000001");
  assert.equal(registeredUser?.primaryLoginMethod, "phone");
  assert.match(registeredUser?.displayName ?? "", /^源素用户·[0-9A-F]{8}$/);
  assert.deepEqual(
    new Set(registeredUser?.authIdentities.map((identity) => identity.provider)),
    new Set(["phone", "email"])
  );
  assert.equal(registeredUser?.termsAcceptances.length, 1);
  assert.equal(registeredUser?.termsAcceptances[0]?.source, "email_phone_authenticate");

  await getPrisma().authChallenge.update({
    where: { id: credentials.challengeId },
    data: { createdAt: new Date(Date.now() - 61_000) }
  });
  const existingEmailCredentials = await challenge("email", "new-user@example.test", "register");
  const existingEmailResponse = await register(
    jsonRequest("/api/v1/auth/register", existingEmailCredentials)
  );
  assert.equal(existingEmailResponse.status, 200);
  const existingEmailPayload = await body<{
    data: { isNewUser: boolean; user: { id: string } };
  }>(existingEmailResponse);
  assert.equal(existingEmailPayload.data.isNewUser, false);
  assert.equal(existingEmailPayload.data.user.id, registeredUser?.id);

  const storedChallenge = await getPrisma().authChallenge.findUnique({
    where: { id: credentials.challengeId }
  });
  assert.notEqual(storedChallenge?.codeHash, credentials.verificationCode);
  const rawSessionToken = decodeURIComponent(cookie.split("=")[1] ?? "");
  const storedSession = await getPrisma().userSession.findFirst({
    where: { userId: registeredUser?.id }
  });
  assert.notEqual(storedSession?.tokenHash, rawSessionToken);

  const meBeforeInvite = await getMe(request("/api/v1/me", { cookie }));
  assert.equal(meBeforeInvite.status, 200);
  const beforePayload = await body<{ data: { roles: string[]; adminRoles: string[] } }>(meBeforeInvite);
  assert.deepEqual(beforePayload.data.roles, ["buyer"]);
  assert.deepEqual(beforePayload.data.adminRoles, []);

  const csrfToken = await csrf(cookie);
  const missingCsrfResponse = await activateInvite(
    jsonRequest(
      "/api/v1/invites/activate",
      { code: LEGACY_LOCAL_UPLOADER_INVITE_CODE, uploaderDisplayName: "新测试上传者" },
      { cookie, origin: appUrl }
    )
  );
  assert.equal(missingCsrfResponse.status, 400);
  const activateResponse = await activateInvite(
    jsonRequest(
      "/api/v1/invites/activate",
      { code: LEGACY_LOCAL_UPLOADER_INVITE_CODE, uploaderDisplayName: "新测试上传者" },
      { cookie, origin: appUrl, "x-csrf-token": csrfToken }
    )
  );
  assert.equal(activateResponse.status, 200);

  const meAfterInvite = await getMe(request("/api/v1/me", { cookie }));
  const afterPayload = await body<{
    data: { roles: string[]; uploaderProfile: { displayName: string } | null };
  }>(meAfterInvite);
  assert.deepEqual(new Set(afterPayload.data.roles), new Set(["buyer", "uploader"]));
  assert.equal(afterPayload.data.uploaderProfile?.displayName, "新测试上传者");

  const seededAdmin = await getPrisma().user.findUniqueOrThrow({
    where: { email: "admin@example.test" }
  });
  await ensureLocalUploaderInvite(getPrisma(), {
    code: LEGACY_LOCAL_UPLOADER_INVITE_CODE,
    createdByUserId: seededAdmin.id
  });
  const preservedInvite = await getPrisma().inviteCode.findUniqueOrThrow({
    where: { codeHash: hashInviteCode(LEGACY_LOCAL_UPLOADER_INVITE_CODE) },
    include: { uploaderProfile: true }
  });
  assert.equal(preservedInvite.status, "used");
  assert.equal(preservedInvite.usedByUserId, registeredUser?.id);
  assert.equal(preservedInvite.uploaderProfile?.userId, registeredUser?.id);

  const freshLocalInvite = await getPrisma().inviteCode.findUniqueOrThrow({
    where: { codeHash: hashInviteCode(LOCAL_UPLOADER_INVITE_CODE) }
  });
  assert.equal(freshLocalInvite.status, "unused");

  const loginCredentials = await challenge("email", "new-user@example.test", "login");
  const loginResponse = await login(jsonRequest("/api/v1/auth/login", loginCredentials));
  assert.equal(loginResponse.status, 200);
  const loginCookie = sessionCookie(loginResponse);
  const logoutCsrf = await csrf(loginCookie);
  const logoutResponse = await logout(
    jsonRequest("/api/v1/auth/logout", {}, {
      cookie: loginCookie,
      origin: new URL(appUrl).hostname === "localhost"
        ? appUrl.replace("localhost", "127.0.0.1")
        : appUrl,
      "x-csrf-token": logoutCsrf
    })
  );
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie") ?? "", /yuansu_session=;/);
  assert.equal((await getMe(request("/api/v1/me", { cookie: loginCookie }))).status, 401);
});

test("统一手机号入口只在新账号建号，验证码不可重放，微信绑定不改原昵称", { skip: !shouldRun }, async () => {
  const termsResponse = await getCurrentTerms(
    request("/api/v1/legal-documents/current?type=terms_of_service")
  );
  const termsVersion = (await body<{ data: { version: string } }>(termsResponse)).data.version;
  const phone = "+8613900000002";
  const phoneRegistration = await challenge("phone", phone, "register");
  const missingTermsResponse = await register(
    jsonRequest("/api/v1/auth/register", phoneRegistration)
  );
  assert.equal(missingTermsResponse.status, 422);
  assert.equal(
    (await body<{ error: { code: string } }>(missingTermsResponse)).error.code,
    "TERMS_ACCEPTANCE_REQUIRED"
  );

  const registerResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...phoneRegistration,
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(registerResponse.status, 201);
  const registeredPayload = await body<{
    data: { isNewUser: boolean; user: { id: string; displayName: string } };
  }>(registerResponse);
  assert.equal(registeredPayload.data.isNewUser, true);
  assert.match(registeredPayload.data.user.displayName, /^源素用户·[0-9A-F]{8}$/);

  const replayResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...phoneRegistration,
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(replayResponse.status, 422);
  assert.equal(
    (await body<{ error: { code: string } }>(replayResponse)).error.code,
    "CHALLENGE_INVALID"
  );

  await getPrisma().authChallenge.update({
    where: { id: phoneRegistration.challengeId },
    data: { createdAt: new Date(Date.now() - 61_000) }
  });
  const existingPhoneCredentials = await challenge("phone", phone, "register");
  const existingPhoneResponse = await register(
    jsonRequest("/api/v1/auth/register", existingPhoneCredentials)
  );
  assert.equal(existingPhoneResponse.status, 200);
  const existingPhonePayload = await body<{
    data: { isNewUser: boolean; user: { id: string; displayName: string } };
  }>(existingPhoneResponse);
  assert.equal(existingPhonePayload.data.isNewUser, false);
  assert.equal(existingPhonePayload.data.user.id, registeredPayload.data.user.id);
  assert.equal(existingPhonePayload.data.user.displayName, registeredPayload.data.user.displayName);

  const newEmail = "bind-to-phone@example.test";
  const emailCredentials = await challenge("email", newEmail, "register");
  const missingEmailPhoneResponse = await register(
    jsonRequest("/api/v1/auth/register", emailCredentials)
  );
  assert.equal(missingEmailPhoneResponse.status, 422);

  await getPrisma().authChallenge.update({
    where: { id: existingPhoneCredentials.challengeId },
    data: { createdAt: new Date(Date.now() - 61_000) }
  });
  const emailBindingPhoneCredentials = await challenge("phone", phone, "register");
  const emailBindingResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...emailCredentials,
      phoneChallengeId: emailBindingPhoneCredentials.challengeId,
      phoneVerificationCode: emailBindingPhoneCredentials.verificationCode
    })
  );
  assert.equal(emailBindingResponse.status, 200);
  const emailBindingPayload = await body<{
    data: { isNewUser: boolean; user: { id: string } };
  }>(emailBindingResponse);
  assert.equal(emailBindingPayload.data.isNewUser, false);
  assert.equal(emailBindingPayload.data.user.id, registeredPayload.data.user.id);

  process.env.AUTH_LOCAL_WECHAT_CODE = "local-wechat-bind-code";
  process.env.AUTH_LOCAL_WECHAT_SUBJECT = "local-wechat-bind-subject";
  process.env.AUTH_LOCAL_WECHAT_DISPLAY_NAME = "不应覆盖原昵称";
  const missingPhoneWechatResponse = await loginWithWechat(
    jsonRequest("/api/v1/auth/wechat", {
      code: "local-wechat-bind-code",
      redirectUri: `${appUrl}/login`
    })
  );
  assert.equal(missingPhoneWechatResponse.status, 422);

  await getPrisma().authChallenge.update({
    where: { id: emailBindingPhoneCredentials.challengeId },
    data: { createdAt: new Date(Date.now() - 61_000) }
  });
  const bindingChallenge = await challenge("phone", phone, "register");
  const wechatResponse = await loginWithWechat(
    jsonRequest("/api/v1/auth/wechat", {
      code: "local-wechat-bind-code",
      redirectUri: `${appUrl}/login`,
      phoneChallengeId: bindingChallenge.challengeId,
      phoneVerificationCode: bindingChallenge.verificationCode
    })
  );
  assert.equal(wechatResponse.status, 200);
  const wechatPayload = await body<{ data: { isNewUser: boolean; user: { id: string } } }>(wechatResponse);
  assert.equal(wechatPayload.data.isNewUser, false);

  const user = await getPrisma().user.findUnique({
    where: { phone },
    include: { authIdentities: true, termsAcceptances: true }
  });
  assert.equal(user?.id, wechatPayload.data.user.id);
  assert.equal(user?.displayName, registeredPayload.data.user.displayName);
  assert.equal(user?.termsAcceptances.length, 1);
  assert.deepEqual(
    new Set(user?.authIdentities.map((identity) => identity.provider)),
    new Set(["phone", "email", "wechat"])
  );
});

test("首次微信注册绑定新手机号并安全采用微信昵称", { skip: !shouldRun }, async () => {
  const termsResponse = await getCurrentTerms(
    request("/api/v1/legal-documents/current?type=terms_of_service")
  );
  const termsVersion = (await body<{ data: { version: string } }>(termsResponse)).data.version;
  const phoneCredentials = await challenge("phone", "+8613900000003", "register");

  process.env.AUTH_LOCAL_WECHAT_CODE = "local-wechat-create-code";
  process.env.AUTH_LOCAL_WECHAT_SUBJECT = "local-wechat-create-subject";
  process.env.AUTH_LOCAL_WECHAT_DISPLAY_NAME = "  微信\u200B昵称\u202E  ";

  const missingTermsResponse = await loginWithWechat(
    jsonRequest("/api/v1/auth/wechat", {
      code: "local-wechat-create-code",
      redirectUri: `${appUrl}/login`,
      phoneChallengeId: phoneCredentials.challengeId,
      phoneVerificationCode: phoneCredentials.verificationCode
    })
  );
  assert.equal(missingTermsResponse.status, 422);
  assert.equal(
    (await body<{ error: { code: string } }>(missingTermsResponse)).error.code,
    "TERMS_ACCEPTANCE_REQUIRED"
  );

  const createResponse = await loginWithWechat(
    jsonRequest("/api/v1/auth/wechat", {
      code: "local-wechat-create-code",
      redirectUri: `${appUrl}/login`,
      phoneChallengeId: phoneCredentials.challengeId,
      phoneVerificationCode: phoneCredentials.verificationCode,
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(createResponse.status, 201);
  const createPayload = await body<{
    data: { isNewUser: boolean; user: { displayName: string } };
  }>(createResponse);
  assert.equal(createPayload.data.isNewUser, true);
  assert.equal(createPayload.data.user.displayName, "微信昵称");
});

test("管理员和观察员数据库角色保持隔离，管理员不自动获得购买或上传角色", { skip: !shouldRun }, async () => {
  const admin = await loginSeededUser("admin@example.test");
  const adminPayload = await body<{
    data: { roles: string[]; adminRoles: string[]; observerProfile: unknown };
  }>(admin.response);
  assert.deepEqual(adminPayload.data.roles, ["admin"]);
  assert.deepEqual(adminPayload.data.adminRoles, ["super_admin"]);
  assert.equal(adminPayload.data.observerProfile, undefined);

  const observer = await loginSeededUser("observer@example.test");
  const observerMe = await getMe(request("/api/v1/me", { cookie: observer.cookie }));
  const observerPayload = await body<{
    data: { roles: string[]; adminRoles: string[]; observerProfile: { partnerName: string } };
  }>(observerMe);
  assert.deepEqual(observerPayload.data.roles, ["observer"]);
  assert.deepEqual(observerPayload.data.adminRoles, []);
  assert.equal(observerPayload.data.observerProfile.partnerName, "本地测试合作方");
});

test.after(async () => {
  if (shouldRun) await disconnectPrisma();
});
