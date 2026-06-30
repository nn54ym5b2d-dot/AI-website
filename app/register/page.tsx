import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";

export default function RegisterPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/login">已有账号登录</PrimaryLink>
          <SecondaryLink href="/upload">上传者入口</SecondaryLink>
        </>
      }
      description="购买用户可注册账号；上传者需要邀请码激活上传权限。当前页面只定义注册信息结构，不保存用户数据。"
      title="注册页"
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">购买用户注册</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            后续填写手机号、邮箱、微信绑定信息，用于购买、下载和查看授权记录。
          </p>
        </article>
        <article className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">上传者邀请码激活</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            第一版不开放无邀请码上传者注册，邀请码由后台创建和管理。
          </p>
        </article>
      </section>
    </PageShell>
  );
}
