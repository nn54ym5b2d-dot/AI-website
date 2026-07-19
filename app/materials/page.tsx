import { Buildings, Cube, UserFocus } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PageShell, PrimaryLink } from "@/components/layout/page-shell";
import { MaterialFeed } from "@/components/materials/material-feed";
import { DemoNotice } from "@/components/ui/demo-notice";

const categories = [
  { label: "人物", detail: "真实人物与多角度形象", type: "person", icon: UserFocus },
  { label: "物件/道具", detail: "器物、产品与细节参考", type: "object", icon: Cube },
  { label: "场景", detail: "空间、建筑与环境氛围", type: "scene", icon: Buildings }
];

export default function MaterialsPage() {
  return (
    <PageShell actions={<PrimaryLink href="/search">搜索与筛选</PrimaryLink>} description="按人物、物件/道具、场景浏览已认证素材；价格与授权规则在浏览阶段清晰可见。" eyebrow="Asset library" title="发现适合项目的创作素材">
      <div className="grid gap-10">
        <section aria-label="素材分类" className="grid gap-3 sm:grid-cols-3">
          {categories.map(({ icon: Icon, ...category }) => (
            <Link className="ui-panel flex items-center gap-4 p-5 transition hover:border-brand/40 hover:shadow-card" href={`/search?type=${category.type}`} key={category.label}>
              <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand"><Icon aria-hidden="true" size={22} weight="duotone" /></span>
              <span><strong className="block text-sm text-ink">{category.label}</strong><span className="mt-1 block text-xs text-muted">{category.detail}</span></span>
            </Link>
          ))}
        </section>
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-ink">最新素材</h2><p className="mt-1 text-sm text-muted">统一采用 4:3 预览比例，减少浏览跳动。</p></div>
            <DemoNotice>本地种子素材 · 真实 API 查询</DemoNotice>
          </div>
          <MaterialFeed limit={20} sort="newest" />
        </section>
      </div>
    </PageShell>
  );
}
