import { getPrisma } from "@/lib/db/prisma";
import type { SessionAccess } from "@/lib/auth/session";

export async function getAccountSummary(access: SessionAccess) {
  const [uploadCount, purchaseCount, downloadCount, revenue] = await Promise.all([
    access.uploaderProfile ? getPrisma().asset.count({ where: { uploaderProfileId: access.uploaderProfile.id, deletedAt: null } }) : 0,
    access.roles.includes("buyer") ? getPrisma().order.count({ where: { buyerUserId: access.user.id } }) : 0,
    access.roles.includes("buyer") ? getPrisma().downloadLink.count({ where: { requestedByUserId: access.user.id, status: "active", expiresAt: { gt: new Date() } } }) : 0,
    access.uploaderProfile ? getPrisma().revenueRecord.aggregate({ where: { uploaderProfileId: access.uploaderProfile.id }, _sum: { uploaderAmountCents: true } }) : null
  ]);
  return {
    purchases: { count: purchaseCount, availability: "available" as const },
    downloads: { count: downloadCount, availability: "available" as const },
    uploads: { count: uploadCount, availability: "available" as const },
    revenue: { amountCents: revenue?._sum.uploaderAmountCents ?? 0, availability: "available" as const }
  };
}
