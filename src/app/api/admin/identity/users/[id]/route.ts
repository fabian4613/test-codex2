import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { kcDeleteUser, kcUserGroups, kcListGroups, kcAddUserToGroup, kcRemoveUserFromGroup, kcSetUserPassword } from "@/lib/server/keycloak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await kcDeleteUser(params.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const nextGroupNames: string[] | undefined = Array.isArray(body?.groups) ? body.groups : undefined;
  const password: string | undefined = body?.password;
  if (nextGroupNames) {
    // fetch mapping name->id
    const all = await kcListGroups();
    const map = new Map(all.map(g => [g.name, g.id] as const));
    const desired = new Set(nextGroupNames.map(n => map.get(n)).filter(Boolean) as string[]);
    const current = await kcUserGroups(params.id);
    const currentIds = new Set(current.map(g => g.id));
    // add missing
    for (const gid of desired) if (!currentIds.has(gid)) await kcAddUserToGroup(params.id, gid);
    // remove extraneous
    for (const gid of currentIds) if (!desired.has(gid)) await kcRemoveUserFromGroup(params.id, gid);
  }
  if (password) {
    await kcSetUserPassword(params.id, password, false);
  }
  return NextResponse.json({ ok: true });
}
