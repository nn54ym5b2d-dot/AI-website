import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { accountRoutes } from "@/lib/domain/navigation";

export default function AccountPage() {
  return (
    <PageShell
      actions={<SecondaryLink href="/upload">上传者入口</SecondaryLink>}
      description="个人中心覆盖购买用户和上传者。当前只做入口骨架，真实登录状态和权限控制留到 T009。"
      title="个人中心"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">购买用户页面</h2>
          <div className="mt-5">
            <RouteCardGrid
              routes={accountRoutes.filter((route) => route.roleEntry.includes("购买用户"))}
            />
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink">上传者页面</h2>
          <div className="mt-5">
            <RouteCardGrid
              routes={accountRoutes.filter((route) => route.roleEntry.includes("上传者"))}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
