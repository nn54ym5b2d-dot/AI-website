import Link from "next/link";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/upload", label: "上传" },
  { href: "/admin", label: "后台" }
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link className="text-base font-semibold text-ink" href="/">
          源素库
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1">
          {navItems.map((item) => (
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
