import { LogoutButton } from "@/components/auth/logout-button";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { ObserverDashboard } from "@/components/observer/observer-dashboard";
import { requireObserverPage } from "@/lib/auth/page-guard";

export const dynamic = "force-dynamic";

export default async function ObserverPage() {
  const access = await requireObserverPage("/observer");
  return (
    <PageShell
      actions={<><LogoutButton label="退出账号" /><SecondaryLink href="/">返回首页</SecondaryLink></>}
      description={`${access.observerProfile.partnerName} 只能查看聚合经营快照和自己的分成记录；不允许导出、下钻或访问管理后台。`}
      eyebrow="Partner view"
      title="外部观察员只读看板"
    >
      <ObserverDashboard />
    </PageShell>
  );
}
