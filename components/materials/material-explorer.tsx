"use client";

import { Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { MaterialGrid } from "@/components/materials/material-card";
import type { DemoAsset } from "@/lib/domain/demo-content";

export function MaterialExplorer({ assets, initialQuery = "", initialCategory = "全部" }: { assets: DemoAsset[]; initialQuery?: string; initialCategory?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [certifiedOnly, setCertifiedOnly] = useState(true);
  const [sort, setSort] = useState("recommended");

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = assets.filter((asset) => {
      const matchesQuery = !normalized || [asset.title, asset.category, asset.summary, ...asset.tags].join(" ").toLowerCase().includes(normalized);
      const matchesCategory = category === "全部" || asset.category === category;
      return matchesQuery && matchesCategory && (!certifiedOnly || asset.certified);
    });
    return [...result].sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : a.id.localeCompare(b.id));
  }, [assets, category, certifiedOnly, query, sort]);

  function reset() {
    setQuery("");
    setCategory("全部");
    setCertifiedOnly(true);
    setSort("recommended");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="ui-panel h-fit p-5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 font-semibold text-ink"><Funnel aria-hidden="true" size={18} />筛选</h2>
          <button className="text-xs font-medium text-brand hover:text-brand-dark" onClick={reset} type="button">清除</button>
        </div>
        <div className="mt-5 grid gap-5">
          <fieldset>
            <legend className="text-xs font-semibold text-muted">素材类型</legend>
            <div className="mt-2 grid gap-1">
              {["全部", "人物", "物件/道具", "场景"].map((item) => (
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-paper" key={item}>
                  <input checked={category === item} className="accent-brand" name="category" onChange={() => setCategory(item)} type="radio" />{item}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 border-t border-line pt-4 text-sm leading-6 text-ink">
            <input checked={certifiedOnly} className="mt-1 accent-brand" onChange={(event) => setCertifiedOnly(event.target.checked)} type="checkbox" />仅看已认证素材
          </label>
        </div>
      </aside>

      <section>
        <div className="ui-panel p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="relative block">
              <span className="sr-only">搜索结果</span>
              <MagnifyingGlass aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={19} />
              <input className="ui-input pl-10 pr-10" onChange={(event) => setQuery(event.target.value)} placeholder="在演示素材中搜索" value={query} />
              {query ? <button aria-label="清空搜索" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" onClick={() => setQuery("")} type="button"><X aria-hidden="true" size={16} /></button> : null}
            </label>
            <label><span className="sr-only">排序</span><select className="ui-input" onChange={(event) => setSort(event.target.value)} value={sort}><option value="recommended">推荐排序</option><option value="price-low">价格从低到高</option><option value="price-high">价格从高到低</option></select></label>
          </div>
        </div>
        <div className="my-5 flex items-center justify-between gap-4 text-sm"><p className="text-muted">找到 <strong className="text-ink">{filteredAssets.length}</strong> 个演示结果</p><span className="demo-label">演示数据</span></div>
        {filteredAssets.length ? <MaterialGrid assets={filteredAssets} /> : <div className="ui-panel grid min-h-64 place-items-center p-8 text-center"><div><p className="font-semibold text-ink">没有匹配素材</p><p className="mt-2 text-sm text-muted">请调整关键词或清除筛选条件。</p><button className="mt-5 text-sm font-semibold text-brand" onClick={reset} type="button">恢复全部演示素材</button></div></div>}
      </section>
    </div>
  );
}
