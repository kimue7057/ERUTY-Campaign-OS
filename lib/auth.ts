import { jwtVerify } from "jose";
import { db } from "./db";
import { DomainError, ensure } from "./errors";
import type { AppUser } from "../generated/prisma/client";

export type Actor = Pick<AppUser, "id" | "name" | "role" | "isDemo">;
export function demoEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_MODE === "demo" &&
    process.env.ALLOW_DEMO_AUTH === "true"
  );
}
export async function verifyAssertion(
  assertion: string,
  secret: string,
  issuer: string,
  audience: string,
) {
  ensure(
    secret.length >= 32 && issuer && audience,
    503,
    "사내 인증 설정을 완료해 주세요.",
  );
  try {
    const { payload } = await jwtVerify(
      assertion,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer,
        audience,
        maxTokenAge: "5m",
        requiredClaims: ["sub", "exp", "iat"],
        clockTolerance: 5,
      },
    );
    ensure(
      typeof payload.sub === "string" && payload.sub.length > 0,
      401,
      "사내 로그인이 필요합니다.",
    );
    return payload.sub;
  } catch {
    throw new DomainError(401, "사내 인증이 만료되었거나 유효하지 않습니다.");
  }
}
export async function authenticate(headers: Headers): Promise<Actor> {
  let subject: string;
  if (demoEnabled()) subject = "demo-admin";
  else if (process.env.AUTH_MODE === "supabase") {
    const { supabaseSubject } = await import("./supabase-auth");
    subject = await supabaseSubject();
  }
  else {
    ensure(
      process.env.AUTH_MODE === "proxy",
      503,
      "사내 인증이 설정되지 않았습니다. 운영 접속이 차단되었습니다.",
    );
    const token = headers.get("x-eruty-assertion");
    ensure(token, 401, "사내 로그인이 필요합니다.");
    subject = await verifyAssertion(
      token,
      process.env.AUTH_PROXY_SECRET ?? "",
      process.env.AUTH_ISSUER ?? "",
      process.env.AUTH_AUDIENCE ?? "",
    );
  }
  const user = await db.appUser.findUnique({ where: { authSubject: subject } });
  ensure(
    user?.active && user.isDemo === demoEnabled(),
    403,
    "등록된 내부 계정의 접근 권한이 필요합니다.",
  );
  return { id: user.id, name: user.name, role: user.role, isDemo: user.isDemo };
}
export function requireAdmin(actor: Actor) {
  ensure(actor.role === "ADMIN", 403, "관리자 권한이 필요합니다.");
}
export function scope(actor: Actor) {
  return {
    isDemo: actor.isDemo,
    ...(actor.role === "ADMIN"
      ? {}
      : { members: { some: { userId: actor.id } } }),
  };
}
export async function authorizeCampaign(
  actor: Actor,
  id: string,
  write = false,
) {
  const campaign = await db.campaign.findFirst({
    where: { id, ...scope(actor) },
    include: { members: { where: { userId: actor.id } } },
  });
  ensure(campaign, 404, "캠페인을 찾을 수 없거나 접근 권한이 없습니다.");
  ensure(
    !write ||
      actor.role === "ADMIN" ||
      campaign.members.some((m) => m.role === "EDITOR"),
    403,
    "이 캠페인을 수정할 권한이 없습니다.",
  );
  return campaign;
}
