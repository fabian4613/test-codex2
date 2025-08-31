import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { putState, deleteState } from "@/lib/server/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const key = String(body?.key || "");
  const content = body?.content || {};
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  await putState(key, content);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  await deleteState(key);
  return NextResponse.json({ ok: true });
}

