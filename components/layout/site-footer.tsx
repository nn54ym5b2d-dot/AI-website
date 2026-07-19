import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="site-container grid gap-6 py-8 text-sm text-muted sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Link className="text-lg font-black text-brand" href="/">源素库</Link>
          <p className="mt-2 max-w-xl leading-6">可信来源、明确授权，让每一份创作素材更放心地进入作品。</p>
          <p className="mt-3 text-xs">当前公开素材来自本地 PostgreSQL 非真实种子数据；真实 COS、CDN 与支付服务尚未接入。</p>
        </div>
        <nav aria-label="辅助入口" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <Link className="hover:text-ink" href="/admin">管理后台</Link>
          <Link className="hover:text-ink" href="/observer">观察员入口</Link>
        </nav>
      </div>
    </footer>
  );
}
