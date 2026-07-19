"use client";

import { useEffect, useState } from "react";
import { MaterialGrid } from "@/components/materials/material-card";
import type { PublicAssetCard, PublicAssetListResponse, PublicAssetSort, PublicAssetType } from "@/types/materials";

type MaterialFeedProps = {
  limit?: number;
  sort?: PublicAssetSort;
  type?: PublicAssetType;
  emptyMessage?: string;
};

export function MaterialFeed({
  limit = 3,
  sort = "newest",
  type,
  emptyMessage = "当前没有符合公开上架条件的素材。"
}: MaterialFeedProps) {
  const [assets, setAssets] = useState<PublicAssetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(limit), sort });
    if (type) params.set("type", type);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/assets?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as PublicAssetListResponse & {
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(payload.error?.message ?? "素材加载失败。 ");
        setAssets(payload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "素材加载失败。 ");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [limit, sort, type]);

  if (loading) {
    return <div aria-live="polite" className="ui-panel grid min-h-56 place-items-center p-8 text-sm text-muted">正在从本地素材 API 加载…</div>;
  }
  if (error) {
    return <div className="ui-panel grid min-h-56 place-items-center p-8 text-center"><div><p className="font-semibold text-ink">暂时无法加载素材</p><p className="mt-2 text-sm text-muted">{error}</p></div></div>;
  }
  if (!assets.length) {
    return <div className="ui-panel grid min-h-56 place-items-center p-8 text-sm text-muted">{emptyMessage}</div>;
  }

  return <MaterialGrid assets={assets} />;
}
