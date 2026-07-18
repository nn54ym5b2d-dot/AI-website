import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { PageShell } from "@/components/layout/page-shell";

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return (
    <PageShell compact description="使用手机号或微信登录；首次使用将自动创建账号。邮箱登录位于下方，首次使用邮箱仍需验证并绑定手机号。" eyebrow="Account access" title="登录/注册源素库">
      <AuthFlowForm nextPath={next} />
    </PageShell>
  );
}
