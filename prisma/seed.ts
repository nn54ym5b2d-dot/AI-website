import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashContent } from "../lib/auth/crypto";
import {
  ensureLocalUploaderInvite,
  LEGACY_LOCAL_UPLOADER_INVITE_CODE,
  LOCAL_UPLOADER_INVITE_CODE
} from "../lib/auth/local-invite-seed";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for database seeding.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const TEST_TERMS_VERSION = "test-2026-07-15";
const TEST_TERMS_CONTENT =
  "本条款只用于源素库本地开发和自动化测试，不是正式平台条款，也不适用于真实交易。";

async function ensureIdentityUser(input: {
  email: string;
  displayName: string;
  role: "buyer" | "admin" | "observer";
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { displayName: input.displayName, status: "active" },
    create: {
      email: input.email,
      displayName: input.displayName,
      primaryLoginMethod: "email",
      authIdentities: {
        create: {
          provider: "email",
          providerSubject: input.email,
          isVerified: true,
          verifiedAt: new Date()
        }
      }
    }
  });

  await prisma.userRoleMembership.upsert({
    where: { userId_role: { userId: user.id, role: input.role } },
    update: { status: "active" },
    create: { userId: user.id, role: input.role }
  });

  return user;
}

async function main() {
  await prisma.legalDocumentVersion.upsert({
    where: {
      documentType_version: {
        documentType: "terms_of_service",
        version: TEST_TERMS_VERSION
      }
    },
    update: {
      title: "本地测试条款（非正式）",
      content: TEST_TERMS_CONTENT,
      contentHash: hashContent(TEST_TERMS_CONTENT),
      retiredAt: null
    },
    create: {
      documentType: "terms_of_service",
      version: TEST_TERMS_VERSION,
      title: "本地测试条款（非正式）",
      content: TEST_TERMS_CONTENT,
      contentHash: hashContent(TEST_TERMS_CONTENT),
      effectiveAt: new Date("2026-01-01T00:00:00.000Z")
    }
  });

  await ensureIdentityUser({
    email: "buyer@example.test",
    displayName: "本地购买用户",
    role: "buyer"
  });
  const admin = await ensureIdentityUser({
    email: "admin@example.test",
    displayName: "本地超级管理员",
    role: "admin"
  });
  const observer = await ensureIdentityUser({
    email: "observer@example.test",
    displayName: "本地外部观察员",
    role: "observer"
  });

  await prisma.adminRoleAssignment.upsert({
    where: { userId_adminRole: { userId: admin.id, adminRole: "super_admin" } },
    update: { status: "active" },
    create: {
      userId: admin.id,
      adminRole: "super_admin",
      createdByUserId: admin.id
    }
  });
  await prisma.observerProfile.upsert({
    where: { userId: observer.id },
    update: { partnerName: "本地测试合作方", status: "active", defaultShareRate: 0 },
    create: {
      userId: observer.id,
      partnerName: "本地测试合作方",
      defaultShareRate: 0
    }
  });

  await ensureLocalUploaderInvite(prisma, {
    code: LEGACY_LOCAL_UPLOADER_INVITE_CODE,
    createdByUserId: admin.id
  });
  await ensureLocalUploaderInvite(prisma, {
    code: LOCAL_UPLOADER_INVITE_CODE,
    createdByUserId: admin.id
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect();
    throw error;
  });
