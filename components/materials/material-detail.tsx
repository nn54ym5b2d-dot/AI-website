"use client";

import Link from "next/link";
import { ArrowLeft, FileText, SealCheck, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { MaterialGallery } from "@/components/materials/material-gallery";
import { PurchasePanel } from "@/components/materials/purchase-panel";
import { DemoNotice } from "@/components/ui/demo-notice";
import type { PublicAssetDetail as PublicAssetDetailData, PublicAssetDetailResponse } from "@/types/materials";

export function MaterialDetail({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<PublicAssetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/assets/${encodeURIComponent(assetId)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as PublicAssetDetailResponse & {
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(payload.error?.message ?? "素材详情加载失败。 ");
        setAsset(payload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "素材详情加载失败。 ");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [assetId]);

  if (loading) {
    return <main className="site-container grid min-h-[60vh] place-items-center py-12 text-sm text-muted">正在从本地素材 API 加载详情…</main>;
  }
  if (!asset || error) {
    return <main className="site-container grid min-h-[60vh] place-items-center py-12 text-center"><div><p className="text-xl font-bold text-ink">无法显示该素材</p><p className="mt-2 text-sm text-muted">{error ?? "素材不存在或尚未上架。"}</p><Link className="ui-button-secondary mt-5" href="/materials">返回素材库</Link></div></main>;
  }

  return (
    <main className="site-container py-10 sm:py-12">
      <p className="ui-eyebrow">{asset.typeLabel}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.025em] text-ink sm:text-4xl">{asset.title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">查看认证状态、带水印预览、素材说明和授权范围，再进入后续购买流程。</p>
      <Link className="mb-5 mt-7 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand" href="/materials"><ArrowLeft aria-hidden="true" size={16} />返回素材库</Link>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="ui-panel p-3 sm:p-5">
          <MaterialGallery previews={asset.previews} title={asset.title} />
          <p className="mt-3 text-xs leading-5 text-muted">当前展示的是水印已写入图片像素的本地衍生图；公开接口不返回私有原文件定位信息。</p>
        </section>
        <aside className="ui-panel h-fit p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-3"><DemoNotice>本地测试数据</DemoNotice><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><SealCheck aria-hidden="true" size={19} weight="fill" />已认证</span></div>
          <dl className="mt-6 grid gap-4 text-sm">
            <div><dt className="text-xs text-muted">素材编号</dt><dd className="mt-1 break-all font-medium text-ink">{asset.id}</dd></div>
            <div><dt className="text-xs text-muted">上传者</dt><dd className="mt-1 font-medium text-ink">{asset.uploaderDisplayName}</dd></div>
            <div><dt className="text-xs text-muted">素材说明</dt><dd className="mt-1 leading-6 text-ink">{asset.description ?? "上传者暂未补充说明。"}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">{asset.tags.map((tag) => <Link className="rounded-full bg-paper px-3 py-1.5 text-xs text-muted hover:text-brand" href={`/search?tag=${encodeURIComponent(tag)}`} key={tag}>{tag}</Link>)}</div>
          <div className="my-6 grid gap-3 rounded-lg bg-paper p-4 text-sm">
            <div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={20} weight="duotone" /><div><strong className="text-ink">认证状态可查</strong><p className="mt-1 text-xs leading-5 text-muted">证书编号：{asset.certificationSummary.certificateNo}</p><p className="text-xs leading-5 text-muted">来源：{asset.certificationSummary.source ?? "未公开来源名称"} · 签发：{asset.certificationSummary.issuedAt ? new Date(asset.certificationSummary.issuedAt).toLocaleDateString("zh-CN") : "未记录"}</p></div></div>
            <div className="flex gap-3"><FileText aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={20} weight="duotone" /><div><strong className="text-ink">统一商业授权</strong><p className="mt-1 text-xs leading-5 text-muted">支付后生成永久授权记录；平台下载资格默认 {asset.licenseSummary.downloadEligibilityDays} 天。</p><Link className="mt-1 inline-block text-xs font-semibold text-brand" href="/license">查看当前授权说明</Link></div></div>
          </div>
          <PurchasePanel assetId={asset.id} priceCents={asset.priceCents} />
        </aside>
      </div>
    </main>
  );
}
