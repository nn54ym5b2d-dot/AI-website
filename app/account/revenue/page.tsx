import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { getUploaderRevenueSummary, listUploaderRevenue } from "@/lib/revenue/service";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const access = await requireUploaderPage("/account/revenue");
  const [records, summary] = await Promise.all([listUploaderRevenue(access), getUploaderRevenueSummary(access)]);
  const metrics = [["累计初始收益", summary.initialUploaderAmountCents], ["已冲正", summary.reversedUploaderAmountCents], ["当前净收益", summary.netUploaderAmountCents], ["待结算记录金额", summary.pendingSettlementAmountCents]] as const;
  return <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description="仅展示当前上传者本人收益；金额、比例和冲正均来自成交时不可变快照。" eyebrow="Creator revenue" title="收益记录"><div className="grid gap-7"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, amount]) => <article className="ui-panel p-5" key={label}><span className="text-xs text-muted">{label}</span><strong className="mt-4 block text-2xl text-ink">¥{(amount / 100).toFixed(2)}</strong></article>)}</section><section className="ui-panel overflow-hidden"><div className="divide-y divide-line">{records.map((record) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center" key={record.id}><div><strong className="text-sm text-ink">{record.assetTitle}</strong><p className="mt-1 text-xs text-muted">{record.recordType === "initial" ? "成交收益" : "退款/撤销冲正"} · {record.status} · {new Date(record.createdAt).toLocaleString("zh-CN")}</p></div><strong className={record.uploaderAmountCents < 0 ? "text-danger" : "text-success"}>{record.uploaderAmountCents < 0 ? "−" : "+"}¥{(Math.abs(record.uploaderAmountCents) / 100).toFixed(2)}</strong></article>)}{!records.length ? <p className="p-6 text-sm text-muted">尚无收益记录。</p> : null}</div></section></div></PageShell>;
}
