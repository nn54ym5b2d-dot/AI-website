"use client";

import Link from "next/link";
import { CheckCircle, CreditCard, ShoppingBagOpen } from "@phosphor-icons/react";
import { useState } from "react";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(priceCents / 100);
}

export function PurchasePanel({ assetId, priceCents }: { assetId: string; priceCents: number }) {
  const [saved, setSaved] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"save" | "checkout" | null>(null);

  async function addToDraft(action: "save" | "checkout") {
    setBusyAction(action); setMessage("");
    const fallbackMessage = action === "checkout" ? "暂时无法进入结算，请稍后重试。" : "加入待购清单失败。";
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
      if (csrfResponse.status === 401) { window.location.href = `/login?next=${encodeURIComponent(`/materials/${assetId}`)}`; return; }
      const csrf = await csrfResponse.json() as { data?: { csrfToken: string } };
      const response = await fetch("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf.data?.csrfToken ?? "", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ assetIds: [assetId] }) });
      const payload = await response.json() as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? fallbackMessage);
      if (action === "checkout") {
        window.location.assign(`/checkout?orderId=${encodeURIComponent(payload.data.id)}`);
        return;
      }
      setSaved(true); setOrderId(payload.data.id); setMessage("已保存到服务端待购订单，刷新或换页面后仍可恢复。");
    } catch (error) { setMessage(error instanceof Error ? error.message : fallbackMessage); }
    finally { setBusyAction(null); }
  }
  return (
    <div className="border-t border-line pt-5">
      <div className="flex items-baseline justify-between gap-4"><span className="text-sm text-muted">统一商业授权</span><strong className="text-3xl tracking-tight text-brand">{formatPrice(priceCents)}</strong></div>
      <p className="mt-3 text-xs leading-5 text-muted">结算价格由服务端重新读取系统设置并保存订单明细快照，页面金额不能覆盖成交价。</p>
      {saved ? <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-success"><CheckCircle aria-hidden="true" size={18} weight="fill" />已加入本次本地待购清单</div> : null}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button className="ui-button-primary w-full" disabled={busyAction !== null} onClick={() => addToDraft("checkout")} type="button"><CreditCard aria-hidden="true" size={18} weight="bold" />{busyAction === "checkout" ? "正在前往结算…" : "立即购买"}</button>
        <button className="ui-button-secondary w-full" disabled={busyAction !== null} onClick={() => addToDraft("save")} type="button"><ShoppingBagOpen aria-hidden="true" size={18} weight="bold" />{busyAction === "save" ? "正在保存…" : "加入待购清单"}</button>
      </div>
      {orderId ? <Link className="ui-button-secondary mt-2 w-full" href={`/checkout?orderId=${encodeURIComponent(orderId)}`}>前往结算</Link> : null}
      {message ? <p className="mt-3 text-xs leading-5 text-muted">{message}</p> : null}
    </div>
  );
}
