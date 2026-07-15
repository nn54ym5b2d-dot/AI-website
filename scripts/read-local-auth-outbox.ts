import { readFile } from "node:fs/promises";
import path from "node:path";

const outboxPath = path.resolve(
  process.cwd(),
  process.env.AUTH_LOCAL_OUTBOX_PATH ?? ".local/auth-outbox.jsonl"
);

try {
  const lines = (await readFile(outboxPath, "utf8")).trim().split("\n").filter(Boolean);
  for (const line of lines.slice(-10)) {
    const delivery = JSON.parse(line) as {
      challengeId: string;
      method: string;
      identifier: string;
      verificationCode: string;
      expiresAt: string;
    };
    process.stdout.write(
      `${delivery.method} ${delivery.identifier} | code ${delivery.verificationCode} | ${delivery.expiresAt} | ${delivery.challengeId}\n`
    );
  }
} catch (error) {
  if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
    process.stdout.write("No local authentication deliveries yet.\n");
  } else {
    throw error;
  }
}
