import { DownloadWorkspace } from "@/components/downloads/download-workspace";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { requireAudience } from "@/lib/auth/page-guard";
import { listBuyerDownloadHistory, listBuyerDownloadLinks } from "@/lib/downloads/service";

export const dynamic = "force-dynamic";

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ orderId?: string; payment?: string }> }) {
  const access = await requireAudience("/account/downloads", ["buyer"]);
  const query = await searchParams;
  const [links, history] = await Promise.all([listBuyerDownloadLinks(access), listBuyerDownloadHistory(access)]);
  return <PageShell actions={<SecondaryLink href="/account">返回个人中心</SecondaryLink>} description="365 天平台资格可重复使用；每次实际下载都会重新签发短时 ZIP 地址并记录。" eyebrow="My workspace" title="我的下载"><DownloadWorkspace highlightOrderId={query.orderId ?? null} history={history} links={links} paymentSuccessful={query.payment === "success"} /></PageShell>;
}
