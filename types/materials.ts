export type PublicAssetType = "person" | "object" | "scene";
export type PublicAssetSort = "newest" | "popular" | "price_asc" | "price_desc";

export const assetTypeLabels: Record<PublicAssetType, string> = {
  person: "人物",
  object: "物件/道具",
  scene: "场景"
};

export type PublicPreview = {
  id: string;
  kind: "preview" | "thumbnail";
  url: string;
  width: number | null;
  height: number | null;
  watermarkTemplateVersion: string;
};

export type PublicAssetCard = {
  id: string;
  title: string;
  type: PublicAssetType;
  typeLabel: string;
  priceCents: number;
  currency: "CNY";
  certificationStatus: "certified";
  uploaderDisplayName: string;
  listedAt: string;
  preview: PublicPreview;
};

export type PublicAssetDetail = PublicAssetCard & {
  description: string | null;
  tags: string[];
  previews: PublicPreview[];
  licenseSummary: {
    scope: string;
    authorizationDuration: "permanent";
    downloadEligibilityDays: number;
  };
  certificationSummary: {
    status: "certified";
    certificateNo: string;
    source: string | null;
    issuedAt: string | null;
  };
};

export type PublicAssetListMeta = {
  nextCursor: string | null;
  hasMore: boolean;
};

export type PublicAssetListResponse = {
  data: PublicAssetCard[];
  meta: PublicAssetListMeta;
  requestId: string;
};

export type PublicAssetDetailResponse = {
  data: PublicAssetDetail;
  requestId: string;
};

export type PublicAssetFilters = {
  q?: string;
  type?: PublicAssetType;
  tag?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  listedAfter?: string;
  sort: PublicAssetSort;
  cursor?: string;
  limit: number;
};
