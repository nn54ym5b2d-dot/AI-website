import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { AuthFlowForm } from "@/components/auth/auth-flow-form";

export default function RegisterPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/login">已有账号登录</PrimaryLink>
          <SecondaryLink href="/upload">上传者入口</SecondaryLink>
        </>
      }
      description="新账号默认获得购买用户角色，并在同一数据库事务中保存当前有效条款的接受记录；上传者角色需登录后使用邀请码激活。"
      title="注册页"
    >
      <AuthFlowForm mode="register" />
    </PageShell>
  );
}
