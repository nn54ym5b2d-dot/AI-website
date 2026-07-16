import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  compact?: boolean;
};

export function PageShell({ title, description, children, actions, eyebrow, compact = false }: PageShellProps) {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <section className={`site-container ${compact ? "py-8 sm:py-12" : "py-9 sm:py-12 lg:py-14"}`}>
          <div className={`flex flex-col gap-5 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between ${compact ? "mx-auto max-w-3xl" : ""}`}>
            <div className="max-w-3xl">
              {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
              <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          <div className={`${compact ? "mx-auto max-w-3xl" : ""} py-7 sm:py-9`}>{children}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="ui-button-primary" href={href}>{children}<ArrowRight aria-hidden="true" size={16} weight="bold" /></Link>;
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="ui-button-secondary" href={href}>{children}</Link>;
}
