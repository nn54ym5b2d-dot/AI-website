import { SiteHeader } from "@/components/layout/site-header";
import { assetTypes } from "@/lib/domain/project";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-paper">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink">上传者入口框架</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            第一版上传者需要邀请码激活。素材提交时填写名称和类型，说明可选填；
            只有人物素材需要必要证明材料，所有素材都需要获得认证证书后才能上架。
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {assetTypes.map((asset) => (
            <article className="rounded-lg border border-line bg-white p-5" key={asset.name}>
              <h2 className="text-sm font-semibold text-ink">{asset.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{asset.rule}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
