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

const callingCodes = [
  { code: "+86", region: "中国大陆" },
  { code: "+852", region: "中国香港" },
  { code: "+853", region: "中国澳门" },
  { code: "+886", region: "中国台湾" },
  { code: "+1", region: "美国/加拿大" },
  { code: "+44", region: "英国" },
  { code: "+81", region: "日本" },
  { code: "+82", region: "韩国" },
  { code: "+65", region: "新加坡" },
  { code: "+60", region: "马来西亚" },
  { code: "+66", region: "泰国" },
  { code: "+84", region: "越南" },
  { code: "+63", region: "菲律宾" },
  { code: "+62", region: "印度尼西亚" },
  { code: "+91", region: "印度" },
  { code: "+971", region: "阿联酋" },
  { code: "+61", region: "澳大利亚" },
  { code: "+64", region: "新西兰" },
  { code: "+33", region: "法国" },
  { code: "+49", region: "德国" },
  { code: "+39", region: "意大利" },
  { code: "+34", region: "西班牙" },
  { code: "+31", region: "荷兰" },
  { code: "+41", region: "瑞士" },
  { code: "+46", region: "瑞典" },
  { code: "+47", region: "挪威" },
  { code: "+45", region: "丹麦" },
  { code: "+358", region: "芬兰" },
  { code: "+7", region: "俄罗斯/哈萨克斯坦" },
  { code: "+55", region: "巴西" },
  { code: "+52", region: "墨西哥" },
  { code: "+27", region: "南非" }
] as const;

export function AuthFlowForm({ mode, nextPath = "/account" }: AuthFlowFormProps) {
  const [method, setMethod] = useState<"phone" | "email">("email");
  const [identifier, setIdentifier] = useState("");
  const [countryCallingCode, setCountryCallingCode] = useState("+86");
  const [phoneNumber, setPhoneNumber] = useState("");
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

  function resetChallenge() {
    setChallengeId("");
    setVerificationCode("");
    setMessage("");
  }

  function selectMethod(nextMethod: "phone" | "email") {
    setMethod(nextMethod);
    resetChallenge();
  }

  async function requestChallenge() {
    setSubmitting(true);
    setMessage("");
    try {
      const challengeIdentifier = method === "phone"
        ? `${countryCallingCode}${phoneNumber.replace(/[\s-]/g, "")}`
        : identifier;
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, identifier: challengeIdentifier, purpose: mode })
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
        <button className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "email" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`} onClick={() => selectMethod("email")} type="button"><EnvelopeSimple aria-hidden="true" size={17} />邮箱</button>
        <button className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "phone" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`} onClick={() => selectMethod("phone")} type="button"><Phone aria-hidden="true" size={17} />手机号</button>
      </div>
      <div className="grid gap-4">
        {method === "email" ? (
          <label className="grid gap-2 text-sm font-medium text-ink">
            邮箱
            <input
              autoComplete="email"
              className="ui-input"
              inputMode="email"
              onChange={(event) => {
                setIdentifier(event.target.value);
                resetChallenge();
              }}
              placeholder="name@example.test"
              type="email"
              value={identifier}
            />
          </label>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-ink">手机号</legend>
            <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <label className="sr-only" htmlFor={`${mode}-country-code`}>国家或地区代码</label>
              <select
                aria-label="国家或地区代码"
                className="ui-input min-w-0 px-2 sm:px-3.5"
                id={`${mode}-country-code`}
                onChange={(event) => {
                  setCountryCallingCode(event.target.value);
                  resetChallenge();
                }}
                value={countryCallingCode}
              >
                {callingCodes.map((item) => (
                  <option key={`${item.code}-${item.region}`} value={item.code}>
                    {item.code} {item.region}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`${mode}-phone-number`}>手机号</label>
              <input
                aria-label="手机号"
                autoComplete="tel-national"
                className="ui-input min-w-0"
                id={`${mode}-phone-number`}
                inputMode="tel"
                onChange={(event) => {
                  setPhoneNumber(event.target.value.replace(/[^\d\s-]/g, ""));
                  resetChallenge();
                }}
                placeholder="13800000000"
                type="tel"
                value={phoneNumber}
              />
            </div>
          </fieldset>
        )}
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
          disabled={submitting || (method === "email" ? !identifier.trim() : !phoneNumber.replace(/\D/g, ""))}
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
