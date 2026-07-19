"use client";

import { Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import { MaterialGrid } from "@/components/materials/material-card";
import type {
  PublicAssetCard,
  PublicAssetListMeta,
  PublicAssetListResponse,
  PublicAssetSort,
  PublicAssetType
} from "@/types/materials";

export type MaterialExplorerInitialFilters = {
  q?: string;
  type?: PublicAssetType;
  tag?: string;
  minPriceCents?: string;
  maxPriceCents?: string;
  listedAfter?: string;
  sort?: PublicAssetSort;
};

function initialQuery(filters: MaterialExplorerInitialFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.minPriceCents) params.set("minPriceCents", filters.minPriceCents);
  if (filters.maxPriceCents) params.set("maxPriceCents", filters.maxPriceCents);
  if (filters.listedAfter) params.set("listedAfter", filters.listedAfter);
  params.set("sort", filters.sort ?? "newest");
  params.set("limit", "20");
  return params.toString();
}

function priceInYuan(priceCents?: string) {
  const value = Number(priceCents);
  return Number.isFinite(value) && value >= 0 ? String(value / 100) : "";
}

export function MaterialExplorer({ initialFilters = {} }: { initialFilters?: MaterialExplorerInitialFilters }) {
  const [query, setQuery] = useState(initialFilters.q ?? "");
  const [type, setType] = useState<"" | PublicAssetType>(initialFilters.type ?? "");
  const [tag, setTag] = useState(initialFilters.tag ?? "");
  const [minPriceYuan, setMinPriceYuan] = useState(priceInYuan(initialFilters.minPriceCents));
  const [maxPriceYuan, setMaxPriceYuan] = useState(priceInYuan(initialFilters.maxPriceCents));
  const [listedAfter, setListedAfter] = useState(initialFilters.listedAfter?.slice(0, 10) ?? "");
  const [sort, setSort] = useState<PublicAssetSort>(initialFilters.sort ?? "newest");
  const [appliedQuery, setAppliedQuery] = useState(() => initialQuery(initialFilters));
  const [assets, setAssets] = useState<PublicAssetCard[]>([]);
  const [meta, setMeta] = useState<PublicAssetListMeta>({ hasMore: false, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/assets?${appliedQuery}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as PublicAssetListResponse & {
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(payload.error?.message ?? "素材查询失败。 ");
        setAssets(payload.data);
        setMeta(payload.meta);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setAssets([]);
        setMeta({ hasMore: false, nextCursor: null });
        setError(loadError instanceof Error ? loadError.message : "素材查询失败。 ");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [appliedQuery]);

  function buildQuery() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("type", type);
    if (tag.trim()) params.set("tag", tag.trim());
    if (minPriceYuan !== "") params.set("minPriceCents", String(Math.round(Number(minPriceYuan) * 100)));
    if (maxPriceYuan !== "") params.set("maxPriceCents", String(Math.round(Number(maxPriceYuan) * 100)));
    if (listedAfter) params.set("listedAfter", listedAfter);
    params.set("sort", sort);
    params.set("limit", "20");
    return params;
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = buildQuery();
    setAppliedQuery(params.toString());
    window.history.replaceState(null, "", `/search?${params.toString()}`);
  }

  function reset() {
    setQuery("");
    setType("");
    setTag("");
    setMinPriceYuan("");
    setMaxPriceYuan("");
    setListedAfter("");
    setSort("newest");
    const params = new URLSearchParams({ sort: "newest", limit: "20" });
    setAppliedQuery(params.toString());
    window.history.replaceState(null, "", "/search");
  }

  async function loadMore() {
    if (!meta.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams(appliedQuery);
      params.set("cursor", meta.nextCursor);
      const response = await fetch(`/api/v1/assets?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as PublicAssetListResponse & {
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "更多素材加载失败。 ");
      setAssets((current) => [...current, ...payload.data]);
      setMeta(payload.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "更多素材加载失败。 ");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[260px_1fr]" onSubmit={applyFilters}>
      <aside className="ui-panel h-fit p-5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 font-semibold text-ink"><Funnel aria-hidden="true" size={18} />筛选</h2>
          <button className="text-xs font-medium text-brand hover:text-brand-dark" onClick={reset} type="button">清除</button>
        </div>
        <div className="mt-5 grid gap-5">
          <fieldset>
            <legend className="text-xs font-semibold text-muted">素材类型</legend>
            <div className="mt-2 grid gap-1">
              {[
                { value: "", label: "全部" },
                { value: "person", label: "人物" },
                { value: "object", label: "物件/道具" },
                { value: "scene", label: "场景" }
              ].map((item) => (
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-paper" key={item.value || "all"}>
                  <input checked={type === item.value} className="accent-brand" name="type" onChange={() => setType(item.value as "" | PublicAssetType)} type="radio" />{item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 border-t border-line pt-4 text-xs font-semibold text-muted">标签
            <input className="ui-input font-normal text-ink" maxLength={40} onChange={(event) => setTag(event.target.value)} placeholder="例如：自然光" value={tag} />
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-muted">价格（元）</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label><span className="sr-only">最低价格</span><input className="ui-input" min="0" onChange={(event) => setMinPriceYuan(event.target.value)} placeholder="最低" step="1" type="number" value={minPriceYuan} /></label>
              <label><span className="sr-only">最高价格</span><input className="ui-input" min="0" onChange={(event) => setMaxPriceYuan(event.target.value)} placeholder="最高" step="1" type="number" value={maxPriceYuan} /></label>
            </div>
          </fieldset>
          <label className="grid gap-2 text-xs font-semibold text-muted">上架时间不早于
            <input className="ui-input font-normal text-ink" onChange={(event) => setListedAfter(event.target.value)} type="date" value={listedAfter} />
          </label>
          <button className="ui-button-primary w-full" type="submit">应用筛选</button>
        </div>
      </aside>

      <section>
        <div className="ui-panel p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="relative block">
              <span className="sr-only">搜索素材</span>
              <MagnifyingGlass aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={19} />
              <input className="ui-input pl-10 pr-10" maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、说明或标签" value={query} />
              {query ? <button aria-label="清空搜索" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" onClick={() => setQuery("")} type="button"><X aria-hidden="true" size={16} /></button> : null}
            </label>
            <label><span className="sr-only">排序</span><select className="ui-input" onChange={(event) => setSort(event.target.value as PublicAssetSort)} value={sort}><option value="newest">最新上架</option><option value="popular">热门（暂无热度，按最新）</option><option value="price_asc">价格从低到高</option><option value="price_desc">价格从高到低</option></select></label>
          </div>
        </div>
        <div className="my-5 flex items-center justify-between gap-4 text-sm"><p className="text-muted">当前显示 <strong className="text-ink">{assets.length}</strong> 个结果</p><span className="demo-label">本地测试数据 · API 查询</span></div>
        {error ? <div className="mb-5 rounded-lg border border-brand/25 bg-brand-soft p-4 text-sm text-brand-dark" role="alert">{error}</div> : null}
        {loading ? <div aria-live="polite" className="ui-panel grid min-h-64 place-items-center p-8 text-sm text-muted">正在查询本地 PostgreSQL 素材…</div> : assets.length ? <><MaterialGrid assets={assets} />{meta.hasMore ? <div className="mt-7 text-center"><button className="ui-button-secondary" disabled={loadingMore} onClick={loadMore} type="button">{loadingMore ? "加载中…" : "加载更多"}</button></div> : null}</> : <div className="ui-panel grid min-h-64 place-items-center p-8 text-center"><div><p className="font-semibold text-ink">没有匹配素材</p><p className="mt-2 text-sm text-muted">请调整关键词、价格或上架时间。</p><button className="mt-5 text-sm font-semibold text-brand" onClick={reset} type="button">清除全部筛选</button></div></div>}
      </section>
    </form>
  );
}
