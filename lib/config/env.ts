import "server-only";

type AppEnv = {
  appName: string;
  appUrl: string;
  databaseUrl?: string;
  tencentCosBucket?: string;
  tencentCosRegion?: string;
};

export function getAppEnv(): AppEnv {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "源素库",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL,
    tencentCosBucket: process.env.TENCENT_COS_BUCKET,
    tencentCosRegion: process.env.TENCENT_COS_REGION
  };
}
