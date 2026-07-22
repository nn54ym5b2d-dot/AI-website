"use client";

import { useState } from "react";

type ObserverAccount = {
  id: string;
  displayName: string;
  email: string | null;
  partnerName: string;
  shareRate: number;
  status: "active" | "disabled" | "revoked";
  lastLoginAt: string | null;
  createdAt: string;
};

async function csrfToken() {
  const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "无法取得安全校验信息。");
  return payload.data.csrfToken as string;
}

export function ObserverAccountManager({ initialAccounts }: { initialAccounts: ObserverAccount[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [form, setForm] = useState({ email: "", displayName: "", partnerName: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/admin/observer-accounts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": await csrfToken() },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "创建失败。");
      setAccounts((current) => [payload.data, ...current]);
      setForm({ email: "", displayName: "", partnerName: "" });
      setMessage("观察员账号已创建。对方可使用该邮箱通过当前登录流程进入只读看板。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败。");
    } finally { setBusy(false); }
  }

  async function updateAccount(account: ObserverAccount, status: ObserverAccount["status"]) {
    if (status === "revoked" && !window.confirm(`确定永久撤销“${account.partnerName}”的观察权限吗？撤销后不能重新启用。`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/observer-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": await csrfToken() },
        body: JSON.stringify({ status })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "更新失败。");
      setAccounts((current) => current.map((item) => item.id === account.id ? payload.data : item));
      setMessage(status === "active" ? "账号已启用。" : status === "disabled" ? "账号已禁用，现有会话权限立即失效。" : "观察权限已撤销并记录审计。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败。");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6">
      <form className="ui-panel p-5 sm:p-6" onSubmit={createAccount}>
        <div><h2 className="font-bold text-ink">创建观察员账号</h2><p className="mt-1 text-xs leading-5 text-muted">仅创建邮箱登录身份与只读观察员角色，不授予任何管理员权限。</p></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm"><span className="text-muted">登录邮箱</span><input className="ui-input" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></label>
          <label className="grid gap-2 text-sm"><span className="text-muted">账号显示名</span><input className="ui-input" maxLength={80} minLength={2} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required value={form.displayName} /></label>
          <label className="grid gap-2 text-sm"><span className="text-muted">合作方名称</span><input className="ui-input" maxLength={120} minLength={2} onChange={(event) => setForm({ ...form, partnerName: event.target.value })} required value={form.partnerName} /></label>
        </div>
        <button className="ui-button-primary mt-5" disabled={busy} type="submit">{busy ? "处理中…" : "创建账号"}</button>
      </form>
      {message ? <div aria-live="polite" className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted">{message}</div> : null}
      <section className="ui-panel overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="font-bold text-ink">观察员账号</h2><p className="mt-1 text-xs text-muted">默认分成比例为 0；禁用和撤销都会即时移除只读访问能力。</p></div>
        <div className="divide-y divide-line">
          {accounts.map((account) => (
            <article className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={account.id}>
              <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{account.partnerName}</strong><span className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">{account.status}</span></div><p className="mt-2 text-xs leading-5 text-muted">{account.displayName} · {account.email ?? "无邮箱"} · 分成 {(account.shareRate * 100).toFixed(2)}% · 最近登录 {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("zh-CN") : "无"}</p></div>
              <div className="flex flex-wrap gap-2">
                {account.status === "disabled" ? <button className="ui-button-secondary" disabled={busy} onClick={() => updateAccount(account, "active")} type="button">启用</button> : null}
                {account.status === "active" ? <button className="ui-button-secondary" disabled={busy} onClick={() => updateAccount(account, "disabled")} type="button">禁用</button> : null}
                {account.status !== "revoked" ? <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={busy} onClick={() => updateAccount(account, "revoked")} type="button">撤销权限</button> : null}
              </div>
            </article>
          ))}
          {!accounts.length ? <p className="p-6 text-sm text-muted">暂无观察员账号。</p> : null}
        </div>
      </section>
    </div>
  );
}
