import { getPrisma } from "@/lib/db/prisma";
import type { UploaderAccess } from "@/lib/uploader/access";

export async function getUploaderProfile(access: UploaderAccess) {
  const profile = await getPrisma().uploaderProfile.findUniqueOrThrow({
    where: { id: access.uploaderProfile.id },
    include: { _count: { select: { assets: true } } }
  });
  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    status: profile.status,
    assetCount: profile._count.assets,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}
export async function updateUploaderProfile(access: UploaderAccess, input: { displayName?: string; bio?: string | null }) {
  const profile = await getPrisma().uploaderProfile.update({
    where: { id: access.uploaderProfile.id },
    data: {
      ...(input.displayName === undefined ? {} : { displayName: input.displayName.trim() }),
      ...(input.bio === undefined ? {} : { bio: input.bio?.trim() || null })
    }
  });
  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    status: profile.status,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}
