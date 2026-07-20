import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { adminRoutes, findRouteBySlug } from "@/lib/domain/navigation";

type Props = { params: Promise<{ section: string }> };
export const dynamic = "force-dynamic";
const ownerBySection: Record<string, string> = { orders: "T013", payments: "T013", licenses: "T013", revenue: "T014", "observer-accounts": "T015" };

export default async function AdminSectionPage({ params }: Props) {
  const { section } = await params;
  const route = findRouteBySlug(adminRoutes, section);
  const owner = ownerBySection[section];
  if (!route || !owner) notFound();
  await requireAudience(route.href, route.audiences);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description={route.description} eyebrow="Operations" title={route.title}><section className="ui-panel p-6"><h2 className="text-lg font-bold text-ink">当前尚未开放</h2><p className="mt-2 text-sm leading-6 text-muted">该正式路由由 {owner} 负责。对应真实数据库与权限流程完成前，本页不展示假记录、伪状态或可点击但无行为的按钮。</p><button className="ui-button-secondary mt-5" disabled type="button">等待 {owner} 实现</button></section></PageShell>;
}
