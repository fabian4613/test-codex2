import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { kcUserGroups } from "@/lib/server/keycloak";

export async function getUserGroups(req: NextRequest): Promise<string[]> {
  const session = await getServerSession(authOptions);
  const sub = (session as any)?.sub as string | undefined;
  let groups = ((session as any)?.groups as string[] | undefined) || [];
  if ((!groups || groups.length === 0) && process.env.KEYCLOAK_ISSUER) {
    try {
      const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const access = (jwt as any)?.accessToken as string | undefined;
      if (access) {
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
        if (r.ok) {
          const ui = await r.json();
          if (Array.isArray(ui.groups)) groups = ui.groups;
        }
      }
    } catch {}
  }
  // Final fallback: query admin API for user's groups by subject id
  if ((!groups || groups.length === 0) && sub) {
    try {
      const g = await kcUserGroups(sub);
      groups = g.map(x => `/${x.name}`);
    } catch {}
  }
  return groups || [];
}
