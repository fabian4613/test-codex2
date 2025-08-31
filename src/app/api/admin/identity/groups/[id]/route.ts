import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { kcRenameGroup, kcDeleteGroup, kcGroupMembers, kcAddUserToGroup, kcListGroups, kcRemoveUserFromGroup } from "@/lib/server/keycloak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  await kcRenameGroup(params.id, name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = (session as any)?.groups as string[] | undefined;
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target") || ""; // accept target name or id
  // move users if target provided
  if (target) {
    const all = await kcListGroups();
    const targetId = all.find(g => g.id === target || g.name === target)?.id;
    if (!targetId) return NextResponse.json({ error: "target group not found" }, { status: 400 });
    // paginate members to avoid large lists
    let first = 0; const max = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const members = await kcGroupMembers(params.id, first, max);
      if (!members.length) break;
      for (const u of members) {
        await kcAddUserToGroup(u.id, targetId);
        await kcRemoveUserFromGroup(u.id, params.id);
      }
      first += members.length;
      if (members.length < max) break;
    }
  }
  await kcDeleteGroup(params.id);
  return NextResponse.json({ ok: true });
}
