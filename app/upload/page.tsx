import { InviteActivationForm } from "@/components/auth/invite-activation-form";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { UploaderSubmissionWorkspace } from "@/components/upload/uploader-submission-workspace";
import { requireAudience } from "@/lib/auth/page-guard";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const access = await requireAudience("/upload", ["buyer", "uploader"]);

  if (!access.roles.includes("uploader")) {
    return (
      <PageShell
        actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>}
        description={`你好，${access.user.displayName}。上传素材前需要先用有效邀请码激活上传者身份；激活成功后会留在本页并进入素材提交界面。`}
        eyebrow="Uploader access"
        title="开通上传者身份"
      >
        <InviteActivationForm />
      </PageShell>
    );
  }

  return (
    <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description={`当前上传者：${access.uploaderProfile?.displayName ?? access.user.displayName}。人物使用独立表单；物件/道具和场景使用共用表单。当前本地 provider 可验证上传与处理状态，但不代表真实 COS 已接通。`} eyebrow="Uploader workspace" title="提交认证素材">
      <UploaderSubmissionWorkspace />
    </PageShell>
  );
}
