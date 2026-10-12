import { describe, it, expect } from "vitest";
import { databaseOptions } from "../../lib/database-options";

describe("서버 DB 인증서 검증", () => {
  it("URL의 SSL 비활성화 옵션이 명시한 CA 검증을 덮어쓰지 못한다", () => {
    const options = databaseOptions("postgresql://test:test@pooler.example.test:6543/postgres?sslmode=disable&sslrootcert=other&sslcert=other&sslkey=other&pgbouncer=true", "test-CA");
    const url = new URL(options.connectionString!);
    expect(url.searchParams.has("sslmode")).toBe(false);
    expect(url.searchParams.has("sslrootcert")).toBe(false);
    expect(url.searchParams.has("sslcert")).toBe(false);
    expect(url.searchParams.has("sslkey")).toBe(false);
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(options.ssl).toEqual({ ca: "test-CA", rejectUnauthorized: true });
  });
  it("로컬 PostgreSQL 설정은 별도 CA 없이 유지한다", () => {
    expect(databaseOptions("postgresql://localhost/eruty_test")).toEqual({ connectionString: "postgresql://localhost/eruty_test" });
  });
});
