import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { assetTypes } from "@/lib/domain/project";

export default function MaterialsPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/search">搜索素材</PrimaryLink>
          <SecondaryLink href="/materials/demo-asset">查看详情骨架</SecondaryLink>
        </>
      }
      description="第一版素材浏览按人物、物件/道具、场景三类展开。当前只建立分类和列表骨架，真实素材数据留到 T007/T008 后接入。"
      title="素材分类页"
    >
      <div className="grid gap-8">
        <section className="grid gap-4 md:grid-cols-3">
          {assetTypes.map((asset) => (
            <article className="rounded-lg border border-line bg-white p-5" key={asset.name}>
              <h2 className="text-base font-semibold text-ink">{asset.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{asset.rule}</p>
              <a className="mt-4 block text-sm font-medium text-brand" href="/search">
                查看该类素材
              </a>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">列表信息结构</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {["素材封面", "素材类型", "认证状态", "价格和购买入口"].map((item) => (
              <div className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
