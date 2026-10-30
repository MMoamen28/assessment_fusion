import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const maxWaitMs = 60000;
const intervalMs = 2000;
const start = Date.now();

console.log("[start.mjs] Applying database migrations...");
let migrated = false;

while (Date.now() - start < maxWaitMs) {
  try {
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy");
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    migrated = true;
    break;
  } catch (err) {
    console.log(`[start.mjs] Migration attempt failed: ${err.message}. Retrying in ${intervalMs / 1000}s...`);
    await sleep(intervalMs);
  }
}

if (!migrated) {
  console.error("[start.mjs] Failed to apply migrations within timeout.");
  process.exit(1);
}

if (process.env.SEED_ON_START === "true") {
  console.log("[start.mjs] Checking if database needs seed...");
  try {
    const { stdout, stderr } = await execAsync("npx tsx prisma/seed-if-empty.ts");
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (err) {
    console.error("[start.mjs] Error running seed-if-empty:", err);
  }
}

console.log("[start.mjs] Starting Next.js server on port 3000 (0.0.0.0)...");
const child = spawn("npx", ["next", "start", "-p", "3000", "-H", "0.0.0.0"], {
  stdio: "inherit",
});

function handleSignal(signal) {
  console.log(`[start.mjs] Received ${signal}, shutting down Next.js process...`);
  child.kill(signal);
}

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
