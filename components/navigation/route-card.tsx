import Link from "next/link";
import type { RouteDefinition } from "@/lib/domain/navigation";

export function RouteCard({ route }: { route: RouteDefinition }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-muted">
          {route.priority}
        </span>
        <span className="text-xs font-medium text-brand">{route.roleEntry}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{route.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{route.description}</p>
      {route.notes ? <p className="mt-3 text-xs leading-5 text-warning">{route.notes}</p> : null}
      <Link className="mt-4 text-sm font-medium text-brand hover:text-blue-700" href={route.href}>
        打开 {route.href}
      </Link>
    </article>
  );
}

export function RouteCardGrid({ routes }: { routes: RouteDefinition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {routes.map((route) => (
        <RouteCard key={route.href} route={route} />
      ))}
    </div>
  );
}
