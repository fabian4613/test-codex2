"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/components/DashboardContext";

type Item = { key: string; updated_at: string };

export default function AdminPage() {
  const { setPersistKey } = useDashboard();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [tab, setTab] = useState<"scopes" | "identity">("scopes");

  // identity state
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", groups: [] as string[] });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/keys", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "No autorizado" : "Error cargando");
      setItems(await res.json());
    } catch (e: any) {
      setError(e?.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  // identity tab refresh handled after defining refreshIdentity

  const refreshIdentity = useCallback(async () => {
    try {
      const g = await fetch("/api/admin/identity/groups", { cache: "no-store" });
      if (g.ok) setGroups(await g.json());
      const u = await fetch(`/api/admin/identity/users?search=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      if (u.ok) {
        const data = await u.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch {}
  }, [q, page, pageSize]);

  useEffect(() => { if (tab === "identity") refreshIdentity(); }, [tab, refreshIdentity]);

  async function createScope() {
    if (!newKey.trim()) return;
    await fetch("/api/admin/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), content: defaultState() })
    });
    setNewKey("");
    refresh();
  }

  async function removeScope(key: string) {
    if (!confirm(`Eliminar '${key}'?`)) return;
    await fetch(`/api/admin/state?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="container" style={{ paddingTop: 16 }}>
      <h1>Administración</h1>
      <nav className="toolbar" aria-label="Pestañas de administración" style={{ marginTop: 12, borderRadius: 12, gap: 6 }}>
        <button className={`secondary-btn ${tab === "scopes" ? "btn-on" : ""}`} onClick={() => setTab("scopes")}>Ámbitos</button>
        <button className={`secondary-btn ${tab === "identity" ? "btn-on" : ""}`} onClick={() => setTab("identity")}>Identidad</button>
      </nav>

      {tab === "scopes" && (
        <>
          <div className="toolbar" style={{ marginTop: 12, borderRadius: 12, gap: 8 }}>
            <input className="search" placeholder="Nuevo ámbito, p.ej. group:devops" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <button type="button" className="primary-btn" onClick={createScope}>Crear</button>
          </div>
          {loading && <p>Cargando…</p>}
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}
          <div className="list-view" style={{ marginTop: 12 }}>
            <div className="list-header" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
              <div>Key</div>
              <div>Actualizado</div>
              <div>Acciones</div>
            </div>
            {(items || []).map(it => (
              <div key={it.key} className="list-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                <div>{it.key}</div>
                <div>{it.updated_at}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="secondary-btn" onClick={() => setPersistKey(it.key)}>Usar</button>
                  <button type="button" aria-label={`Exportar ${it.key}`} className="icon-btn" title="Exportar" onClick={async () => {
                    const res = await fetch(`/api/state?key=${encodeURIComponent(it.key)}`, { cache: "no-store" });
                    const data = await res.json();
                    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
                    const a = document.createElement("a"); a.href = url; a.download = `${it.key}.json`; a.click(); URL.revokeObjectURL(url);
                  }}>⤓</button>
                  <button className="icon-btn" title="Eliminar" onClick={() => removeScope(it.key)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "identity" && (
        <>
          <div className="toolbar" style={{ marginTop: 12, borderRadius: 12, gap: 10 }}>
            <div className="control" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="new-group">Nuevo grupo</label>
              <input id="new-group" className="search" placeholder="devops" style={{ maxWidth: 220 }} value={newGroup} onChange={e => setNewGroup(e.target.value)} />
              <button className="primary-btn" onClick={async () => { if (!newGroup.trim()) return; await fetch("/api/admin/identity/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newGroup.trim() }) }); setNewGroup(""); refreshIdentity(); }}>Crear</button>
            </div>
            <div className="control" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="search-users">Buscar usuarios</label>
              <input id="search-users" className="search" placeholder="texto" style={{ maxWidth: 220 }} value={q} onChange={e => setQ(e.target.value)} />
              <button className="secondary-btn" onClick={() => { setPage(0); refreshIdentity(); }}>Buscar</button>
            </div>
            <div className="control" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Página
              <button className="secondary-btn" onClick={() => { const p = Math.max(0, page - 1); setPage(p); setTimeout(refreshIdentity, 0); }}>◀</button>
              <span aria-atomic="true" aria-live="polite">{page + 1}</span>
              <button className="secondary-btn" onClick={() => { const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1); const p = Math.min(maxPage, page + 1); setPage(p); setTimeout(refreshIdentity, 0); }}>▶</button>
              <span style={{ color: "var(--muted)" }}>{total} usuarios</span>
            </div>
          </div>

          <div className="list-view" style={{ marginTop: 12 }}>
            <div className="list-header" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>Grupos</div>
              <div>Usuarios</div>
              <div>Provisionar</div>
            </div>
            <div className="list-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>
                {groups.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label htmlFor={`group-name-${g.id}`} className="sr-only">Nombre del grupo</label>
                    <input id={`group-name-${g.id}`} aria-label="Nombre del grupo" defaultValue={g.name} onBlur={async (e) => { const name = e.currentTarget.value.trim(); if (name && name !== g.name) { await fetch(`/api/admin/identity/groups/${g.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }); refreshIdentity(); } }} className="tile-icon-input" />
                    <button type="button" className="icon-btn" aria-label={`Eliminar grupo ${g.name}`} title="Eliminar" onClick={async () => {
                      if (!confirm(`Eliminar grupo ${g.name}?`)) return;
                      const tgt = prompt("Mover usuarios a (nombre de grupo existente):", groups.find(x => x.name !== g.name)?.name || "");
                      const qp = tgt ? `?target=${encodeURIComponent(tgt)}` : "";
                      await fetch(`/api/admin/identity/groups/${g.id}${qp}`, { method: "DELETE" });
                      refreshIdentity();
                    }}>🗑️</button>
                  </div>
                ))}
              </div>
              <div>
                {(users || []).map((u: any) => (
                  <UserRow key={u.id} u={u} allGroups={groups} onChange={refreshIdentity} />
                ))}
              </div>
              <div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label className="field-label" htmlFor="new-user-username">Usuario</label>
                  <input id="new-user-username" className="tile-icon-input" placeholder="username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label className="field-label" htmlFor="new-user-email">Email (opcional)</label>
                  <input id="new-user-email" className="tile-icon-input" placeholder="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <div className="field-label">Contraseña</div>
                  <input id="new-user-password" className="tile-icon-input" type="password" placeholder="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <div className="field-label">Grupos</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {groups.map(g => {
                      const on = userForm.groups.includes(g.name);
                      return (
                  <button aria-pressed={on} key={g.id} type="button" className={`btn ${on ? "btn-on" : "btn-off"}`} onClick={() => {
                          setUserForm(f => ({ ...f, groups: on ? f.groups.filter(x => x !== g.name) : [...f.groups, g.name] }));
                        }}>{g.name}</button>
                      );
                    })}
                  </div>
                </div>
                <button type="button" className="primary-btn" onClick={async () => {
                  if (!userForm.username || !userForm.password) return;
                  await fetch("/api/admin/identity/users", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(userForm)
                  });
                  setUserForm({ username: "", email: "", password: "", groups: [] });
                  refreshIdentity();
                }}>Crear usuario</button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function defaultState() {
  return {
    title: "Nuevo Panel",
    theme: "system",
    columns: 4,
    tileStyle: "cozy",
    search: "",
    editMode: false,
    viewMode: "grouped",
    groups: []
  };
}

function PasswordReset({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [pwd, setPwd] = useState("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input className="tile-icon-input" type="password" placeholder="Nueva contraseña" value={pwd} onChange={e => setPwd(e.target.value)} />
      <button type="button" className="secondary-btn" onClick={async () => { if (!pwd) return; await fetch(`/api/admin/identity/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pwd }) }); setPwd(""); onDone(); }}>Aplicar</button>
    </div>
  );
}

function UserRow({ u, allGroups, onChange }: { u: any; allGroups: { id: string; name: string }[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/identity/users/${u.id}/groups`, { cache: "no-store" });
        if (res.ok) {
          const arr = await res.json();
          setUserGroups((arr || []).map((g: any) => g.name));
        }
      } catch {}
    })();
  }, [open, u.id]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{u.username} {u.email ? `· ${u.email}` : ""}</div>
      <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="icon-btn" title="Editar" style={{ listStyle: "none" }}>✎</summary>
        <div style={{ background: "var(--panel-raise)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: 8, marginTop: 6 }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <div className="field-label">Grupos</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allGroups.map(g => {
                const on = userGroups.includes(g.name);
                return (
                  <button key={g.id} type="button" className={`btn ${on ? "btn-on" : "btn-off"}`} onClick={async () => {
                    const names = new Set(userGroups);
                    if (on) names.delete(g.name); else names.add(g.name);
                    setUserGroups(Array.from(names));
                    await fetch(`/api/admin/identity/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ groups: Array.from(names) }) });
                    onChange();
                  }}>{g.name}</button>
                );
              })}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <div className="field-label">Reset password</div>
            <PasswordReset userId={u.id} onDone={onChange} />
          </div>
        </div>
      </details>
      <button className="icon-btn" title="Eliminar" onClick={async () => { if (!confirm(`Eliminar usuario ${u.username}?`)) return; await fetch(`/api/admin/identity/users/${u.id}`, { method: "DELETE" }); onChange(); }}>🗑️</button>
    </div>
  );
}
