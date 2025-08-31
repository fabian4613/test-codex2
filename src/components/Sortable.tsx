"use client";

import { PropsWithChildren, createContext, useContext } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export { SortableContext, verticalListSortingStrategy, rectSortingStrategy };

type Ctx = { listeners: any; attributes: any };
const SortCtx = createContext<Ctx | null>(null);

export function SortableItem({ id, children }: PropsWithChildren<{ id: string }>) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style}>
      <SortCtx.Provider value={{ listeners, attributes }}>
        {children}
      </SortCtx.Provider>
    </div>
  );
}

export function DragHandle({ children }: PropsWithChildren<{}>) {
  const ctx = useContext(SortCtx);
  return (
    <div {...(ctx?.attributes || {})} {...(ctx?.listeners || {})} className="drag-handle">
      {children ?? "⋮"}
    </div>
  );
}
