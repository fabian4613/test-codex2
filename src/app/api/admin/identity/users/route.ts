import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { kcListUsers, kcCreateUser, kcListGroups, kcUsersCount } from "@/lib/server/keycloak";
import { getUserGroups } from "@/lib/server/auth-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json([], { status: 200 });
  const session = await getServerSession(authOptions);
  const groups = await getUserGroups(req);
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const first = Math.max(0, page) * Math.max(1, pageSize);
  const users = await kcListUsers(search, first, pageSize);
  const total = await kcUsersCount(search);
  return NextResponse.json({ users, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = await getUserGroups(req);
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const username = String(body?.username || "").trim();
  const email = body?.email ? String(body.email) : undefined;
  const password = String(body?.password || "").trim();
  const groupNames: string[] = Array.isArray(body?.groups) ? body.groups : [];
  if (!username || !password) return NextResponse.json({ error: "Missing username/password" }, { status: 400 });
  // Map group names to IDs
  let groupIds: string[] = [];
  if (groupNames.length) {
    const list = await kcListGroups();
    groupIds = list.filter(g => groupNames.includes(g.name)).map(g => g.id);
  }
  const id = await kcCreateUser({ username, email, password, groups: groupIds });
  return NextResponse.json({ id });
}
