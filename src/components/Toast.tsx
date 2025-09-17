"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Toast = { id: string; text: string; variant: 'info' | 'success' | 'error' };

type ToastContextValue = { showToast: (text: string, variant?: 'info' | 'success' | 'error') => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function showToast(text: string, variant: 'info' | 'success' | 'error' = 'info') {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(t => [...t, { id, text, variant }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  }
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.variant}`}
              initial={{ y: 20, opacity: 0, scale: .98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: .98 }}
              transition={{ duration: 0.22 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  {t.variant === 'success' ? '✅' : t.variant === 'error' ? '⚠️' : 'ℹ️'}
                </span>
                <span>{t.text}</span>
              </div>
              <div className="toast-progress" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
