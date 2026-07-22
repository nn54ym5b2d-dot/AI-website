import Link from "next/link";
import { ArrowRight, DownloadSimple, FileText } from "@phosphor-icons/react/ssr";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageShell } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { buyerAccountRoutes } from "@/lib/domain/navigation";
import { getAccountSummary } from "@/lib/account/summary";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const access = await requireAudience("/account", ["buyer"]);
  const summary = await getAccountSummary(access);
  const quickItems = [
    {
      href: "/account/purchases",
      label: `我的购买 · ${summary.purchases.availability}`,
      value: String(summary.purchases.count),
      icon: FileText
    },
    {
      href: "/account/downloads",
      label: `可下载 · ${summary.downloads.availability}`,
      value: String(summary.downloads.count),
      icon: DownloadSimple
    }
  ];
  const buyerRoutes = buyerAccountRoutes.filter((route) => route.href !== "/account");
  const uploaderActive = access.roles.includes("uploader") && access.uploaderProfile?.status === "active";

  return (
    <PageShell
      actions={
        <>
          <Link className="ui-button-primary" href={uploaderActive ? "/account/uploader" : "/upload"}>
            {uploaderActive ? "进入上传者中心" : "开通上传资格"}
          </Link>
          <LogoutButton />
        </>
      }
      description={`你好，${access.user.displayName}。这里仅展示你的购买、授权和下载；上传业务在独立上传者中心管理。`}
      eyebrow="Buyer workspace"
      title="购买者中心"
    >
      <div className="grid gap-8">
        <section className="grid gap-4 sm:grid-cols-2">
          {quickItems.map(({ icon: Icon, ...item }) => (
            <Link
              className="ui-panel group p-5 transition hover:border-brand/40 hover:shadow-card"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
                  <Icon aria-hidden="true" size={20} weight="duotone" />
                </span>
                <ArrowRight aria-hidden="true" className="text-muted group-hover:text-brand" size={17} />
              </div>
              <strong className="mt-5 block text-2xl text-ink">{item.value}</strong>
              <span className="mt-1 block text-xs text-muted">{item.label}</span>
            </Link>
          ))}
        </section>

        <section className="ui-panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold text-ink">购买者功能</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {buyerRoutes.map((route) => (
              <Link
                className="group border-b border-line p-5 transition hover:bg-paper sm:border-r"
                href={route.href}
                key={route.href}
              >
                <span className="text-sm font-semibold text-ink group-hover:text-brand">{route.title}</span>
                <p className="mt-2 text-xs leading-5 text-muted">{route.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
