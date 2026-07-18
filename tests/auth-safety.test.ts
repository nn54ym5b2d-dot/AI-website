import assert from "node:assert/strict";
import test from "node:test";

import {
  generateDefaultDisplayName,
  selectInitialDisplayName
} from "../lib/auth/display-name.ts";
import { authEntryHref, safeAuthRedirectPath } from "../lib/auth/redirect.ts";

test("默认昵称随机生成，微信昵称会清理控制字符并限制长度", () => {
  const first = generateDefaultDisplayName();
  const second = generateDefaultDisplayName();
  assert.match(first, /^源素用户·[0-9A-F]{8}$/);
  assert.match(second, /^源素用户·[0-9A-F]{8}$/);
  assert.notEqual(first, second);
  assert.equal(selectInitialDisplayName("  微信\u200B昵称\u202E  "), "微信昵称");
  assert.equal(Array.from(selectInitialDisplayName("用".repeat(50))).length, 40);
  assert.match(selectInitialDisplayName("\u200B\u202E"), /^源素用户·[0-9A-F]{8}$/);
});

test("登录完成只允许站内 next 路径", () => {
  assert.equal(safeAuthRedirectPath("/upload?from=login#ready"), "/upload?from=login#ready");
  assert.equal(safeAuthRedirectPath("https://evil.example/path"), "/");
  assert.equal(safeAuthRedirectPath("//evil.example/path"), "/");
  assert.equal(safeAuthRedirectPath("/\\evil.example/path"), "/");
  assert.equal(safeAuthRedirectPath("\\\\evil.example/path"), "/");
  assert.equal(safeAuthRedirectPath("account"), "/");
  assert.equal(safeAuthRedirectPath(), "/");
  assert.equal(authEntryHref("/"), "/login?next=%2F");
  assert.equal(authEntryHref("/upload"), "/login?next=%2Fupload");
  assert.equal(authEntryHref("https://evil.example/path"), "/login?next=%2F");
});
