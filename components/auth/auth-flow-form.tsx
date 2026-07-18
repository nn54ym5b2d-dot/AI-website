"use client";

import {
  CaretDown,
  EnvelopeSimple,
  Phone,
  QrCode,
  ShieldCheck,
  WechatLogo
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";

type AuthFlowFormProps = {
  nextPath?: string;
};

type AuthMethod = "phone" | "wechat" | "email";
type ChallengeMethod = "phone" | "email";

type ApiFailure = {
  error?: { code?: string; message?: string };
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

export function AuthFlowForm({ nextPath = "/" }: AuthFlowFormProps) {
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [email, setEmail] = useState("");
  const [countryCallingCode, setCountryCallingCode] = useState("+86");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [phoneChallengeId, setPhoneChallengeId] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [termsVersion, setTermsVersion] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showRegistrationRequirements, setShowRegistrationRequirements] = useState(true);
  const [needsPhoneBinding, setNeedsPhoneBinding] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/legal-documents/current?type=terms_of_service")
      .then(async (response) => {
        if (!response.ok) throw new Error("当前测试条款不可用。");
        const payload = (await response.json()) as { data: { version: string } };
        setTermsVersion(payload.data.version);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "当前测试条款不可用。");
      });
  }, []);

  async function parseFailure(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as ApiFailure;
    return {
      code: payload.error?.code,
      message: payload.error?.message ?? "请求失败，请稍后重试。"
    };
  }

  function resetEmailChallenge() {
    setEmailChallengeId("");
    setEmailVerificationCode("");
    setMessage("");
  }

  function resetPhoneChallenge() {
    setPhoneChallengeId("");
    setPhoneVerificationCode("");
    setMessage("");
  }

  function selectMethod(nextMethod: AuthMethod) {
    if (nextMethod === method) return;
    setMethod(nextMethod);
    resetEmailChallenge();
    resetPhoneChallenge();
    setNeedsPhoneBinding(false);
    setShowRegistrationRequirements(true);
  }

  function normalizedPhone() {
    return `${countryCallingCode}${phoneNumber.replace(/[\s-]/g, "")}`;
  }

  async function requestChallenge(challengeMethod: ChallengeMethod) {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/auth/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: challengeMethod,
          identifier: challengeMethod === "phone" ? normalizedPhone() : email,
          purpose: "register"
        })
      });
      if (!response.ok) {
        setMessage((await parseFailure(response)).message);
        return;
      }
      const payload = (await response.json()) as { data: { challengeId: string } };
      if (challengeMethod === "phone") {
        setPhoneChallengeId(payload.data.challengeId);
        setPhoneVerificationCode("");
      } else {
        setEmailChallengeId(payload.data.challengeId);
        setEmailVerificationCode("");
      }
      setMessage("验证码已交给本地测试 provider。开发环境可运行 npm run auth:outbox 查看。");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeAuth() {
    if (method === "wechat") return;
    setSubmitting(true);
    setMessage("");
    try {
      const challengeId = method === "phone" ? phoneChallengeId : emailChallengeId;
      const verificationCode = method === "phone"
        ? phoneVerificationCode
        : emailVerificationCode;
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId,
          verificationCode,
          ...(termsAccepted && termsVersion ? { acceptedTermsVersion: termsVersion } : {}),
          ...(method === "email" && needsPhoneBinding
            ? { phoneChallengeId, phoneVerificationCode }
            : {})
        })
      });
      if (!response.ok) {
        const failure = await parseFailure(response);
        if (failure.code === "PHONE_BINDING_REQUIRED") {
          setNeedsPhoneBinding(true);
          setShowRegistrationRequirements(true);
        }
        if (failure.code === "TERMS_ACCEPTANCE_REQUIRED") {
          setShowRegistrationRequirements(true);
        }
        setMessage(failure.message);
        return;
      }
      window.location.assign(safeAuthRedirectPath(nextPath));
    } finally {
      setSubmitting(false);
    }
  }

  const phoneReady = phoneChallengeId.length > 0 && phoneVerificationCode.length === 6;
  const emailReady = emailChallengeId.length > 0 && emailVerificationCode.length === 6;
  const authReady = method === "phone"
    ? phoneReady
    : method === "email" && emailReady && (!needsPhoneBinding || phoneReady);
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  const phoneFields = (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium text-ink">手机号</legend>
      <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <label className="sr-only" htmlFor={`auth-${method}-country-code`}>国家或地区代码</label>
        <select
          aria-label="国家或地区代码"
          className="ui-input min-w-0 px-2 sm:px-3.5"
          id={`auth-${method}-country-code`}
          onChange={(event) => {
            setCountryCallingCode(event.target.value);
            resetPhoneChallenge();
          }}
          value={countryCallingCode}
        >
          {callingCodes.map((item) => (
            <option key={`${item.code}-${item.region}`} value={item.code}>
              {item.code} {item.region}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`auth-${method}-phone-number`}>手机号</label>
        <input
          aria-label="手机号"
          autoComplete="tel-national"
          className="ui-input min-w-0"
          id={`auth-${method}-phone-number`}
          inputMode="tel"
          onChange={(event) => {
            setPhoneNumber(event.target.value.replace(/[^\d\s-]/g, ""));
            resetPhoneChallenge();
          }}
          placeholder="13800000000"
          type="tel"
          value={phoneNumber}
        />
      </div>
      <button
        className="ui-button-secondary w-full"
        disabled={submitting || phoneDigits.length < 8}
        onClick={() => requestChallenge("phone")}
        type="button"
      >
        获取手机验证码
      </button>
      {phoneChallengeId ? (
        <label className="grid gap-2 text-sm font-medium text-ink">
          手机验证码
          <input
            aria-label="手机验证码"
            className="ui-input tracking-[0.25em]"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setPhoneVerificationCode(event.target.value.replace(/\D/g, ""))}
            value={phoneVerificationCode}
          />
        </label>
      ) : null}
    </fieldset>
  );

  const authControls = method !== "wechat" ? (
    <div className="grid gap-4">
      {showRegistrationRequirements ? (
        <label className="flex items-start gap-3 rounded-md bg-paper p-3 text-sm leading-6 text-muted">
          <input
            checked={termsAccepted}
            className="mt-1"
            onChange={(event) => setTermsAccepted(event.target.checked)}
            type="checkbox"
          />
          若本次需要创建新账号，我接受当前本地测试条款版本 {termsVersion || "（载入中）"}。该文本不是正式平台条款。
        </label>
      ) : null}
      <button
        className="ui-button-primary w-full"
        disabled={submitting || !authReady}
        onClick={completeAuth}
        type="button"
      >
        登录/注册
      </button>
      {message ? <p className="rounded-md border border-line bg-paper p-3 text-sm leading-6 text-muted" role="status">{message}</p> : null}
    </div>
  ) : null;

  return (
    <section className="ui-panel p-5 shadow-panel sm:p-7">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-1.5" role="group" aria-label="手机号或微信登录方式">
        <button
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "phone" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          onClick={() => selectMethod("phone")}
          type="button"
        >
          <Phone aria-hidden="true" size={18} />手机号登录
        </button>
        <button
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${method === "wechat" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          onClick={() => selectMethod("wechat")}
          type="button"
        >
          <WechatLogo aria-hidden="true" className="text-success" size={19} weight="fill" />微信登录
        </button>
      </div>

      {method === "phone" ? (
        <div className="mt-6 grid gap-4">
          {phoneFields}
          <p className="text-xs leading-5 text-muted">
            验证码通过后，已有账号直接登录；未注册手机号在接受条款后创建账号。
          </p>
          {authControls}
        </div>
      ) : null}

      {method === "wechat" ? (
        <div className="mt-6 rounded-lg border border-line bg-paper px-5 py-7 text-center">
          <div className="mx-auto flex size-28 items-center justify-center rounded-lg border border-line bg-white text-success shadow-sm">
            <QrCode aria-hidden="true" size={64} weight="duotone" />
          </div>
          <h2 className="mt-4 font-semibold text-ink">微信扫码登录</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
            已绑定微信的账号可直接登录；首次使用需验证手机号，手机号已有账号则绑定，未有账号才创建。
          </p>
          <span className="mt-4 inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
            真实微信二维码将在 T017 接入
          </span>
        </div>
      ) : null}

      <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        其他方式
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        aria-expanded={method === "email"}
        className={`flex min-h-12 w-full items-center justify-between rounded-md border px-4 text-sm font-semibold transition ${method === "email" ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-ink hover:border-brand/40"}`}
        onClick={() => selectMethod(method === "email" ? "phone" : "email")}
        type="button"
      >
        <span className="flex items-center gap-2"><EnvelopeSimple aria-hidden="true" size={18} />使用邮箱登录</span>
        <CaretDown aria-hidden="true" className={`transition ${method === "email" ? "rotate-180" : ""}`} size={16} />
      </button>

      {method === "email" ? (
        <div className="mt-5 grid gap-5 rounded-lg border border-line bg-paper p-4 sm:p-5">
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">验证邮箱</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                已绑定邮箱可直接登录；新邮箱验证成功后会继续要求绑定手机号。
              </p>
            </div>
            <label className="grid gap-2 text-sm font-medium text-ink">
              邮箱
              <input
                autoComplete="email"
                className="ui-input"
                inputMode="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  resetEmailChallenge();
                }}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </label>
            <button
              className="ui-button-secondary w-full"
              disabled={submitting || !email.trim()}
              onClick={() => requestChallenge("email")}
              type="button"
            >
              获取邮箱验证码
            </button>
            {emailChallengeId ? (
              <label className="grid gap-2 text-sm font-medium text-ink">
                邮箱验证码
                <input
                  aria-label="邮箱验证码"
                  className="ui-input tracking-[0.25em]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setEmailVerificationCode(event.target.value.replace(/\D/g, ""))}
                  value={emailVerificationCode}
                />
              </label>
            ) : null}
          </div>

          {needsPhoneBinding ? (
            <div className="grid gap-3 border-t border-line pt-5">
              <div>
                <p className="text-sm font-semibold text-ink">绑定手机号</p>
                <p className="mt-1 text-xs leading-5 text-muted">手机号是源素库主身份，用于账号安全、找回和避免重复账号。</p>
              </div>
              {phoneFields}
            </div>
          ) : null}
          {authControls}
        </div>
      ) : null}
      <div className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-xs leading-5 text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} weight="fill" />
        <span>手机号是主账号身份；邮箱和微信绑定到同一账号。真实短信、邮件和微信服务尚未接入。</span>
      </div>
    </section>
  );
}
