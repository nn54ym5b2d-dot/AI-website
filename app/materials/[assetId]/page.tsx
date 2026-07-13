import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";

type AssetDetailPageProps = {
  params: Promise<{ assetId: string }>;
};

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params;

  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/checkout">进入订单支付</PrimaryLink>
          <SecondaryLink href="/materials">返回分类页</SecondaryLink>
        </>
      }
      description="素材详情页展示预览、价格、认证状态和购买入口。当前使用路由参数展示页面骨架，不读取真实素材数据。"
      title="素材详情页"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-line bg-white p-5">
          <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-line bg-paper text-sm text-muted">
            素材预览区域：{assetId}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">详情信息结构</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            {[
              ["素材编号", assetId],
              ["素材类型", "人物 / 物件 / 场景"],
              ["认证状态", "已认证后才允许上架"],
              ["价格", "待 Robert 确认定价规则"],
              ["授权说明", "支付后生成统一商业授权记录"]
            ].map(([label, value]) => (
              <div className="rounded-md border border-line bg-paper p-4" key={label}>
                <dt className="font-medium text-ink">{label}</dt>
                <dd className="mt-1 text-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </PageShell>
  );
}
