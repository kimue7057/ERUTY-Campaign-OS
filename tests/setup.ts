import "dotenv/config";
// Integration writes only to an explicitly named, dedicated test database.
if (process.env.TEST_DATABASE_URL) {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("/eruty_test"))
    throw new Error("TEST_DATABASE_URL의 eruty_test DB가 필요합니다.");
  process.env.DATABASE_URL = url;
}
