import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listAdminAssets } from "@/lib/admin/assets";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  await requireAudience("/admin/review", ["super_admin", "operator"]);
  const assets = await listAdminAssets({ reviewStatus: "pending_review" });
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="只显示认证费已确认成功并进入待初审状态的本地数据库记录。" eyebrow="Operations" title="素材审核">
      <div className="rounded-lg border border-warning/25 bg-amber-50 px-4 py-3 text-xs leading-5 text-warning">当前待审核样本为明确标记的本地测试状态；真实认证费支付仍由 T013 接入。</div>
      <section className="ui-panel mt-6 overflow-hidden">
        <div className="divide-y divide-line">
          {assets.map((asset) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={asset.id}><div><strong className="text-sm text-ink">{asset.title}</strong><p className="mt-1 text-xs text-muted">{asset.assetType} · {asset.uploaderDisplayName} · {asset.id}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-warning">待初审</span><Link className="text-sm font-semibold text-brand" href={`/admin/assets/${asset.id}`}>查看与审核</Link></article>)}
          {!assets.length && <p className="p-6 text-sm text-muted">当前没有待初审素材。</p>}
        </div>
      </section>
    </PageShell>
  );
}
