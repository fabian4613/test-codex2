import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, authEnabled } from "@/lib/auth";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Test stub to bypass real auth in visual tests
  if (process.env.TEST_AUTH === "1" || process.env.TEST_AUTH === "true") {
    return NextResponse.json({
      authenticated: true,
      sub: "test-user",
      name: "Tester",
      email: "tester@example.com",
      groups: ["/devops", "team:marketing"]
    }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!authEnabled()) return NextResponse.json({ authenticated: false });
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ authenticated: false });
  const me: any = {
    authenticated: true,
    sub: (session as any).sub,
    name: session.user?.name || null,
    email: session.user?.email || null,
    groups: (session as any).groups || []
  };
  // Fallback: if groups missing, try Keycloak userinfo with access token
  try {
    if ((!me.groups || me.groups.length === 0) && process.env.KEYCLOAK_ISSUER) {
      const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const access = (jwt as any)?.accessToken as string | undefined;
      if (access) {
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
        if (r.ok) {
          const ui = await r.json();
          if (Array.isArray(ui.groups)) me.groups = ui.groups;
        }
      }
    }
  } catch {}
  return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
}
