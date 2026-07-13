import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { assetTypes } from "@/lib/domain/project";
import { accountRoutes, uploadSteps } from "@/lib/domain/navigation";

export default function UploadPage() {
  return (
    <PageShell
      actions={<SecondaryLink href="/account/uploads">查看我的上传</SecondaryLink>}
      description="上传者需要邀请码激活。当前页面只建立认证上传的信息结构，真实上传、支付、COS 和认证接口留到后续任务。"
      title="上传者入口"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">素材类型规则</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {assetTypes.map((asset) => (
              <article className="rounded-lg border border-line bg-white p-5" key={asset.name}>
                <h3 className="text-sm font-semibold text-ink">{asset.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{asset.rule}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">认证上传流程骨架</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {uploadSteps.map((step, index) => (
              <li className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={step}>
                <span className="mr-2 font-semibold text-brand">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">上传者中心相关页面</h2>
          <div className="mt-5">
            <RouteCardGrid
              routes={accountRoutes.filter((route) => route.roleEntry.includes("上传者"))}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
