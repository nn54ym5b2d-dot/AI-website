"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBagOpen } from "@phosphor-icons/react";
import { useState } from "react";

export function PurchasePanel({ price }: { price: number }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="border-t border-line pt-5">
      <div className="flex items-baseline justify-between gap-4"><span className="text-sm text-muted">统一商业授权</span><strong className="text-3xl tracking-tight text-brand">¥{price}</strong></div>
      <p className="mt-3 text-xs leading-5 text-muted">演示价格：人物/场景 ¥50，物件/道具 ¥10。当前不会创建订单或发起支付。</p>
      {saved ? <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-success"><CheckCircle aria-hidden="true" size={18} weight="fill" />已加入演示购买清单</div> : null}
      <button className="ui-button-primary mt-5 w-full" onClick={() => setSaved(true)} type="button"><ShoppingBagOpen aria-hidden="true" size={18} weight="bold" />加入购买清单</button>
      <Link className="ui-button-secondary mt-2 w-full" href="/checkout">查看订单支付演示</Link>
    </div>
  );
}
