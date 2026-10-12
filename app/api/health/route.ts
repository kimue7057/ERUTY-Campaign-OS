import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ ok: true, stage: "bootstrap", dataConnected: false }); }
