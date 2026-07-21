import Link from "next/link";
import { ArrowRight, CheckCircle, FileMagnifyingGlass, Images, WarningCircle, UsersThree } from "@phosphor-icons/react/ssr";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { canAccessAudience, requireAdminPage } from "@/lib/auth/page-guard";
import { adminRoutes } from "@/lib/domain/navigation";
import { getAdminDashboard } from "@/lib/admin/assets";
import { getTransactionMetrics } from "@/lib/transactions/service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await requireAdminPage("/admin");
  const visibleRoutes = adminRoutes.filter((route) => canAccessAudience(access, route.audiences));
  const contentAdmin = access.adminRoles.some((role) => role === "super_admin" || role === "operator");
  const [dashboard, transactionMetrics] = await Promise.all([contentAdmin ? getAdminDashboard() : null, getTransactionMetrics()]);
  const metrics = dashboard ? [
    { label: "已上架素材", value: dashboard.metrics.listed, icon: Images },
    { label: "待初审", value: dashboard.metrics.pendingReview, icon: FileMagnifyingGlass },
    { label: "认证中", value: dashboard.metrics.certifying, icon: CheckCircle },
    { label: "认证异常", value: dashboard.metrics.certificationException, icon: WarningCircle }
  ] : [];

  return (
    <PageShell
      actions={
        <>
          <LogoutButton label="退出账号" />
          <SecondaryLink href="/observer">观察员只读入口</SecondaryLink>
        </>
      }
      description={`当前以 ${access.user.displayName} 登录。所有后台权限继续由服务端按有效子角色检查。`}
      eyebrow="Operations"
      title="管理后台"
    >
      <div className="grid gap-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["订单总数", transactionMetrics.orders],
            ["已支付订单", transactionMetrics.paidOrders],
            ["成功支付", transactionMetrics.successfulPayments],
            ["待处理退款", transactionMetrics.pendingRefunds],
            ["有效授权", transactionMetrics.activeAuthorizations]
          ].map(([label, value]) => <article className="ui-panel p-5" key={String(label)}><span className="text-xs text-muted">{label}</span><strong className="mt-4 block text-3xl text-ink">{value}</strong><span className="mt-2 block text-xs text-muted">真实交易数据库计数</span></article>)}
        </section>
        {dashboard ? (
          <>
            <div className="rounded-lg border border-warning/25 bg-amber-50 px-4 py-3 text-xs leading-5 text-warning">审核与交易均已接入本地 PostgreSQL；支付为本地测试 provider，真实商户网关、COS 与政府认证服务仍未接入。</div>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ icon: Icon, ...metric }) => <article className="ui-panel p-5" key={metric.label}><div className="flex items-start justify-between"><span className="text-xs font-medium text-muted">{metric.label}</span><span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand"><Icon aria-hidden="true" size={18} weight="duotone" /></span></div><strong className="mt-5 block text-3xl tracking-tight text-ink">{metric.value}</strong><span className="mt-2 block text-xs text-muted">真实本地数据库计数</span></article>)}</section>
            <section className="ui-panel overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4"><div><h2 className="font-bold text-ink">待处理素材</h2><p className="mt-1 text-xs text-muted">按提交时间排序</p></div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand" href="/admin/review">查看全部<ArrowRight aria-hidden="true" size={15} /></Link></div><div className="divide-y divide-line">{dashboard.pendingAssets.map((asset) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={asset.id}><div><strong className="text-sm text-ink">{asset.title}</strong><p className="mt-1 text-xs text-muted">{asset.assetType} · {asset.uploaderDisplayName}</p></div><span className="text-xs text-warning">待初审</span><Link className="text-sm font-semibold text-brand" href={`/admin/assets/${asset.id}`}>查看</Link></article>)}{!dashboard.pendingAssets.length && <p className="p-5 text-sm text-muted">当前没有待初审素材。</p>}</div></section>
          </>
        ) : <div className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted">当前为财务管理员，只显示有权访问的后台模块；素材审核、认证和敏感文件不可见。</div>}
        <section><div className="mb-4 flex items-center gap-2"><UsersThree aria-hidden="true" className="text-brand" size={22} /><h2 className="text-lg font-bold text-ink">可用后台模块</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleRoutes.filter((route) => route.href !== "/admin").map((route) => <Link className="ui-panel group p-5 transition hover:border-brand/40 hover:shadow-card" href={route.href} key={route.href}><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink group-hover:text-brand">{route.title}</h3><p className="mt-2 text-xs leading-5 text-muted">{route.description}</p></div><ArrowRight aria-hidden="true" className="mt-0.5 shrink-0 text-muted group-hover:text-brand" size={17} /></div></Link>)}</div></section>
      </div>
    </PageShell>
  );
}
