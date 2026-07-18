import type { PrismaClient } from "@/generated/prisma/client";
import { hashInviteCode } from "@/lib/auth/crypto";

type InviteSeedClient = Pick<PrismaClient, "inviteCode">;

export const LEGACY_LOCAL_UPLOADER_INVITE_CODE = "YSK-LOCAL-UPLOADER-2026";
export const LOCAL_UPLOADER_INVITE_CODE = "YSK-LOCAL-UPLOADER-2026-02";

type LocalInviteInput = {
  code: string;
  createdByUserId: string;
  displayPrefix?: string;
  expiresAt?: Date;
};

export async function ensureLocalUploaderInvite(
  client: InviteSeedClient,
  {
    code,
    createdByUserId,
    displayPrefix = "YSK-LOCAL",
    expiresAt = new Date("2099-12-31T23:59:59.000Z")
  }: LocalInviteInput
) {
  const codeHash = hashInviteCode(code);
  const existing = await client.inviteCode.findUnique({
    where: { codeHash },
    include: { uploaderProfile: true }
  });

  if (!existing) {
    return client.inviteCode.create({
      data: {
        codeHash,
        displayPrefix,
        status: "unused",
        createdByUserId,
        expiresAt
      }
    });
  }

  if (existing.uploaderProfile) {
    return client.inviteCode.update({
      where: { id: existing.id },
      data: {
        status: "used",
        usedByUserId: existing.uploaderProfile.userId,
        usedAt: existing.usedAt ?? existing.uploaderProfile.createdAt
      }
    });
  }

  return existing;
}
