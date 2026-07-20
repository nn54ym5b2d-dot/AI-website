import Link from "next/link";
import {
  Armchair,
  ArrowRight,
  Buildings,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  UserFocus
} from "@phosphor-icons/react/ssr";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MaterialFeed } from "@/components/materials/material-feed";
import { DemoNotice } from "@/components/ui/demo-notice";

const categories = [
  { label: "人物素材", detail: "真实人物参考与角色形象", href: "/search?type=person", icon: UserFocus },
  { label: "物件/道具", detail: "可复用的物件与道具参考", href: "/search?type=object", icon: Armchair },
  { label: "场景素材", detail: "空间、建筑与环境氛围", href: "/search?type=scene", icon: Buildings }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <section className="site-container pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
          <p className="ui-eyebrow">Certified digital assets</p>
          <h1 className="mx-auto mt-4 max-w-5xl text-3xl font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-4xl">
            为下一次创作，找到<span className="text-brand">可信赖的源素材</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            面向 AI 视频、游戏、短剧广告与虚拟内容制作方，提供来源清晰、认证可查、授权明确的数字素材。
          </p>
          <form action="/search" className="mx-auto mt-6 flex max-w-3xl items-center gap-2 rounded-lg border border-line bg-white p-2 shadow-panel" role="search">
            <MagnifyingGlass aria-hidden="true" className="ml-2 shrink-0 text-muted" size={22} />
            <label className="sr-only" htmlFor="home-search">搜索素材</label>
            <input className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted/75 sm:text-base" id="home-search" name="q" placeholder="搜索人物、道具或场景，例如：都市青年" />
            <button className="ui-button-primary shrink-0 px-4 sm:px-6" type="submit">搜索</button>
          </form>
          <div className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
            {categories.map(({ icon: Icon, ...category }) => (
              <Link className="group flex items-center gap-3 rounded-lg p-3 text-left transition hover:bg-paper sm:justify-center sm:text-center" href={category.href} key={category.label}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-ink transition group-hover:bg-brand-soft group-hover:text-brand"><Icon aria-hidden="true" size={22} weight="duotone" /></span>
                <span><span className="block text-sm font-semibold text-ink group-hover:text-brand">{category.label}</span><span className="mt-0.5 hidden text-xs text-muted lg:block">{category.detail}</span></span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted sm:text-sm">
            <span className="inline-flex items-center gap-1.5"><SealCheck aria-hidden="true" className="text-success" size={17} weight="fill" />认证后上架</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="text-success" size={17} weight="fill" />商业授权记录</span>
            <span>人物/场景 ¥50 · 物件/道具 ¥10</span>
          </div>
        </section>

        <section className="border-t border-line"><div className="site-container py-10 sm:py-14">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ui-eyebrow">Latest assets</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">最新上架素材</h2>
              <div className="mt-3"><DemoNotice>本地种子素材 · 真实 API 查询</DemoNotice></div>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark" href="/materials">查看全部素材<ArrowRight aria-hidden="true" size={16} weight="bold" /></Link>
          </div>
          <MaterialFeed limit={3} sort="newest" />
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
