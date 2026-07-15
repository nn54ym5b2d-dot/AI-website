import { notFound } from "next/navigation";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { accountRoutes, findRouteBySlug } from "@/lib/domain/navigation";
import { requireAudience } from "@/lib/auth/page-guard";

type AccountSectionPageProps = {
  params: Promise<{ section: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return accountRoutes
    .filter((route) => route.slug)
    .map((route) => ({ section: route.slug as string }));
}

export default async function AccountSectionPage({ params }: AccountSectionPageProps) {
  const { section } = await params;
  const route = findRouteBySlug(accountRoutes, section);

  if (!route) {
    notFound();
  }

  await requireAudience(route.href, route.audiences);

  return (
    <PageShell
      actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>}
      description={`${route.description} 当前页面已接入服务端角色守卫，真实业务数据将在对应后续任务接入。`}
      title={route.title}
    >
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">页面信息结构</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["列表区域", "状态字段", "详情入口"].map((item) => (
            <div className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
