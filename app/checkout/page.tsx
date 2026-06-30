import { PageShell, PrimaryLink, SecondaryLink } from "@/components/layout/page-shell";
import { checkoutSteps } from "@/lib/domain/navigation";

export default function CheckoutPage() {
  return (
    <PageShell
      actions={
        <>
          <PrimaryLink href="/account/purchases">查看购买记录</PrimaryLink>
          <SecondaryLink href="/materials">继续浏览</SecondaryLink>
        </>
      }
      description="订单支付页展示多素材订单、金额、微信支付/支付宝入口和支付状态。当前不接入真实支付。"
      title="订单支付页"
    >
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">购买下载流程</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {checkoutSteps.map((step, index) => (
            <li className="rounded-md border border-line bg-paper p-4 text-sm text-muted" key={step}>
              <span className="mr-2 font-semibold text-brand">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
