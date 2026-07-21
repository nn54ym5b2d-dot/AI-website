import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listBuyerOrders } from "@/lib/transactions/service";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const access = await requireAudience("/account/purchases", ["buyer"]);
  const orders = await listBuyerOrders(access);
  return (
    <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description="订单、明细价格快照和支付状态均来自真实 PostgreSQL。" eyebrow="My workspace" title="我的购买">
      <div className="grid gap-4">
        {orders.map((order) => (
          <article className="ui-panel p-5" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-bold text-ink">{order.orderNo}</h2><p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString("zh-CN")} · {order.items.length} 份素材</p></div>
              <span className="rounded-full bg-paper px-3 py-1 text-xs text-muted">{order.status}</span>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {order.items.map((item: { id: string; title: string; priceCents: number }) => <div className="flex justify-between gap-4 py-3 text-sm" key={item.id}><span className="text-ink">{item.title}</span><span className="text-muted">¥{(item.priceCents / 100).toFixed(2)}</span></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between"><strong className="text-brand">¥{(order.totalAmountCents / 100).toFixed(2)}</strong>{order.status === "pending_payment" ? <Link className="ui-button-primary" href={`/checkout?orderId=${order.id}`}>继续支付</Link> : null}</div>
          </article>
        ))}
        {!orders.length ? <p className="ui-panel p-6 text-sm text-muted">尚无购买订单。</p> : null}
      </div>
    </PageShell>
  );
}
