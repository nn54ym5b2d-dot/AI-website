import { InviteActivationForm } from "@/components/auth/invite-activation-form";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { UploadPrototypeForm } from "@/components/upload/upload-prototype-form";
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
    <PageShell actions={<SecondaryLink href="/account/uploads">查看我的上传</SecondaryLink>} description={`当前上传者：${access.uploaderProfile?.displayName ?? access.user.displayName}。页面保留邀请码身份与服务端角色守卫，只演示填写和状态反馈。`} eyebrow="Uploader workspace" title="提交认证素材">
      <UploadPrototypeForm />
    </PageShell>
  );
}
