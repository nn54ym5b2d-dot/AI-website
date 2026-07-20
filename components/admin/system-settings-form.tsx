"use client";
import { useState } from "react";
import type { SystemSettings } from "@/types/settings";

export function SystemSettingsForm({ initialSettings, canEdit }: { initialSettings: SystemSettings; canEdit: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const setNumber = (key: keyof Pick<SystemSettings, "certificationFeeCents" | "downloadEligibilityDays" | "signedDownloadUrlTtlMinutes">, value: string) => setSettings((current) => ({ ...current, [key]: Number(value) }));
  const setRate = (key: keyof Pick<SystemSettings, "uploaderShareRate" | "platformShareRate" | "observerShareRate">, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  async function save() {
    setBusy(true); setMessage("");
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
      const csrfPayload = await csrfResponse.json() as { data?: { csrfToken: string }; error?: { message?: string } };
      if (!csrfResponse.ok || !csrfPayload.data) throw new Error(csrfPayload.error?.message ?? "安全校验失败。");
      const response = await fetch("/api/v1/admin/settings", { method: "PATCH", headers: { "content-type": "application/json", "x-csrf-token": csrfPayload.data.csrfToken }, body: JSON.stringify({ ...settings, uploaderShareRate: Number(settings.uploaderShareRate), platformShareRate: Number(settings.platformShareRate), observerShareRate: Number(settings.observerShareRate) }) });
      const payload = await response.json() as { data?: SystemSettings; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "保存失败。");
      setSettings(payload.data); setMessage("设置已保存并写入审计日志；历史业务快照不会被重算。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败。"); } finally { setBusy(false); }
  }
  const money = ["person", "object", "scene"] as const;
  return <div className="grid gap-6">
    <div className="rounded-lg border border-warning/25 bg-amber-50 px-4 py-3 text-sm leading-6 text-warning">365 天是平台下载资格；短时 ZIP 地址期限是每次校验后签发的分钟数，两者不能混为同一设置。所有设置只作为之后新建业务对象的权威来源，历史快照不可变。</div>
    <section className="ui-panel p-5 sm:p-6"><h2 className="font-bold text-ink">价格与认证费</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{money.map((type) => <label className="grid gap-2 text-sm" key={type}><span className="text-muted">{type === "person" ? "人物" : type === "object" ? "物件/道具" : "场景"}价格（分）</span><input className="ui-input" disabled={!canEdit} min={1} onChange={(e) => setSettings((current) => ({ ...current, assetPriceRules: { ...current.assetPriceRules, [type]: Number(e.target.value) } }))} type="number" value={settings.assetPriceRules[type]} /></label>)}<label className="grid gap-2 text-sm"><span className="text-muted">认证上传费（分）</span><input className="ui-input" disabled={!canEdit} min={0} onChange={(e) => setNumber("certificationFeeCents", e.target.value)} type="number" value={settings.certificationFeeCents} /></label></div></section>
    <section className="ui-panel p-5 sm:p-6"><h2 className="font-bold text-ink">分成与下载</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{(["uploaderShareRate", "platformShareRate", "observerShareRate"] as const).map((key) => <label className="grid gap-2 text-sm" key={key}><span className="text-muted">{key === "uploaderShareRate" ? "上传者" : key === "platformShareRate" ? "平台" : "观察员"}比例（0-1）</span><input className="ui-input" disabled={!canEdit} max={1} min={0} onChange={(e) => setRate(key, e.target.value)} step="0.0001" type="number" value={settings[key]} /></label>)}<label className="grid gap-2 text-sm"><span className="text-muted">平台下载资格（天）</span><input className="ui-input" disabled={!canEdit} min={1} onChange={(e) => setNumber("downloadEligibilityDays", e.target.value)} type="number" value={settings.downloadEligibilityDays} /></label><label className="grid gap-2 text-sm"><span className="text-muted">私有 ZIP 短时地址（分钟）</span><input className="ui-input" disabled={!canEdit} max={60} min={1} onChange={(e) => setNumber("signedDownloadUrlTtlMinutes", e.target.value)} type="number" value={settings.signedDownloadUrlTtlMinutes} /></label></div>{canEdit ? <button className="ui-button-primary mt-5" disabled={busy} onClick={save} type="button">{busy ? "保存中…" : "保存设置"}</button> : <p className="mt-5 text-sm text-muted">当前角色为只读；只有超级管理员可以修改。</p>}{message ? <p aria-live="polite" className="mt-3 text-sm text-muted">{message}</p> : null}</section>
  </div>;
}
