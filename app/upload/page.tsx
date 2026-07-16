import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { UploadPrototypeForm } from "@/components/upload/upload-prototype-form";
import { requireAudience } from "@/lib/auth/page-guard";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const access = await requireAudience("/upload", ["uploader"]);
  return (
    <PageShell actions={<SecondaryLink href="/account/uploads">查看我的上传</SecondaryLink>} description={`当前上传者：${access.uploaderProfile?.displayName ?? access.user.displayName}。页面保留邀请码身份与服务端角色守卫，只演示填写和状态反馈。`} eyebrow="Uploader workspace" title="提交认证素材">
      <UploadPrototypeForm />
    </PageShell>
  );
}
