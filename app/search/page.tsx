import { PageShell } from "@/components/layout/page-shell";
import { MaterialExplorer, type MaterialExplorerInitialFilters } from "@/components/materials/material-explorer";
import type { PublicAssetSort, PublicAssetType } from "@/types/materials";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    tag?: string;
    minPriceCents?: string;
    maxPriceCents?: string;
    listedAfter?: string;
    sort?: string;
  }>;
};

function validType(value?: string): PublicAssetType | undefined {
  return value === "person" || value === "object" || value === "scene" ? value : undefined;
}

function validSort(value?: string): PublicAssetSort | undefined {
  return value === "newest" || value === "popular" || value === "price_asc" || value === "price_desc"
    ? value
    : undefined;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const initialFilters: MaterialExplorerInitialFilters = {
    q: params.q,
    type: validType(params.type),
    tag: params.tag,
    minPriceCents: params.minPriceCents,
    maxPriceCents: params.maxPriceCents,
    listedAfter: params.listedAfter,
    sort: validSort(params.sort)
  };

  return (
    <PageShell description="通过关键词、素材类型、标签、价格、上架时间和排序查询本地 PostgreSQL 中已审核、已认证并上架的素材。" eyebrow="Search" title="搜索素材">
      <MaterialExplorer initialFilters={initialFilters} />
    </PageShell>
  );
}
