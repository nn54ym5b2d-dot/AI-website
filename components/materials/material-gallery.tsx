"use client";

import Image from "next/image";
import { useState } from "react";

export function MaterialGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(images[0]);
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-paper">
        <Image alt={`${title}主预览`} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 60vw" src={selected} />
      </div>
      {images.length > 1 ? <div className="mt-3 grid grid-cols-4 gap-3">{images.map((image, index) => <button aria-label={`查看第 ${index + 1} 张预览`} className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 ${selected === image ? "border-brand" : "border-transparent"}`} key={image} onClick={() => setSelected(image)} type="button"><Image alt="" className="object-cover" fill sizes="120px" src={image} /></button>)}</div> : null}
    </div>
  );
}
