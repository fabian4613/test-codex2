import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, authEnabled, isAdminGroup } from "@/lib/auth";
import { listKeys, getState, putState } from "@/lib/server/persist";
import { deepFixMojibake } from "@/lib/encoding";
import { getUserGroups } from "@/lib/server/auth-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json({ error: "Auth disabled" }, { status: 501 });
  const session = await getServerSession(authOptions);
  const groups = await getUserGroups(req);
  if (!session || !isAdminGroup(groups)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const keys = await listKeys();
  let scanned = 0; let updated = 0;
  for (const { key } of keys) {
    scanned++;
    const value = await getState(key);
    if (value && typeof value === "object") {
      const fixed = deepFixMojibake(value);
      if (JSON.stringify(fixed) !== JSON.stringify(value)) {
        await putState(key, fixed);
        updated++;
      }
    }
  }
  return NextResponse.json({ scanned, updated });
}
