import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashContent, hashInviteCode } from "../lib/auth/crypto";
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
const TEST_LEGAL_DOCUMENTS = [
  {
    documentType: "terms_of_service" as const,
    version: TEST_TERMS_VERSION,
    title: "服务条款草案（本地测试，非正式）",
    content: TEST_TERMS_CONTENT
  },
  {
    documentType: "privacy_policy" as const,
    version: "draft-2026-07-20",
    title: "隐私政策草案（本地测试，非正式）",
    content: "本页面仅用于验证版本化隐私政策展示，不构成正式隐私政策或法律意见。正式文本将在 T017 经法律审阅后替换。"
  },
  {
    documentType: "commercial_license" as const,
    version: "draft-2026-07-20",
    title: "商业授权说明草案（本地测试，非正式）",
    content: "本页面仅用于验证商业授权版本展示。当前说明不得用于真实交易；正式授权范围、限制和争议条款将在 T017 经法律审阅后替换。"
  }
];
const SYSTEM_SETTINGS = [
  ["certification_fee_cents", 1000, "每份素材的认证上传费，单位分。"],
  ["asset_price_rules", { person: 5000, object: 1000, scene: 5000 }, "三类素材当前统一售价，单位分。"],
  ["uploader_share_rate", "0.8000", "上传者收益比例。"],
  ["platform_share_rate", "0.2000", "平台收益比例。"],
  ["observer_share_rate", "0.0000", "外部观察员收益比例。"],
  ["download_eligibility_days", 365, "购买后的平台下载资格天数。"],
  ["signed_download_url_ttl_minutes", 10, "每次校验授权后签发的私有 ZIP 地址有效分钟数。"]
] as const;
const ASSET_UPLOADER_INVITE_HASH = hashInviteCode("YSK-T010-ASSET-SEED-INTERNAL");

const seededAssets = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    type: "person" as const,
    title: "都市青年｜自然光人物参考",
    description: "适用于 AI 视频、短剧广告与游戏概念设计的人物视觉参考。",
    priceCents: 5000,
    listedAt: new Date("2026-07-18T08:00:00.000Z"),
    tags: ["青年", "自然光", "都市", "写实"],
    originals: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        objectKey: "private-originals/9e441f23-3df0-45d2-a03f-cbfa3a885001"
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        objectKey: "private-originals/3d2f168d-cb67-4db8-885f-c2b865dc5002"
      }
    ],
    previews: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        sourceFileId: "20000000-0000-4000-8000-000000000001",
        objectKey: "t010/3fe3a4b6-61f1-4a10-a923-4d2c3a310001.png"
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        sourceFileId: "20000000-0000-4000-8000-000000000002",
        objectKey: "t010/79bc2d1e-1e54-4f53-8eaa-78c6a60f0002.png"
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    type: "object" as const,
    title: "复古金属台灯｜工业质感",
    description: "带真实磨损细节的工业风桌面道具素材。",
    priceCents: 1000,
    listedAt: new Date("2026-07-17T08:00:00.000Z"),
    tags: ["台灯", "金属", "复古", "室内"],
    originals: [
      {
        id: "20000000-0000-4000-8000-000000000003",
        objectKey: "private-originals/f38ccf68-83d1-4af5-bf27-266baea45003"
      }
    ],
    previews: [
      {
        id: "30000000-0000-4000-8000-000000000003",
        sourceFileId: "20000000-0000-4000-8000-000000000003",
        objectKey: "t010/a6e9c4f1-d1a8-4cee-966b-8f39c49a0003.png"
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    type: "scene" as const,
    title: "废弃厂房｜阴天工业场景",
    description: "适用于末世、悬疑与工业题材的环境设计参考。",
    priceCents: 5000,
    listedAt: new Date("2026-07-16T08:00:00.000Z"),
    tags: ["厂房", "工业", "阴天", "废墟"],
    originals: [
      {
        id: "20000000-0000-4000-8000-000000000004",
        objectKey: "private-originals/99aad196-0680-4a4c-b614-5c7ba74c5004"
      }
    ],
    previews: [
      {
        id: "30000000-0000-4000-8000-000000000004",
        sourceFileId: "20000000-0000-4000-8000-000000000004",
        objectKey: "t010/e8b2c7d5-bd34-46ad-a174-24fa474d0004.png"
      }
    ]
  }
] as const;

async function ensureIdentityUser(input: {
  email: string;
  displayName: string;
  role: "buyer" | "uploader" | "admin" | "observer";
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
  for (const document of TEST_LEGAL_DOCUMENTS) {
    await prisma.legalDocumentVersion.upsert({
      where: {
        documentType_version: {
          documentType: document.documentType,
          version: document.version
        }
      },
      update: {
        title: document.title,
        content: document.content,
        contentHash: hashContent(document.content),
        retiredAt: null
      },
      create: {
        ...document,
        contentHash: hashContent(document.content),
        effectiveAt: new Date("2026-01-01T00:00:00.000Z")
      }
    });
  }

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
  for (const [key, value, description] of SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description, updatedByUserId: admin.id }
    });
  }
  const operator = await ensureIdentityUser({
    email: "operator@example.test",
    displayName: "本地运营管理员",
    role: "admin"
  });
  const finance = await ensureIdentityUser({
    email: "finance@example.test",
    displayName: "本地财务管理员",
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
  await prisma.adminRoleAssignment.upsert({
    where: { userId_adminRole: { userId: operator.id, adminRole: "operator" } },
    update: { status: "active" },
    create: {
      userId: operator.id,
      adminRole: "operator",
      createdByUserId: admin.id
    }
  });
  await prisma.adminRoleAssignment.upsert({
    where: { userId_adminRole: { userId: finance.id, adminRole: "finance" } },
    update: { status: "active" },
    create: {
      userId: finance.id,
      adminRole: "finance",
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

  const assetUploader = await ensureIdentityUser({
    email: "asset-uploader@example.test",
    displayName: "本地素材上传者",
    role: "uploader"
  });
  const assetInvite = await prisma.inviteCode.upsert({
    where: { codeHash: ASSET_UPLOADER_INVITE_HASH },
    update: {
      status: "used",
      createdByUserId: admin.id,
      usedByUserId: assetUploader.id,
      usedAt: new Date("2026-07-15T08:00:00.000Z")
    },
    create: {
      codeHash: ASSET_UPLOADER_INVITE_HASH,
      displayPrefix: "YSK-T010",
      status: "used",
      createdByUserId: admin.id,
      usedByUserId: assetUploader.id,
      usedAt: new Date("2026-07-15T08:00:00.000Z")
    }
  });
  const uploaderProfile = await prisma.uploaderProfile.upsert({
    where: { userId: assetUploader.id },
    update: {
      inviteCodeId: assetInvite.id,
      displayName: "源素库本地示例上传者",
      bio: "仅用于 T010 本地数据闭环，不代表真实平台用户。",
      status: "active"
    },
    create: {
      userId: assetUploader.id,
      inviteCodeId: assetInvite.id,
      displayName: "源素库本地示例上传者",
      bio: "仅用于 T010 本地数据闭环，不代表真实平台用户。"
    }
  });

  for (const [assetIndex, assetSeed] of seededAssets.entries()) {
    await prisma.asset.upsert({
      where: { id: assetSeed.id },
      update: {
        uploaderProfileId: uploaderProfile.id,
        assetType: assetSeed.type,
        title: assetSeed.title,
        description: assetSeed.description,
        reviewStatus: "approved",
        listingStatus: "listed",
        certificationStatus: "certified",
        priceCents: assetSeed.priceCents,
        currency: "CNY",
        submittedAt: new Date("2026-07-15T08:00:00.000Z"),
        reviewedByUserId: admin.id,
        reviewedAt: new Date("2026-07-16T08:00:00.000Z"),
        listedAt: assetSeed.listedAt,
        deletedAt: null
      },
      create: {
        id: assetSeed.id,
        uploaderProfileId: uploaderProfile.id,
        assetType: assetSeed.type,
        title: assetSeed.title,
        description: assetSeed.description,
        reviewStatus: "approved",
        listingStatus: "listed",
        certificationStatus: "certified",
        priceCents: assetSeed.priceCents,
        currency: "CNY",
        submittedAt: new Date("2026-07-15T08:00:00.000Z"),
        reviewedByUserId: admin.id,
        reviewedAt: new Date("2026-07-16T08:00:00.000Z"),
        listedAt: assetSeed.listedAt
      }
    });

    await prisma.assetTag.deleteMany({ where: { assetId: assetSeed.id } });
    await prisma.assetTag.createMany({
      data: assetSeed.tags.map((tag) => ({ assetId: assetSeed.id, tag }))
    });

    for (const [index, original] of assetSeed.originals.entries()) {
      await prisma.assetFile.upsert({
        where: { id: original.id },
        update: {
          assetId: assetSeed.id,
          uploadedByUserId: assetUploader.id,
          fileType: "original",
          accessScope: "private",
          cosBucket: "local-private-originals",
          cosRegion: "local",
          cosObjectKey: original.objectKey,
          fileHash: hashContent(`${assetSeed.id}:original:${index}`),
          fileSizeBytes: 4_000_000n,
          mimeType: "image/png",
          width: 1456,
          height: 1092,
          metadata: { storageProvider: "local_private_fixture", verificationStatus: "verified" },
          deletedAt: null
        },
        create: {
          id: original.id,
          assetId: assetSeed.id,
          uploadedByUserId: assetUploader.id,
          fileType: "original",
          accessScope: "private",
          cosBucket: "local-private-originals",
          cosRegion: "local",
          cosObjectKey: original.objectKey,
          fileHash: hashContent(`${assetSeed.id}:original:${index}`),
          fileSizeBytes: 4_000_000n,
          mimeType: "image/png",
          width: 1456,
          height: 1092,
          metadata: { storageProvider: "local_private_fixture", verificationStatus: "verified" }
        }
      });
    }

    for (const [index, preview] of assetSeed.previews.entries()) {
      await prisma.assetFile.upsert({
        where: { id: preview.id },
        update: {
          assetId: assetSeed.id,
          uploadedByUserId: assetUploader.id,
          fileType: "preview",
          accessScope: "public_preview",
          cosBucket: "local-watermarked-previews",
          cosRegion: "local",
          cosObjectKey: preview.objectKey,
          fileHash: hashContent(`${assetSeed.id}:preview:${index}:t010-local-v1`),
          fileSizeBytes: 3_000_000n,
          mimeType: "image/png",
          width: 1456,
          height: 1092,
          metadata: {
            processingStatus: "ready",
            sourceFileId: preview.sourceFileId,
            watermarkTemplateVersion: "t010-local-v1",
            deliveryProvider: "local_public_asset"
          },
          deletedAt: null
        },
        create: {
          id: preview.id,
          assetId: assetSeed.id,
          uploadedByUserId: assetUploader.id,
          fileType: "preview",
          accessScope: "public_preview",
          cosBucket: "local-watermarked-previews",
          cosRegion: "local",
          cosObjectKey: preview.objectKey,
          fileHash: hashContent(`${assetSeed.id}:preview:${index}:t010-local-v1`),
          fileSizeBytes: 3_000_000n,
          mimeType: "image/png",
          width: 1456,
          height: 1092,
          metadata: {
            processingStatus: "ready",
            sourceFileId: preview.sourceFileId,
            watermarkTemplateVersion: "t010-local-v1",
            deliveryProvider: "local_public_asset"
          }
        }
      });
    }

    const certificateFileId = `40000000-0000-4000-8000-${String(assetIndex + 1).padStart(12, "0")}`;
    await prisma.assetFile.upsert({
      where: { id: certificateFileId },
      update: {
        assetId: assetSeed.id,
        uploadedByUserId: admin.id,
        fileType: "certificate_file",
        accessScope: "private",
        cosBucket: "local-private-certificates",
        cosRegion: "local",
        cosObjectKey: `t012/certificates/${assetSeed.id}/certificate.pdf`,
        fileHash: hashContent(`${assetSeed.id}:certificate:t012-local-v1`),
        fileSizeBytes: 240_000n,
        mimeType: "application/pdf",
        metadata: {
          storageProvider: "local_private_fixture",
          providerDisclosure: "本地测试只保存证书文件元数据，不保存文件正文。"
        },
        deletedAt: null
      },
      create: {
        id: certificateFileId,
        assetId: assetSeed.id,
        uploadedByUserId: admin.id,
        fileType: "certificate_file",
        accessScope: "private",
        cosBucket: "local-private-certificates",
        cosRegion: "local",
        cosObjectKey: `t012/certificates/${assetSeed.id}/certificate.pdf`,
        fileHash: hashContent(`${assetSeed.id}:certificate:t012-local-v1`),
        fileSizeBytes: 240_000n,
        mimeType: "application/pdf",
        metadata: {
          storageProvider: "local_private_fixture",
          providerDisclosure: "本地测试只保存证书文件元数据，不保存文件正文。"
        }
      }
    });
    await prisma.certificationRecord.upsert({
      where: { assetId: assetSeed.id },
      update: {
        status: "certified",
        governmentSiteName: "本地测试认证来源（非真实机构）",
        certificateNo: `LOCAL-CERT-${assetIndex + 1}`,
        credential: `LOCAL-CREDENTIAL-${assetIndex + 1}`,
        certificateFileId,
        certificateIssuedAt: new Date("2026-07-16T08:00:00.000Z"),
        certificationStartedAt: new Date("2026-07-15T09:00:00.000Z"),
        verifiedByUserId: admin.id,
        verifiedAt: new Date("2026-07-16T08:00:00.000Z"),
        notes: "本地非真实认证记录。"
      },
      create: {
        assetId: assetSeed.id,
        status: "certified",
        governmentSiteName: "本地测试认证来源（非真实机构）",
        certificateNo: `LOCAL-CERT-${assetIndex + 1}`,
        credential: `LOCAL-CREDENTIAL-${assetIndex + 1}`,
        certificateFileId,
        certificateIssuedAt: new Date("2026-07-16T08:00:00.000Z"),
        certificationStartedAt: new Date("2026-07-15T09:00:00.000Z"),
        verifiedByUserId: admin.id,
        verifiedAt: new Date("2026-07-16T08:00:00.000Z"),
        notes: "本地非真实认证记录。"
      }
    });
  }

  const pendingReviewFixtures = [
    {
      id: "11000000-0000-4000-8000-000000000001",
      type: "person" as const,
      title: "待初审人物素材｜本地测试",
      category: "人物参考",
      originalId: "21000000-0000-4000-8000-000000000001",
      previewId: "31000000-0000-4000-8000-000000000001",
      previewObjectKey: "t010/aa000000-0000-4000-8000-000000000001.png",
      proofId: "41000000-0000-4000-8000-000000000001",
      chargeId: "51000000-0000-4000-8000-000000000001"
    },
    {
      id: "11000000-0000-4000-8000-000000000002",
      type: "object" as const,
      title: "待初审物件素材｜本地测试",
      category: "生活道具",
      originalId: "21000000-0000-4000-8000-000000000002",
      previewId: "31000000-0000-4000-8000-000000000002",
      previewObjectKey: "t010/bb000000-0000-4000-8000-000000000002.png",
      proofId: null,
      chargeId: "51000000-0000-4000-8000-000000000002"
    }
  ];

  for (const [index, fixture] of pendingReviewFixtures.entries()) {
    await prisma.asset.upsert({
      where: { id: fixture.id },
      update: {},
      create: {
        id: fixture.id,
        uploaderProfileId: uploaderProfile.id,
        assetType: fixture.type,
        title: fixture.title,
        description: "T012 本地审核流程样本，不代表真实素材或真实支付。",
        category: fixture.category,
        reviewStatus: "pending_review",
        listingStatus: "unlisted",
        certificationStatus: "pending_review",
        priceCents: fixture.type === "object" ? 1000 : 5000,
        currency: "CNY",
        submittedAt: new Date(`2026-07-20T0${index + 1}:00:00.000Z`)
      }
    });
    await prisma.assetTag.createMany({
      data: ["T012", fixture.type === "person" ? "人物" : "物件"].map((tag) => ({
        assetId: fixture.id,
        tag
      })),
      skipDuplicates: true
    });
    await prisma.assetFile.upsert({
      where: { id: fixture.originalId },
      update: {
        assetId: fixture.id,
        uploadedByUserId: assetUploader.id,
        fileType: "original",
        accessScope: "private",
        cosBucket: "local-private-originals",
        cosRegion: "local",
        cosObjectKey: `t012/review/${fixture.id}/original.png`,
        fileHash: hashContent(`${fixture.id}:original`),
        fileSizeBytes: 2_000_000n,
        mimeType: "image/png",
        metadata: { storageProvider: "local_private_fixture", verificationStatus: "verified" },
        deletedAt: null
      },
      create: {
        id: fixture.originalId,
        assetId: fixture.id,
        uploadedByUserId: assetUploader.id,
        fileType: "original",
        accessScope: "private",
        cosBucket: "local-private-originals",
        cosRegion: "local",
        cosObjectKey: `t012/review/${fixture.id}/original.png`,
        fileHash: hashContent(`${fixture.id}:original`),
        fileSizeBytes: 2_000_000n,
        mimeType: "image/png",
        metadata: { storageProvider: "local_private_fixture", verificationStatus: "verified" }
      }
    });
    await prisma.assetFile.upsert({
      where: { id: fixture.previewId },
      update: {
        assetId: fixture.id,
        uploadedByUserId: assetUploader.id,
        fileType: "preview",
        accessScope: "public_preview",
        cosBucket: "local-watermarked-previews",
        cosRegion: "local",
        cosObjectKey: fixture.previewObjectKey,
        fileHash: hashContent(`${fixture.id}:preview`),
        fileSizeBytes: 800_000n,
        mimeType: "image/png",
        metadata: { processingStatus: "ready", watermarkTemplateVersion: "t012-local-v1" },
        deletedAt: null
      },
      create: {
        id: fixture.previewId,
        assetId: fixture.id,
        uploadedByUserId: assetUploader.id,
        fileType: "preview",
        accessScope: "public_preview",
        cosBucket: "local-watermarked-previews",
        cosRegion: "local",
        cosObjectKey: fixture.previewObjectKey,
        fileHash: hashContent(`${fixture.id}:preview`),
        fileSizeBytes: 800_000n,
        mimeType: "image/png",
        metadata: { processingStatus: "ready", watermarkTemplateVersion: "t012-local-v1" }
      }
    });
    if (fixture.proofId) {
      await prisma.assetFile.upsert({
        where: { id: fixture.proofId },
        update: {
          assetId: fixture.id,
          uploadedByUserId: assetUploader.id,
          fileType: "person_proof",
          accessScope: "private",
          cosBucket: "local-private-proofs",
          cosRegion: "local",
          cosObjectKey: `t012/review/${fixture.id}/proof.pdf`,
          fileHash: hashContent(`${fixture.id}:proof`),
          fileSizeBytes: 300_000n,
          mimeType: "application/pdf",
          metadata: { storageProvider: "local_private_fixture" },
          deletedAt: null
        },
        create: {
          id: fixture.proofId,
          assetId: fixture.id,
          uploadedByUserId: assetUploader.id,
          fileType: "person_proof",
          accessScope: "private",
          cosBucket: "local-private-proofs",
          cosRegion: "local",
          cosObjectKey: `t012/review/${fixture.id}/proof.pdf`,
          fileHash: hashContent(`${fixture.id}:proof`),
          fileSizeBytes: 300_000n,
          mimeType: "application/pdf",
          metadata: { storageProvider: "local_private_fixture" }
        }
      });
    }
    await prisma.certificationFeeCharge.upsert({
      where: { assetId: fixture.id },
      update: {},
      create: {
        id: fixture.chargeId,
        assetId: fixture.id,
        uploaderUserId: assetUploader.id,
        amountCents: 1000,
        currency: "CNY",
        status: "success",
        paidAt: new Date("2026-07-20T00:30:00.000Z")
      }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect();
    throw error;
  });
