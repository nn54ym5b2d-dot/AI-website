import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAdminPage } from "@/lib/auth/page-guard";
import { listAdminOrders } from "@/lib/transactions/service";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdminPage("/admin/orders");
  const orders = await listAdminOrders();
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="订单、买家显示名、完整明细和服务端成交快照。" eyebrow="Operations" title="订单管理">
      <div className="grid gap-4">
        {orders.map((order) => <article className="ui-panel p-5" key={order.id}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-ink">{order.orderNo}</h2><p className="mt-1 text-xs text-muted">{order.buyerDisplayName} · {order.items.length} 项</p></div><span className="rounded-full bg-paper px-3 py-1 text-xs text-muted">{order.status}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{order.items.map((item: { id: string; title: string; priceCents: number }) => <div className="rounded-lg border border-line p-3 text-sm" key={item.id}><span className="text-ink">{item.title}</span><span className="float-right text-muted">¥{(item.priceCents / 100).toFixed(2)}</span></div>)}</div></article>)}
        {!orders.length ? <p className="ui-panel p-6 text-sm text-muted">暂无订单。</p> : null}
      </div>
    </PageShell>
  );
}
