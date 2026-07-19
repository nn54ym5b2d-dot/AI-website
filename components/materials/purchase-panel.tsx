"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBagOpen } from "@phosphor-icons/react";
import { useState } from "react";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(priceCents / 100);
}

export function PurchasePanel({ assetId, priceCents }: { assetId: string; priceCents: number }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="border-t border-line pt-5">
      <div className="flex items-baseline justify-between gap-4"><span className="text-sm text-muted">统一商业授权</span><strong className="text-3xl tracking-tight text-brand">{formatPrice(priceCents)}</strong></div>
      <p className="mt-3 text-xs leading-5 text-muted">价格来自本地素材数据库。T010 只提供购买入口，不创建订单或发起真实支付。</p>
      {saved ? <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-success"><CheckCircle aria-hidden="true" size={18} weight="fill" />已加入本次本地待购清单</div> : null}
      <button className="ui-button-primary mt-5 w-full" onClick={() => setSaved(true)} type="button"><ShoppingBagOpen aria-hidden="true" size={18} weight="bold" />加入待购清单</button>
      <Link className="ui-button-secondary mt-2 w-full" href={`/checkout?assetId=${encodeURIComponent(assetId)}`}>查看后续支付入口</Link>
    </div>
  );
}
