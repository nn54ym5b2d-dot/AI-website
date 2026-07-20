"use client";

import { useState } from "react";

type Invite = { id: string; code: string; status: string; note: string | null; createdBy: string; usedBy: string | null; expiresAt: string | null; createdAt: string };
type Payload<T> = { data?: T; error?: { message?: string } };

async function csrf() {
  const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
  const payload = await response.json() as Payload<{ csrfToken: string }>;
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "安全校验失败。");
  return payload.data.csrfToken;
}

export function InviteCodeManager({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const response = await fetch("/api/v1/admin/invite-codes", { cache: "no-store" });
    const payload = await response.json() as Payload<Invite[]>;
    if (response.ok && payload.data) setInvites(payload.data);
  }

  async function create() {
    setBusy(true); setMessage(""); setRevealedCode(null);
    try {
      const response = await fetch("/api/v1/admin/invite-codes", { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": await csrf() }, body: JSON.stringify({ note: note || null, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) });
      const payload = await response.json() as Payload<{ code: string; disclosure: string }>;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "创建失败。");
      setRevealedCode(payload.data.code); setMessage(payload.data.disclosure); setNote(""); setExpiresAt(""); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败。"); } finally { setBusy(false); }
  }

  async function disable(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/invite-codes/${id}/disable`, { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": await csrf() }, body: "{}" });
      const payload = await response.json() as Payload<unknown>;
      if (!response.ok) throw new Error(payload.error?.message ?? "禁用失败。");
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "禁用失败。"); } finally { setBusy(false); }
  }

  return <div className="grid gap-6">
    <section className="ui-panel p-5"><h2 className="font-bold text-ink">创建邀请码</h2><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_240px_auto]"><input className="ui-input" maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="用途备注（选填）" value={note} /><input className="ui-input" min={new Date().toISOString().slice(0, 16)} onChange={(e) => setExpiresAt(e.target.value)} type="datetime-local" value={expiresAt} /><button className="ui-button-primary" disabled={busy} onClick={create} type="button">{busy ? "处理中…" : "创建"}</button></div>{revealedCode ? <div className="mt-4 rounded-lg border border-brand/25 bg-brand-soft p-4"><p className="text-xs text-muted">仅本次完整显示</p><code className="mt-2 block break-all text-lg font-bold text-brand">{revealedCode}</code></div> : null}{message ? <p aria-live="polite" className="mt-3 text-sm text-muted">{message}</p> : null}</section>
    <section className="ui-panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">邀请码列表</h2><p className="mt-1 text-xs text-muted">数据库只保存哈希；列表始终掩码显示。</p></div><div className="divide-y divide-line">{invites.map((invite) => <article className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={invite.id}><div><strong className="font-mono text-sm text-ink">{invite.code}</strong><p className="mt-1 text-xs text-muted">{invite.note ?? "无备注"} · 创建人 {invite.createdBy} · {new Date(invite.createdAt).toLocaleString("zh-CN")}</p>{invite.usedBy ? <p className="mt-1 text-xs text-muted">使用者：{invite.usedBy}</p> : null}</div><span className="rounded-full bg-paper px-3 py-1 text-xs text-muted">{invite.status}</span><button className="ui-button-secondary" disabled={busy || invite.status !== "unused"} onClick={() => disable(invite.id)} type="button">禁用</button></article>)}{!invites.length ? <p className="p-5 text-sm text-muted">暂无邀请码。</p> : null}</div></section>
  </div>;
}
