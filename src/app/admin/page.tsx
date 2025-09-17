"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/components/DashboardContext";
import { motion, AnimatePresence } from "framer-motion";
import type { Me } from "@/lib/auth";
import { useDialog } from "@/components/Dialog";
import { useToast } from "@/components/Toast";

type Item = { key: string; updated_at: string };

type OwnerInfo = {
  badge: string;
  badgeClass: string;
  label: string;
  meta?: string;
  extraBadge?: string;
};

export default function AdminPage() {
  const { setPersistKey } = useDashboard();
  const { confirm: askConfirm, prompt: askPrompt } = useDialog();
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [tab, setTab] = useState<"scopes" | "identity">("scopes");
  const [helpOpen, setHelpOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [currentScope, setCurrentScope] = useState<string>("");

  // identity state
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", groups: [] as string[] });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const dateFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
  }, []);

  const formatUpdatedAt = useCallback((value: string) => {
    if (!value) return "—";
    try {
      return dateFormatter.format(new Date(value));
    } catch {
      return value;
    }
  }, [dateFormatter]);

  const resolveOwner = useCallback((key: string): OwnerInfo => {
    if (!key) return { badge: "Perfil", badgeClass: "badge-default", label: "—" };
    if (key.startsWith("user:")) {
      const id = key.slice(5);
      const human = labels[key];
      const isSelf = !!(me?.sub && id === me.sub);
      const label = isSelf ? (me?.name || me?.email || "Tu perfil") : (human || `ID ${id}`);
      const meta = (!isSelf && human) ? `ID ${id}` : (isSelf ? `ID ${id}` : undefined);
      return {
        badge: "Usuario",
        badgeClass: "badge-user",
        label,
        meta,
        extraBadge: isSelf ? "Tú" : undefined
      };
    }
    if (key.startsWith("group:")) {
      const id = key.slice(6);
      const human = labels[key];
      const label = human || id;
      const meta = human ? `ID ${id}` : undefined;
      return {
        badge: "Grupo",
        badgeClass: "badge-group",
        label,
        meta
      };
    }
    if (key === "default") {
      return { badge: "General", badgeClass: "badge-default", label: "Sin sesión" };
    }
    if (key.includes(":")) {
      const [prefix, rest] = key.split(":", 2);
      return {
        badge: prefix ? prefix.toUpperCase() : "Perfil",
        badgeClass: "badge-shared",
        label: rest || key
      };
    }
    return { badge: "Perfil", badgeClass: "badge-shared", label: key };
  }, [labels, me?.email, me?.name, me?.sub]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/keys", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "No autorizado" : "Error cargando");
      const list: Item[] = await res.json();
      setItems(list);
      const keys = list.map(it => it.key).filter(k => k && (k.startsWith('user:') || k.startsWith('group:')));
      const results = await Promise.all(keys.map(async k => {
        try {
          const r = await fetch(`/api/profile/label?key=${encodeURIComponent(k)}`, { cache: 'no-store' });
          if (!r.ok) return [k, undefined] as const;
          const { label } = await r.json();
          return [k, label as string | undefined] as const;
        } catch { return [k, undefined] as const; }
      }));
      const map: Record<string, string> = {};
      results.forEach(([k, v]) => { if (v) map[k] = v; });
      setLabels(map);
    } catch (e: any) {
      setError(e?.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) setMe(await r.json());
      } catch {}
      try {
        const stored = (typeof window !== "undefined") ? window.localStorage.getItem("persist_scope") : null;
        setCurrentScope(stored || "default");
      } catch {}
      // Open quick help on first visit
      try {
        if (typeof window !== "undefined") {
          const seen = window.localStorage.getItem("admin_help_seen");
          if (!seen) setHelpOpen(true);
        }
      } catch {}
    })();
  }, []);
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
    const owner = resolveOwner(key);
    const human = owner.extraBadge === "Tú"
      ? "tu perfil personal"
      : owner.badge === "General"
        ? "el perfil general"
        : `${owner.badge.toLowerCase()} ${owner.label}`;
    const ok = await askConfirm({ title: 'Eliminar', message: `¿Eliminar ${human}?` });
    if (!ok) return;
    await fetch(`/api/admin/state?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    showToast('Perfil eliminado', 'success');
    refresh();
  }

  return (
    <main className="container admin-container">
      <header className="admin-header">
        <div>
          <h1>Administración</h1>
          <p className="admin-subtitle">Gestiona perfiles compartidos y la identidad de tu organización.</p>
        </div>
        <div className="admin-header-actions">
          <Link href="/" className="secondary-btn admin-home-btn">← Volver al panel</Link>
          <button
            type="button"
            className="secondary-btn admin-help-btn"
            onClick={() => {
              setHelpOpen(v => {
                const next = !v;
                try {
                  if (!next && typeof window !== "undefined") window.localStorage.setItem("admin_help_seen", "1");
                } catch {}
                return next;
              });
            }}
            aria-expanded={helpOpen}
            aria-controls="admin-help"
            title={helpOpen ? "Ocultar guía" : "Ver guía rápida"}
          >
            {helpOpen ? "Ocultar ayuda" : "Guía rápida"}
          </button>
        </div>
      </header>

      <div className="admin-infobar">
        <div className="admin-userline">
          <span className="field-label">Administrador</span>
          <span className="admin-user">{me?.name || me?.email || me?.sub || "—"}</span>
          {!!(me?.groups && me.groups.length) && (
            <span className="admin-groups">Grupos: {me.groups.join(", ")}</span>
          )}
        </div>
        {!!currentScope && (
          <span className="badge badge-default" title="Perfil activo en este navegador">{currentScope}</span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {helpOpen && (
          <motion.div
            id="admin-help"
            className="help-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <div className="admin-help-title">Guía rápida</div>
            <ul className="admin-help-list">
              <li><strong>Perfiles</strong> · versiones del tablero. Crea <code>user:&lt;id&gt;</code> o <code>group:&lt;nombre&gt;</code> para compartir.</li>
              <li><strong>Aplicar</strong> · usa “Usar” para trabajar dentro de ese perfil.</li>
              <li><strong>Identidad</strong> · gestiona grupos y usuarios si tienes permisos.</li>
              <li><strong>¿Problemas?</strong> · visita <code>/api/me</code> y verifica que pertenezcas al grupo admin.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="admin-tabs" aria-label="Pestañas de administración">
        <button className={`admin-tab ${tab === "scopes" ? "is-active" : ""}`} onClick={() => setTab("scopes")}>Perfiles</button>
        <button className={`admin-tab ${tab === "identity" ? "is-active" : ""}`} onClick={() => setTab("identity")}>Identidad</button>
      </nav>

      {tab === "scopes" && (
        <section className="admin-card" aria-labelledby="scopes-heading">
          <header className="admin-card-header">
            <div>
              <h2 id="scopes-heading">Perfiles guardados</h2>
              <p className="admin-card-subtitle">Crea espacios compartidos y controla quién ve cada versión del dashboard.</p>
            </div>
            <div className="admin-card-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={refresh}
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
          </header>

          <div className="toolbar admin-toolbar">
            <input
              className="search"
              placeholder="Nuevo perfil, p.ej. group:devops"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
            <button type="button" className="primary-btn" onClick={createScope} disabled={!newKey.trim()}>Crear</button>
          </div>

          {loading && <p className="admin-note">Cargando…</p>}
          {error && <p className="admin-error">{error}</p>}
          {!loading && !error && (items?.length === 0) && (
            <div className="admin-empty">
              <h3>Sin perfiles guardados</h3>
              <p>Crea uno con tu usuario o con un grupo para comenzar a compartir.</p>
            </div>
          )}

          <div className="list-view admin-scope-list">
            <div className="list-header">
              <div>Key</div>
              <div>Propietario</div>
              <div>Actualizado</div>
              <div>Acciones</div>
            </div>
            <AnimatePresence initial={false}>
              {(items || []).map(it => {
                const owner = resolveOwner(it.key);
                const isActive = currentScope === it.key;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    key={it.key}
                    className={`list-row admin-scope-row ${isActive ? "is-active" : ""}`}
                  >
                    <div className="admin-scope-key">
                      <code>{it.key}</code>
                      {isActive && <span className="badge badge-default" title="Perfil activo en este navegador">Activo</span>}
                    </div>
                    <div className="admin-scope-owner">
                      <div className="admin-owner-badges">
                        <span className={`badge ${owner.badgeClass}`}>{owner.badge}</span>
                        {owner.extraBadge && <span className="badge badge-self">{owner.extraBadge}</span>}
                      </div>
                      <span className="admin-owner-name">{owner.label}</span>
                      {owner.meta && <span className="admin-owner-meta">{owner.meta}</span>}
                    </div>
                    <div className="admin-scope-updated">
                      <span title={it.updated_at}>{formatUpdatedAt(it.updated_at)}</span>
                    </div>
                    <div className="admin-scope-actions">
                      <button className="secondary-btn" title="Aplicar este perfil en el dashboard" onClick={() => setPersistKey(it.key)}>Usar</button>
                      <button
                        type="button"
                        aria-label={`Exportar ${it.key}`}
                        className="icon-btn"
                        title="Descargar JSON"
                        onClick={async () => {
                          const res = await fetch(`/api/state?key=${encodeURIComponent(it.key)}`, { cache: "no-store" });
                          const data = await res.json();
                          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
                          const a = document.createElement("a"); a.href = url; a.download = `${it.key}.json`; a.click(); URL.revokeObjectURL(url);
                        }}
                      >⤓</button>
                      <button className="icon-btn" title="Eliminar" onClick={() => removeScope(it.key)}>🗑️</button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {tab === "identity" && (
        <section className="admin-card admin-card--identity" aria-labelledby="identity-heading">
          <header className="admin-card-header">
            <div>
              <h2 id="identity-heading">Gestión de identidad</h2>
              <p className="admin-card-subtitle">Administra grupos y usuarios sincronizados con Keycloak.</p>
            </div>
          </header>

          <div className="toolbar admin-toolbar admin-identity-toolbar">
            <div className="control admin-toolbar-control">
              <label htmlFor="new-group">Nuevo grupo</label>
              <input
                id="new-group"
                className="search admin-compact-input"
                placeholder="devops"
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
              />
              <button
                className="primary-btn"
                onClick={async () => {
                  if (!newGroup.trim()) return;
                  await fetch("/api/admin/identity/groups", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name: newGroup.trim() })
                  });
                  setNewGroup("");
                  refreshIdentity();
                }}
              >
                Crear
              </button>
            </div>

            <div className="control admin-toolbar-control">
              <label htmlFor="search-users">Buscar usuarios</label>
              <input
                id="search-users"
                className="search admin-compact-input"
                placeholder="texto"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <button className="secondary-btn" onClick={() => { setPage(0); refreshIdentity(); }}>Buscar</button>
            </div>

            <div className="control admin-toolbar-control admin-pagination">
              <span>Página</span>
              <button className="secondary-btn" onClick={() => { const p = Math.max(0, page - 1); setPage(p); setTimeout(refreshIdentity, 0); }}>◀</button>
              <span aria-atomic="true" aria-live="polite">{page + 1}</span>
              <button className="secondary-btn" onClick={() => { const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1); const p = Math.min(maxPage, page + 1); setPage(p); setTimeout(refreshIdentity, 0); }}>▶</button>
              <span className="admin-note">{total} usuarios</span>
            </div>
          </div>

          <div className="admin-identity-grid">
            <div className="admin-identity-card">
              <h3 className="admin-section-title">Grupos</h3>
              <p className="admin-caption">Los grupos se sincronizan desde Keycloak. Cualquier cambio profundo debe gestionarse allí.</p>
              {groups.length === 0 ? (
                <p className="admin-note">No hay grupos aún. Crea uno con “Nuevo grupo”.</p>
              ) : (
                <div className="admin-groups-list">
                  <AnimatePresence initial={false}>
                    {groups.map(g => (
                      <motion.div
                        key={g.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="admin-group-row"
                      >
                        <label htmlFor={`group-name-${g.id}`} className="sr-only">Nombre del grupo</label>
                        <input
                          id={`group-name-${g.id}`}
                          aria-label="Nombre del grupo"
                          defaultValue={g.name}
                          onBlur={async (e) => {
                            const name = e.currentTarget.value.trim();
                            if (name && name !== g.name) {
                              await fetch(`/api/admin/identity/groups/${g.id}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ name })
                              });
                              refreshIdentity();
                            }
                          }}
                          className="tile-icon-input"
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Eliminar grupo ${g.name}`}
                          title="Eliminar"
                          onClick={async () => {
                            const ok = await askConfirm({ title: 'Eliminar grupo', message: `Eliminar grupo ${g.name}?` });
                            if (!ok) return;
                            const tgt = await askPrompt({ title: 'Mover usuarios', message: 'Mover usuarios a (nombre de grupo existente):', defaultValue: groups.find(x => x.name !== g.name)?.name || '' });
                            const qp = tgt ? `?target=${encodeURIComponent(tgt)}` : "";
                            await fetch(`/api/admin/identity/groups/${g.id}${qp}`, { method: "DELETE" });
                            refreshIdentity();
                          }}
                        >🗑️</button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="admin-identity-card">
              <h3 className="admin-section-title">Usuarios</h3>
              <AnimatePresence initial={false}>
                {users.length === 0 ? (
                  <motion.p key="users-empty" layout className="admin-note">No se encontraron usuarios para la búsqueda.</motion.p>
                ) : (
                  (users || []).map((u: any) => (
                    <motion.div key={u.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="admin-user-wrapper">
                      <UserRow u={u} allGroups={groups} onChange={refreshIdentity} />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="admin-identity-card admin-identity-card--form">
              <h3 className="admin-section-title">Provisionar usuario</h3>
              <div className="field">
                <label className="field-label" htmlFor="new-user-username">Usuario</label>
                <input id="new-user-username" className="tile-icon-input" placeholder="username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="new-user-email">Email (opcional)</label>
                <input id="new-user-email" className="tile-icon-input" placeholder="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="new-user-password">Contraseña</label>
                <input id="new-user-password" className="tile-icon-input" type="password" placeholder="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div className="field">
                <div className="field-label">Grupos</div>
                <div className="admin-chip-group">
                  {groups.map(g => {
                    const on = userForm.groups.includes(g.name);
                    return (
                      <button
                        aria-pressed={on}
                        key={g.id}
                        type="button"
                        className={`btn ${on ? "btn-on" : "btn-off"}`}
                        onClick={() => {
                          setUserForm(f => ({ ...f, groups: on ? f.groups.filter(x => x !== g.name) : [...f.groups, g.name] }));
                        }}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  if (!userForm.username || !userForm.password) return;
                  await fetch("/api/admin/identity/users", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(userForm)
                  });
                  setUserForm({ username: "", email: "", password: "", groups: [] });
                  refreshIdentity();
                }}
              >
                Crear usuario
              </button>
            </div>
          </div>
        </section>
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
    <div className="admin-reset-row">
      <input className="tile-icon-input" type="password" placeholder="Nueva contraseña" value={pwd} onChange={e => setPwd(e.target.value)} />
      <button type="button" className="secondary-btn" onClick={async () => { if (!pwd) return; await fetch(`/api/admin/identity/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pwd }) }); setPwd(""); onDone(); }}>Aplicar</button>
    </div>
  );
}

function UserRow({ u, allGroups, onChange }: { u: any; allGroups: { id: string; name: string }[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const { confirm: askConfirm } = useDialog();
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
    <div className="admin-user-row">
      <div className="admin-user-main">
        <span className="admin-user-name">{u.username}</span>
        {u.email && <span className="admin-user-email">{u.email}</span>}
      </div>
      <details className="admin-user-details" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="icon-btn admin-user-edit" title="Editar">
          <span aria-hidden="true">✎</span>
        </summary>
        <div className="admin-user-edit-panel">
          <div className="field">
            <div className="field-label">Grupos</div>
            <div className="admin-chip-group">
              {allGroups.map(g => {
                const on = userGroups.includes(g.name);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`btn ${on ? "btn-on" : "btn-off"}`}
                    onClick={async () => {
                      const names = new Set(userGroups);
                      if (on) names.delete(g.name); else names.add(g.name);
                      const next = Array.from(names);
                      setUserGroups(next);
                      await fetch(`/api/admin/identity/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ groups: next }) });
                      onChange();
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field">
            <div className="field-label">Reset password</div>
            <PasswordReset userId={u.id} onDone={onChange} />
          </div>
        </div>
      </details>
      <button className="icon-btn" title="Eliminar" onClick={async () => { const ok = await askConfirm({ title: 'Eliminar usuario', message: `Eliminar usuario ${u.username}?` }); if (!ok) return; await fetch(`/api/admin/identity/users/${u.id}`, { method: "DELETE" }); onChange(); }}>🗑️</button>
    </div>
  );
}
