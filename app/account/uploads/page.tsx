import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { listUploaderAssets } from "@/lib/uploader/assets";
export const dynamic = "force-dynamic";
export default async function UploadsPage() {
  const access = await requireUploaderPage("/account/uploads");
  const assets = await listUploaderAssets(access);
  return <PageShell actions={<><SecondaryLink href="/account">返回个人中心</SecondaryLink><SecondaryLink href="/upload">继续上传</SecondaryLink></>} description="当前上传者在 PostgreSQL 中的真实素材记录。" eyebrow="My workspace" title="我的上传"><section className="ui-panel overflow-hidden"><div className="divide-y divide-line">{assets.map((asset) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={asset.id}><div><strong className="text-sm text-ink">{asset.title}</strong><p className="mt-1 text-xs text-muted">{asset.type} · {asset.id} · {new Date(asset.updatedAt).toLocaleString("zh-CN")}</p></div><span className="text-xs text-muted">审核 {asset.reviewStatus} / 认证 {asset.certificationStatus}</span><Link className="text-sm font-semibold text-brand" href={asset.reviewStatus === "draft" && asset.certificationStatus === "not_started" ? "/upload" : "/account/upload-status"}>{asset.reviewStatus === "draft" && asset.certificationStatus === "not_started" ? "继续编辑" : "查看状态"}</Link></article>)}{!assets.length ? <p className="p-6 text-sm text-muted">尚未上传素材。可从“继续上传”创建第一份草稿。</p> : null}</div></section></PageShell>;
}
