import { PageShell } from "@/components/layout/page-shell";
import { MaterialExplorer } from "@/components/materials/material-explorer";
import { demoAssets } from "@/lib/domain/demo-content";

type SearchPageProps = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", category = "全部" } = await searchParams;
  return (
    <PageShell description="用关键词、素材类型与认证状态缩小范围；当前筛选只作用于页面内演示素材。" eyebrow="Search" title="搜索素材">
      <MaterialExplorer assets={demoAssets} initialCategory={category} initialQuery={q} />
    </PageShell>
  );
}
