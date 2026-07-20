import { getPrisma } from "@/lib/db/prisma";
import type { SessionAccess } from "@/lib/auth/session";

export async function getAccountSummary(access: SessionAccess) {
  const uploadCount = access.uploaderProfile
    ? await getPrisma().asset.count({ where: { uploaderProfileId: access.uploaderProfile.id, deletedAt: null } })
    : 0;
  return {
    purchases: { count: 0, availability: "T013" as const },
    downloads: { count: 0, availability: "T014" as const },
    uploads: { count: uploadCount, availability: "available" as const },
    revenue: { amountCents: 0, availability: "T014" as const }
  };
}
