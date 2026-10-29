import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const env = loadEnv("test", process.cwd(), "");
const testDbUrl = env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL || "";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    globalSetup: ["tests/setup/global-setup.ts"],
    env: {
      DATABASE_URL: testDbUrl,
    },
  },
});
