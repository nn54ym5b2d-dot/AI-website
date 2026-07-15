import assert from "node:assert/strict";
import test from "node:test";

import { adminRoutes, routesForAudience } from "../lib/domain/navigation.ts";

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
