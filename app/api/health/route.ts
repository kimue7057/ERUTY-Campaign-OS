import { NextResponse } from "next/server";
// Liveness only: never claims DB readiness without querying it.
export function GET() {
  return NextResponse.json({ ok: true, stage: "pr1", check: "liveness" });
}
