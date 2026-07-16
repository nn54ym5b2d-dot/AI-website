import Link from "next/link";
import { ArrowRight, CurrencyCny, FileMagnifyingGlass, Images, ShoppingBag, TrendUp, UsersThree } from "@phosphor-icons/react/ssr";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { canAccessAudience, requireAdminPage } from "@/lib/auth/page-guard";
import { adminRoutes } from "@/lib/domain/navigation";

export const dynamic = "force-dynamic";

const metrics = [
  { label: "已上架素材", value: "409", change: "+18 本周", icon: Images },
  { label: "待审核", value: "12", change: "3 条高优先级", icon: FileMagnifyingGlass },
  { label: "本月订单", value: "86", change: "+12.4%", icon: ShoppingBag },
  { label: "本月交易额", value: "¥3,760", change: "演示统计", icon: CurrencyCny }
];

const reviewRows = [
  { id: "YSK-P-000231", name: "咖啡店青年人物组", type: "人物", submitter: "时见工作室", time: "10 分钟前", status: "待初审" },
  { id: "YSK-S-000449", name: "雨夜街道路口", type: "场景", submitter: "北纬视觉", time: "36 分钟前", status: "待认证" },
  { id: "YSK-O-000103", name: "旧式磁带录音机", type: "物件/道具", submitter: "拾光档案", time: "1 小时前", status: "待初审" }
];

export default async function AdminPage() {
  const access = await requireAdminPage("/admin");
  const visibleRoutes = adminRoutes.filter((route) => canAccessAudience(access, route.audiences));
  return (
    <PageShell actions={<SecondaryLink href="/observer">观察员只读入口</SecondaryLink>} description={`当前以 ${access.user.displayName} 登录。后台继续由服务端检查 admin 基础身份与有效子角色。`} eyebrow="Operations" title="管理后台">
      <div className="grid gap-8">
        <div className="rounded-lg border border-warning/25 bg-amber-50 px-4 py-3 text-xs leading-5 text-warning">所有数字、素材和待办均为第二阶段演示数据；审核、支付、认证与导出操作尚未接入。</div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ icon: Icon, ...metric }) => <article className="ui-panel p-5" key={metric.label}><div className="flex items-start justify-between"><span className="text-xs font-medium text-muted">{metric.label}</span><span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand"><Icon aria-hidden="true" size={18} weight="duotone" /></span></div><strong className="mt-5 block text-3xl tracking-tight text-ink">{metric.value}</strong><span className="mt-2 inline-flex items-center gap-1 text-xs text-success"><TrendUp aria-hidden="true" size={14} />{metric.change}</span></article>)}</section>
        <section className="ui-panel overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4"><div><h2 className="font-bold text-ink">待处理素材</h2><p className="mt-1 text-xs text-muted">按提交时间排序 · 演示</p></div><Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand" href="/admin/review">查看全部<ArrowRight aria-hidden="true" size={15} /></Link></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-paper text-xs text-muted"><tr><th className="px-5 py-3 font-medium">素材</th><th className="px-5 py-3 font-medium">类型</th><th className="px-5 py-3 font-medium">上传者</th><th className="px-5 py-3 font-medium">提交时间</th><th className="px-5 py-3 font-medium">状态</th><th className="px-5 py-3 font-medium">操作</th></tr></thead><tbody className="divide-y divide-line">{reviewRows.map((row) => <tr className="hover:bg-paper/70" key={row.id}><td className="px-5 py-4"><strong className="block font-semibold text-ink">{row.name}</strong><span className="mt-1 block text-xs text-muted">{row.id}</span></td><td className="px-5 py-4 text-muted">{row.type}</td><td className="px-5 py-4 text-muted">{row.submitter}</td><td className="px-5 py-4 text-muted">{row.time}</td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-warning">{row.status}</span></td><td className="px-5 py-4"><Link className="font-semibold text-brand hover:text-brand-dark" href="/admin/review">查看</Link></td></tr>)}</tbody></table></div></section>
        <section><div className="mb-4 flex items-center gap-2"><UsersThree aria-hidden="true" className="text-brand" size={22} /><h2 className="text-lg font-bold text-ink">可用后台模块</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleRoutes.filter((route) => route.href !== "/admin").map((route) => <Link className="ui-panel group p-5 transition hover:border-brand/40 hover:shadow-card" href={route.href} key={route.href}><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink group-hover:text-brand">{route.title}</h3><p className="mt-2 text-xs leading-5 text-muted">{route.description}</p></div><ArrowRight aria-hidden="true" className="mt-0.5 shrink-0 text-muted group-hover:text-brand" size={17} /></div></Link>)}</div></section>
      </div>
    </PageShell>
  );
}
