import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { observerMetrics } from "@/lib/domain/navigation";
import { requireAudience } from "@/lib/auth/page-guard";

export const dynamic = "force-dynamic";

export default async function ObserverPage() {
  const access = await requireAudience("/observer", ["observer"]);

  return (
    <PageShell
      actions={<SecondaryLink href="/">返回首页</SecondaryLink>}
      description={`${access.observerProfile?.partnerName ?? access.user.displayName} 仅可查看汇总；首版分成比例为 0，不允许编辑、审核、退款或导出。`}
      title="外部观察员只读看板"
    >
      <div className="grid gap-8">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">可见汇总字段</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {observerMetrics.map((metric) => (
              <div className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={metric}>
                {metric}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">不可见和不可操作</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "不能导出任何后台数据",
              "不能查看用户手机号、邮箱、证件信息或支付账户",
              "不能查看素材原文件地址、下载原始链接或平台密钥",
              "不能编辑、审核、退款、录入认证或修改分成规则"
            ].map((rule) => (
              <div className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={rule}>
                {rule}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
