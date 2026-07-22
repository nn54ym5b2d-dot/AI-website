import assert from "node:assert/strict";
import test from "node:test";

import {
  adminRoutes,
  buyerAccountRoutes,
  routesForAudience,
  uploaderAccountRoutes
} from "../lib/domain/navigation.ts";

test("购买者中心和上传者中心使用独立页面与功能入口", () => {
  const buyerHrefs = buyerAccountRoutes.map((route) => route.href);
  const uploaderHrefs = uploaderAccountRoutes.map((route) => route.href);

  assert.deepEqual(buyerHrefs, [
    "/account",
    "/account/purchases",
    "/account/downloads",
    "/account/licenses"
  ]);
  assert.deepEqual(uploaderHrefs, [
    "/account/uploader",
    "/account/uploads",
    "/account/upload-status",
    "/account/revenue",
    "/account/uploader-profile"
  ]);
  assert.equal(buyerHrefs.some((href) => uploaderHrefs.includes(href)), false);
});

test("运营管理员只能只读查看支付和收益入口，不能进入观察员账号管理", () => {
  const operatorRoutes = routesForAudience(adminRoutes, "operator");
  const slugs = operatorRoutes.map((route) => route.slug);

  assert.ok(slugs.includes("payments"));
  assert.ok(slugs.includes("revenue"));
  assert.equal(slugs.includes("observer-accounts"), false);
});

test("财务管理员不显示内容审核入口", () => {
  const financeRoutes = routesForAudience(adminRoutes, "finance");
  const slugs = financeRoutes.map((route) => route.slug);

  assert.ok(slugs.includes("orders"));
  assert.ok(slugs.includes("payments"));
  assert.equal(slugs.includes("review"), false);
  assert.equal(slugs.includes("assets"), false);
});
