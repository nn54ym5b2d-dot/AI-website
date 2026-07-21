import { PageShell, SecondaryLink } from "@/components/layout/page-shell";
import { RefundManager } from "@/components/transactions/refund-manager";
import { requireAudience } from "@/lib/auth/page-guard";
import { listAdminOrders, listAdminRefunds } from "@/lib/transactions/service";
export const dynamic = "force-dynamic";
export default async function AdminRefundsPage() {
  await requireAudience("/admin/refunds", ["super_admin", "finance"]);
  const [orders, data] = await Promise.all([listAdminOrders(), listAdminRefunds()]);
  return <PageShell actions={<SecondaryLink href="/admin">返回管理后台</SecondaryLink>} description="购买退款只允许完整订单明细；认证费退款从审核驳回待办进入同一测试回调流程。" eyebrow="Operations" title="退款管理"><RefundManager certificationRequests={data.certificationRequests} orders={orders} refunds={data.refunds} /></PageShell>;
}
