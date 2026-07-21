"use client";

import { DownloadSimple, Package, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LinkRecord = {
  id: string;
  authorizationId: string;
  assetTitle: string;
  orderNo: string;
  status: string;
  bundleStatus: string;
  bundleFailureCode: string | null;
  expiresAt: string;
  bundleGeneratedAt: string | null;
  downloadCount: number;
  lastDownloadedAt: string | null;
};

type HistoryRecord = { id: string; assetTitle: string; orderNo: string; downloadedAt: string };

async function csrf() {
  const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
  const payload = await response.json() as { data?: { csrfToken: string }; error?: { message?: string } };
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "安全校验初始化失败。");
  return payload.data.csrfToken;
}

export function DownloadWorkspace({ links, history }: { links: LinkRecord[]; history: HistoryRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function prepare(authorizationId: string) {
    setBusy(authorizationId);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/authorizations/${authorizationId}/download-links`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": await csrf() },
        body: "{}"
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "ZIP 准备失败。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ZIP 准备失败。");
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  return <div className="grid gap-7">
    <div className="rounded-lg border border-warning/30 bg-amber-50 p-4 text-sm text-muted"><div className="flex gap-3"><Package className="shrink-0 text-warning" size={22} /><p>当前使用受控本地 ZIP provider：只为有真实本地测试正文的非真实种子素材生成 ZIP；每次下载再签发独立短时地址。真实腾讯云 COS 仍在 T017 接入。</p></div></div>
    <section className="grid gap-4">
      {links.map((link) => {
        const active = link.status === "active";
        const ready = link.bundleStatus === "ready";
        return <article className="ui-panel p-5" key={link.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-ink">{link.assetTitle}</h2><p className="mt-1 text-xs text-muted">订单 {link.orderNo} · 资格至 {new Date(link.expiresAt).toLocaleString("zh-CN")}</p></div><span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-50 text-success" : "bg-rose-50 text-danger"}`}>{link.status}</span></div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-muted">ZIP 状态</dt><dd className="mt-1 text-ink">{link.bundleStatus}</dd></div><div><dt className="text-xs text-muted">实际下载</dt><dd className="mt-1 text-ink">{link.downloadCount} 次</dd></div><div><dt className="text-xs text-muted">最近下载</dt><dd className="mt-1 text-ink">{link.lastDownloadedAt ? new Date(link.lastDownloadedAt).toLocaleString("zh-CN") : "尚无"}</dd></div></dl>
          {link.bundleFailureCode ? <p className="mt-4 flex items-center gap-2 text-xs text-danger"><WarningCircle size={16} />生成失败：{link.bundleFailureCode}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {active && ready ? <a className="ui-button-primary" href={`/api/v1/download-links/${link.id}/file`}><DownloadSimple size={18} />下载 ZIP</a> : null}
            {active && (link.bundleStatus === "pending" || link.bundleStatus === "failed") ? <button className="ui-button-primary" disabled={busy === link.authorizationId} onClick={() => prepare(link.authorizationId)} type="button">{busy === link.authorizationId ? <SpinnerGap className="animate-spin" size={18} /> : <Package size={18} />}{link.bundleStatus === "failed" ? "重试生成 ZIP" : "准备 ZIP"}</button> : null}
            {active && link.bundleStatus === "processing" ? <button className="ui-button-secondary" disabled type="button"><SpinnerGap className="animate-spin" size={18} />ZIP 生成中</button> : null}
          </div>
        </article>;
      })}
      {!links.length ? <p className="ui-panel p-6 text-sm text-muted">尚无已购素材下载资格。</p> : null}
    </section>
    <section className="ui-panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">下载记录</h2><p className="mt-1 text-xs text-muted">记录每次实际签发 ZIP 短时地址的行为，不保存历史签名 URL。</p></div><div className="divide-y divide-line">{history.map((item) => <article className="flex flex-wrap items-center justify-between gap-3 p-5" key={item.id}><div><strong className="text-sm text-ink">{item.assetTitle}</strong><p className="mt-1 text-xs text-muted">订单 {item.orderNo}</p></div><time className="text-xs text-muted">{new Date(item.downloadedAt).toLocaleString("zh-CN")}</time></article>)}{!history.length ? <p className="p-6 text-sm text-muted">尚无实际下载记录。</p> : null}</div></section>
    {message ? <p className="text-sm text-danger" role="alert">{message}</p> : null}
  </div>;
}
