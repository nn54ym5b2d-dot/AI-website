"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, UploadSimple, UserCircle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { authEntryHref } from "@/lib/auth/redirect";

type HeaderUser = {
  avatarUrl: string | null;
  displayName: string;
};

const navItems = [
  { href: "/materials", label: "发现素材" },
  { href: "/search?type=person", label: "人物" },
  { href: "/search?type=object", label: "物件/道具" },
  { href: "/search?type=scene", label: "场景" }
];

const authHref = authEntryHref("/");
const signedOutUploadHref = authEntryHref("/upload");

function AccountIcon({ user }: { user: HeaderUser }) {
  if (user.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="size-7 shrink-0 rounded-full bg-cover bg-center ring-1 ring-line"
        style={{ backgroundImage: `url(${JSON.stringify(user.avatarUrl)})` }}
      />
    );
  }

  return <UserCircle aria-hidden="true" className="shrink-0" size={23} weight="duotone" />;
}

export function SiteHeaderClient({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const uploadHref = user ? "/upload" : signedOutUploadHref;

  const accountAction = user ? (
    <Link
      aria-label={`进入 ${user.displayName} 的个人中心`}
      className="inline-flex min-h-10 max-w-44 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink transition hover:bg-paper"
      href="/account"
    >
      <AccountIcon user={user} />
      <span className="truncate">{user.displayName}</span>
    </Link>
  ) : (
    <Link className="ui-button-secondary px-4" href={authHref}>
      <UserCircle aria-hidden="true" size={19} />
      登录/注册
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="site-container flex min-h-16 items-center justify-between gap-4">
        <Link aria-label="源素库首页" className="shrink-0 text-xl font-black tracking-tight text-brand" href="/">
          源素库
        </Link>

        <nav aria-label="主导航" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              className={`rounded-md px-3 py-2 text-sm font-medium transition hover:bg-paper hover:text-ink ${
                pathname === item.href ? "text-ink" : "text-muted"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {accountAction}
          <Link className="ui-button-primary min-h-10 px-4" href={uploadHref}>
            <UploadSimple aria-hidden="true" size={17} weight="bold" />
            上传素材
          </Link>
        </div>

        <button
          aria-expanded={open}
          aria-label={open ? "关闭导航" : "打开导航"}
          className="rounded-md border border-line p-2 text-ink md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X aria-hidden="true" size={22} /> : <List aria-hidden="true" size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-white px-4 py-4 md:hidden">
          <nav aria-label="手机导航" className="grid gap-1">
            {navItems.map((item) => (
              <Link className="rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-paper" href={item.href} key={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link className="rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-paper" href="/search" onClick={() => setOpen(false)}>
              搜索素材
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {user ? (
                <Link className="ui-button-secondary min-w-0" href="/account" onClick={() => setOpen(false)}>
                  <AccountIcon user={user} />
                  <span className="truncate">{user.displayName}</span>
                </Link>
              ) : (
                <Link className="ui-button-secondary" href={authHref} onClick={() => setOpen(false)}>登录/注册</Link>
              )}
              <Link className="ui-button-primary" href={uploadHref} onClick={() => setOpen(false)}>上传素材</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
