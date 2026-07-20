import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
import { requireAudience } from "@/lib/auth/page-guard";
import { listInviteCodes } from "@/lib/admin/foundation";
export const dynamic = "force-dynamic";
export default async function InvitationsPage() {
  await requireAudience("/admin/invitations", ["super_admin", "operator"]);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="创建、掩码列表、按需查看完整邀请码和禁用未使用邀请码；每次查看都会记录审计。" eyebrow="Operations" title="邀请码管理"><InviteCodeManager initialInvites={await listInviteCodes()} /></PageShell>;
}
