"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";

type Invite = {
  id: string;
  code: string;
  revealable: boolean;
  status: string;
  note: string | null;
  createdBy: string;
  usedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
};
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
  const [visibleCodes, setVisibleCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const response = await fetch("/api/v1/admin/invite-codes", { cache: "no-store" });
    const payload = await response.json() as Payload<Invite[]>;
    if (response.ok && payload.data) setInvites(payload.data);
  }

  async function create() {
    setBusy(true);
    setMessage("");
    setRevealedCode(null);
    try {
      const response = await fetch("/api/v1/admin/invite-codes", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": await csrf() },
        body: JSON.stringify({
          note: note || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });
      const payload = await response.json() as Payload<{ code: string; disclosure: string }>;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "创建失败。");
      setRevealedCode(payload.data.code);
      setMessage(payload.data.disclosure);
      setNote("");
      setExpiresAt("");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败。");
    } finally {
      setBusy(false);
    }
  }

  async function reveal(invite: Invite) {
    if (visibleCodes[invite.id]) {
      setVisibleCodes((current) => {
        const next = { ...current };
        delete next[invite.id];
        return next;
      });
      return;
    }

    setBusy(true);
    setListMessage("");
    try {
      const response = await fetch(`/api/v1/admin/invite-codes/${invite.id}/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": await csrf() },
        body: "{}"
      });
      const payload = await response.json() as Payload<{ code: string }>;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "查看失败。");
      const code = payload.data.code;
      setVisibleCodes((current) => ({ ...current, [invite.id]: code }));
    } catch (error) {
      setListMessage(error instanceof Error ? error.message : "查看失败。");
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    setBusy(true);
    setListMessage("");
    try {
      const response = await fetch(`/api/v1/admin/invite-codes/${id}/disable`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": await csrf() },
        body: "{}"
      });
      const payload = await response.json() as Payload<unknown>;
      if (!response.ok) throw new Error(payload.error?.message ?? "禁用失败。");
      await reload();
    } catch (error) {
      setListMessage(error instanceof Error ? error.message : "禁用失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="ui-panel p-5">
        <h2 className="font-bold text-ink">创建邀请码</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_240px_auto]">
          <input className="ui-input" maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="用途备注（选填）" value={note} />
          <input className="ui-input" min={new Date().toISOString().slice(0, 16)} onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" value={expiresAt} />
          <button className="ui-button-primary" disabled={busy} onClick={create} type="button">{busy ? "处理中…" : "创建"}</button>
        </div>
        {revealedCode ? (
          <div className="mt-4 rounded-lg border border-brand/25 bg-brand-soft p-4">
            <p className="text-xs text-muted">本次创建的完整邀请码</p>
            <code className="mt-2 block break-all text-lg font-bold text-brand">{revealedCode}</code>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className="mt-3 text-sm text-muted">{message}</p> : null}
      </section>

      <section className="ui-panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">邀请码列表</h2>
          <p className="mt-1 text-xs text-muted">默认掩码显示；点击小眼睛按需查看加密保存的完整邀请码。旧版只保存哈希的历史码无法恢复。</p>
          {listMessage ? <p aria-live="polite" className="mt-2 text-sm text-warning">{listMessage}</p> : null}
        </div>
        <div className="divide-y divide-line">
          {invites.map((invite) => {
            const fullCode = visibleCodes[invite.id];
            return (
              <article className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={invite.id}>
                <div>
                  <div className="flex min-w-0 items-center gap-2">
                    <strong className="break-all font-mono text-sm text-ink">{fullCode ?? invite.code}</strong>
                    <button
                      aria-label={fullCode ? `隐藏 ${invite.code} 的完整邀请码` : `查看 ${invite.code} 的完整邀请码`}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={busy || !invite.revealable}
                      onClick={() => reveal(invite)}
                      title={invite.revealable ? (fullCode ? "隐藏完整邀请码" : "查看完整邀请码") : "历史邀请码只保存了哈希，无法恢复"}
                      type="button"
                    >
                      {fullCode ? <EyeSlash aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted">{invite.note ?? "无备注"} · 创建人 {invite.createdBy} · {new Date(invite.createdAt).toLocaleString("zh-CN")}</p>
                  {invite.usedBy ? <p className="mt-1 text-xs text-muted">使用者：{invite.usedBy}</p> : null}
                  {!invite.revealable ? <p className="mt-1 text-xs text-warning">历史记录：完整邀请码未保存，无法恢复</p> : null}
                </div>
                <span className="rounded-full bg-paper px-3 py-1 text-xs text-muted">{invite.status}</span>
                <button className="ui-button-secondary" disabled={busy || invite.status !== "unused"} onClick={() => disable(invite.id)} type="button">禁用</button>
              </article>
            );
          })}
          {!invites.length ? <p className="p-5 text-sm text-muted">暂无邀请码。</p> : null}
        </div>
      </section>
    </div>
  );
}
