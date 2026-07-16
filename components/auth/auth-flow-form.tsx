"use client";

import { EnvelopeSimple, Phone, ShieldCheck } from "@phosphor-icons/react";
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
    <section className="ui-panel p-5 shadow-panel sm:p-7">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-paper p-1.5" role="group" aria-label="验证方式">
        <button className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "email" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`} onClick={() => setMethod("email")} type="button"><EnvelopeSimple aria-hidden="true" size={17} />邮箱</button>
        <button className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "phone" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`} onClick={() => setMethod("phone")} type="button"><Phone aria-hidden="true" size={17} />手机号</button>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-ink">
          {method === "email" ? "邮箱" : "手机号（含国家/地区代码）"}
          <input
            className="ui-input"
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
              className="ui-input"
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>
          <label className="flex items-start gap-3 rounded-md bg-paper p-3 text-sm leading-6 text-muted">
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

      <div className="mt-5">
        <button
          className="ui-button-primary w-full"
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
              className="ui-input tracking-[0.25em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setVerificationCode(event.target.value)}
              value={verificationCode}
            />
          </label>
          <button
            className="ui-button-primary w-full"
            disabled={submitting || verificationCode.length !== 6}
            onClick={completeAuth}
            type="button"
          >
            {mode === "register" ? "完成注册" : "登录"}
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-md border border-line bg-paper p-3 text-sm leading-6 text-muted" role="status">{message}</p> : null}
      <div className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-xs leading-5 text-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} weight="fill" /><span>保留本地验证码、CSRF 与会话保护；真实短信、邮件和微信服务尚未接入。</span></div>
    </section>
  );
}
