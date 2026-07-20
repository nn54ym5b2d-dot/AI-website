import Link from "next/link";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listAdminUsers } from "@/lib/admin/foundation";
export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const access = await requireAudience("/admin/users", ["super_admin", "operator"]);
  const users = await listAdminUsers(access);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="真实用户、基础角色和后台角色只读摘要；角色与状态修改留给 T015。" eyebrow="Operations" title="用户管理"><section className="ui-panel overflow-hidden"><div className="divide-y divide-line">{users.map((user) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={user.id}><div><strong className="text-sm text-ink">{user.displayName}</strong><p className="mt-1 text-xs text-muted">{user.email ?? user.phone ?? "无联系方式"} · {user.status}</p></div><span className="text-xs text-muted">{[...user.roles, ...user.adminRoles].join(" / ") || "无角色"}</span><Link className="text-sm font-semibold text-brand" href={`/admin/users/${user.id}`}>查看详情</Link></article>)}</div></section></PageShell>;
}
