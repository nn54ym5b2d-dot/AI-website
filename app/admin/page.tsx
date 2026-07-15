import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { adminRoutes } from "@/lib/domain/navigation";
import { canAccessAudience, requireAdminPage } from "@/lib/auth/page-guard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await requireAdminPage("/admin");
  const visibleRoutes = adminRoutes.filter((route) => canAccessAudience(access, route.audiences));

  return (
    <PageShell
      actions={<SecondaryLink href="/observer">外部观察员只读入口</SecondaryLink>}
      description={`当前以 ${access.user.displayName} 登录。后台入口由服务端同时检查 admin 基础身份和有效后台子角色。`}
      title="管理后台"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">后台模块</h2>
          <div className="mt-5">
            <RouteCardGrid routes={visibleRoutes} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">后台角色边界</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-md border border-line bg-paper p-4">
              <h3 className="text-sm font-semibold text-ink">超级管理员</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                拥有全部后台权限，管理用户、素材、订单、支付、认证、收益、角色和系统设置。
              </p>
            </article>
            <article className="rounded-md border border-line bg-paper p-4">
              <h3 className="text-sm font-semibold text-ink">运营管理员</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                处理素材审核、上架下架、认证录入、订单查看和用户问题。
              </p>
            </article>
            <article className="rounded-md border border-line bg-paper p-4">
              <h3 className="text-sm font-semibold text-ink">财务管理员</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                查看订单、支付、退款和收益记录，不处理素材审核或认证录入。
              </p>
            </article>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
