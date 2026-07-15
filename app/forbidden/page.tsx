import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";

export default function ForbiddenPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/account">返回个人中心</PrimaryLink>
          <SecondaryLink href="/">返回首页</SecondaryLink>
        </>
      }
      description="当前账号已登录，但没有访问这个页面所需的有效角色。角色检查由服务端执行，页面入口本身不会提升权限。"
      title="没有访问权限"
    >
      <section className="rounded-lg border border-line bg-white p-5 text-sm leading-6 text-muted">
        如需上传者权限，请使用有效邀请码激活；后台和外部观察员权限由平台管理员配置。
      </section>
    </PageShell>
  );
}
