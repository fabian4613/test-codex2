import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, authEnabled } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!authEnabled()) return NextResponse.json({ authenticated: false });
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ authenticated: false });
  const me = {
    authenticated: true,
    sub: (session as any).sub,
    name: session.user?.name || null,
    email: session.user?.email || null,
    groups: (session as any).groups || []
  };
  return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
}

