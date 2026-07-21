"use client";

import { SignOut } from "@phosphor-icons/react";
import { useState } from "react";

type ApiPayload = {
  data?: { csrfToken?: string };
  error?: { message?: string };
};

async function readPayload(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

export function LogoutButton({ label = "退出登录" }: { label?: string }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    setMessage("");

    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", {
        cache: "no-store"
      });
      const csrfPayload = await readPayload(csrfResponse);
      const csrfToken = csrfPayload.data?.csrfToken;

      if (!csrfResponse.ok || !csrfToken) {
        setMessage(csrfPayload.error?.message ?? "无法完成安全校验，请刷新后重试。");
        return;
      }

      const logoutResponse = await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({})
      });
      const logoutPayload = await readPayload(logoutResponse);

      if (!logoutResponse.ok) {
        setMessage(logoutPayload.error?.message ?? "退出登录失败，请稍后重试。");
        return;
      }

      window.location.assign("/");
    } catch {
      setMessage("网络连接异常，暂时无法退出登录。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className="ui-button-secondary"
        disabled={submitting}
        onClick={logout}
        type="button"
      >
        <SignOut aria-hidden="true" size={17} weight="bold" />
        {submitting ? "正在退出…" : label}
      </button>
      {message ? (
        <p aria-live="polite" className="max-w-52 text-xs leading-5 text-brand" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
