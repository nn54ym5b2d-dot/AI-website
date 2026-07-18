import { randomUUID } from "node:crypto";

const unsafeDisplayNameCharacters =
  /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

export function generateDefaultDisplayName() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `源素用户·${suffix}`;
}

export function selectInitialDisplayName(preferredDisplayName?: string) {
  if (!preferredDisplayName) return generateDefaultDisplayName();

  const normalized = preferredDisplayName
    .normalize("NFKC")
    .replace(unsafeDisplayNameCharacters, "")
    .trim();
  const truncated = Array.from(normalized).slice(0, 40).join("");

  return truncated || generateDefaultDisplayName();
}
