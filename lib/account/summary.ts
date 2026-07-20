import { getPrisma } from "@/lib/db/prisma";
import type { SessionAccess } from "@/lib/auth/session";

export async function getAccountSummary(access: SessionAccess) {
  const [uploadCount, purchaseCount, downloadCount] = await Promise.all([
    access.uploaderProfile ? getPrisma().asset.count({ where: { uploaderProfileId: access.uploaderProfile.id, deletedAt: null } }) : 0,
    access.roles.includes("buyer") ? getPrisma().order.count({ where: { buyerUserId: access.user.id } }) : 0,
    access.roles.includes("buyer") ? getPrisma().downloadLink.count({ where: { requestedByUserId: access.user.id, status: "active" } }) : 0
  ]);
  return {
    purchases: { count: purchaseCount, availability: "available" as const },
    downloads: { count: downloadCount, availability: "资格已生成，ZIP 等待 T014" as const },
    uploads: { count: uploadCount, availability: "available" as const },
    revenue: { amountCents: 0, availability: "T014" as const }
  };
}
