import Link from "next/link";
import { ArrowRight, UploadSimple, Wallet } from "@phosphor-icons/react/ssr";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { uploaderAccountRoutes } from "@/lib/domain/navigation";
import { getAccountSummary } from "@/lib/account/summary";

export const dynamic = "force-dynamic";

export default async function UploaderAccountPage() {
  const access = await requireUploaderPage("/account/uploader");
  const summary = await getAccountSummary(access);
  const quickItems = [
    {
      href: "/account/uploads",
      label: "我的上传 · 真实数据",
      value: String(summary.uploads.count),
      icon: UploadSimple
    },
    {
      href: "/account/revenue",
      label: "购买收益 · 真实数据",
      value: `¥${(summary.revenue.amountCents / 100).toFixed(2)}`,
      icon: Wallet
    }
  ];
  const uploaderRoutes = uploaderAccountRoutes.filter((route) => route.href !== "/account/uploader");

  return (
    <PageShell
      actions={
        <>
          <SecondaryLink href="/account">返回购买者中心</SecondaryLink>
          <SecondaryLink href="/upload">上传素材</SecondaryLink>
          <LogoutButton />
        </>
      }
      description={`你好，${access.user.displayName}。这里仅展示你的上传、审核状态、收益和上传者资料；购买业务请返回购买者中心。`}
      eyebrow="Uploader workspace"
      title="上传者中心"
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
            <h2 className="font-bold text-ink">上传者功能</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {uploaderRoutes.map((route) => (
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
