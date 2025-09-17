import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { listKeys } from "@/lib/server/persist";
import { getUserGroups } from "@/lib/server/auth-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json([], { status: 200 });
  const session = await getServerSession(authOptions);
  const groups = await getUserGroups(req);
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const keys = await listKeys();
  return NextResponse.json(keys, { headers: { "Cache-Control": "no-store" } });
}
