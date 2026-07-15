import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GET as getCurrentTerms } from "../app/api/v1/legal-documents/current/route.ts";
import { POST as createChallenge } from "../app/api/v1/auth/challenges/route.ts";
import { POST as register } from "../app/api/v1/auth/register/route.ts";
import { POST as login } from "../app/api/v1/auth/login/route.ts";
import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { POST as logout } from "../app/api/v1/auth/logout/route.ts";
import { GET as getMe } from "../app/api/v1/me/route.ts";
import { POST as activateInvite } from "../app/api/v1/invites/activate/route.ts";
import { disconnectPrisma, getPrisma } from "../lib/db/prisma.ts";

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
  const registerResponse = await register(
    jsonRequest("/api/v1/auth/register", {
      ...credentials,
      displayName: "新测试用户",
      acceptedTermsVersion: termsVersion
    })
  );
  assert.equal(registerResponse.status, 201);
  const cookie = sessionCookie(registerResponse);
  const registeredUser = await getPrisma().user.findUnique({
    where: { email: "new-user@example.test" },
    include: { termsAcceptances: true }
  });
  assert.equal(registeredUser?.termsAcceptances.length, 1);
  assert.equal(registeredUser?.termsAcceptances[0]?.source, "email_register");
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
      { code: "YSK-LOCAL-UPLOADER-2026", uploaderDisplayName: "新测试上传者" },
      { cookie, origin: appUrl }
    )
  );
  assert.equal(missingCsrfResponse.status, 400);
  const activateResponse = await activateInvite(
    jsonRequest(
      "/api/v1/invites/activate",
      { code: "YSK-LOCAL-UPLOADER-2026", uploaderDisplayName: "新测试上传者" },
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

  const loginCredentials = await challenge("email", "new-user@example.test", "login");
  const loginResponse = await login(jsonRequest("/api/v1/auth/login", loginCredentials));
  assert.equal(loginResponse.status, 200);
  const loginCookie = sessionCookie(loginResponse);
  const logoutCsrf = await csrf(loginCookie);
  const logoutResponse = await logout(
    jsonRequest("/api/v1/auth/logout", {}, {
      cookie: loginCookie,
      origin: appUrl,
      "x-csrf-token": logoutCsrf
    })
  );
  assert.equal(logoutResponse.status, 200);
  assert.equal((await getMe(request("/api/v1/me", { cookie: loginCookie }))).status, 401);
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
