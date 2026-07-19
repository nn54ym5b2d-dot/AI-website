import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MaterialDetail } from "@/components/materials/material-detail";

type AssetDetailPageProps = { params: Promise<{ assetId: string }> };

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <MaterialDetail assetId={assetId} />
      <SiteFooter />
    </div>
  );
}
