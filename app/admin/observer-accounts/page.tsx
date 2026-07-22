import { ObserverAccountManager } from "@/components/admin/observer-account-manager";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listObserverAccounts } from "@/lib/admin/observers";

export const dynamic = "force-dynamic";

export default async function ObserverAccountsPage() {
  await requireAudience("/admin/observer-accounts", ["super_admin"]);
  return (
    <PageShell
      actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>}
      description="创建、绑定合作方、启用、禁用或永久撤销观察员只读权限；所有写操作记录审计。"
      eyebrow="Operations"
      title="观察员账号管理"
    >
      <ObserverAccountManager initialAccounts={await listObserverAccounts()} />
    </PageShell>
  );
}
