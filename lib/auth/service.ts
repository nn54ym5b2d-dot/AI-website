import { randomUUID } from "node:crypto";
import type {
  AuthChallengePurpose,
  AuthProvider,
  Prisma,
  User
} from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import { getAuthConfig } from "@/lib/auth/config";
import {
  createVerificationCode,
  hashInviteCode,
  hashWithSecret,
  safeEqual
} from "@/lib/auth/crypto";
import {
  AuthProviderUnavailableError,
  getAuthProvider,
  type AuthProviderAdapter
} from "@/lib/auth/provider";
import { selectInitialDisplayName } from "@/lib/auth/display-name";
import { createSession, type SessionAccess } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

type ChallengeMethod = Extract<AuthProvider, "phone" | "email">;

function normalizeIdentifier(method: ChallengeMethod, identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  if (method === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
      throw new ApiError(422, "VALIDATION_ERROR", "请输入有效邮箱地址。 ");
    }
    return normalized;
  }

  const phone = normalized.replace(/[\s-]/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
    throw new ApiError(422, "VALIDATION_ERROR", "请输入包含国家或地区代码的有效手机号。 ");
  }
  return phone;
}

type LegalDocumentLookup = Pick<Prisma.TransactionClient, "legalDocumentVersion">;

async function findCurrentTerms(
  version?: string,
  database: LegalDocumentLookup = getPrisma()
) {
  const now = new Date();
  const terms = await database.legalDocumentVersion.findFirst({
    where: {
      documentType: "terms_of_service",
      ...(version ? { version } : {}),
      effectiveAt: { lte: now },
      OR: [{ retiredAt: null }, { retiredAt: { gt: now } }]
    },
    orderBy: { effectiveAt: "desc" }
  });

  if (!terms || (version && terms.version !== version)) {
    throw new ApiError(422, "TERMS_ACCEPTANCE_REQUIRED", "请接受当前有效的平台条款。 ");
  }

  return terms;
}

export async function createAuthChallenge(
  input: {
    method: ChallengeMethod;
    identifier: string;
    purpose: AuthChallengePurpose;
  },
  provider: AuthProviderAdapter = getAuthProvider()
) {
  const config = getAuthConfig();
  const identifier = normalizeIdentifier(input.method, input.identifier);
  const identifierHash = hashWithSecret(`${input.method}:${identifier}`, config.authSecret);
  const recentChallenge = await getPrisma().authChallenge.findFirst({
    where: {
      identifierHash,
      purpose: input.purpose,
      createdAt: { gt: new Date(Date.now() - 60_000) }
    }
  });

  if (recentChallenge) {
    throw new ApiError(429, "RATE_LIMITED", "请稍后再请求新的验证码。 ");
  }

  const challengeId = randomUUID();
  const verificationCode = createVerificationCode();
  const expiresAt = new Date(Date.now() + config.challengeTtlSeconds * 1000);
  await getPrisma().authChallenge.create({
    data: {
      id: challengeId,
      provider: input.method,
      identifier,
      identifierHash,
      purpose: input.purpose,
      codeHash: hashWithSecret(`${challengeId}:${verificationCode}`, config.authSecret),
      expiresAt
    }
  });

  try {
    await provider.deliverChallenge({
      challengeId,
      method: input.method,
      identifier,
      verificationCode,
      expiresAt
    });
  } catch (error) {
    await getPrisma().authChallenge.delete({ where: { id: challengeId } });
    if (error instanceof AuthProviderUnavailableError) {
      throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "登录验证服务暂时不可用。 ");
    }
    throw error;
  }

  return { challengeId, expiresAt, resendAfterSeconds: 60 };
}

async function verifyChallenge(
  challengeId: string,
  verificationCode: string,
  purpose: AuthChallengePurpose
) {
  const config = getAuthConfig();
  const challenge = await getPrisma().authChallenge.findUnique({ where: { id: challengeId } });

  if (!challenge || challenge.purpose !== purpose || challenge.consumedAt) {
    throw new ApiError(422, "CHALLENGE_INVALID", "验证码无效。 ");
  }

  if (challenge.expiresAt <= new Date()) {
    throw new ApiError(422, "CHALLENGE_EXPIRED", "验证码已过期，请重新获取。 ");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new ApiError(422, "CHALLENGE_INVALID", "验证码尝试次数已达上限。 ");
  }

  const candidateHash = hashWithSecret(`${challenge.id}:${verificationCode}`, config.authSecret);
  if (!safeEqual(candidateHash, challenge.codeHash)) {
    await getPrisma().authChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } }
    });
    throw new ApiError(422, "CHALLENGE_INVALID", "验证码无效。 ");
  }

  return challenge;
}

async function consumeChallenge(
  transaction: Prisma.TransactionClient,
  challengeId: string
) {
  const consumed = await transaction.authChallenge.updateMany({
    where: { id: challengeId, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() }
  });

  if (consumed.count !== 1) {
    throw new ApiError(422, "CHALLENGE_INVALID", "验证码已被使用。 ");
  }
}

function providerSubject(provider: AuthProvider, identifier: string) {
  return provider === "email" ? identifier.toLowerCase() : identifier;
}

type VerifiedIdentity = {
  provider: AuthProvider;
  identifier: string;
};

function contactFields(identities: VerifiedIdentity[]) {
  const email = identities.find((identity) => identity.provider === "email")?.identifier;
  const phone = identities.find((identity) => identity.provider === "phone")?.identifier;
  return {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {})
  };
}

function identityKey(identity: VerifiedIdentity) {
  return `${identity.provider}:${providerSubject(identity.provider, identity.identifier)}`;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function completeVerifiedRegistration(input: {
  identities: VerifiedIdentity[];
  primaryProvider: AuthProvider;
  preferredDisplayName?: string;
  acceptedTermsVersion?: string;
  source: string;
  requestId: string;
  challengeIds: string[];
}) {
  try {
    return await getPrisma().$transaction(async (transaction) => {
      for (const challengeId of input.challengeIds) {
        await consumeChallenge(transaction, challengeId);
      }

      const matchingIdentities = await transaction.authIdentity.findMany({
        where: {
          OR: input.identities.map((identity) => ({
            provider: identity.provider,
            providerSubject: providerSubject(identity.provider, identity.identifier)
          }))
        },
        include: { user: true }
      });
      const matchingUserIds = new Set(matchingIdentities.map((identity) => identity.userId));

      if (matchingUserIds.size > 1) {
        throw new ApiError(409, "RESOURCE_CONFLICT", "邮箱与手机号已分别绑定不同账号，请联系客服处理。 ");
      }

      const existingIdentity = matchingIdentities[0];
      if (existingIdentity) {
        if (existingIdentity.user.status !== "active") {
          throw new ApiError(401, "SESSION_INVALID", "账号当前不可登录。 ");
        }

        const existingByKey = new Map(matchingIdentities.map((identity) => [
          identityKey({ provider: identity.provider, identifier: identity.providerSubject }),
          identity
        ]));
        for (const identity of input.identities) {
          const storedIdentity = existingByKey.get(identityKey(identity));
          if (storedIdentity) {
            if (!storedIdentity.isVerified) {
              await transaction.authIdentity.update({
                where: { id: storedIdentity.id },
                data: { isVerified: true, verifiedAt: new Date() }
              });
            }
            continue;
          }
          await transaction.authIdentity.create({
            data: {
              userId: existingIdentity.userId,
              provider: identity.provider,
              providerSubject: providerSubject(identity.provider, identity.identifier),
              isVerified: true,
              verifiedAt: new Date()
            }
          });
        }

        const user = await transaction.user.update({
          where: { id: existingIdentity.userId },
          data: {
            ...contactFields(input.identities),
            ...(input.identities.some((identity) => identity.provider === "phone")
              ? { primaryLoginMethod: "phone" as const }
              : {}),
            lastLoginAt: new Date()
          }
        });

        return { user, isNewUser: false };
      }

      if (!input.acceptedTermsVersion) {
        throw new ApiError(422, "TERMS_ACCEPTANCE_REQUIRED", "创建新账号前请接受当前有效的平台条款。 ");
      }
      const terms = await findCurrentTerms(input.acceptedTermsVersion, transaction);

      const user = await transaction.user.create({
        data: {
          displayName: selectInitialDisplayName(input.preferredDisplayName),
          primaryLoginMethod: input.primaryProvider,
          ...contactFields(input.identities),
          authIdentities: {
            create: input.identities.map((identity) => ({
              provider: identity.provider,
              providerSubject: providerSubject(identity.provider, identity.identifier),
              isVerified: true,
              verifiedAt: new Date()
            }))
          },
          roleMemberships: { create: { role: "buyer" } },
          termsAcceptances: {
            create: {
              legalDocumentVersionId: terms.id,
              source: input.source,
              requestId: input.requestId
            }
          }
        }
      });
      return { user, isNewUser: true };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, "RESOURCE_CONFLICT", "邮箱、手机号或第三方身份已绑定其他账号。 ");
    }
    throw error;
  }
}

export async function registerWithChallenge(input: {
  challengeId: string;
  verificationCode: string;
  acceptedTermsVersion?: string;
  requestId: string;
  phoneChallengeId?: string;
  phoneVerificationCode?: string;
}) {
  const challenge = await verifyChallenge(input.challengeId, input.verificationCode, "register");
  if (challenge.provider !== "phone" && challenge.provider !== "email") {
    throw new ApiError(422, "VALIDATION_ERROR", "注册验证方式无效。 ");
  }

  if (challenge.provider === "email") {
    const existingEmailIdentity = await getPrisma().authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "email",
          providerSubject: providerSubject("email", challenge.identifier)
        }
      }
    });

    if (existingEmailIdentity) {
      const authentication = await completeVerifiedRegistration({
        identities: [{ provider: "email", identifier: challenge.identifier }],
        primaryProvider: "phone",
        source: "email_authenticate",
        requestId: input.requestId,
        challengeIds: [challenge.id]
      });
      const session = await createSession(authentication.user.id);
      return { ...authentication, session };
    }

    if (!input.phoneChallengeId || !input.phoneVerificationCode) {
      throw new ApiError(422, "PHONE_BINDING_REQUIRED", "邮箱注册必须验证并绑定手机号。 ");
    }
    const phoneChallenge = await verifyChallenge(
      input.phoneChallengeId,
      input.phoneVerificationCode,
      "register"
    );
    if (phoneChallenge.provider !== "phone") {
      throw new ApiError(422, "PHONE_BINDING_REQUIRED", "邮箱注册必须使用手机号验证码完成绑定。 ");
    }
    const registration = await completeVerifiedRegistration({
      identities: [
        { provider: "phone", identifier: phoneChallenge.identifier },
        { provider: "email", identifier: challenge.identifier }
      ],
      primaryProvider: "phone",
      acceptedTermsVersion: input.acceptedTermsVersion,
      source: "email_phone_authenticate",
      requestId: input.requestId,
      challengeIds: [challenge.id, phoneChallenge.id]
    });
    const session = await createSession(registration.user.id);
    return { ...registration, session };
  }

  const registration = await completeVerifiedRegistration({
    identities: [{ provider: "phone", identifier: challenge.identifier }],
    primaryProvider: "phone",
    acceptedTermsVersion: input.acceptedTermsVersion,
    source: "phone_authenticate",
    requestId: input.requestId,
    challengeIds: [challenge.id]
  });
  const session = await createSession(registration.user.id);

  return { ...registration, session };
}

export async function loginWithChallenge(input: {
  challengeId: string;
  verificationCode: string;
}) {
  const challenge = await verifyChallenge(input.challengeId, input.verificationCode, "login");
  const identity = await getPrisma().authIdentity.findUnique({
    where: {
      provider_providerSubject: {
        provider: challenge.provider,
        providerSubject: providerSubject(challenge.provider, challenge.identifier)
      }
    },
    include: { user: true }
  });

  if (!identity || !identity.isVerified || identity.user.status !== "active") {
    throw new ApiError(401, "SESSION_INVALID", "账号不存在或当前不可登录。 ");
  }

  await getPrisma().$transaction(async (transaction) => {
    await consumeChallenge(transaction, challenge.id);
    await transaction.user.update({
      where: { id: identity.userId },
      data: { lastLoginAt: new Date() }
    });
  });

  const session = await createSession(identity.userId);
  return { user: identity.user, session };
}

export async function loginWithWechat(input: {
  code: string;
  redirectUri: string;
  acceptedTermsVersion?: string;
  phoneChallengeId?: string;
  phoneVerificationCode?: string;
  requestId: string;
}) {
  let wechatIdentity;
  try {
    wechatIdentity = await getAuthProvider().exchangeWechatCode(input.code, input.redirectUri);
  } catch (error) {
    if (error instanceof AuthProviderUnavailableError) {
      throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "微信登录测试 provider 未配置。 ");
    }
    throw error;
  }

  const identity = await getPrisma().authIdentity.findUnique({
    where: {
      provider_providerSubject: { provider: "wechat", providerSubject: wechatIdentity.subject }
    },
    include: { user: true }
  });

  let user: User;
  let isNewUser = false;
  if (identity) {
    if (!identity.isVerified || identity.user.status !== "active") {
      throw new ApiError(401, "SESSION_INVALID", "账号当前不可登录。 ");
    }
    user = await getPrisma().user.update({
      where: { id: identity.userId },
      data: { lastLoginAt: new Date() }
    });
  } else {
    if (!input.phoneChallengeId || !input.phoneVerificationCode) {
      throw new ApiError(422, "PHONE_BINDING_REQUIRED", "首次微信登录必须验证并绑定手机号。 ");
    }
    const phoneChallenge = await verifyChallenge(
      input.phoneChallengeId,
      input.phoneVerificationCode,
      "register"
    );
    if (phoneChallenge.provider !== "phone") {
      throw new ApiError(422, "PHONE_BINDING_REQUIRED", "首次微信登录必须使用手机号验证码完成绑定。 ");
    }

    const registration = await completeVerifiedRegistration({
      identities: [
        { provider: "phone", identifier: phoneChallenge.identifier },
        { provider: "wechat", identifier: wechatIdentity.subject }
      ],
      primaryProvider: "phone",
      preferredDisplayName: wechatIdentity.displayName,
      acceptedTermsVersion: input.acceptedTermsVersion,
      source: "wechat_phone_authenticate",
      requestId: input.requestId,
      challengeIds: [phoneChallenge.id]
    });
    user = registration.user;
    isNewUser = registration.isNewUser;
  }

  const session = await createSession(user.id);
  return { user, isNewUser, session };
}

export async function activateUploaderInvite(
  access: SessionAccess,
  input: { code: string; uploaderDisplayName: string }
) {
  if (access.roles.includes("uploader")) {
    throw new ApiError(409, "UPLOADER_ALREADY_ACTIVE", "当前账号已经是上传者。 ");
  }

  const displayName = input.uploaderDisplayName.trim();
  if (displayName.length < 2 || displayName.length > 40) {
    throw new ApiError(422, "VALIDATION_ERROR", "上传者展示名称需为 2 到 40 个字符。 ");
  }

  return getPrisma().$transaction(async (transaction) => {
    const invite = await transaction.inviteCode.findUnique({
      where: { codeHash: hashInviteCode(input.code) },
      include: { uploaderProfile: true }
    });

    if (!invite) {
      throw new ApiError(422, "INVITE_CODE_INVALID", "邀请码无效。 ");
    }
    if (invite.status === "used") {
      throw new ApiError(409, "INVITE_CODE_USED", "邀请码已使用。 ");
    }
    if (invite.status === "disabled") {
      throw new ApiError(409, "INVITE_CODE_DISABLED", "邀请码已停用。 ");
    }
    if (invite.status === "expired" || (invite.expiresAt && invite.expiresAt <= new Date())) {
      throw new ApiError(409, "INVITE_CODE_EXPIRED", "邀请码已过期。 ");
    }
    if (invite.usedByUserId || invite.uploaderProfile) {
      throw new ApiError(409, "INVITE_CODE_USED", "邀请码已关联其他上传者。 ");
    }

    const claimed = await transaction.inviteCode.updateMany({
      where: {
        id: invite.id,
        status: "unused",
        usedByUserId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      data: {
        status: "used",
        usedByUserId: access.user.id,
        usedAt: new Date()
      }
    });

    if (claimed.count !== 1) {
      throw new ApiError(409, "INVITE_CODE_USED", "邀请码已被其他账号使用。 ");
    }

    const uploaderProfile = await transaction.uploaderProfile.create({
      data: {
        userId: access.user.id,
        inviteCodeId: invite.id,
        displayName
      }
    });
    for (const role of ["buyer", "uploader"] as const) {
      await transaction.userRoleMembership.upsert({
        where: { userId_role: { userId: access.user.id, role } },
        create: { userId: access.user.id, role },
        update: { status: "active" }
      });
    }

    return { uploaderProfile, roles: [...new Set([...access.roles, "buyer", "uploader"])] };
  });
}

export async function getCurrentLegalDocument(type: "terms_of_service" | "privacy_policy" | "commercial_license") {
  const now = new Date();
  const document = await getPrisma().legalDocumentVersion.findFirst({
    where: {
      documentType: type,
      effectiveAt: { lte: now },
      OR: [{ retiredAt: null }, { retiredAt: { gt: now } }]
    },
    orderBy: { effectiveAt: "desc" }
  });

  if (!document) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "未找到当前有效文档。 ");
  }

  return document;
}

export async function getUserRoleSummary(userId: string) {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    include: {
      roleMemberships: { where: { status: "active" } },
      adminRoleAssignments: { where: { status: "active" } }
    }
  });

  if (!user) {
    throw new ApiError(401, "SESSION_INVALID", "账号不存在或当前不可登录。 ");
  }

  const roles = user.roleMemberships.map((membership) => membership.role);
  return {
    roles,
    adminRoles: roles.includes("admin")
      ? user.adminRoleAssignments.map((assignment) => assignment.adminRole)
      : []
  };
}
