import { getPageAccess } from "@/lib/auth/page-guard";
import { SiteHeaderClient } from "@/components/layout/site-header-client";

export async function SiteHeader() {
  const access = await getPageAccess();

  return (
    <SiteHeaderClient
      user={access
        ? {
            avatarUrl: access.user.avatarUrl,
            displayName: access.user.displayName
          }
        : null}
    />
  );
}
