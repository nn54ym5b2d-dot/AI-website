"use client";

import { CheckCircle, Flask, SpinnerGap } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

type Payment = { id: string; paymentNo: string; provider: "wechat_pay" | "alipay"; providerMode: string; amountCents: number; status: string };
type Order = { id: string; orderNo: string; status: string; totalAmountCents: number; currency: string; items: Array<{ id: string; title: string; assetType: string; priceCents: number }>; payments: Payment[] };
type Charge = { id: string; amountCents: number; currency: string; status: string; asset: { title: string; assetType: string; reviewStatus: string; certificationStatus: string }; payments: Payment[] };

async function csrfToken() {
  const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
  const payload = await response.json() as { data?: { csrfToken: string }; error?: { message: string } };
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "安全校验初始化失败。");
  return payload.data.csrfToken;
}

export function CheckoutWorkspace({ resource }: { resource: { kind: "order"; value: Order } | { kind: "certification_fee"; value: Charge } }) {
  const [provider, setProvider] = useState<"wechat_pay" | "alipay">("wechat_pay");
  const [payment, setPayment] = useState<Payment | null>(() => resource.value.payments.find((item) => item.status === "pending") ?? resource.value.payments[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const successful = resource.kind === "order" ? ["paid", "partial_refunded", "refunded"].includes(resource.value.status) : resource.value.status === "success";
  const amount = resource.kind === "order" ? resource.value.totalAmountCents : resource.value.amountCents;
  const endpoint = useMemo(() => resource.kind === "order" ? `/api/v1/orders/${resource.value.id}/payments` : `/api/v1/certification-fee-charges/${resource.value.id}/payments`, [resource]);

  async function startPayment() {
    setBusy(true); setMessage("");
    try {
      const csrf = await csrfToken();
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf, "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ provider }) });
      const payload = await response.json() as { data?: Payment; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "创建支付记录失败。");
      setPayment(payload.data); setMessage("测试支付单已创建。下一步将发送带签名的本地测试回调。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "创建支付记录失败。"); }
    finally { setBusy(false); }
  }

  async function confirmPayment() {
    if (!payment) return;
    setBusy(true); setMessage("");
    try {
      const csrf = await csrfToken();
      const response = await fetch(`/api/v1/payments/${payment.id}/test-confirm`, { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf }, body: "{}" });
      const payload = await response.json() as { error?: { message: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "测试回调处理失败。");
      if (resource.kind === "order") {
        window.location.replace(`/account/downloads?payment=success&orderId=${resource.value.id}`);
        return;
      }
      setMessage("签名、商户号、金额和事件去重校验已通过，业务状态已原子更新。");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) { setMessage(error instanceof Error ? error.message : "测试回调处理失败。"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="ui-panel overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">{resource.kind === "order" ? resource.value.orderNo : "认证上传费"}</h2><p className="mt-1 text-xs text-muted">数据来自 PostgreSQL，成交金额由服务端计算。</p></div>
        {resource.kind === "order" ? <div className="divide-y divide-line">{resource.value.items.map((item) => <div className="flex items-center justify-between gap-4 p-5" key={item.id}><div><strong className="text-sm text-ink">{item.title}</strong><p className="mt-1 text-xs text-muted">{item.assetType} · 完整明细快照</p></div><span className="font-semibold text-ink">¥{(item.priceCents / 100).toFixed(2)}</span></div>)}</div> : <div className="p-5"><strong className="text-sm text-ink">{resource.value.asset.title}</strong><p className="mt-2 text-xs text-muted">支付成功后才会从“等待支付”原子进入“等待审核”。</p></div>}
      </section>
      <aside className="ui-panel p-5">
        <div className="rounded-lg border border-warning/30 bg-amber-50 p-4"><div className="flex gap-3"><Flask className="shrink-0 text-warning" size={22} weight="duotone" /><div><strong className="text-sm text-ink">本地测试 provider</strong><p className="mt-1 text-xs leading-5 text-muted">不调用微信或支付宝生产网关，不使用真实商户密钥。</p></div></div></div>
        <div className="mt-5 flex items-baseline justify-between"><span className="text-sm text-muted">应付金额</span><strong className="text-3xl text-brand">¥{(amount / 100).toFixed(2)}</strong></div>
        {successful ? <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-success"><CheckCircle size={20} weight="fill" />支付已验证完成</div> : <>
          {!payment ? <div className="mt-5 grid grid-cols-2 gap-2"><button className={`ui-button-secondary ${provider === "wechat_pay" ? "border-brand text-brand" : ""}`} onClick={() => setProvider("wechat_pay")} type="button">模拟微信支付</button><button className={`ui-button-secondary ${provider === "alipay" ? "border-brand text-brand" : ""}`} onClick={() => setProvider("alipay")} type="button">模拟支付宝</button></div> : <p className="mt-5 break-all rounded-lg bg-paper p-3 text-xs text-muted">测试支付单：{payment.paymentNo}<br />状态：{payment.status}</p>}
          {!payment ? <button className="ui-button-primary mt-4 w-full" disabled={busy} onClick={startPayment} type="button">{busy ? <SpinnerGap className="animate-spin" size={18} /> : null}创建测试支付单</button> : <button className="ui-button-primary mt-4 w-full" disabled={busy || payment.status !== "pending"} onClick={confirmPayment} type="button">{busy ? <SpinnerGap className="animate-spin" size={18} /> : null}发送签名成功回调</button>}
        </>}
        {message ? <p className="mt-4 text-xs leading-5 text-muted">{message}</p> : null}
      </aside>
    </div>
  );
}
