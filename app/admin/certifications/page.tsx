import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listCertifications } from "@/lib/admin/assets";

export const dynamic = "force-dynamic";

export default async function AdminCertificationsPage() {
  await requireAudience("/admin/certifications", ["super_admin", "operator"]);
  const records = await listCertifications({});
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="人工录入和核验证书编号、凭证、证书文件与认证状态；当前不对接政府网站或 OCR。" eyebrow="Operations" title="版权认证记录">
      <section className="ui-panel overflow-hidden"><div className="divide-y divide-line">{records.map((record) => record && <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={record.id}><div><strong className="text-sm text-ink">{record.asset.title}</strong><p className="mt-1 text-xs text-muted">{record.asset.assetType} · {record.certificateNo ?? "暂无证书编号"}</p></div><span className="text-xs font-medium text-muted">{record.status}</span><Link className="text-sm font-semibold text-brand" href={`/admin/assets/${record.asset.id}`}>处理认证</Link></article>)}{!records.length && <p className="p-6 text-sm text-muted">当前没有认证记录。初审通过后会自动创建。</p>}</div></section>
    </PageShell>
  );
}
