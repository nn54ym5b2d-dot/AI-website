import { getAppEnv } from "@/lib/config/env";

export function getDatabaseUrl() {
  const { databaseUrl } = getAppEnv();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}
