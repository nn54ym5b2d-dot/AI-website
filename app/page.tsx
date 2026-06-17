import { SiteHeader } from "@/components/layout/site-header";
import { coreModules, roleSummaries } from "@/lib/domain/project";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-ink md:text-5xl">
            源素库
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            面向 AI 视频、游戏、短剧广告和虚拟内容制作方的数字素材交易平台。
            第一版先跑通认证上传、审核上架、购买下载、授权记录、收益记录和后台权限。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="rounded-md bg-brand px-5 py-3 text-sm font-medium text-white shadow-panel transition hover:bg-blue-700"
              href="/upload"
            >
              上传者入口
            </a>
            <a
              className="rounded-md border border-line bg-white px-5 py-3 text-sm font-medium text-ink transition hover:border-brand"
              href="/admin"
            >
              管理后台
            </a>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-ink">MVP 核心模块</h2>
          <div className="mt-5 grid gap-3">
            {coreModules.map((module) => (
              <div
                className="rounded-md border border-line bg-paper px-4 py-3"
                key={module.name}
              >
                <div className="text-sm font-medium text-ink">{module.name}</div>
                <div className="mt-1 text-sm leading-6 text-muted">
                  {module.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-16 lg:px-8">
        <h2 className="text-xl font-semibold text-ink">第一版角色</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roleSummaries.map((role) => (
            <article className="rounded-lg border border-line bg-white p-5" key={role.name}>
              <h3 className="text-sm font-semibold text-ink">{role.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{role.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
