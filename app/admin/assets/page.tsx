import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listAdminAssets } from "@/lib/admin/assets";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  await requireAudience("/admin/assets", ["super_admin", "operator"]);
  const assets = await listAdminAssets({});
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="查看素材状态，维护基础信息并执行受约束的上架/下架操作。" eyebrow="Operations" title="素材管理">
      <section className="ui-panel overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-paper text-xs text-muted"><tr><th className="px-5 py-3 font-medium">素材</th><th className="px-5 py-3 font-medium">类型/分类</th><th className="px-5 py-3 font-medium">初审</th><th className="px-5 py-3 font-medium">认证</th><th className="px-5 py-3 font-medium">上架</th><th className="px-5 py-3 font-medium">操作</th></tr></thead><tbody className="divide-y divide-line">{assets.map((asset) => <tr key={asset.id}><td className="px-5 py-4"><strong className="block text-ink">{asset.title}</strong><span className="mt-1 block text-xs text-muted">{asset.uploaderDisplayName} · {asset.id}</span></td><td className="px-5 py-4 text-muted">{asset.assetType} / {asset.category ?? "未分类"}</td><td className="px-5 py-4 text-muted">{asset.reviewStatus}</td><td className="px-5 py-4 text-muted">{asset.certificationStatus}</td><td className="px-5 py-4 text-muted">{asset.listingStatus}</td><td className="px-5 py-4"><Link className="font-semibold text-brand" href={`/admin/assets/${asset.id}`}>查看详情</Link></td></tr>)}</tbody></table></div>
      </section>
    </PageShell>
  );
}
