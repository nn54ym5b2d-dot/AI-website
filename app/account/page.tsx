import Link from "next/link";
import { ArrowRight, DownloadSimple, FileText, UploadSimple, Wallet } from "@phosphor-icons/react/ssr";
import { InviteActivationForm } from "@/components/auth/invite-activation-form";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { canAccessAudience, requireAudience } from "@/lib/auth/page-guard";
import { accountRoutes } from "@/lib/domain/navigation";

export const dynamic = "force-dynamic";

const quickItems = [
  { href: "/account/purchases", label: "我的购买", value: "3", icon: FileText },
  { href: "/account/downloads", label: "可下载", value: "2", icon: DownloadSimple },
  { href: "/account/uploads", label: "我的上传", value: "5", icon: UploadSimple },
  { href: "/account/revenue", label: "演示收益", value: "¥120", icon: Wallet }
];

export default async function AccountPage() {
  const access = await requireAudience("/account", ["buyer", "uploader"]);
  const visibleRoutes = accountRoutes.filter((route) => canAccessAudience(access, route.audiences));
  const visibleHrefs = new Set(visibleRoutes.map((route) => route.href));
  return (
    <PageShell actions={<SecondaryLink href="/upload">上传素材</SecondaryLink>} description={`你好，${access.user.displayName}。购买、下载、授权、上传与收益入口会按账号有效角色显示。`} eyebrow="My workspace" title="个人中心">
      <div className="grid gap-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{quickItems.filter((item) => visibleHrefs.has(item.href)).map(({ icon: Icon, ...item }) => <Link className="ui-panel group p-5 transition hover:border-brand/40 hover:shadow-card" href={item.href} key={item.href}><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand"><Icon aria-hidden="true" size={20} weight="duotone" /></span><ArrowRight aria-hidden="true" className="text-muted group-hover:text-brand" size={17} /></div><strong className="mt-5 block text-2xl text-ink">{item.value}</strong><span className="mt-1 block text-xs text-muted">{item.label} · 演示数据</span></Link>)}</section>
        <section className="ui-panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">我的功能</h2></div><div className="grid sm:grid-cols-2 lg:grid-cols-3">{visibleRoutes.filter((route) => route.href !== "/account").map((route) => <Link className="group border-b border-line p-5 transition hover:bg-paper sm:border-r" href={route.href} key={route.href}><span className="text-sm font-semibold text-ink group-hover:text-brand">{route.title}</span><p className="mt-2 text-xs leading-5 text-muted">{route.description}</p></Link>)}</div></section>
        {!access.roles.includes("uploader") ? <InviteActivationForm /> : null}
      </div>
    </PageShell>
  );
}
