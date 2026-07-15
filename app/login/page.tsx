import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/account">进入个人中心骨架</PrimaryLink>
          <SecondaryLink href="/register">注册</SecondaryLink>
        </>
      }
      description="手机号和邮箱使用一次性验证码；当前由本地测试 provider 交付，真实短信、邮件和微信服务在 T017 接入。"
      title="登录页"
    >
      <AuthFlowForm mode="login" nextPath={next} />
    </PageShell>
  );
}
