import { NextRequest, NextResponse } from "next/server";
import { getState, putState, deleteState } from "@/lib/server/persist";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled } from "@/lib/auth";
import { getUserGroups } from "@/lib/server/auth-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "default";
  try {
    const state = await getState(key);
    if (!state) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "default";
  try {
    const json = await req.json();
    await putState(key, json);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "";
  try {
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
    // Basic safety
    if (key === "default") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (authEnabled()) {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const sub = (session as any).sub as string | undefined;
      const groups = await getUserGroups(req);
      let allowed = false;
      if (key.startsWith("user:") && sub) {
        const ksub = key.slice(5);
        allowed = (ksub === sub);
      } else if (key.startsWith("group:")) {
        const name = key.slice(6);
        allowed = !!groups?.some(g => g === `/${name}` || g === name);
      }
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteState(key);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
