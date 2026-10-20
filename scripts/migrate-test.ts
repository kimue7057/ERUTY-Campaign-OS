import "dotenv/config";
import { spawnSync } from "node:child_process";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("/eruty_test"))
  throw new Error("전용 TEST_DATABASE_URL / eruty_test DB가 필요합니다.");
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
