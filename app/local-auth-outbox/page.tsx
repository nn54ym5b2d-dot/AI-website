import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LocalAuthOutbox } from "@/components/auth/local-auth-outbox";
import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import {
  isLocalAuthProviderEnabled,
  isLoopbackHostHeader,
  readLocalAuthOutbox
} from "@/lib/auth/local-outbox";

export const dynamic = "force-dynamic";

export default async function LocalAuthOutboxPage() {
  const requestHeaders = await headers();
  if (!isLocalAuthProviderEnabled() || !isLoopbackHostHeader(requestHeaders.get("host"))) {
    notFound();
  }
  const deliveries = await readLocalAuthOutbox();

  return (
    <PageShell
      actions={<SecondaryLink href="/login?method=email">返回登录</SecondaryLink>}
      description="只读取本机 local provider 生成的测试验证码，不连接真实短信或邮件服务；离开 localhost 后页面和接口均不可访问。"
      eyebrow="Local testing only"
      title="本地验证码箱"
    >
      <LocalAuthOutbox initialDeliveries={deliveries} />
    </PageShell>
  );
}
