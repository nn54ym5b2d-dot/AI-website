import { notFound } from "next/navigation";
import { CheckCircle, Clock, DotsThree, FileText } from "@phosphor-icons/react/ssr";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { accountRoutes, findRouteBySlug } from "@/lib/domain/navigation";

type AccountSectionPageProps = { params: Promise<{ section: string }> };
export const dynamic = "force-dynamic";
export function generateStaticParams() { return accountRoutes.filter((route) => route.slug).map((route) => ({ section: route.slug as string })); }

const rows = [
  { name: "都市青年｜自然光人物参考", id: "YSK-P-000128", state: "已完成", date: "2026-07-14" },
  { name: "复古金属台灯｜工业质感", id: "YSK-O-000067", state: "处理中", date: "2026-07-12" },
  { name: "废弃厂房｜阴天工业场景", id: "YSK-S-000214", state: "已完成", date: "2026-07-08" }
];

export default async function AccountSectionPage({ params }: AccountSectionPageProps) {
  const { section } = await params;
  const route = findRouteBySlug(accountRoutes, section);
  if (!route) notFound();
  await requireAudience(route.href, route.audiences);
  return (
    <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description={`${route.description} 以下内容用于验证列表层级、状态与手机适配，不代表真实业务记录。`} eyebrow="My workspace" title={route.title}>
      <section className="ui-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="font-bold text-ink">最近记录</h2><p className="mt-1 text-xs text-muted">共 3 条演示数据</p></div><span className="demo-label">演示数据</span></div><div className="divide-y divide-line">{rows.map((row) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={row.id}><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-muted"><FileText aria-hidden="true" size={19} /></span><div><h3 className="text-sm font-semibold text-ink">{row.name}</h3><p className="mt-1 text-xs text-muted">{row.id} · {row.date}</p></div></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.state === "已完成" ? "bg-emerald-50 text-success" : "bg-amber-50 text-warning"}`}>{row.state === "已完成" ? <CheckCircle aria-hidden="true" size={14} weight="fill" /> : <Clock aria-hidden="true" size={14} weight="fill" />}{row.state}</span><button aria-label={`查看 ${row.name} 更多操作`} className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink" type="button"><DotsThree aria-hidden="true" size={22} weight="bold" /></button></article>)}</div></section>
    </PageShell>
  );
}
