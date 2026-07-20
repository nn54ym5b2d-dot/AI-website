import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { getAdminUser } from "@/lib/admin/foundation";
import { ApiError } from "@/lib/api/http";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ userId: string }> };
export default async function UserDetailPage({ params }: Props) {
  const access = await requireAudience("/admin/users", ["super_admin", "operator"]);
  let user; try { user = await getAdminUser(access, (await params).userId); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return <PageShell actions={<SecondaryLink href="/admin/users">返回用户列表</SecondaryLink>} description="只读用户基础与角色摘要；本页不提供任何高权限写操作。" eyebrow="Operations" title={user.displayName}><dl className="ui-panel grid gap-5 p-6 sm:grid-cols-2"><div><dt className="text-xs text-muted">用户编号</dt><dd className="mt-1 break-all text-sm text-ink">{user.id}</dd></div><div><dt className="text-xs text-muted">状态</dt><dd className="mt-1 text-sm text-ink">{user.status}</dd></div><div><dt className="text-xs text-muted">邮箱</dt><dd className="mt-1 text-sm text-ink">{user.email ?? "未绑定"}</dd></div><div><dt className="text-xs text-muted">手机号</dt><dd className="mt-1 text-sm text-ink">{user.phone ?? "未绑定"}</dd></div><div><dt className="text-xs text-muted">基础角色</dt><dd className="mt-1 text-sm text-ink">{user.roles.join("、") || "无"}</dd></div><div><dt className="text-xs text-muted">后台角色</dt><dd className="mt-1 text-sm text-ink">{user.adminRoles.join("、") || "无"}</dd></div></dl></PageShell>;
}
