import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(),
  findUnique: vi.fn(), factory: vi.fn(), setCookie: vi.fn(),
}));
vi.mock("../../lib/db", () => ({ db: { appUser: { findUnique: mocks.findUnique } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: mocks.setCookie }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.factory }));
import { authenticate } from "../../lib/auth";
import { createAuthClient } from "../../lib/supabase-auth";
import { requireAuthOrigin } from "../../lib/request-security";
import { POST } from "../../app/api/auth/[action]/route";

const registered = { id: "internal-user", name: "관리자", role: "ADMIN", active: true, isDemo: false };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_MODE", "supabase");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_URL", "https://test-project.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
  vi.stubEnv("APP_BASE_URL", "https://campaign.example.test");
  mocks.factory.mockReturnValue({ auth: { getUser: mocks.getUser, signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut } });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user", user_metadata: { role: "ADMIN" } } }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.findUnique.mockResolvedValue(registered);
});
afterEach(() => vi.unstubAllEnvs());

describe("Supabase 운영 인증 경계", () => {
  it("Auth 서버가 검증한 ID로만 조회하고 메타데이터·프록시 헤더의 역할을 무시한다", async () => {
    mocks.findUnique.mockResolvedValue({ ...registered, role: "MEMBER" });
    const actor = await authenticate(new Headers({ "x-eruty-assertion": "forged-admin" }));
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { authSubject: "supabase:verified-user" } });
    expect(actor.role).toBe("MEMBER");
  });
  it("취소·만료·위조된 세션은 DB 조회 전에 차단한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid token" } });
    await expect(authenticate(new Headers())).rejects.toMatchObject({ status: 401 });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it.each([null, { ...registered, active: false }, { ...registered, isDemo: true }])("미등록·비활성·DEMO 계정은 운영 권한을 얻지 못한다: %j", async (user) => {
    mocks.findUnique.mockResolvedValue(user);
    await expect(authenticate(new Headers())).rejects.toMatchObject({ status: 403 });
  });
  it("운영 쿠키는 HttpOnly·Secure·SameSite=Lax를 사용한다", async () => {
    await createAuthClient();
    expect(mocks.factory.mock.calls[0][2].cookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });
  it("설정 누락은 인증을 우회하지 않는다", async () => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    await expect(authenticate(new Headers())).rejects.toMatchObject({ status: 503 });
  });
  it.each([null, "https://evil.example.test"])("출처가 없거나 외부인 로그인·로그아웃을 거절한다: %s", (origin) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (origin) headers.origin = origin;
    expect(() => requireAuthOrigin(new Request("https://campaign.example.test/api/auth/login", { headers }))).toThrow("허용되지 않은 요청 출처");
  });
  it("내부 미등록 사용자의 로그인 성공 후에도 세션을 정리하고 403을 반환한다", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await POST(new NextRequest("https://campaign.example.test/api/auth/login", {
      method: "POST", headers: { origin: "https://campaign.example.test", "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.test", password: "test-only" }),
    }), { params: Promise.resolve({ action: "login" }) });
    expect(response.status).toBe(403);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
