"use client";

import { useState } from "react";

type ManagedRole = "buyer" | "uploader" | "admin";
type AdminRole = "super_admin" | "operator" | "finance";
type UserAccess = {
  id: string;
  status: string;
  roles: string[];
  adminRoles: string[];
};

const roleLabels: Record<ManagedRole, string> = { buyer: "购买者", uploader: "上传者", admin: "管理员" };
const adminRoleLabels: Record<AdminRole, string> = { super_admin: "超级管理员", operator: "运营", finance: "财务" };

export function UserAccessManager({ user }: { user: UserAccess }) {
  const [status, setStatus] = useState<"active" | "disabled">(user.status === "active" ? "active" : "disabled");
  const [roles, setRoles] = useState<ManagedRole[]>(user.roles.filter((role): role is ManagedRole => role in roleLabels));
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>(user.adminRoles.filter((role): role is AdminRole => role in adminRoleLabels));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function toggle<T extends string>(value: T, values: T[], setter: (next: T[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
      const csrfPayload = await csrfResponse.json();
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrfPayload.data.csrfToken },
        body: JSON.stringify({ status, roles, adminRoles })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "保存失败。");
      setMessage("权限和账号状态已保存；现有会话会立即按新权限重新校验。");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ui-panel p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-ink">角色与账号状态</h2>
          <p className="mt-1 text-xs leading-5 text-muted">只有超级管理员可修改。观察员权限撤销请使用观察员账号管理。</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">高权限操作</span>
      </div>
      <label className="mt-5 grid gap-2 text-sm sm:max-w-xs">
        <span className="text-muted">账号状态</span>
        <select className="ui-input" onChange={(event) => setStatus(event.target.value as "active" | "disabled")} value={status}>
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </label>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-ink">基础角色</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(roleLabels) as ManagedRole[]).map((role) => (
            <label className="flex items-center gap-3 rounded-md border border-line bg-paper p-3 text-sm" key={role}>
              <input checked={roles.includes(role)} onChange={() => toggle(role, roles, setRoles)} type="checkbox" />
              {roleLabels[role]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-ink">后台子角色</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(adminRoleLabels) as AdminRole[]).map((role) => (
            <label className="flex items-center gap-3 rounded-md border border-line bg-paper p-3 text-sm" key={role}>
              <input checked={adminRoles.includes(role)} onChange={() => toggle(role, adminRoles, setAdminRoles)} type="checkbox" />
              {adminRoleLabels[role]}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="ui-button-primary mt-5" disabled={busy} onClick={save} type="button">{busy ? "保存中…" : "保存权限"}</button>
      {message ? <p aria-live="polite" className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
