"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/components/DashboardContext";
import { downloadJSON } from "@/lib/storage";
import { Select, SelectItem } from "@/components/Select";
import { signIn, signOut } from "next-auth/react";
import { useToast } from "@/components/Toast";
import { useDialog } from "@/components/Dialog";
import type { Me } from "@/lib/auth";
import { isAdminGroup } from "@/lib/auth-util";

export function Toolbar() {
  const { state, setTheme, setColumns, setTileStyle, setSearch, setEditMode, setViewMode, importState, setPersistKey } = useDashboard();
  const filters = state.filters || {};
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [scope, setScope] = useState<string>("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [newProfile, setNewProfile] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const shareAnchorRef = useRef<HTMLButtonElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);
  const actionsAnchorRef = useRef<HTMLButtonElement>(null);
  const actionsPanelRef = useRef<HTMLDivElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMe(data);
          const stored = localStorage.getItem("persist_scope");
          const defaultKey = data?.sub ? `user:${data.sub}` : "default";
          const key = stored || defaultKey;
          setScope(key);
          setPersistKey(key);
        }
      } catch {}
      try {
        const raw = localStorage.getItem("persist_profiles_recent");
        setRecent(raw ? (JSON.parse(raw) as string[]) : []);
        const labelsRaw = localStorage.getItem("persist_profile_labels");
        if (labelsRaw) setLabels(JSON.parse(labelsRaw));
      } catch {}
    })();
  }, [setPersistKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("persist_profiles_recent");
      setRecent(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {}
  }, [scope]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setCanNativeShare(typeof (navigator as any).share === "function");
    }
  }, []);

  // Resolve human labels for foreign user:* profiles via API
  useEffect(() => {
    (async () => {
      try {
        const raw = (typeof window !== 'undefined') ? window.localStorage.getItem('persist_profiles_recent') : null;
        const arr: string[] = raw ? JSON.parse(raw) : [];
        const keys = new Set<string>([scope, ...arr]);
        const userKeyForMe = me?.sub ? `user:${me.sub}` : null;
        const toResolve = Array.from(keys).filter(k => k?.startsWith('user:') && k !== userKeyForMe && !labels[k]);
        if (toResolve.length === 0) return;
        const results = await Promise.all(toResolve.map(async k => {
          try {
            const r = await fetch(`/api/profile/label?key=${encodeURIComponent(k)}`, { cache: 'no-store' });
            if (!r.ok) return [k, undefined] as const;
            const { label } = await r.json();
            return [k, label as string | undefined] as const;
          } catch { return [k, undefined] as const; }
        }));
        const map: Record<string, string> = { ...labels };
        results.forEach(([k, v]) => { if (v) map[k] = v; });
        setLabels(map);
        try { localStorage.setItem('persist_profile_labels', JSON.stringify(map)); } catch {}
      } catch {}
    })();
  }, [me, scope, labels]);

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    const push = (v: string, l: string) => { if (!seen.has(v)) { opts.push({ value: v, label: l }); seen.add(v); } };

    // Personal del usuario actual
    if (me?.sub) push(`user:${me.sub}`, 'Personal');

    // Grupos normalizados (sin prefijo "/")
    (me?.groups || []).forEach(g => {
      const name = typeof g === 'string' ? g.replace(/^\//, '') : String(g);
      push(`group:${name}`, `Grupo: ${name}`);
    });

    // Perfiles recientes: evitar duplicados y descartar user:* de otros usuarios
    try {
      const raw = (typeof window !== 'undefined') ? window.localStorage.getItem('persist_profiles_recent') : null;
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const currentUserKey = me?.sub ? `user:${me.sub}` : null;
      arr.forEach(k => {
        if (!k) return;
        // Do not show other users' personal keys as 'Personal'
        if (k.startsWith('user:') && k !== currentUserKey) {
          const friendly = labels[k] ? `Usuario: ${labels[k]}` : `Usuario: ${k.slice(5, 13)}`;
          push(k, friendly);
          return;
        }
        let label = k;
        if (k.startsWith('group:')) label = `Grupo: ${k.slice(6)}`;
        else if (k.startsWith('user:')) label = 'Personal';
        push(k, label);
      });
    } catch {}

    if (opts.length === 0) push('default', 'Sin sesión');
    if (scope && !seen.has(scope)) opts.unshift({ value: scope, label: scope });
    return opts;
  }, [me, scope, labels]);
  const isAdmin = admin;

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      if (scope) url.searchParams.set('profile', scope);
      return url.toString();
    } catch {
      return '';
    }
  }, [scope]);

  const shareSummary = useMemo(() => {
    if (!scope) return null;
    if (scope.startsWith('user:')) {
      const id = scope.slice(5);
      const human = labels[scope];
      const isSelf = !!(me?.sub && id === me.sub);
      return {
        badge: 'Usuario',
        badgeClass: 'badge-user',
        title: isSelf ? (me?.name || me?.email || 'Tu perfil') : (human || `ID ${id}`),
        subtitle: `ID ${id}`,
        note: isSelf ? 'Tu espacio personal sincronizado.' : undefined,
        disabled: false
      };
    }
    if (scope.startsWith('group:')) {
      const id = scope.slice(6);
      const human = labels[scope];
      return {
        badge: 'Grupo',
        badgeClass: 'badge-group',
        title: human || id,
        subtitle: human ? `ID ${id}` : undefined,
        note: 'Comparte el enlace y añade personas al grupo desde la pestaña Identidad.',
        disabled: false
      };
    }
    if (scope === 'default') {
      return {
        badge: 'General',
        badgeClass: 'badge-default',
        title: 'Perfil sin sesión',
        note: 'Crea un perfil con tu usuario o grupo para compartir cambios con tu equipo.',
        disabled: true
      };
    }
    if (scope.includes(':')) {
      const [prefix, rest] = scope.split(':', 2);
      return {
        badge: prefix ? prefix.toUpperCase() : 'Perfil',
        badgeClass: 'badge-shared',
        title: rest || scope,
        disabled: false
      };
    }
    return {
      badge: 'Perfil',
      badgeClass: 'badge-shared',
      title: scope,
      disabled: false
    };
  }, [scope, labels, me?.email, me?.name, me?.sub]);

  const shareDisabled = !!shareSummary?.disabled;

  useEffect(() => {
    if (!me?.authenticated) { setAdmin(false); return; }
    // First, decide via token groups if present
    const tokenAdmin = isAdminGroup(me.groups);
    setAdmin(tokenAdmin);
    // Fallback probe: if not detected, try calling an admin API; 200 => admin
    if (!tokenAdmin) {
      fetch('/api/admin/keys', { cache: 'no-store' })
        .then(r => { if (r.ok) setAdmin(true); })
        .catch(() => {});
    }
  }, [me]);

  useEffect(() => {
    if (!shareOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sharePanelRef.current?.contains(target) || shareAnchorRef.current?.contains(target)) return;
      setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shareOpen]);

  useEffect(() => {
    if (!actionsOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionsPanelRef.current?.contains(target) || actionsAnchorRef.current?.contains(target)) return;
      setActionsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionsOpen]);

  useEffect(() => {
    setShareOpen(false);
    setCopied(false);
  }, [scope]);

  useEffect(() => {
    if (!shareOpen) setCopied(false);
  }, [shareOpen]);
  useEffect(() => {
    if (!shareOpen) return;
    setActionsOpen(false);
  }, [shareOpen]);

  return (
    <div className="toolbar toolbar-modern">
      <div className="toolbar-grid">
        <div className="toolbar-row toolbar-row-main">
          <input
            type="search"
            className="search"
            placeholder="Buscar..."
            value={state.search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`primary-btn toolbar-edit ${state.editMode ? 'is-active' : ''}`}
            onClick={() => setEditMode(!state.editMode)}
          >
            {state.editMode ? "Salir edición" : "Editar"}
          </button>
        </div>

        <div className="toolbar-row toolbar-row-profile">
          <div className="toolbar-section" role="group" aria-label="Perfil">
            <label className="control">
              <span className="label-text">Perfil</span>
              <Select value={scope} onValueChange={(v) => { setScope(v); setPersistKey(v); }} displayLabel={(() => {
                if (!scope) return '';
                if (me?.sub && scope === `user:${me.sub}`) return 'Personal';
                if (scope.startsWith('group:')) return `Grupo: ${scope.slice(6)}`;
                if (scope.startsWith('user:')) {
                  const name = labels[scope];
                  return name ? `Usuario: ${name}` : `Usuario: ${scope.slice(5, 13)}`;
                }
                return scope;
              })()}>
                {scopeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </Select>
            </label>
            <div className="user-chip" title={me?.email || me?.name || me?.sub || ''} aria-label="Usuario actual">
              <span style={{ opacity: .9 }}>👤</span>
              <span>{me?.name || me?.email || (me?.sub ? me.sub : 'Invitado')}</span>
            </div>
          </div>

          <div className="toolbar-section actions-section" role="group" aria-label="Acciones de perfil">
            <button
              type="button"
              className={`toolbar-action-toggle ${actionsOpen ? 'is-open' : ''}`}
              onClick={() => setActionsOpen(v => !v)}
              ref={actionsAnchorRef}
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              aria-controls="toolbar-actions-menu"
            >
              {actionsOpen ? 'Cerrar' : 'Acciones'}
            </button>
            {actionsOpen && (
              <div id="toolbar-actions-menu" className="toolbar-action-menu" ref={actionsPanelRef} role="menu">
                <button
                  type="button"
                  className="action-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setNewProfile("");
                    setNewProfileOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <span>➕</span> Nuevo perfil
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  role="menuitem"
                  onClick={async () => {
                    try {
                      await fetch(`/api/state?key=${encodeURIComponent(scope)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
                      showToast('Perfil guardado', 'success');
                    } catch {
                      showToast('Error al guardar', 'error');
                    }
                    setActionsOpen(false);
                  }}
                >
                  <span>💾</span> Guardar
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  role="menuitem"
                  disabled={shareDisabled}
                  onClick={() => {
                    setShareOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <span>🔗</span> Compartir
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  role="menuitem"
                  onClick={() => {
                    downloadJSON("dashboard.json", state);
                    showToast('Exportado', 'success');
                    setActionsOpen(false);
                  }}
                >
                  <span>⤓</span> Exportar
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  role="menuitem"
                  onClick={() => {
                    fileRef.current?.click();
                    setActionsOpen(false);
                  }}
                >
                  <span>⤴</span> Importar
                </button>
                <button
                  type="button"
                  className="action-menu-item danger"
                  role="menuitem"
                  disabled={!scope || scope === 'default'}
                  onClick={async () => {
                    if (!scope || scope === 'default') return;
                    const human = (() => {
                      if (me?.sub && scope === `user:${me.sub}`) return 'tu perfil Personal';
                      if (scope.startsWith('group:')) return `perfil de Grupo: ${scope.slice(6)}`;
                      if (scope.startsWith('user:')) return `perfil de Usuario: ${labels[scope] || scope.slice(5,13)}`;
                      return scope;
                    })();
                    const ok = await confirm({ title: 'Eliminar perfil', message: `¿Eliminar ${human}?` });
                    if (!ok) return;
                    try {
                      const res = await fetch(`/api/state?key=${encodeURIComponent(scope)}`, { method: 'DELETE' });
                      if (res.ok) {
                        try {
                          const raw = localStorage.getItem('persist_profiles_recent');
                          const arr: string[] = raw ? JSON.parse(raw) : [];
                          const next = arr.filter(k => k !== scope);
                          localStorage.setItem('persist_profiles_recent', JSON.stringify(next));
                          setRecent(next);
                        } catch {}
                        if (me?.sub) { const v = `user:${me.sub}`; setScope(v); setPersistKey(v); }
                        showToast('Perfil eliminado', 'success');
                      } else {
                        try {
                          const raw = localStorage.getItem('persist_profiles_recent');
                          const arr: string[] = raw ? JSON.parse(raw) : [];
                          const next = arr.filter(k => k !== scope);
                          localStorage.setItem('persist_profiles_recent', JSON.stringify(next));
                          setRecent(next);
                          if (me?.sub) { const v = `user:${me.sub}`; setScope(v); setPersistKey(v); }
                          showToast('Quitado de tus perfiles', 'info');
                        } catch { showToast('No se pudo eliminar', 'error'); }
                      }
                    } catch { showToast('No se pudo eliminar', 'error'); }
                    setActionsOpen(false);
                  }}
                >
                  <span>🗑️</span> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {state.editMode && (
          <div className="toolbar-row toolbar-row-edit" role="group" aria-label="Opciones de edición">
            <label className="control slider-control">
              <span className="label-text">Columnas</span>
              {(() => {
                const pct = ((state.columns - 2) / (6 - 2)) * 100;
                return (
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={state.columns}
                    onChange={(e) => setColumns(parseInt(e.target.value))}
                    style={{ ["--range-pct" as any]: `${pct}%` }}
                  />
                );
              })()}
              <span>{state.columns}</span>
            </label>

            <div className="control select-control" role="group" aria-label="Vista">
              <Select value={state.viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <SelectItem value="grouped">Agrupado</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
              </Select>
            </div>

            <label className="control toggle-control">
              <span className="label-text">Solo favoritos</span>
              <input
                type="checkbox"
                checked={!!filters.favoritesOnly}
                onChange={(e) => {
                  importState({
                    ...state,
                    filters: { ...filters, favoritesOnly: e.target.checked },
                  });
                }}
              />
            </label>
          </div>
        )}
      </div>

      {shareOpen && (
        <div ref={sharePanelRef} className="share-panel" role="dialog" aria-label="Opciones para compartir el perfil">
          <div className="share-panel-header">
            <div>
              <div className="share-panel-title">Compartir perfil</div>
              {shareSummary && (
                <div className="share-panel-meta">
                  <span className={`badge ${shareSummary.badgeClass}`}>{shareSummary.badge}</span>
                  <span>{shareSummary.title}</span>
                </div>
              )}
              {shareSummary?.subtitle && <p className="share-panel-note">{shareSummary.subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" aria-label="Cerrar panel de compartir" onClick={() => setShareOpen(false)}>✕</button>
          </div>
          <p className="share-panel-text">{shareDisabled ? 'Crea un perfil con tu usuario o grupo para compartir cambios con tu equipo.' : 'Comparte este enlace para que otra persona cargue exactamente este tablero.'}</p>
          {shareSummary?.note && <p className="share-panel-note">{shareSummary.note}</p>}
          <div className="share-link-row">
            <input
              ref={shareInputRef}
              value={shareUrl}
              readOnly
              onFocus={e => e.currentTarget.select()}
            />
            <button
              type="button"
              className="secondary-btn"
              onClick={async () => {
                if (!shareUrl) return;
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  showToast('Enlace copiado', 'success');
                  setTimeout(() => setCopied(false), 1800);
                  shareInputRef.current?.select();
                } catch {
                  showToast('No se pudo copiar', 'error');
                }
              }}
            >
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            {canNativeShare && !shareDisabled && (
              <button
                type="button"
                className="secondary-btn"
                onClick={async () => {
                  if (!shareUrl) return;
                  try {
                    await (navigator as any).share({ title: 'Dashboard', url: shareUrl });
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Compartir…
              </button>
            )}
          </div>
          {!shareDisabled && (
            <ul className="share-tips">
              <li>Los cambios se guardan automáticamente para cualquiera que use este perfil.</li>
              <li>Si es un <strong>group:</strong> añade personas desde la pestaña Identidad.</li>
              <li>Comparte solo con personas de confianza; podrán editar este tablero.</li>
            </ul>
          )}
        </div>
      )}

      {newProfileOpen && (
        <div className="toolbar-row profile-new">
          <input
            className="tile-icon-input"
            placeholder="p.ej. team:marketing o user:mi-id"
            value={newProfile}
            onChange={e => setNewProfile(e.target.value)}
          />
          <div className="profile-new-actions">
            <button
              className="primary-btn"
              onClick={async () => {
                const k = newProfile.trim();
                if (!k) return;
                setPersistKey(k);
                setScope(k);
                try { await fetch(`/api/state?key=${encodeURIComponent(k)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) }); } catch {}
                setNewProfile(""); setNewProfileOpen(false);
                try {
                  const raw = localStorage.getItem("persist_profiles_recent");
                  setRecent(raw ? (JSON.parse(raw) as string[]) : []);
                } catch {}
              }}
            >
              Crear y aplicar
            </button>
            <button className="secondary-btn" onClick={() => setNewProfileOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Perfiles recientes: mover a avanzado para compactar */}

      {/* Small screens: toggle to show advanced controls */}
      <button
        type="button"
        className="secondary-btn more-btn"
        aria-expanded={moreOpen}
        aria-controls="toolbar-advanced"
        onClick={() => setMoreOpen(v => !v)}
      >
        {moreOpen ? "Cerrar" : "Más opciones"}
      </button>

      {/* Advanced controls: menos frecuentes */}
      <div id="toolbar-advanced" className={`toolbar-advanced ${moreOpen ? "is-open" : ""}`}>
        <div className="toolbar-row toolbar-row-advanced">
          <div className="control" role="group" aria-label="Estilo">
            <Select value={state.tileStyle} onValueChange={(v) => setTileStyle(v as any)}>
              <SelectItem value="cozy">Cómodo</SelectItem>
              <SelectItem value="compact">Compacto</SelectItem>
            </Select>
          </div>

          <div className="control" role="group" aria-label="Tema">
            <Select value={state.theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Oscuro</SelectItem>
            </Select>
          </div>

          {me?.authenticated ? (
            <button type="button" className="secondary-btn" onClick={() => signOut({ callbackUrl: "/" })}>Salir</button>
          ) : (
            <button type="button" className="secondary-btn" onClick={() => signIn()}>Entrar</button>
          )}
          {isAdmin && (<a className="secondary-btn" href="/admin" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Admin</a>)}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const ab = await f.arrayBuffer();
            const res = await fetch("/api/encoding/convert", { method: "POST", body: ab });
            if (!res.ok) throw new Error("No se pudo convertir el archivo");
            const { data } = await res.json();
            if (typeof data === "object" && data) { importState(data); showToast('Importado'); }
          } catch (err) {
            showToast("Archivo inválido");
          } finally {
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
}
