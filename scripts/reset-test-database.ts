import { spawn } from "node:child_process";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(testDatabaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "");

if (!databaseName.endsWith("_test")) {
  throw new Error("Refusing to reset a database whose name does not end in _test.");
}

function runPrisma(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", ...args], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma command failed with exit code ${code ?? "unknown"}.`));
      }
    });
  });
}

await runPrisma(["migrate", "reset", "--force"]);
await runPrisma(["db", "seed"]);
