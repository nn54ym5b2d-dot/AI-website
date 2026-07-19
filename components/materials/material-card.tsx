import Image from "next/image";
import Link from "next/link";
import { SealCheck } from "@phosphor-icons/react/ssr";
import type { PublicAssetCard } from "@/types/materials";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(priceCents / 100);
}

export function MaterialCard({ asset }: { asset: PublicAssetCard }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-white transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-card">
      <Link aria-label={`查看${asset.title}`} className="block" href={`/materials/${asset.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-paper">
          <Image alt={`${asset.title}带水印预览`} className="object-cover transition duration-300 group-hover:scale-[1.025]" fill sizes="(max-width: 768px) 100vw, 33vw" src={asset.preview.url} />
          <span className="absolute left-3 top-3 rounded bg-white/92 px-2 py-1 text-xs font-semibold text-ink shadow-sm">{asset.typeLabel}</span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold leading-6 text-ink group-hover:text-brand">{asset.title}</h3>
            <span className="shrink-0 text-base font-bold text-brand">{formatPrice(asset.priceCents)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{asset.uploaderDisplayName}</span>
            <span className="inline-flex items-center gap-1 text-success"><SealCheck aria-hidden="true" size={15} weight="fill" />已认证</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function MaterialGrid({ assets }: { assets: PublicAssetCard[] }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{assets.map((asset) => <MaterialCard asset={asset} key={asset.id} />)}</div>;
}
