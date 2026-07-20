import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { AdminAssetWorkspace } from "@/components/admin/admin-asset-workspace";
import { requireAudience } from "@/lib/auth/page-guard";
import { getAdminAsset } from "@/lib/admin/assets";
import { ApiError } from "@/lib/api/http";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ assetId: string }> };

export default async function AdminAssetDetailPage({ params }: Props) {
  const { assetId } = await params;
  await requireAudience(`/admin/assets/${assetId}`, ["super_admin", "operator"]);
  let asset;
  try {
    asset = await getAdminAsset(assetId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <PageShell actions={<SecondaryLink href="/admin/assets">返回素材列表</SecondaryLink>} description={`${asset.assetType} · ${asset.uploaderDisplayName} · ${asset.id}`} eyebrow="Asset review" title={asset.title}>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="ui-panel p-4"><span className="text-xs text-muted">初审</span><strong className="mt-2 block text-sm text-ink">{asset.reviewStatus}</strong></div><div className="ui-panel p-4"><span className="text-xs text-muted">认证</span><strong className="mt-2 block text-sm text-ink">{asset.certificationStatus}</strong></div><div className="ui-panel p-4"><span className="text-xs text-muted">上架</span><strong className="mt-2 block text-sm text-ink">{asset.listingStatus}</strong></div></div>
      <AdminAssetWorkspace asset={asset} />
    </PageShell>
  );
}
