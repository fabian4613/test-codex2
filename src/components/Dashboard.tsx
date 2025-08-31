"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/components/DashboardContext";
import { TileCard } from "@/components/TileCard";
import { ListView } from "@/components/ListView";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, SortableItem } from "@/components/Sortable";
import { Toolbar } from "@/components/Toolbar";

export function Dashboard() {
  const { state, setTitle, addGroup, moveGroup, removeGroup, updateGroup, addTile, moveTile } = useDashboard();

  const filtered = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    const applyFilters = (groups: typeof state.groups) => {
      const f = state.filters || {};
      const wantFav = !!f.favoritesOnly;
      const hasCats = f.categories && f.categories.length > 0;
      const hasEnvs = f.envs && f.envs.length > 0;
      const hasCrits = f.criticalities && f.criticalities.length > 0;
      const hasTags = f.tags && f.tags.length > 0;
      return groups.map(g => ({
        ...g,
        tiles: g.tiles.filter(t => {
          if (wantFav && !t.favorite) return false;
          if (hasCats && !f.categories!.includes(t.category || "")) return false;
          if (hasEnvs && !f.envs!.includes((t.env || "OTRO") as any)) return false;
          if (hasCrits && !f.criticalities!.includes((t.criticality || "low") as any)) return false;
          if (hasTags && !(t.tags || []).some(tag => f.tags!.includes(tag))) return false;
          return true;
        })
      }));
    };

    const base = applyFilters(state.groups);
    if (!q) return base;
    return base
      .map(g => ({
        ...g,
        tiles: g.tiles.filter(t => `${t.title} ${t.url} ${t.description ?? ""}`.toLowerCase().includes(q))
      }))
      .filter(g => g.tiles.length > 0);
  }, [state.groups, state.search, state.filters]);

  const allTiles = useMemo(() => {
    return filtered.flatMap(g => g.tiles.map(t => ({ groupId: g.id, groupTitle: g.title, tile: t })));
  }, [filtered]);

  // Map tileId -> groupId to allow constrained reorders in "Todos"
  const idToGroup = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of filtered) {
      for (const t of g.tiles) m.set(t.id, g.id);
    }
    return m;
  }, [filtered]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <main className="container">
      <motion.header className="page-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
        {state.editMode && (
          <input
            className="title-input"
            value={state.title}
            onChange={e => setTitle(e.target.value)}
          />
        )}
        <Toolbar />
      </motion.header>

      {state.viewMode === "grouped" ? (
        <motion.div layout className="groups" style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))` }}>
          <AnimatePresence mode="popLayout">
            {filtered.map(group => (
              <motion.section
                layout
                key={group.id}
                className="group"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
              <div className="group-header">
                {state.editMode ? (
                  <input
                    className="group-title"
                    value={group.title}
                    onChange={e => updateGroup(group.id, { title: e.target.value })}
                  />
                ) : (
                  <div className="group-title-static">{group.title}</div>
                )}
                {state.editMode && (
                  <div className="group-actions">
                    <button type="button" className="icon-btn" aria-label="Subir" title="Subir" onClick={() => moveGroup(group.id, -1)}>▲</button>
                    <button type="button" className="icon-btn" aria-label="Bajar" title="Bajar" onClick={() => moveGroup(group.id, 1)}>▼</button>
                    <button type="button" className="icon-btn" aria-label="Eliminar grupo" title="Eliminar grupo" onClick={() => removeGroup(group.id)}>🗑️</button>
                  </div>
                )}
              </div>
              <motion.div layout className={`tiles tiles-${state.tileStyle}`}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  const ids = group.tiles.map(t => t.id);
                  const from = ids.indexOf(String(active.id));
                  const to = ids.indexOf(String(over.id));
                  if (from < 0 || to < 0) return;
                  // move step-by-step using existing action
                  const dir = from < to ? 1 : -1;
                  for (let i = from; i !== to; i += dir) {
                    moveTile(group.id, ids[i], dir as any);
                  }
                }}>
                  <SortableContext items={group.tiles.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {group.tiles.map(tile => (
                      <SortableItem key={tile.id} id={tile.id}>
                        <TileCard groupId={group.id} tile={tile} />
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                {state.editMode && (
                  <button type="button" className="add-tile" onClick={() => addTile(group.id)}>+ Añadir enlace</button>
                )}
              </motion.div>
              </motion.section>
            ))}
          </AnimatePresence>
          {state.editMode && (
            <motion.button
              layout
              className="add-group"
              onClick={addGroup}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.12 }}
            >
            >
              + Añadir grupo
            </motion.button>
          )}
        </motion.div>
      ) : state.viewMode === "all" ? (
          const { active, over } = e;
          if (!over || active.id === over.id) return;
          const a = String(active.id);
          const b = String(over.id);
          const ga = idToGroup.get(a);
          const gb = idToGroup.get(b);
          if (!ga || !gb || ga !== gb) return; // solo reordena dentro del mismo grupo
          const group = state.groups.find(g => g.id === ga);
          if (!group) return;
          const ids = group.tiles.map(t => t.id);
          const from = ids.indexOf(a);
          const to = ids.indexOf(b);
          if (from < 0 || to < 0) return;
          const dir = from < to ? 1 : -1;
          for (let i = from; i !== to; i += dir) {
            moveTile(ga, ids[i], dir as any);
          }
        }}>
          <SortableContext items={allTiles.map(({ tile }) => tile.id)} strategy={rectSortingStrategy}>
            <motion.div layout className={`tiles tiles-${state.tileStyle}`} style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))` }}>
              {allTiles.map(({ groupId, groupTitle, tile }) => (
                <SortableItem key={tile.id} id={tile.id}>
                  <div className="tile-all">
                    <TileCard groupId={groupId} tile={tile} />
                    <div className="tile-chip">{groupTitle}</div>
                  </div>
                </SortableItem>
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      ) : (
        <ListView items={allTiles} edit={state.editMode} />
      )}
    </main>
  );
}





