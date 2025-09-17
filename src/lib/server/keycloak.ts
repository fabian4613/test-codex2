// Keycloak Admin REST helpers
// Uses admin user credentials to obtain a token and call admin endpoints

type Token = { access_token: string; expires_in: number };

function parseIssuer() {
  const issuer = process.env.KEYCLOAK_ISSUER || ""; // e.g., http://keycloak:8080/realms/myrealm
  const m = issuer.match(/^(https?:\/\/[^/]+)\/realms\/([^/]+)/i);
  if (!m) throw new Error("KEYCLOAK_ISSUER inválido");
  return { base: m[1], realm: m[2] };
}

let cached: { token: string; exp: number } | null = null;

async function getAdminToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 30 > now) return cached.token;
  const { base } = parseIssuer();
  const username = process.env.KEYCLOAK_ADMIN_USER || process.env.KEYCLOAK_ADMIN || "admin";
  const password = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";
  const url = `${base}/realms/master/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username,
    password
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(`Keycloak token error: ${res.status}`);
  const json = (await res.json()) as Token;
  cached = { token: json.access_token, exp: Math.floor(Date.now() / 1000) + (json.expires_in || 60) };
  return cached.token;
}

async function kc<T = any>(method: string, path: string, data?: any): Promise<T> {
  const { base } = parseIssuer();
  const token = await getAdminToken();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data ? { "content-type": "application/json" } : {})
    },
    body: data ? JSON.stringify(data) : undefined
  });
  if (res.status === 204) return undefined as any;
  if (!res.ok) throw new Error(`Keycloak error ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  // For create endpoints, id can be in Location header
  return undefined as any;
}

export async function kcListGroups(): Promise<Array<{ id: string; name: string }>> {
  const { realm } = parseIssuer();
  return kc("GET", `/admin/realms/${realm}/groups`);
}

export async function kcCreateGroup(name: string): Promise<string | undefined> {
  const { realm } = parseIssuer();
  const { base } = parseIssuer();
  const token = await getAdminToken();
  const res = await fetch(`${base}/admin/realms/${realm}/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`Keycloak create group ${res.status}`);
  const loc = res.headers.get("location") || "";
  const m = loc.match(/\/groups\/([^/]+)$/);
  return m ? m[1] : undefined;
}

export async function kcRenameGroup(id: string, name: string): Promise<void> {
  const { realm } = parseIssuer();
  await kc("PUT", `/admin/realms/${realm}/groups/${id}`, { name });
}

export async function kcDeleteGroup(id: string): Promise<void> {
  const { realm } = parseIssuer();
  await kc("DELETE", `/admin/realms/${realm}/groups/${id}`);
}

export type KCUser = { id: string; username: string; email?: string; enabled: boolean };

export async function kcListUsers(search?: string, first?: number, max?: number): Promise<KCUser[]> {
  const { realm } = parseIssuer();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (typeof first === "number") params.set("first", String(first));
  if (typeof max === "number") params.set("max", String(max));
  const qs = params.toString();
  const q = qs ? `?${qs}` : "";
  return kc("GET", `/admin/realms/${realm}/users${q}`);
}

export async function kcCreateUser(params: { username: string; email?: string; password?: string; groups?: string[] }): Promise<string> {
  const { username, email, password, groups } = params;
  const { realm } = parseIssuer();
  const { base } = parseIssuer();
  const token = await getAdminToken();
  let res = await fetch(`${base}/admin/realms/${realm}/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ username, email, enabled: true })
  });
  if (!res.ok) throw new Error(`Keycloak create user ${res.status}`);
  const loc = res.headers.get("location") || "";
  const m = loc.match(/\/users\/([^/]+)$/);
  const id = m ? m[1] : "";
  if (!id) throw new Error("No se pudo obtener ID de usuario");
  if (password) {
    await fetch(`${base}/admin/realms/${realm}/users/${id}/reset-password`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ type: "password", value: password, temporary: false })
    });
  }
  if (groups && groups.length) {
    for (const gid of groups) {
      await fetch(`${base}/admin/realms/${realm}/users/${id}/groups/${gid}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }
  return id;
}

export async function kcDeleteUser(id: string): Promise<void> {
  const { realm } = parseIssuer();
  await kc("DELETE", `/admin/realms/${realm}/users/${id}`);
}

export async function kcSetUserPassword(id: string, password: string, temporary = false): Promise<void> {
  const { realm } = parseIssuer();
  const { base } = parseIssuer();
  const token = await getAdminToken();
  await fetch(`${base}/admin/realms/${realm}/users/${id}/reset-password`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ type: "password", value: password, temporary })
  });
}

export async function kcUserGroups(id: string): Promise<Array<{ id: string; name: string }>> {
  const { realm } = parseIssuer();
  return kc("GET", `/admin/realms/${realm}/users/${id}/groups`);
}

export async function kcAddUserToGroup(id: string, groupId: string): Promise<void> {
  const { realm } = parseIssuer();
  await kc("PUT", `/admin/realms/${realm}/users/${id}/groups/${groupId}`);
}

export async function kcRemoveUserFromGroup(id: string, groupId: string): Promise<void> {
  const { realm } = parseIssuer();
  await kc("DELETE", `/admin/realms/${realm}/users/${id}/groups/${groupId}`);
}

export async function kcUsersCount(search?: string): Promise<number> {
  const { realm } = parseIssuer();
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await kc<{ count: number }>("GET", `/admin/realms/${realm}/users/count${q}`);
  // Keycloak returns a number directly in some versions
  if (typeof (data as any) === "number") return data as any;
  return (data as any)?.count ?? 0;
}

export async function kcGroupMembers(groupId: string, first?: number, max?: number): Promise<KCUser[]> {
  const { realm } = parseIssuer();
  const params = new URLSearchParams();
  if (typeof first === "number") params.set("first", String(first));
  if (typeof max === "number") params.set("max", String(max));
  const q = params.toString() ? `?${params.toString()}` : "";
  return kc("GET", `/admin/realms/${realm}/groups/${groupId}/members${q}`);
}

export async function kcGetUser(id: string): Promise<any> {
  const { realm } = parseIssuer();
  return kc("GET", `/admin/realms/${realm}/users/${id}`);
}
