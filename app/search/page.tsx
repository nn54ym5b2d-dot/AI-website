import { PageShell, SecondaryLink } from "@/components/layout/page-shell";

export default function SearchPage() {
  return (
    <PageShell
      actions={<SecondaryLink href="/materials/demo-asset">查看详情骨架</SecondaryLink>}
      description="搜索结果页承接关键词搜索和筛选。当前只定义筛选栏、结果列表和详情跳转，不连接真实搜索服务。"
      title="搜索结果页"
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">筛选条件</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted">
            {["关键词", "素材类型", "认证状态", "价格区间", "上架时间"].map((filter) => (
              <div className="rounded-md border border-line bg-paper p-3" key={filter}>
                {filter}
              </div>
            ))}
          </div>
        </aside>
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">结果列表骨架</h2>
          <div className="mt-4 grid gap-3">
            {[1, 2, 3].map((item) => (
              <a
                className="grid gap-3 rounded-md border border-line bg-paper p-4 text-sm md:grid-cols-[120px_1fr_auto]"
                href="/materials/demo-asset"
                key={item}
              >
                <span className="flex aspect-video items-center justify-center rounded border border-line bg-white text-muted">
                  预览
                </span>
                <span>
                  <span className="block font-medium text-ink">示例素材 {item}</span>
                  <span className="mt-1 block text-muted">类型、认证状态、用途说明摘要。</span>
                </span>
                <span className="font-medium text-brand">查看详情</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
