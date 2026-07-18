import { notFound } from "next/navigation";
import { CheckCircle, Clock } from "@phosphor-icons/react/ssr";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { adminRoutes, findRouteBySlug } from "@/lib/domain/navigation";

type AdminSectionPageProps = { params: Promise<{ section: string }> };
export const dynamic = "force-dynamic";
export function generateStaticParams() { return adminRoutes.filter((route) => route.slug).map((route) => ({ section: route.slug as string })); }

export default async function AdminSectionPage({ params }: AdminSectionPageProps) {
  const { section } = await params;
  const route = findRouteBySlug(adminRoutes, section);
  if (!route) notFound();
  await requireAudience(route.href, route.audiences);
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description={`${route.description} 当前仅演示筛选、列表和状态层级，不执行真实后台操作。`} eyebrow="Operations" title={route.title}>
      <section className="ui-panel overflow-hidden"><div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_180px_auto]"><label><span className="sr-only">搜索后台记录</span><input className="ui-input" placeholder="搜索编号、名称或用户" /></label><label><span className="sr-only">筛选后台记录状态</span><select className="ui-input"><option>全部状态</option><option>待处理</option><option>已完成</option></select></label><button className="ui-button-secondary" type="button">筛选</button></div><div className="divide-y divide-line">{["YSK-P-000231", "YSK-S-000449", "YSK-O-000103"].map((id, index) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={id}><div><strong className="text-sm text-ink">{["咖啡店青年人物组", "雨夜街道路口", "旧式磁带录音机"][index]}</strong><p className="mt-1 text-xs text-muted">{id} · 演示记录</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${index === 2 ? "bg-emerald-50 text-success" : "bg-amber-50 text-warning"}`}>{index === 2 ? <CheckCircle aria-hidden="true" size={14} weight="fill" /> : <Clock aria-hidden="true" size={14} weight="fill" />}{index === 2 ? "已完成" : "待处理"}</span><button className="text-left text-sm font-semibold text-brand sm:text-right" type="button">查看详情</button></article>)}</div></section>
    </PageShell>
  );
}
