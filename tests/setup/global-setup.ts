import { execSync } from "node:child_process";
import { loadEnv } from "vite";

export default function globalSetup(): void {
  const env = loadEnv("test", process.cwd(), "");
  const testDbUrl = env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL;
  const devDbUrl = env.DATABASE_URL || process.env.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error("TEST_DATABASE_URL is missing");
  }

  if (testDbUrl === devDbUrl) {
    throw new Error("TEST_DATABASE_URL must not equal DATABASE_URL");
  }

  const parsedUrl = new URL(testDbUrl.replace(/^postgresql:\/\//, "http://"));
  const dbName = parsedUrl.pathname.replace(/^\//, "");

  if (!dbName.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL database name must end with _test");
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });
}
