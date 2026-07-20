export type SystemSettings = {
  certificationFeeCents: number;
  assetPriceRules: { person: number; object: number; scene: number };
  uploaderShareRate: string;
  platformShareRate: string;
  observerShareRate: string;
  downloadEligibilityDays: number;
  signedDownloadUrlTtlMinutes: number;
};
