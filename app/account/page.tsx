import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { accountRoutes } from "@/lib/domain/navigation";
import { canAccessAudience, requireAudience } from "@/lib/auth/page-guard";
import { InviteActivationForm } from "@/components/auth/invite-activation-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const access = await requireAudience("/account", ["buyer", "uploader"]);
  const visibleRoutes = accountRoutes.filter((route) => canAccessAudience(access, route.audiences));

  return (
    <PageShell
      actions={<SecondaryLink href="/upload">上传者入口</SecondaryLink>}
      description={`你好，${access.user.displayName}。这里仅显示当前账号有效角色可访问的个人中心入口。`}
      title="个人中心"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">购买用户页面</h2>
          <div className="mt-5">
            <RouteCardGrid
              routes={visibleRoutes.filter((route) => route.audiences.includes("buyer"))}
            />
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-ink">上传者页面</h2>
          <div className="mt-5">
            <RouteCardGrid
              routes={visibleRoutes.filter((route) => route.audiences.includes("uploader"))}
            />
          </div>
        </section>
        {!access.roles.includes("uploader") ? <InviteActivationForm /> : null}
      </div>
    </PageShell>
  );
}
