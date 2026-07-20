import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { SystemSettingsForm } from "@/components/admin/system-settings-form";
import { requireAudience } from "@/lib/auth/page-guard";
import { getSystemSettings } from "@/lib/settings/service";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const access = await requireAudience("/admin/settings", ["super_admin", "operator", "finance"]);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="服务端业务配置；超级管理员可改，运营和财务只读。" eyebrow="Operations" title="系统设置"><SystemSettingsForm canEdit={access.adminRoles.includes("super_admin")} initialSettings={await getSystemSettings()} /></PageShell>;
}
