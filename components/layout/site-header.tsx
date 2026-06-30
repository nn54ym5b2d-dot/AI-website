import Link from "next/link";
import { primaryNavItems } from "@/lib/domain/navigation";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link className="text-base font-semibold text-ink" href="/">
          源素库
        </Link>
        <nav aria-label="主导航" className="flex flex-wrap items-center gap-1">
          {primaryNavItems.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-paper hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
