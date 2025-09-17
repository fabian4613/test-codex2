"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ConfirmOptions = { title?: string; message?: string; okText?: string; cancelText?: string };
type PromptOptions = { title?: string; message?: string; placeholder?: string; okText?: string; cancelText?: string; defaultValue?: string };

type DialogContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"confirm" | "prompt">("confirm");
  const [opts, setOpts] = useState<any>({});
  const [resolver, setResolver] = useState<((v: any) => void) | null>(null);
  const [value, setValue] = useState("");

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setMode("confirm"); setOpts(o || {}); setResolver(() => resolve); setOpen(true);
  }), []);
  const prompt = useCallback((o: PromptOptions) => new Promise<string | null>((resolve) => {
    setMode("prompt"); setOpts(o || {}); setValue(o?.defaultValue || ""); setResolver(() => resolve); setOpen(true);
  }), []);

  const close = () => { setOpen(false); };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="dlg-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dlg-box" role="dialog" aria-modal="true" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }}>
              {opts.title && <div className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>{opts.title}</div>}
              {opts.message && <div style={{ marginBottom: 10 }}>{opts.message}</div>}
              {mode === "prompt" && (
                <input className="tile-icon-input" placeholder={opts.placeholder || ""} value={value} onChange={(e) => setValue(e.target.value)} style={{ marginBottom: 10 }} />
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-btn" onClick={() => { close(); resolver && resolver(mode === "prompt" ? null : false); }}>{opts.cancelText || "Cancelar"}</button>
                <button type="button" className="primary-btn" onClick={() => { close(); resolver && resolver(mode === "prompt" ? value : true); }}>{opts.okText || "Aceptar"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog debe usarse dentro de DialogProvider");
  return ctx;
}

