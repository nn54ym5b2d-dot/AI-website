import { getPageAccess } from "@/lib/auth/page-guard";
import { SiteHeaderClient } from "@/components/layout/site-header-client";
import { signedInHeaderAccess } from "@/lib/domain/navigation";

export async function SiteHeader() {
  const access = await getPageAccess();

  return (
    <SiteHeaderClient
      user={access
        ? {
            ...signedInHeaderAccess(access.roles),
            avatarUrl: access.user.avatarUrl,
            displayName: access.user.displayName
          }
        : null}
    />
  );
}
