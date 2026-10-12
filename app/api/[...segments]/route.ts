import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticate } from "@/lib/auth";
import { DomainError, ensure } from "@/lib/errors";
import { idSchema } from "@/lib/validation";
import { serialize } from "@/lib/domain";
import * as service from "@/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments: string[] }> };

async function handle(request: NextRequest, context: Context) {
  try {
    const actor = await authenticate(request.headers);
    const { segments: s } = await context.params;
    const method = request.method;
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      ensure(!origin || origin === (process.env.APP_BASE_URL ?? request.nextUrl.origin), 403, "허용되지 않은 요청 출처입니다.");
    }
    const id = s[1] ? idSchema.parse(s[1]) : undefined;
    const childId = s[3] ? idSchema.parse(s[3]) : undefined;
    ensure(s.length <= 4, 404, "요청한 경로를 찾을 수 없습니다.");
    let data: unknown;
    if (method === "POST" || method === "PATCH") {
      ensure(request.headers.get("content-type")?.includes("application/json"), 415, "JSON 형식으로 요청해 주세요.");
      try { data = await request.json(); } catch { throw new DomainError(400, "올바른 JSON 형식으로 요청해 주세요."); }
    }
    let result: unknown;
    if (method === "GET") {
      if (s[0] === "bootstrap" && s.length === 1) result = await service.bootstrap(actor);
      else if (s[0] === "brands" && s.length === 1) result = (await service.bootstrap(actor)).brands;
      else if (s[0] === "brand-countries" && s.length === 1) result = (await service.bootstrap(actor)).countries;
      else if (s[0] === "campaigns" && s.length === 1) result = await service.campaigns(actor);
      else if (s[0] === "campaigns" && id) {
        const row = await service.detail(actor, id);
        if (s.length === 2) result = row;
        else if (s.length === 3 && s[2] === "strategies") result = row.strategies;
        else if (s.length === 3 && s[2] === "work-items") result = row.workItems;
        else if (s.length === 3 && s[2] === "summary") result = row.summary;
        else throw new DomainError(404, "요청한 경로를 찾을 수 없습니다.");
      } else throw new DomainError(404, "요청한 경로를 찾을 수 없습니다.");
    } else if (method === "POST" || method === "PATCH") {
      ensure(method === "POST" ? !childId && s.length !== 2 : !!(childId ?? id), 405, "지원하지 않는 요청 방식입니다.");
      if (s[0] === "brands" && s.length <= 2) result = await service.saveBrand(actor, data, id);
      else if (s[0] === "brand-countries" && s.length <= 2) result = await service.saveCountry(actor, data, id);
      else if (s[0] === "campaigns" && s.length <= 2) result = await service.saveCampaign(actor, data, id);
      else if (s[0] === "campaigns" && id && s[2] === "strategies") result = await service.saveStrategy(actor, id, data, childId);
      else if (s[0] === "campaigns" && id && s[2] === "work-items") result = await service.saveWork(actor, id, data, childId);
      else throw new DomainError(404, "요청한 경로를 찾을 수 없습니다.");
    } else if (method === "DELETE") {
      const revision = Number(request.nextUrl.searchParams.get("revision"));
      ensure(Number.isInteger(revision) && revision > 0, 422, "삭제할 데이터의 수정 버전이 필요합니다.");
      ensure(id, 404, "삭제할 대상을 찾을 수 없습니다.");
      if (s[0] === "brands" && s.length === 2) result = await service.remove(actor, "brand", id, revision);
      else if (s[0] === "brand-countries" && s.length === 2) result = await service.remove(actor, "country", id, revision);
      else if (s[0] === "campaigns" && s.length === 2) {
        // An editor may delete an empty campaign through the same campaign write gate.
        result = await service.remove(actor, "campaign", id, revision, id);
      } else if (s[0] === "campaigns" && childId && s[2] === "strategies") result = await service.remove(actor, "strategy", childId, revision, id);
      else if (s[0] === "campaigns" && childId && s[2] === "work-items") result = await service.remove(actor, "work", childId, revision, id);
      else throw new DomainError(404, "요청한 경로를 찾을 수 없습니다.");
    } else throw new DomainError(405, "지원하지 않는 요청 방식입니다.");
    return NextResponse.json({ data: serialize(result) }, { status: method === "POST" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    let status = 500, message = "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    if (error instanceof DomainError) { status = error.status; message = error.message; }
    else if (error instanceof ZodError) { status = 422; message = error.issues.map(i => i.message).join(" "); }
    else if (typeof error === "object" && error && "code" in error) {
      const code = String(error.code);
      if (code === "P2002") { status = 409; message = "이미 등록된 이름 또는 국가 코드입니다."; }
      if (["P2003", "P2004", "P2010"].includes(code)) { status = 422; message = "날짜·금액·계층 또는 소속 제약을 위반했습니다."; }
      if (["P2034", "P2025"].includes(code)) { status = 409; message = "동시 수정이 감지되었습니다. 새로고침 후 다시 시도해 주세요."; }
      if (code === "P1001") { status = 503; message = "데이터베이스에 연결할 수 없습니다. 연결 설정을 확인해 주세요."; }
    }
    // Avoid logging database connection strings or raw validation input.
    return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
