import Link from "next/link";
import { ArrowLeft, FileText, SealCheck, ShieldCheck } from "@phosphor-icons/react/ssr";
import { PageShell } from "@/components/layout/page-shell";
import { MaterialGallery } from "@/components/materials/material-gallery";
import { PurchasePanel } from "@/components/materials/purchase-panel";
import { DemoNotice } from "@/components/ui/demo-notice";
import { demoAsset, demoAssets } from "@/lib/domain/demo-content";

type AssetDetailPageProps = { params: Promise<{ assetId: string }> };

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params;
  const asset = demoAssets.find((item) => item.id === assetId) ?? demoAsset;
  const images = [asset.image, ...(asset.alternateImages ?? [])];

  return (
    <PageShell description="查看高清预览、认证状态、素材说明与授权范围，再进入购买流程。" eyebrow={asset.category} title={asset.title}>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand" href="/materials"><ArrowLeft aria-hidden="true" size={16} />返回素材库</Link>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="ui-panel p-3 sm:p-5"><MaterialGallery images={images} title={asset.title} /></section>
        <aside className="ui-panel h-fit p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-3"><DemoNotice>演示素材</DemoNotice><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><SealCheck aria-hidden="true" size={19} weight="fill" />已认证</span></div>
          <dl className="mt-6 grid gap-4 text-sm">
            <div><dt className="text-xs text-muted">素材编号</dt><dd className="mt-1 font-medium text-ink">{asset.id}</dd></div>
            <div><dt className="text-xs text-muted">上传者</dt><dd className="mt-1 font-medium text-ink">{asset.creator}</dd></div>
            <div><dt className="text-xs text-muted">素材说明</dt><dd className="mt-1 leading-6 text-ink">{asset.summary}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">{asset.tags.map((tag) => <span className="rounded-full bg-paper px-3 py-1.5 text-xs text-muted" key={tag}>{tag}</span>)}</div>
          <div className="my-6 grid gap-3 rounded-lg bg-paper p-4 text-sm">
            <div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={20} weight="duotone" /><div><strong className="text-ink">认证记录可追溯</strong><p className="mt-1 text-xs leading-5 text-muted">正式阶段将展示证书编号与有效信息。</p></div></div>
            <div className="flex gap-3"><FileText aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={20} weight="duotone" /><div><strong className="text-ink">统一商业授权</strong><p className="mt-1 text-xs leading-5 text-muted">支付后生成永久授权记录；下载入口默认有效 365 天。</p></div></div>
          </div>
          <PurchasePanel price={asset.price} />
        </aside>
      </div>
    </PageShell>
  );
}
