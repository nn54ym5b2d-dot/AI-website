import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { accountRoutes, findRouteBySlug } from "@/lib/domain/navigation";

type Props = { params: Promise<{ section: string }> };
export const dynamic = "force-dynamic";
const ownerBySection: Record<string, string> = { purchases: "T013", licenses: "T013", downloads: "T014", revenue: "T014" };

export default async function AccountSectionPage({ params }: Props) {
  const { section } = await params;
  const route = findRouteBySlug(accountRoutes, section);
  const owner = ownerBySection[section];
  if (!route || !owner) notFound();
  await requireAudience(route.href, route.audiences);
  return <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description={route.description} eyebrow="My workspace" title={route.title}><section className="ui-panel p-6"><h2 className="text-lg font-bold text-ink">当前尚未开放</h2><p className="mt-2 text-sm leading-6 text-muted">该入口属于 {owner}。在真实订单、授权、下载或收益数据库闭环完成前，本页不显示假记录、演示金额或无行为按钮。</p><button className="ui-button-secondary mt-5" disabled type="button">等待 {owner} 实现</button></section></PageShell>;
}
