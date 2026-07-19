"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicPreview } from "@/types/materials";

export function MaterialGallery({ previews, title }: { previews: PublicPreview[]; title: string }) {
  const [selectedId, setSelectedId] = useState(previews[0]?.id);
  const selected = previews.find((preview) => preview.id === selectedId) ?? previews[0];
  if (!selected) return null;

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-paper">
        <Image alt={`${title}带水印主预览`} className="object-cover" fill loading="eager" sizes="(max-width: 1024px) 100vw, 60vw" src={selected.url} />
      </div>
      {previews.length > 1 ? <div className="mt-3 grid grid-cols-4 gap-3">{previews.map((preview, index) => <button aria-label={`查看第 ${index + 1} 张带水印预览`} className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 ${selected.id === preview.id ? "border-brand" : "border-transparent"}`} key={preview.id} onClick={() => setSelectedId(preview.id)} type="button"><Image alt="" className="object-cover" fill sizes="120px" src={preview.url} /></button>)}</div> : null}
    </div>
  );
}
