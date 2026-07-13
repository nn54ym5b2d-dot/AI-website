import Link from "next/link";
import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { RouteCardGrid } from "@/components/navigation/route-card";
import { coreModules } from "@/lib/domain/project";
import {
  internalEntryRoutes,
  publicPageRouteGroups,
  publicRoleEntryRoutes
} from "@/lib/domain/navigation";

export default function HomePage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/materials">浏览素材</PrimaryLink>
          <SecondaryLink href="/upload">上传者入口</SecondaryLink>
        </>
      }
      description="面向 AI 视频、游戏、短剧广告和虚拟内容制作方的数字素材交易平台。页面结构已确认，T009 起逐步接入本地真实数据和业务 API。"
      title="源素库"
    >
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold text-ink">第一版角色从哪里进入</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {publicRoleEntryRoutes.map((role) => (
              <article className="rounded-lg border border-line bg-white p-5" key={role.role}>
                <div className="text-sm font-semibold text-ink">{role.role}</div>
                <Link className="mt-2 block text-sm font-medium text-brand" href={role.href}>
                  {role.entry}
                </Link>
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
          <h2 className="text-xl font-semibold text-ink">第一版公开页面分组</h2>
          <div className="mt-5 grid gap-7">
            {publicPageRouteGroups.map((group) => (
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

        <section className="border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>内部入口</span>
            {internalEntryRoutes.map((route) => (
              <Link
                className="text-muted underline-offset-4 transition hover:text-ink hover:underline"
                href={route.href}
                key={route.href}
              >
                {route.role}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
