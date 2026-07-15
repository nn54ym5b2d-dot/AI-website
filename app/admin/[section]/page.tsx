import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { adminRoutes, findRouteBySlug } from "@/lib/domain/navigation";
import { requireAudience } from "@/lib/auth/page-guard";

type AdminSectionPageProps = {
  params: Promise<{ section: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return adminRoutes
    .filter((route) => route.slug)
    .map((route) => ({ section: route.slug as string }));
}

export default async function AdminSectionPage({ params }: AdminSectionPageProps) {
  const { section } = await params;
  const route = findRouteBySlug(adminRoutes, section);

  if (!route) {
    notFound();
  }

  await requireAudience(route.href, route.audiences);

  return (
    <PageShell
      actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>}
      description={`${route.description} 当前页面已接入服务端角色守卫，真实业务表格和操作流将在对应后续任务实现。`}
      title={route.title}
    >
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">后台模块信息结构</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {["筛选/搜索", "数据列表", "详情抽屉", "操作记录"].map((item) => (
            <div className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
