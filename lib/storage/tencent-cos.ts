import { getAppEnv } from "@/lib/config/env";

export type CosObjectPurpose =
  | "asset-original"
  | "asset-preview"
  | "asset-thumbnail"
  | "person-proof"
  | "certification-file";

export function buildCosObjectKey(purpose: CosObjectPurpose, fileName: string) {
  const normalizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const today = new Date().toISOString().slice(0, 10);

  return `${purpose}/${today}/${crypto.randomUUID()}-${normalizedName}`;
}

export function getTencentCosConfig() {
  const { tencentCosBucket, tencentCosRegion } = getAppEnv();

  if (!tencentCosBucket || !tencentCosRegion) {
    throw new Error("Tencent COS bucket and region are not configured.");
  }

  return {
    bucket: tencentCosBucket,
    region: tencentCosRegion
  };
}
