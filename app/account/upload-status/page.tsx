import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { listUploaderAssets } from "@/lib/uploader/assets";
export const dynamic = "force-dynamic";
export default async function UploadStatusPage() {
  const access = await requireUploaderPage("/account/upload-status");
  const assets = await listUploaderAssets(access);
  return <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description="审核、认证、认证费和上架状态均来自当前上传者的真实数据库记录。" eyebrow="My workspace" title="素材审核状态"><div className="grid gap-4">{assets.map((asset) => <article className="ui-panel p-5" key={asset.id}><h2 className="font-bold text-ink">{asset.title}</h2><p className="mt-1 break-all text-xs text-muted">{asset.id}</p><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4"><div><dt className="text-xs text-muted">审核</dt><dd className="mt-1 text-ink">{asset.reviewStatus}</dd></div><div><dt className="text-xs text-muted">认证</dt><dd className="mt-1 text-ink">{asset.certificationStatus}</dd></div><div><dt className="text-xs text-muted">上架</dt><dd className="mt-1 text-ink">{asset.listingStatus}</dd></div><div><dt className="text-xs text-muted">认证费</dt><dd className="mt-1 text-ink">{asset.certificationFeeCharge ? `${asset.certificationFeeCharge.status} · ¥${(asset.certificationFeeCharge.amountCents / 100).toFixed(2)}` : "尚未生成"}</dd></div></dl></article>)}{!assets.length ? <p className="ui-panel p-6 text-sm text-muted">尚无可显示的素材状态。</p> : null}</div></PageShell>;
}
