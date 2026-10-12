import "dotenv/config";
import { defineConfig } from "@playwright/test";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("/eruty_test"))
  throw new Error("E2E에는 전용 eruty_test PostgreSQL이 필요합니다.");
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: testUrl,
      AUTH_MODE: "demo",
      ALLOW_DEMO_AUTH: "true",
      APP_BASE_URL: "http://127.0.0.1:3100",
      ERUTY_DIST_DIR: ".next-e2e",
    },
  },
});
