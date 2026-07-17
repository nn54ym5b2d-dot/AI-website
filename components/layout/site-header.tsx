"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, UploadSimple, UserCircle, X } from "@phosphor-icons/react";
import { useState } from "react";

const navItems = [
  { href: "/materials", label: "发现素材" },
  { href: "/materials?category=人物", label: "人物" },
  { href: "/materials?category=物件", label: "物件/道具" },
  { href: "/materials?category=场景", label: "场景" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
          <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted hover:bg-paper hover:text-ink" href="/login">
            <UserCircle aria-hidden="true" size={19} />
            登录
          </Link>
          <Link className="ui-button-secondary px-4" href="/register">
            注册
          </Link>
          <Link className="ui-button-primary min-h-10 px-4" href="/upload">
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
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-4">
              <Link className="ui-button-secondary" href="/login" onClick={() => setOpen(false)}>登录</Link>
              <Link className="ui-button-secondary" href="/register" onClick={() => setOpen(false)}>注册</Link>
              <Link className="ui-button-primary" href="/upload" onClick={() => setOpen(false)}>上传素材</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
