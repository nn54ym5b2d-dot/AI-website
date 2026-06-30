import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { coreModules } from "@/lib/domain/project";
import { pageRouteGroups, roleEntryRoutes } from "@/lib/domain/navigation";

export default function HomePage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/materials">浏览素材</PrimaryLink>
          <SecondaryLink href="/upload">上传者入口</SecondaryLink>
        </>
      }
      description="面向 AI 视频、游戏、短剧广告和虚拟内容制作方的数字素材交易平台。T006 先明确页面结构、角色入口和路由关系，后续再接入真实业务。"
      title="源素库"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">第一版角色从哪里进入</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {roleEntryRoutes.map((role) => (
              <article className="rounded-lg border border-line bg-white p-5" key={role.role}>
                <div className="text-sm font-semibold text-ink">{role.role}</div>
                <a className="mt-2 block text-sm font-medium text-brand" href={role.href}>
                  {role.entry}
                </a>
                <p className="mt-3 text-sm leading-6 text-muted">{role.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">MVP 核心模块</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {coreModules.map((module) => (
              <article className="rounded-lg border border-line bg-white p-5" key={module.name}>
                <h3 className="text-sm font-semibold text-ink">{module.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">第一版页面分组</h2>
          <div className="mt-5 grid gap-7">
            {pageRouteGroups.map((group) => (
              <div className="rounded-lg border border-line bg-paper p-5" key={group.title}>
                <div className="mb-4 max-w-3xl">
                  <h3 className="text-base font-semibold text-ink">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{group.description}</p>
                </div>
                <RouteCardGrid routes={group.routes} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
