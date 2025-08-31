import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions, authEnabled } from "@/lib/auth";

export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export async function GET(req: NextRequest, ctx: any) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  }
  return handler(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  }
  return handler(req, ctx);
}
