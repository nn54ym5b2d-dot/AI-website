import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listAuditLogs } from "@/lib/admin/assets";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  await requireAudience("/admin/audit-logs", ["super_admin", "operator"]);
  const logs = await listAuditLogs();
  return (
    <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="T012 审核、认证、素材编辑、上架和敏感文件访问的数据库审计记录。" eyebrow="Operations" title="操作日志">
      <section className="ui-panel overflow-hidden"><div className="divide-y divide-line">{logs.map((log) => <article className="grid gap-2 p-5 sm:grid-cols-[1fr_auto]" key={log.id}><div><strong className="text-sm text-ink">{log.action}</strong><p className="mt-1 text-xs text-muted">{log.actorDisplayName} · {log.assetTitle ?? log.targetType} · requestId {log.requestId ?? "无"}</p></div><time className="text-xs text-muted">{new Date(log.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></article>)}{!logs.length && <p className="p-6 text-sm text-muted">尚无操作日志。</p>}</div></section>
    </PageShell>
  );
}
