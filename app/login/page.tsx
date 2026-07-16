import Link from "next/link";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { PageShell } from "@/components/layout/page-shell";

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return (
    <PageShell compact description="使用邮箱或手机号验证码登录，继续浏览购买记录与上传者工作区。" eyebrow="Welcome back" title="登录源素库">
      <AuthFlowForm mode="login" nextPath={next} />
      <p className="mt-5 text-center text-sm text-muted">还没有账号？ <Link className="font-semibold text-brand hover:text-brand-dark" href="/register">注册购买用户</Link></p>
    </PageShell>
  );
}
