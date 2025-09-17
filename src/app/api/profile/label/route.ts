import { NextRequest, NextResponse } from "next/server";
import { kcGetUser } from "@/lib/server/keycloak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "";
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  try {
    if (key.startsWith("group:")) {
      const name = key.slice(6);
      return NextResponse.json({ key, label: `Grupo: ${name}` }, { headers: { "Cache-Control": "no-store" } });
    }
    if (key.startsWith("user:")) {
      const id = key.slice(5);
      // Best effort: prefer full name (firstName + lastName), then email, then username, then short id
      try {
        const u: any = await kcGetUser(id);
        const full = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
        const label = full || u?.email || u?.username || `user:${id.slice(0, 8)}`;
        return NextResponse.json({ key, label }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return NextResponse.json({ key, label: `user:${id.slice(0, 8)}` }, { headers: { "Cache-Control": "no-store" } });
      }
    }
    return NextResponse.json({ key, label: key }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
