import { SiteHeader } from "@/components/layout/site-header";
import { adminSections } from "@/lib/domain/project";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-paper">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink">管理后台框架</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            当前页面是后台入口骨架，用来承接后续素材审核、认证证书、订单支付、收益和外部观察员只读看板。
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => (
            <article className="rounded-lg border border-line bg-white p-5" key={section.name}>
              <h2 className="text-sm font-semibold text-ink">{section.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{section.description}</p>
              <div className="mt-4 text-xs font-medium text-brand">{section.priority}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
