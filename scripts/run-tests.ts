import "dotenv/config";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required. Start PostgreSQL and copy .env.example to .env first.");
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 24) {
  throw new Error("AUTH_SECRET with at least 24 characters is required for identity tests.");
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

const runtimeEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  RUN_DB_TESTS: "1",
  AUTH_PROVIDER: "local",
  AUTH_LOCAL_OUTBOX_PATH: ".local/test-auth-outbox.jsonl",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
};

await run(process.execPath, ["--import", "tsx", "scripts/reset-test-database.ts"], runtimeEnv);

const testFiles = (await readdir("tests"))
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => `tests/${file}`);

await run(process.execPath, ["--import", "tsx", "--test", ...testFiles], runtimeEnv);
