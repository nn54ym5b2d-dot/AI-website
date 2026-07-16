import Link from "next/link";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";
import { PageShell } from "@/components/layout/page-shell";

export default function RegisterPage() {
  return (
    <PageShell compact description="新账号默认获得购买用户身份；上传者权限需登录后使用有效邀请码激活。" eyebrow="Create account" title="注册源素库账号">
      <AuthFlowForm mode="register" />
      <p className="mt-5 text-center text-sm text-muted">已有账号？ <Link className="font-semibold text-brand hover:text-brand-dark" href="/login">返回登录</Link></p>
    </PageShell>
  );
}
