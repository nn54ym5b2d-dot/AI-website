const fallbackPath = "/";
const localOrigin = "https://yuansu.local";

export function safeAuthRedirectPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const resolved = new URL(nextPath, localOrigin);
    if (resolved.origin !== localOrigin) return fallbackPath;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallbackPath;
  }
}

export function authEntryHref(nextPath = "/") {
  return `/login?next=${encodeURIComponent(safeAuthRedirectPath(nextPath))}`;
}
