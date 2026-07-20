import Link from "next/link";
import type { LegalDocumentType } from "@/generated/prisma/client";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { getCurrentLegalDocument } from "@/lib/auth/service";

export async function LegalDocumentPage({ type }: { type: LegalDocumentType }) {
  const document = await getCurrentLegalDocument(type);
  return (
    <PageShell actions={<SecondaryLink href="/">返回首页</SecondaryLink>} description={`版本 ${document.version} · 生效时间 ${document.effectiveAt.toLocaleDateString("zh-CN")}`} eyebrow="Legal documents" title={document.title}>
      <div className="rounded-lg border border-warning/25 bg-amber-50 px-4 py-3 text-sm leading-6 text-warning">当前内容是本地测试/草案文本，不构成正式法律意见，也不可用于真实交易。T017 将替换为经正式法律审阅的版本。</div>
      <article className="ui-panel mt-6 whitespace-pre-wrap p-6 text-sm leading-8 text-ink sm:p-8">{document.content}</article>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-brand"><Link href="/terms">服务条款</Link><Link href="/privacy">隐私政策</Link><Link href="/license">商业授权说明</Link></nav>
    </PageShell>
  );
}
