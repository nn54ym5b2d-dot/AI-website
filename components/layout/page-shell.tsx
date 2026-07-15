import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function PageShell({ title, description, children, actions }: PageShellProps) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)] bg-paper">
        <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-5 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold leading-tight tracking-normal text-ink md:text-4xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          <div className="py-8">{children}</div>
        </section>
      </main>
    </>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-panel transition hover:bg-blue-700"
      href={href}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand"
      href={href}
    >
      {children}
    </Link>
  );
}
