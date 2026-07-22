import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { UploaderProfileForm } from "@/components/uploader/uploader-profile-form";
import { requireUploaderPage } from "@/lib/auth/page-guard";
import { getUploaderProfile } from "@/lib/uploader/profile";
export const dynamic = "force-dynamic";
export default async function UploaderProfilePage() {
  const access = await requireUploaderPage("/account/uploader-profile");
  return <PageShell actions={<SecondaryLink href="/account/uploader">返回上传者中心</SecondaryLink>} description="维护真实上传者展示名称和简介；邀请码明文不会在此回显。" eyebrow="Uploader workspace" title="上传者资料"><UploaderProfileForm initialProfile={await getUploaderProfile(access)} /></PageShell>;
}
