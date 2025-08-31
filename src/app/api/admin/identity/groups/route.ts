import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { kcListGroups, kcCreateGroup } from "@/lib/server/keycloak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!authEnabled()) return NextResponse.json([], { status: 200 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const list = await kcListGroups();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const id = await kcCreateGroup(name);
  return NextResponse.json({ id, name });
}

