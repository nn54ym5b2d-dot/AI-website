"use client";

import { useEffect, useState } from "react";

type AuthFlowFormProps = {
  mode: "login" | "register";
  nextPath?: string;
};

type ApiFailure = {
  error?: { message?: string };
};

export function AuthFlowForm({ mode, nextPath = "/account" }: AuthFlowFormProps) {
  const [method, setMethod] = useState<"phone" | "email">("email");
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsVersion, setTermsVersion] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "register") return;

    fetch("/api/v1/legal-documents/current?type=terms_of_service")
      .then(async (response) => {
        if (!response.ok) throw new Error("当前测试条款不可用。");
        const payload = (await response.json()) as { data: { version: string } };
        setTermsVersion(payload.data.version);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "当前测试条款不可用。");
      });
  }, [mode]);

  async function parseFailure(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as ApiFailure;
    return payload.error?.message ?? "请求失败，请稍后重试。";
  }

  async function requestChallenge() {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, identifier, purpose: mode })
      });
      if (!response.ok) {
        setMessage(await parseFailure(response));
        return;
      }
      const payload = (await response.json()) as { data: { challengeId: string } };
      setChallengeId(payload.data.challengeId);
      setMessage("验证码已交给本地测试 provider。开发环境可运行 npm run auth:outbox 查看。 ");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeAuth() {
    if (mode === "register" && (!termsAccepted || !termsVersion)) {
      setMessage("请先接受当前有效的本地测试条款。 ");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId,
          verificationCode,
          ...(mode === "register" ? { displayName, acceptedTermsVersion: termsVersion } : {})
        })
      });
      if (!response.ok) {
        setMessage(await parseFailure(response));
        return;
      }
      window.location.assign(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          登录方式
          <select
            className="rounded-md border border-line bg-paper px-3 py-2"
            onChange={(event) => setMethod(event.target.value as "phone" | "email")}
            value={method}
          >
            <option value="email">邮箱</option>
            <option value="phone">手机号</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          {method === "email" ? "邮箱" : "手机号（含国家/地区代码）"}
          <input
            className="rounded-md border border-line bg-paper px-3 py-2"
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={method === "email" ? "name@example.test" : "+8613800000000"}
            value={identifier}
          />
        </label>
      </div>

      {mode === "register" ? (
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            显示名称
            <input
              className="rounded-md border border-line bg-paper px-3 py-2"
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6 text-muted">
            <input
              checked={termsAccepted}
              className="mt-1"
              onChange={(event) => setTermsAccepted(event.target.checked)}
              type="checkbox"
            />
            我接受当前本地测试条款版本 {termsVersion || "（载入中）"}。该文本不是正式平台条款。
          </label>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={submitting || !identifier}
          onClick={requestChallenge}
          type="button"
        >
          获取验证码
        </button>
      </div>

      {challengeId ? (
        <div className="mt-5 grid gap-4 border-t border-line pt-5">
          <label className="grid gap-2 text-sm font-medium text-ink">
            6 位验证码
            <input
              className="rounded-md border border-line bg-paper px-3 py-2"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setVerificationCode(event.target.value)}
              value={verificationCode}
            />
          </label>
          <button
            className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={submitting || verificationCode.length !== 6}
            onClick={completeAuth}
            type="button"
          >
            {mode === "register" ? "完成注册" : "登录"}
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm leading-6 text-muted">{message}</p> : null}
    </section>
  );
}
