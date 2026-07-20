import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return (
    <PageShell compact description="使用手机号或微信登录；首次使用将自动创建账号。邮箱登录位于下方，首次使用邮箱仍需验证并绑定手机号。" eyebrow="Account access" title="登录/注册源素库">
      <AuthFlowForm nextPath={next} />
      <p className="mt-5 text-center text-xs leading-5 text-muted">创建账号前可阅读当前的 <Link className="font-semibold text-brand" href="/terms">服务条款</Link> 与 <Link className="font-semibold text-brand" href="/privacy">隐私政策</Link>。当前均为明确标记的测试/草案版本。</p>
    </PageShell>
  );
}
