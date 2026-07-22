"use client";

import { useEffect, useId, useState } from "react";

type PeriodType = "day" | "week" | "month" | "custom";
type Dashboard = {
  period: { periodType: PeriodType; startAt: string; endAt: string };
  partner: { name: string };
  metrics: { uploadedAssets: number; certifiedListedAssets: number; purchases: number; downloads: number; paidOrders: number };
  revenue: {
    grossOrderAmountCents: number;
    paidOrderAmountCents: number;
    refundAmountCents: number;
    netRevenueCents: number;
    platformShareAmountCents: number;
    uploaderShareAmountCents: number;
    transactionRevenuePaidCents: number;
    transactionRevenueRefundCents: number;
    transactionRevenueCents: number;
    uploadFeePaidCents: number;
    uploadFeeRefundCents: number;
    uploadRevenueCents: number;
    currency: "CNY";
  };
  share: { shareBaseAmountCents: number; shareRate: number; expectedShareAmountCents: number; settledShareAmountCents: number; pendingShareAmountCents: number; status: string };
};
type AssetSummary = { assetTypes: Array<{ assetType: "person" | "object" | "scene"; uploadedAssets: number; certifiedListedAssets: number; purchases: number; transactionRevenueCents: number; downloads: number }> };
type ShareRecords = { records: Array<{ id?: string; shareBaseAmountCents: number; shareRate: number; expectedShareAmountCents: number; settledShareAmountCents: number; pendingShareAmountCents: number; status: string }> };

const typeLabels = { person: "人物", object: "物件 / 道具", scene: "场景" } as const;
const periodLabels: Record<PeriodType, string> = { day: "日", week: "周", month: "月", custom: "自定义" };
const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
const dateInput = (date: Date) => date.toISOString().slice(0, 10);

async function fetchData<T>(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "经营汇总读取失败。");
  return payload.data as T;
}

function RevenueMetricCard({
  explanation,
  incomeCents,
  incomeLabel,
  label,
  refundCents,
  refundLabel,
  valueCents
}: {
  explanation: string;
  incomeCents: number;
  incomeLabel: string;
  label: string;
  refundCents: number;
  refundLabel: string;
  valueCents: number;
}) {
  const detailId = useId();
  const explanationId = useId();
  const [expanded, setExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <article className="ui-panel relative flex min-h-[196px] flex-col overflow-hidden">
      <button
        aria-controls={detailId}
        aria-expanded={expanded}
        className="flex flex-1 flex-col items-start p-5 pb-12 text-left transition-colors hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="text-xs text-muted">{label}</span>
        <strong className="mt-4 block text-3xl text-ink">{money(valueCents)}</strong>
        {expanded ? (
          <dl className="mt-4 grid w-full gap-2 border-t border-line pt-3 text-xs" id={detailId}>
            <div className="flex justify-between gap-3"><dt className="text-muted">{incomeLabel}</dt><dd className="font-semibold text-ink">{money(incomeCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{refundLabel}</dt><dd className="font-semibold text-ink">{money(refundCents)}</dd></div>
          </dl>
        ) : <span className="mt-2 block text-xs text-muted">点击查看收支明细</span>}
      </button>
      {showExplanation ? <p className="mx-5 mb-14 rounded-md bg-paper p-3 text-xs leading-5 text-muted" id={explanationId}>{explanation}</p> : null}
      <button
        aria-controls={explanationId}
        aria-expanded={showExplanation}
        aria-label={`查看${label}计算方法`}
        className="absolute bottom-4 right-4 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-xs font-bold text-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setShowExplanation((current) => !current)}
        type="button"
      >
        ?
      </button>
    </article>
  );
}

export function ObserverDashboard() {
  const today = dateInput(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [query, setQuery] = useState("periodType=day");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [assets, setAssets] = useState<AssetSummary | null>(null);
  const [shares, setShares] = useState<ShareRecords | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchData<Dashboard>(`/api/v1/observer/dashboard?${query}`),
      fetchData<AssetSummary>(`/api/v1/observer/assets-summary?${query}`),
      fetchData<ShareRecords>(`/api/v1/observer/share-records?${query}`)
    ]).then(([dashboardData, assetsData, shareData]) => {
      if (!cancelled) { setDashboard(dashboardData); setAssets(assetsData); setShares(shareData); }
    }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "经营汇总读取失败。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  function choosePeriod(next: PeriodType) {
    setPeriodType(next);
    if (next !== "custom") {
      setLoading(true);
      setMessage("");
      setQuery(`periodType=${next}`);
    }
  }

  function applyCustom() {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const endInclusive = new Date(`${endDate}T00:00:00.000Z`);
    const endExclusive = new Date(endInclusive.getTime() + 86_400_000);
    setLoading(true);
    setMessage("");
    setQuery(`periodType=custom&startAt=${encodeURIComponent(start.toISOString())}&endAt=${encodeURIComponent(endExclusive.toISOString())}`);
  }

  const share = shares?.records[0] ?? dashboard?.share;

  return (
    <div className="grid gap-6">
      <section className="ui-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-bold text-ink">统计周期</h2><p className="mt-1 text-xs leading-5 text-muted">可查看日、周、月或最长一年的自定义区间；所有结果均为汇总快照。</p></div>
          <div className="flex flex-wrap gap-2">{(["day", "week", "month", "custom"] as PeriodType[]).map((item) => <button className={periodType === item ? "ui-button-primary" : "ui-button-secondary"} key={item} onClick={() => choosePeriod(item)} type="button">{periodLabels[item]}</button>)}</div>
        </div>
        {periodType === "custom" ? <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="grid gap-2 text-sm"><span className="text-muted">开始日期</span><input className="ui-input" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label><label className="grid gap-2 text-sm"><span className="text-muted">结束日期</span><input className="ui-input" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></label><button className="ui-button-primary" onClick={applyCustom} type="button">应用区间</button></div> : null}
        {dashboard ? <p className="mt-4 text-sm leading-6 text-muted">当前快照：{new Date(dashboard.period.startAt).toLocaleString("zh-CN")} 至 {new Date(dashboard.period.endAt).toLocaleString("zh-CN")}</p> : null}
      </section>

      {message ? <div aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div> : null}
      {loading ? <div className="ui-panel p-6 text-sm text-muted">正在读取真实汇总快照…</div> : null}

      {dashboard ? <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RevenueMetricCard
            explanation="交易收益 = 本周期全部素材交易支付 − 本周期交易退回，按素材成交金额的 100% 统计；其中包含上传者分成和平台分成，不代表平台最终利润。"
            incomeCents={dashboard.revenue.transactionRevenuePaidCents}
            incomeLabel="交易支付"
            label="交易收益"
            refundCents={dashboard.revenue.transactionRevenueRefundCents}
            refundLabel="交易退回"
            valueCents={dashboard.revenue.transactionRevenueCents}
          />
          <RevenueMetricCard
            explanation="上传收益 = 本周期成功支付的认证上传费 − 本周期成功退回的认证上传费；待支付、支付失败和退款待办不计入。"
            incomeCents={dashboard.revenue.uploadFeePaidCents}
            incomeLabel="上传费支付"
            label="上传收益"
            refundCents={dashboard.revenue.uploadFeeRefundCents}
            refundLabel="上传费退回"
            valueCents={dashboard.revenue.uploadRevenueCents}
          />
          {[
            ["新增上传", dashboard.metrics.uploadedAssets],
            ["新认证上架", dashboard.metrics.certifiedListedAssets],
            ["购买次数", dashboard.metrics.purchases],
            ["下载次数", dashboard.metrics.downloads],
            ["已支付订单", dashboard.metrics.paidOrders]
          ].map(([label, value]) => <article className="ui-panel min-h-[196px] p-5" key={String(label)}><span className="text-xs text-muted">{label}</span><strong className="mt-4 block text-3xl text-ink">{value}</strong><span className="mt-2 block text-xs text-muted">只读周期汇总</span></article>)}
        </section>

        <section className="ui-panel overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">分类型汇总</h2><p className="mt-1 text-xs text-muted">只展示人物、物件 / 道具、场景聚合，不能下钻素材明细。</p></div>
          <div className="overflow-x-auto"><table className="min-w-[760px] text-left text-sm"><thead className="bg-paper text-xs text-muted"><tr><th className="px-5 py-3">类型</th><th className="px-5 py-3">上传</th><th className="px-5 py-3">认证上架</th><th className="px-5 py-3">购买</th><th className="px-5 py-3">交易收益</th><th className="px-5 py-3">下载</th></tr></thead><tbody className="divide-y divide-line">{assets?.assetTypes.map((item) => <tr key={item.assetType}><th className="px-5 py-4 font-semibold text-ink">{typeLabels[item.assetType]}</th><td className="px-5 py-4 text-muted">{item.uploadedAssets}</td><td className="px-5 py-4 text-muted">{item.certifiedListedAssets}</td><td className="px-5 py-4 text-muted">{item.purchases}</td><td className="px-5 py-4 text-muted">{money(item.transactionRevenueCents)}</td><td className="px-5 py-4 text-muted">{item.downloads}</td></tr>)}</tbody></table></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="ui-panel p-5"><h2 className="font-bold text-ink">收入汇总</h2><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">交易支付</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.transactionRevenuePaidCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">交易退回</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.transactionRevenueRefundCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">交易收益</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.transactionRevenueCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">上传者分成</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.uploaderShareAmountCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">平台分成</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.platformShareAmountCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">上传收益</dt><dd className="font-semibold text-ink">{money(dashboard.revenue.uploadRevenueCents)}</dd></div></dl></article>
          <article className="ui-panel p-5"><h2 className="font-bold text-ink">当前合作方分成</h2><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">分成基数</dt><dd className="font-semibold text-ink">{money(share?.shareBaseAmountCents ?? 0)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">分成比例</dt><dd className="font-semibold text-ink">{((share?.shareRate ?? 0) * 100).toFixed(2)}%</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">预计分成</dt><dd className="font-semibold text-ink">{money(share?.expectedShareAmountCents ?? 0)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">已结算</dt><dd className="font-semibold text-ink">{money(share?.settledShareAmountCents ?? 0)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">待结算</dt><dd className="font-semibold text-ink">{money(share?.pendingShareAmountCents ?? 0)}</dd></div></dl><p className="mt-4 rounded-md bg-paper p-3 text-xs leading-5 text-muted">首版合作方分成比例和金额均为 0。本看板不提供导出、业务明细或写操作。</p></article>
        </section>
      </> : null}
    </div>
  );
}
