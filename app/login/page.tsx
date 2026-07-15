import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";

export default function LoginPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/account">进入个人中心骨架</PrimaryLink>
          <SecondaryLink href="/register">注册</SecondaryLink>
        </>
      }
      description="第一版登录方式已确认为手机号、邮箱、微信组合登录。当前页面只展示登录入口结构，不接入真实认证。"
      title="登录页"
    >
      <section className="grid gap-4 md:grid-cols-3">
        {["手机号登录", "邮箱登录", "微信登录"].map((method) => (
          <article className="rounded-lg border border-line bg-white p-5" key={method}>
            <h2 className="text-base font-semibold text-ink">{method}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              T009 先接入可运行的本地登录和 provider adapter，真实第三方服务在 T017 接入。
            </p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
