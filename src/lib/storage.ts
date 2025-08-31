import { deepFixMojibake } from "@/lib/encoding";

const KEY = "dashy_next_dashboard_state_v1";

export function loadState<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as T;
    return deepFixMojibake<T>(data);
  } catch (e) {
    console.warn("No se pudo cargar el estado:", e);
    return null;
  }
}

export function saveState<T>(state: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar el estado:", e);
  }
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Remote persistence (optional)
export async function loadStateRemote<T>(key = "default"): Promise<T | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return deepFixMojibake<T>(data as T);
  } catch {
    return null;
  }
}

export async function saveStateRemote<T>(key: string, state: T): Promise<void> {
  if (typeof fetch === "undefined") return;
  try {
    await fetch(`/api/state?key=${encodeURIComponent(key)}` , {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state)
    });
  } catch {
    // ignore network errors
  }
}
