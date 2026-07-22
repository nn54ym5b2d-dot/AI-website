import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { CheckoutWorkspace } from "@/components/transactions/checkout-workspace";
import { requireAudience } from "@/lib/auth/page-guard";
import { getBuyerOrder, getCertificationFeeCheckout, listBuyerOrders } from "@/lib/transactions/service";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ orderId?: string; certificationFeeChargeId?: string }> }) {
  const access = await requireAudience("/checkout", ["buyer", "uploader"]);
  const query = await searchParams;
  const resource = query.orderId
    ? { kind: "order" as const, value: await getBuyerOrder(access, query.orderId) }
    : query.certificationFeeChargeId
      ? { kind: "certification_fee" as const, value: await getCertificationFeeCheckout(access, query.certificationFeeChargeId) }
      : null;
  if (resource?.kind === "order" && resource.value.status === "paid") {
    redirect(`/account/downloads?payment=success&orderId=${resource.value.id}`);
  }
  const orders = !resource && access.roles.includes("buyer") ? await listBuyerOrders(access) : [];

  return (
    <PageShell actions={<SecondaryLink href="/materials">继续浏览素材</SecondaryLink>} description="本页运行可验证的本地测试支付流程；真实微信支付和支付宝商户网关尚未接入。" eyebrow="Local test checkout" title="订单与认证费结算">
      {resource ? <CheckoutWorkspace resource={resource} /> : (
        <section className="ui-panel overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">选择待支付订单</h2><p className="mt-1 text-xs text-muted">服务端订单草稿刷新后仍保留。</p></div>
          <div className="divide-y divide-line">{orders.filter((order) => order.status === "pending_payment").map((order) => <Link className="flex items-center justify-between gap-4 p-5 hover:bg-paper" href={`/checkout?orderId=${order.id}`} key={order.id}><div><strong className="text-sm text-ink">{order.orderNo}</strong><p className="mt-1 text-xs text-muted">{order.items.length} 份素材</p></div><span className="font-semibold text-brand">¥{(order.totalAmountCents / 100).toFixed(2)}</span></Link>)}{!orders.some((order) => order.status === "pending_payment") ? <p className="p-6 text-sm text-muted">当前没有待支付订单，请先从素材详情加入待购清单。</p> : null}</div>
        </section>
      )}
    </PageShell>
  );
}
