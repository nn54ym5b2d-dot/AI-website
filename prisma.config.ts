import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    // Client generation does not need a live database. Runtime and migration
    // commands still receive DATABASE_URL from the environment.
    url: process.env.DATABASE_URL ?? "postgresql://localhost/yuansu_local"
  }
});
