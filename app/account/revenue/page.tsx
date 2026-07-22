import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { getUploaderRevenueSummary } from "@/lib/revenue/service";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const access = await requireUploaderPage("/account/revenue");
  const summary = await getUploaderRevenueSummary(access);
  return <PageShell actions={<SecondaryLink href="/account/uploader">返回上传者中心</SecondaryLink>} description="仅已开通且有效的上传者可查看；统计已支付且未退款或撤销的素材购买，收益按成交时分成快照计算。" eyebrow="Creator revenue" title="收益记录"><div className="grid gap-7"><section className="grid gap-4 sm:grid-cols-2"><article className="ui-panel p-5"><span className="text-xs text-muted">素材总购买次数</span><strong className="mt-4 block text-2xl text-ink">{summary.totalPurchaseCount} 次</strong></article><article className="ui-panel p-5"><span className="text-xs text-muted">购买收益</span><strong className="mt-4 block text-2xl text-ink">¥{(summary.totalPurchaseRevenueCents / 100).toFixed(2)}</strong><p className="mt-2 text-xs leading-5 text-muted">这是上传者实际分成收益；退款或撤销的购买已扣除。</p></article></section><section className="ui-panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">各素材购买情况</h2><p className="mt-1 text-xs text-muted">按有效购买次数排序，同一素材汇总展示。</p></div><div className="divide-y divide-line">{summary.products.map((product) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={product.assetId}><strong className="text-sm text-ink">{product.assetTitle}</strong><span className="text-sm text-muted">购买 {product.purchaseCount} 次</span><strong className="text-success">收益 ¥{(product.purchaseRevenueCents / 100).toFixed(2)}</strong></article>)}{!summary.products.length ? <p className="p-6 text-sm text-muted">你的素材还没有产生有效购买。</p> : null}</div></section><p className="text-xs leading-5 text-muted">当前页面只展示素材购买产生的收益，不代表可提现余额；真实提现与结算尚未接入。</p></div></PageShell>;
}
