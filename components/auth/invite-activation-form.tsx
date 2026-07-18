"use client";

import { useState } from "react";

export function InviteActivationForm() {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function activate() {
    setSubmitting(true);
    setMessage("");
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf");
      const csrfPayload = (await csrfResponse.json()) as {
        data?: { csrfToken: string };
        error?: { message: string };
      };
      if (!csrfResponse.ok || !csrfPayload.data) {
        setMessage(csrfPayload.error?.message ?? "无法完成安全校验。 ");
        return;
      }

      const response = await fetch("/api/v1/invites/activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfPayload.data.csrfToken
        },
        body: JSON.stringify({ code, uploaderDisplayName: displayName })
      });
      const payload = (await response.json()) as {
        error?: { message: string };
      };
      if (!response.ok) {
        setMessage(payload.error?.message ?? "邀请码激活失败。 ");
        return;
      }
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="ui-panel p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-ink">激活上传者身份</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        第一版必须使用有效邀请码。全新本地测试数据的邀请码见 README，不适用于生产环境。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input
          aria-label="邀请码"
          className="ui-input"
          onChange={(event) => setCode(event.target.value)}
          placeholder="邀请码"
          value={code}
        />
        <input
          aria-label="上传者展示名称"
          className="ui-input"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="上传者展示名称"
          value={displayName}
        />
      </div>
      <button
        className="ui-button-primary mt-4"
        disabled={submitting || !code || displayName.length < 2}
        onClick={activate}
        type="button"
      >
        激活上传者
      </button>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
