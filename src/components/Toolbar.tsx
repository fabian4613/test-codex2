"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/components/DashboardContext";
import { downloadJSON } from "@/lib/storage";
import { Select, SelectItem } from "@/components/Select";
import { signIn, signOut } from "next-auth/react";

export function Toolbar() {
  const { state, setTheme, setColumns, setTileStyle, setSearch, setEditMode, setViewMode, importState, setPersistKey } = useDashboard();
  const filters = state.filters || {};
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<{ sub?: string; groups?: string[]; authenticated?: boolean } | null>(null);
  const [scope, setScope] = useState<string>("");

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
    })();
  }, [setPersistKey]);

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (me?.sub) opts.push({ value: `user:${me.sub}`, label: "Personal" });
    (me?.groups || []).forEach(g => opts.push({ value: `group:${g}`, label: `Grupo: ${g}` }));
    if (opts.length === 0) opts.push({ value: "default", label: "Sin sesión" });
    return opts;
  }, [me]);
  const isAdmin = useMemo(() => {
    const admin = (process.env.NEXT_PUBLIC_ADMIN_GROUP || "devops").toLowerCase();
    return !!me?.groups?.some(g => String(g).toLowerCase() === admin);
  }, [me]);

  return (
    <div className="toolbar">
      <input
        className="search"
        placeholder="Buscar..."
        value={state.search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="spacer" />

      <button
        type="button"
        className={`btn primary-btn ${state.editMode ? "btn-on" : "btn-off"}`}
        onClick={() => setEditMode(!state.editMode)}
        title={state.editMode ? "Desactivar edición" : "Activar edición"}
      >
        {state.editMode ? "Salir edición" : "Editar"}
      </button>

      <label className="control">
        Columnas
        {(() => {
          const pct = ((state.columns - 2) / (6 - 2)) * 100;
          return (
            <input
              type="range"
              min={2}
              max={6}
              value={state.columns}
              onChange={e => setColumns(parseInt(e.target.value))}
              style={{ ["--range-pct" as any]: `${pct}%` }}
            />
          );
        })()}
        <span>{state.columns}</span>
      </label>

      <div className="control" role="group" aria-label="Vista">
        <Select value={state.viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectItem value="grouped">Agrupado</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="list">Lista</SelectItem>
        </Select>
      </div>

      <label className="control">
        Favoritos
        <input
          type="checkbox"
          checked={!!filters.favoritesOnly}
          onChange={(e) => {
            // quick set in state root without context method for brevity
            // handled via importState to reuse persistence
            importState({ ...state, filters: { ...filters, favoritesOnly: e.target.checked } });
          }}
        />
      </label>

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

      <label className="control">
        Ámbito
        <Select value={scope} onValueChange={(v) => { setScope(v); setPersistKey(v); }}>
          {scopeOptions.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
      </label>

      <button type="button" className="secondary-btn" onClick={() => downloadJSON("dashboard.json", state)}>Exportar</button>
      <button type="button" className="secondary-btn" onClick={() => fileRef.current?.click()}>Importar</button>
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
            if (typeof data === "object" && data) importState(data);
          } catch (err) {
            alert("Archivo inválido");
          } finally {
            e.currentTarget.value = "";
          }
        }}
      />

      {me?.authenticated ? (
        <button type="button" className="secondary-btn" onClick={() => signOut({ callbackUrl: "/" })}>Salir</button>
      ) : (
        <button type="button" className="secondary-btn" onClick={() => signIn()}>Entrar</button>
      )}
      {isAdmin && (
        <a className="secondary-btn" href="/admin" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Admin</a>
      )}
    </div>
  );
}












