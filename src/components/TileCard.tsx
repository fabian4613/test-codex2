"use client";

import { Tile } from "@/lib/types";
import { useDashboard } from "@/components/DashboardContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { DragHandle } from "@/components/Sortable";
import { ChipsInput } from "@/components/ChipsInput";

export function TileCard({ groupId, tile }: { groupId: string; tile: Tile }) {
  const { state, updateTile, removeTile } = useDashboard();
  const [showOpts, setShowOpts] = useState(false);
  const domain = safeDomain(tile.url);
  const favicon = tile.icon && tile.icon.startsWith("http") ? tile.icon : undefined;
  const isEmoji = tile.icon && !favicon;
  const editing = !!state.editMode;
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        await fetch(tile.url, { mode: "no-cors", signal: controller.signal });
        clearTimeout(t);
        if (active) setStatus("online");
      } catch {
        if (active) setStatus("offline");
      }
    })();
    return () => { active = false; };
  }, [tile.url]);

  return (
    <motion.div
      layout
      className="tile"
      style={{ borderLeftColor: tile.color || "var(--accent)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ translateY: -2, boxShadow: "var(--shadow-2)" as any }}
      whileTap={{ translateY: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="tile-main">
        <a className="tile-icon" aria-label="Abrir enlace" href={tile.url} target="_blank" rel="noreferrer">
          {isEmoji ? (
            <span aria-hidden="true">{tile.icon}</span>
          ) : favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" />
          ) : domain ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt="" />
          ) : (
            <span aria-hidden="true">🔗</span>
          )}
        </a>
        <div className="tile-text">
          {editing ? (
            <>
              <input className="tile-title" aria-label="Título" value={tile.title} onChange={e => updateTile(groupId, tile.id, { title: e.target.value })} />
              <input className="tile-url" aria-label="URL" value={tile.url} onChange={e => updateTile(groupId, tile.id, { url: e.target.value })} />
              {typeof tile.description !== "undefined" && (
                <input className="tile-desc" placeholder="Descripción" value={tile.description || ""} onChange={e => updateTile(groupId, tile.id, { description: e.target.value })} />
              )}
              <div className="tile-meta">
                <div className="field">
                  <div className="field-label">Tags</div>
                  <ChipsInput
                    value={tile.tags || []}
                    placeholder="Escribe y Enter"
                    suggestions={Array.from(new Set(state.groups.flatMap(g => g.tiles.flatMap(t => t.tags || [])))) as string[]}
                    onChange={(arr) => updateTile(groupId, tile.id, { tags: arr })}
                  />
                </div>
              </div>
            </>
          ) : (
            <a className="tile-link" href={tile.url} target="_blank" rel="noreferrer">
              <div className="tile-title-static">{tile.title}</div>
              <div className="tile-url-static">{tile.url}</div>
              <div className="tile-badges">
                {(tile.tags || []).map(tag => (<span className="badge" key={tag}>{tag}</span>))}
              </div>
            </a>
          )}
        </div>
        <div className="tile-right">
          <div className={`status ${status === "online" ? "ok" : status === "offline" ? "bad" : "unk"}`} title={`Estado: ${status}`} />
          {editing && (
            <DragHandle aria-label="Arrastrar">⋮</DragHandle>
          )}
          <button
            type="button"
            className={`favorite-toggle ${tile.favorite ? "is-on" : ""}`}
            aria-pressed={tile.favorite}
            title={tile.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => {
              updateTile(groupId, tile.id, { favorite: !tile.favorite });
              showToast(tile.favorite ? "Quitado de favoritos" : "Añadido a favoritos");
            }}
          >
            <span className="favorite-icon" aria-hidden="true">{tile.favorite ? "★" : "☆"}</span>
            <span className="favorite-text">{tile.favorite ? "Favorito" : "Marcar"}</span>
          </button>
        </div>
      </div>
      {editing && (
        <div className="tile-actions">
          {showOpts && (
            <>
              <input className="tile-icon-input" placeholder="Emoji o URL de icono" value={tile.icon || ""} onChange={e => updateTile(groupId, tile.id, { icon: e.target.value })} />
              <input className="tile-color" title="Color" type="color" value={normalizeColor(tile.color)} onChange={e => updateTile(groupId, tile.id, { color: e.target.value })} />
            </>
          )}
          <button
            type="button"
            className={`favorite-toggle ${tile.favorite ? "is-on" : ""}`}
            aria-pressed={tile.favorite}
            title={tile.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => {
              updateTile(groupId, tile.id, { favorite: !tile.favorite });
              showToast(tile.favorite ? "Quitado de favoritos" : "Añadido a favoritos");
            }}
          >
            <span className="favorite-icon" aria-hidden="true">{tile.favorite ? "★" : "☆"}</span>
            <span className="favorite-text">{tile.favorite ? "Favorito" : "Marcar"}</span>
          </button>
          <button type="button" className="icon-btn" title={showOpts ? "Ocultar opciones" : "Más opciones"} aria-label={showOpts ? "Ocultar opciones" : "Más opciones"} onClick={() => setShowOpts(v => !v)}>⋯</button>
          <button type="button" className="icon-btn" title="Eliminar" aria-label="Eliminar" onClick={() => removeTile(groupId, tile.id)}>🗑️</button>
        </div>
      )}
    </motion.div>
  );
}

function normalizeColor(c?: string) {
  if (!c) return "#cccccc";
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return c;
    ctx.fillStyle = c;
    return ctx.fillStyle as string;
  } catch {
    return c;
  }
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// sin categorÃ­a/entorno/criticidad: solo tags
