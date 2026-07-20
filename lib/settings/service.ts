import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import type { SessionAccess } from "@/lib/auth/session";
import type { SystemSettings } from "@/types/settings";

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  certificationFeeCents: 1000,
  assetPriceRules: { person: 5000, object: 1000, scene: 5000 },
  uploaderShareRate: "0.8000",
  platformShareRate: "0.2000",
  observerShareRate: "0.0000",
  downloadEligibilityDays: 365,
  signedDownloadUrlTtlMinutes: 10
};

const keyMap = {
  certificationFeeCents: "certification_fee_cents",
  assetPriceRules: "asset_price_rules",
  uploaderShareRate: "uploader_share_rate",
  platformShareRate: "platform_share_rate",
  observerShareRate: "observer_share_rate",
  downloadEligibilityDays: "download_eligibility_days",
  signedDownloadUrlTtlMinutes: "signed_download_url_ttl_minutes"
} as const;

type DbClient = Pick<ReturnType<typeof getPrisma>, "systemSetting">;

function numberValue(value: Prisma.JsonValue | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function rateValue(value: Prisma.JsonValue | undefined, fallback: string) {
  return typeof value === "string" && /^\d\.\d{4}$/.test(value) ? value : fallback;
}

export async function getSystemSettings(client: DbClient = getPrisma()): Promise<SystemSettings> {
  const rows = await client.systemSetting.findMany();
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const prices = values.get(keyMap.assetPriceRules);
  const priceObject = prices && typeof prices === "object" && !Array.isArray(prices)
    ? prices as Record<string, Prisma.JsonValue>
    : {};
  return {
    certificationFeeCents: numberValue(values.get(keyMap.certificationFeeCents), DEFAULT_SYSTEM_SETTINGS.certificationFeeCents),
    assetPriceRules: {
      person: numberValue(priceObject.person, DEFAULT_SYSTEM_SETTINGS.assetPriceRules.person),
      object: numberValue(priceObject.object, DEFAULT_SYSTEM_SETTINGS.assetPriceRules.object),
      scene: numberValue(priceObject.scene, DEFAULT_SYSTEM_SETTINGS.assetPriceRules.scene)
    },
    uploaderShareRate: rateValue(values.get(keyMap.uploaderShareRate), DEFAULT_SYSTEM_SETTINGS.uploaderShareRate),
    platformShareRate: rateValue(values.get(keyMap.platformShareRate), DEFAULT_SYSTEM_SETTINGS.platformShareRate),
    observerShareRate: rateValue(values.get(keyMap.observerShareRate), DEFAULT_SYSTEM_SETTINGS.observerShareRate),
    downloadEligibilityDays: numberValue(values.get(keyMap.downloadEligibilityDays), DEFAULT_SYSTEM_SETTINGS.downloadEligibilityDays),
    signedDownloadUrlTtlMinutes: numberValue(values.get(keyMap.signedDownloadUrlTtlMinutes), DEFAULT_SYSTEM_SETTINGS.signedDownloadUrlTtlMinutes)
  };
}

export function settingsSnapshot(settings: SystemSettings) {
  return { ...settings, assetPriceRules: { ...settings.assetPriceRules } };
}

export async function updateSystemSettings(
  access: SessionAccess,
  input: SystemSettings,
  requestId: string
) {
  const totalRate = [input.uploaderShareRate, input.platformShareRate, input.observerShareRate]
    .reduce((sum, rate) => sum + Math.round(Number(rate) * 10000), 0);
  if (totalRate !== 10000) {
    throw new ApiError(422, "VALIDATION_ERROR", "上传者、平台和观察员分成比例之和必须等于 100%。");
  }

  return getPrisma().$transaction(async (transaction) => {
    const previous = await getSystemSettings(transaction);
    const entries: Array<[string, Prisma.InputJsonValue, string]> = [
      [keyMap.certificationFeeCents, input.certificationFeeCents, "每份素材的认证上传费，单位分。"],
      [keyMap.assetPriceRules, input.assetPriceRules, "三类素材当前统一售价，单位分。"],
      [keyMap.uploaderShareRate, input.uploaderShareRate, "上传者收益比例。"],
      [keyMap.platformShareRate, input.platformShareRate, "平台收益比例。"],
      [keyMap.observerShareRate, input.observerShareRate, "外部观察员收益比例。"],
      [keyMap.downloadEligibilityDays, input.downloadEligibilityDays, "购买后的平台下载资格天数。"],
      [keyMap.signedDownloadUrlTtlMinutes, input.signedDownloadUrlTtlMinutes, "私有 ZIP 短时地址有效分钟数。"]
    ];
    for (const [key, value, description] of entries) {
      await transaction.systemSetting.upsert({
        where: { key },
        update: { value, description, updatedByUserId: access.user.id },
        create: { key, value, description, updatedByUserId: access.user.id }
      });
    }
    for (const [assetType, priceCents] of Object.entries(input.assetPriceRules)) {
      await transaction.asset.updateMany({
        where: { assetType: assetType as "person" | "object" | "scene", deletedAt: null },
        data: { priceCents }
      });
    }
    await transaction.auditLog.create({
      data: {
        actorUserId: access.user.id,
        action: "system_settings.updated",
        targetType: "system_settings",
        requestId,
        metadata: { before: previous, after: input }
      }
    });
    return getSystemSettings(transaction);
  });
}
