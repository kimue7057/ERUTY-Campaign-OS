import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

async function main() {
  // Development-only PostgreSQL. Never substitutes an existing DATABASE_URL.
  if (process.env.NODE_ENV === "production")
    throw new Error("로컬 DB는 개발 환경에서만 실행하세요.");
  const directory = resolve(process.env.LOCAL_PG_DIR ?? ".local-postgres");
  mkdirSync(directory, { recursive: true });
  const passwordFile = resolve(directory, "local-password");
  const password = existsSync(passwordFile)
    ? readFileSync(passwordFile, "utf8")
    : randomBytes(24).toString("hex");
  if (!existsSync(passwordFile))
    writeFileSync(passwordFile, password, { mode: 0o600 });
  const port = Number(process.env.LOCAL_PG_PORT ?? 55432);
  const pg = new EmbeddedPostgres({
    databaseDir: resolve(directory, "data"),
    user: "eruty_dev",
    password,
    port,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: (message) => console.error(String(message)),
  });
  if (!existsSync(resolve(directory, "data", "PG_VERSION")))
    await pg.initialise();
  await pg.start();
  const client = pg.getPgClient("postgres");
  await client.connect();
  for (const name of ["eruty_demo", "eruty_test"]) {
    const found = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name],
    );
    if (!found.rowCount) await client.query(`CREATE DATABASE ${name}`);
  }
  await client.end();
  const envFile = resolve(".env");
  if (!existsSync(envFile)) {
    writeFileSync(
      envFile,
      `DATABASE_URL=postgresql://eruty_dev:${password}@127.0.0.1:${port}/eruty_demo\nTEST_DATABASE_URL=postgresql://eruty_dev:${password}@127.0.0.1:${port}/eruty_test\nAUTH_MODE=demo\nALLOW_DEMO_AUTH=true\nAPP_BASE_URL=http://127.0.0.1:3000\n`,
    );
    console.log(
      "로컬 전용 .env를 생성했습니다. 기존 환경 파일은 덮어쓰지 않습니다.",
    );
  }
  console.log(
    `PostgreSQL 준비 완료 (127.0.0.1:${port}). 이 터미널을 열어 두세요.`,
  );
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "로컬 DB 실행 오류");
  process.exitCode = 1;
});
