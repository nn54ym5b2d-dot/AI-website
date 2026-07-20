import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
import { requireAudience } from "@/lib/auth/page-guard";
import { listInviteCodes } from "@/lib/admin/foundation";
export const dynamic = "force-dynamic";
export default async function InvitationsPage() {
  await requireAudience("/admin/invitations", ["super_admin", "operator"]);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="创建、一次完整显示、掩码回显和禁用未使用邀请码；已使用邀请码不可恢复。" eyebrow="Operations" title="邀请码管理"><InviteCodeManager initialInvites={await listInviteCodes()} /></PageShell>;
}
