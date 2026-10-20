import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authenticate } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase-auth";
import { DomainError, ensure } from "@/lib/errors";
import { requireAuthOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024),
}).strict();

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    ensure((await context.params).action === "session", 404, "요청한 경로를 찾을 수 없습니다.");
    ensure(process.env.AUTH_MODE === "supabase", 503, "Supabase 로그인이 설정되지 않았습니다.");
    const actor = await authenticate(request.headers);
    return NextResponse.json({ data: actor }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof DomainError ? error.message : "로그인 상태를 확인할 수 없습니다." } }, {
      status: error instanceof DomainError ? error.status : 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    ensure(process.env.AUTH_MODE === "supabase", 503, "Supabase 로그인이 설정되지 않았습니다.");
    requireAuthOrigin(request);
    const { action } = await context.params;
    ensure(action === "login" || action === "logout", 404, "요청한 경로를 찾을 수 없습니다.");
    const client = await createAuthClient();
    if (action === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      ensure(!error, 503, "로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.");
    } else {
      let input: unknown;
      try { input = await request.json(); }
      catch { throw new DomainError(400, "올바른 JSON 형식으로 요청해 주세요."); }
      const { error } = await client.auth.signInWithPassword(credentials.parse(input));
      ensure(!error, 401, "이메일 또는 비밀번호를 확인해 주세요.");
      try { await authenticate(request.headers); }
      catch (error) {
        // Auth users without an active internal AppUser never receive app access.
        await client.auth.signOut({ scope: "local" });
        throw error;
      }
    }
    return NextResponse.json({ data: { ok: true } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof DomainError ? error.status : error instanceof ZodError ? 422 : 503;
    const message = error instanceof DomainError ? error.message : error instanceof ZodError ? "이메일과 비밀번호를 올바르게 입력해 주세요." : "로그인 서비스에 연결하지 못했습니다. 다시 시도해 주세요.";
    return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
