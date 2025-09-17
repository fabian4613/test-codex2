"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardState, Group, Tile, Theme, ViewMode } from "@/lib/types";
import { loadState, saveState, loadStateRemote, saveStateRemote } from "@/lib/storage";

type DashboardContextValue = {
  state: DashboardState;
  setTheme: (theme: Theme) => void;
  setColumns: (n: number) => void;
  setTileStyle: (style: "compact" | "cozy") => void;
  setTitle: (title: string) => void;
  setSearch: (q: string) => void;
  setEditMode: (on: boolean) => void;
  setViewMode: (mode: ViewMode) => void;

  addGroup: () => void;
  updateGroup: (id: string, patch: Partial<Group>) => void;
  removeGroup: (id: string) => void;
  moveGroup: (id: string, dir: -1 | 1) => void;

  addTile: (groupId: string) => void;
  updateTile: (groupId: string, tileId: string, patch: Partial<Tile>) => void;
  removeTile: (groupId: string, tileId: string) => void;
  moveTile: (groupId: string, tileId: string, dir: -1 | 1) => void;

  importState: (state: DashboardState) => void;
  setPersistKey: (key: string) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultState = (): DashboardState => ({
  title: "Mi Panel",
  theme: "system",
  columns: 4,
  tileStyle: "cozy",
  search: "",
  editMode: false,
  viewMode: "grouped",
  groups: [
    {
      id: uid(),
      title: "Favoritos",
      color: "",
      tiles: [
        { id: uid(), title: "GitHub", url: "https://github.com", icon: "🐙", tags: ["Dev"], category: "Repos", env: "DEV", criticality: "high", favorite: true },
        { id: uid(), title: "Google", url: "https://google.com", icon: "🔍", tags: ["Search"], category: "Utilidad", env: "OTRO", criticality: "low" }
      ]
    }
  ]
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>(defaultState);
  const persistKeyRef = useRef<string>("default");
  const [me, setMe] = useState<{ sub?: string; groups?: string[]; authenticated?: boolean } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    // If URL contains ?profile, prefer that as current key
    try {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const qp = sp.get("profile");
        if (qp) {
          persistKeyRef.current = qp;
          try { window.localStorage.setItem("persist_scope", qp); } catch {}
        }
      }
    } catch {}

    const loaded = loadState<DashboardState>();
    if (loaded) setState({ ...defaultState(), ...loaded });

    // Optional remote load if enabled
    const remoteOn = (process.env.NEXT_PUBLIC_PERSIST_REMOTE === "1" || process.env.NEXT_PUBLIC_PERSIST_REMOTE === "true");
    if (remoteOn) {
      fetch("/api/me", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then((info) => {
          const sub = info?.sub as string | undefined;
          const groups = (info?.groups || []) as string[];
          setMe({ sub, groups, authenticated: !!sub });
          const stored = (typeof window !== "undefined") ? window.localStorage.getItem("persist_scope") : null;
          let key = persistKeyRef.current || stored || (sub ? `user:${sub}` : "default");
          persistKeyRef.current = key;
          return loadStateRemote<DashboardState>(key);
        })
        .then((remote) => {
          if (remote && typeof remote === "object") setState({ ...defaultState(), ...remote });
        })
        .catch(() => {/* ignore */});
    }
  }, []);

  // Persist on changes (debounced remote to avoid bursts)
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    saveState(state);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const effective = state.theme === "system"
        ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : state.theme;
      root.dataset.theme = effective;
    }

    const remoteOn = (process.env.NEXT_PUBLIC_PERSIST_REMOTE === "1" || process.env.NEXT_PUBLIC_PERSIST_REMOTE === "true");
    if (remoteOn) {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveStateRemote(persistKeyRef.current || "default", state).catch(() => {/* ignore */});
      }, 600);
    }
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [state]);

  const setTheme = useCallback((theme: Theme) => setState(s => ({ ...s, theme })), []);
  const setColumns = useCallback((n: number) => setState(s => ({ ...s, columns: Math.min(6, Math.max(2, Math.round(n))) })), []);
  const setTileStyle = useCallback((style: "compact" | "cozy") => setState(s => ({ ...s, tileStyle: style })), []);
  const setTitle = useCallback((title: string) => setState(s => ({ ...s, title })), []);
  const setSearch = useCallback((q: string) => setState(s => ({ ...s, search: q })), []);
  const setEditMode = useCallback((on: boolean) => setState(s => ({ ...s, editMode: on })), []);
  const setViewMode = useCallback((mode: ViewMode) => setState(s => ({ ...s, viewMode: mode })), []);

  const addGroup = useCallback(() => setState(s => ({
    ...s,
    groups: [...s.groups, { id: uid(), title: "Nuevo grupo", color: "", tiles: [] }]
  })), []);

  const updateGroup = useCallback((id: string, patch: Partial<Group>) => setState(s => ({
    ...s,
    groups: s.groups.map(g => (g.id === id ? { ...g, ...patch } : g))
  })), []);

  const removeGroup = useCallback((id: string) => setState(s => ({
    ...s,
    groups: s.groups.filter(g => g.id !== id)
  })), []);

  const moveGroup = useCallback((id: string, dir: -1 | 1) => setState(s => {
    const idx = s.groups.findIndex(g => g.id === id);
    if (idx < 0) return s;
    const to = idx + dir;
    if (to < 0 || to >= s.groups.length) return s;
    const arr = [...s.groups];
    const [it] = arr.splice(idx, 1);
    arr.splice(to, 0, it);
    return { ...s, groups: arr };
  }), []);

  const addTile = useCallback((groupId: string) => setState(s => ({
    ...s,
    groups: s.groups.map(g => g.id === groupId ? ({ ...g, tiles: [...g.tiles, { id: uid(), title: "Nuevo", url: "https://", icon: "⭐" }] }) : g)
  })), []);

  const updateTile = useCallback((groupId: string, tileId: string, patch: Partial<Tile>) => setState(s => ({
    ...s,
    groups: s.groups.map(g => g.id === groupId ? ({
      ...g,
      tiles: g.tiles.map(t => (t.id === tileId ? { ...t, ...patch } : t))
    }) : g)
  })), []);

  const removeTile = useCallback((groupId: string, tileId: string) => setState(s => ({
    ...s,
    groups: s.groups.map(g => g.id === groupId ? ({ ...g, tiles: g.tiles.filter(t => t.id !== tileId) }) : g)
  })), []);

  const moveTile = useCallback((groupId: string, tileId: string, dir: -1 | 1) => setState(s => ({
    ...s,
    groups: s.groups.map(g => {
      if (g.id !== groupId) return g;
      const idx = g.tiles.findIndex(t => t.id === tileId);
      if (idx < 0) return g;
      const to = idx + dir;
      if (to < 0 || to >= g.tiles.length) return g;
      const arr = [...g.tiles];
      const [it] = arr.splice(idx, 1);
      arr.splice(to, 0, it);
      return { ...g, tiles: arr };
    })
  })), []);

  const importState = useCallback((newState: DashboardState) => setState(newState), []);
  const setPersistKey = useCallback((key: string) => {
    persistKeyRef.current = key;
    if (typeof window !== "undefined") window.localStorage.setItem("persist_scope", key);
    // Track recent profiles locally for quick access
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("persist_profiles_recent");
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [key, ...arr.filter(k => k !== key)].slice(0, 8);
        window.localStorage.setItem("persist_profiles_recent", JSON.stringify(next));
        // reflect profile in URL for sharing
        const url = new URL(window.location.href);
        url.searchParams.set("profile", key);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
    // attempt load for the new key
    loadStateRemote<DashboardState>(key).then(remote => {
      if (remote && typeof remote === "object") setState({ ...defaultState(), ...remote });
    }).catch(() => {/* ignore */});
  }, []);

  const value = useMemo<DashboardContextValue>(() => ({
    state,
    setTheme,
    setColumns,
    setTileStyle,
    setTitle,
    setSearch,
    setEditMode,
    setViewMode,
    addGroup,
    updateGroup,
    removeGroup,
    moveGroup,
    addTile,
    updateTile,
    removeTile,
    moveTile,
    importState,
    setPersistKey
  }), [state, setTheme, setColumns, setTileStyle, setTitle, setSearch, setEditMode, setViewMode, addGroup, updateGroup, removeGroup, moveGroup, addTile, updateTile, removeTile, moveTile, importState, setPersistKey]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard debe usarse dentro de DashboardProvider");
  return ctx;
}
