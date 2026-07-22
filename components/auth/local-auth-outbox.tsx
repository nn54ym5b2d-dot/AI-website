"use client";

import { ArrowClockwise, Check, Copy, EnvelopeSimple, Phone } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LocalOutboxDelivery } from "@/lib/auth/local-outbox";
import { LOCAL_TEST_ACCOUNTS } from "@/lib/auth/local-test-accounts";

type OutboxPayload = {
  data?: { deliveries: LocalOutboxDelivery[]; refreshedAt: string };
  error?: { message?: string };
};

function loginHref(email: string, next: string) {
  const query = new URLSearchParams({ method: "email", email, next });
  return `/login?${query.toString()}`;
}

function formatExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(expiresAt));
}

export function LocalAuthOutbox({ initialDeliveries }: { initialDeliveries: LocalOutboxDelivery[] }) {
  const [deliveries, setDeliveries] = useState<LocalOutboxDelivery[]>(initialDeliveries);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/auth/local-outbox", { cache: "no-store" });
      const payload = (await response.json()) as OutboxPayload;
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "验证码箱暂时无法读取。");
        return;
      }
      setDeliveries(payload.data.deliveries);
      setMessage("");
    } catch {
      setMessage("验证码箱暂时无法读取。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(""), 1500);
  }

  return (
    <div className="grid gap-6">
      <section className="ui-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">最新验证码</h2>
            <p className="mt-1 text-sm leading-6 text-muted">每 3 秒自动刷新；最新记录显示在最上方。</p>
          </div>
          <button className="ui-button-secondary self-start" disabled={loading} onClick={() => void refresh()} type="button">
            <ArrowClockwise aria-hidden="true" className={loading ? "animate-spin" : ""} size={16} />
            立即刷新
          </button>
        </div>

        {message ? <p className="mt-5 rounded-md border border-line bg-paper p-3 text-sm text-muted" role="status">{message}</p> : null}
        {!message && deliveries.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-line bg-paper p-5 text-sm leading-6 text-muted">
            还没有验证码。先在下方选择账号并点击“获取邮箱验证码”，新验证码会自动出现在这里。
          </p>
        ) : null}

        <div className="mt-5 grid gap-3" aria-live="polite">
          {deliveries.map((delivery, index) => (
            <article className={`rounded-lg border p-4 ${delivery.expired ? "border-line bg-paper opacity-70" : "border-brand/30 bg-brand-soft/40"}`} key={`${delivery.identifier}-${delivery.expiresAt}-${index}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                    {delivery.method === "email" ? <EnvelopeSimple aria-hidden="true" size={15} /> : <Phone aria-hidden="true" size={15} />}
                    <span className="truncate">{delivery.identifier}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <code className="text-2xl font-bold tracking-[0.18em] text-ink">{delivery.verificationCode}</code>
                    <span className={`text-xs font-semibold ${delivery.expired ? "text-muted" : "text-success"}`}>
                      {delivery.expired ? "已过期" : `有效至 ${formatExpiry(delivery.expiresAt)}`}
                    </span>
                  </div>
                </div>
                <button className="ui-button-secondary shrink-0" onClick={() => void copyCode(delivery.verificationCode)} type="button">
                  {copiedCode === delivery.verificationCode ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                  {copiedCode === delivery.verificationCode ? "已复制" : "复制验证码"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ui-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">本地测试账号</h2>
        <p className="mt-1 text-sm leading-6 text-muted">没有固定密码。选择账号后，获取邮箱验证码并从上方复制。</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {LOCAL_TEST_ACCOUNTS.map((account) => (
            <article className="flex min-w-0 flex-col rounded-lg border border-line bg-paper p-4" key={account.email}>
              <p className="font-semibold text-ink">{account.displayName}</p>
              <p className="mt-1 break-all text-sm text-muted">{account.email}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{account.accessLabel}</p>
              <Link className="ui-button-primary mt-4 w-full" href={loginHref(account.email, account.loginPath)}>
                使用此账号登录
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
