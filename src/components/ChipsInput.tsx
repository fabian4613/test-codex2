"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function ChipsInput({
  value,
  onChange,
  placeholder,
  max,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number; // optional limit of chips
  suggestions?: string[]; // previously created tags
}) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placeUp, setPlaceUp] = useState(false);

  useEffect(() => {
    // keep local input trimmed when max 1 and a value exists
    if (max === 1 && value.length > 0) setInput("");
  }, [value, max]);

  const canAdd = useMemo(() => (max ? value.length < max : true), [value.length, max]);

  function pushToken(raw: string) {
    if (!canAdd) return;
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) return; // dedupe
    onChange([...value, t]);
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && filtered.length) {
      e.preventDefault();
      setOpen(true);
      setActive(i => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp" && filtered.length) {
      e.preventDefault();
      setOpen(true);
      setActive(i => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered.length) {
        pushToken(filtered[active] ?? input);
        setOpen(false);
        return;
      }
      if (input.trim()) pushToken(input);
      return;
    }
    if (e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        pushToken(input);
      }
      return;
    }
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Backspace" && !input && value.length > 0) {
      const next = value.slice(0, -1);
      onChange(next);
      return;
    }
  }

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !value.includes(s))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 12);
  }, [suggestions, value, input]);

  function updatePlacement() {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlaceUp(spaceBelow < 160);
  }

  useEffect(() => {
    if (!open) return;
    updatePlacement();
    const onResize = () => updatePlacement();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <div ref={wrapRef} className="chips-wrap" onBlur={() => setTimeout(() => setOpen(false), 100)}>
      <div
        className="chips"
        onClick={() => { ref.current?.focus(); setOpen(filtered.length > 0); }}
      >
        {value.map((v) => (
          <span key={v} className="chip" title={v}>
            {v}
            <button type="button" className="chip-x" aria-label={`Quitar ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
              ×
            </button>
          </span>
        ))}
        {canAdd && (
          <input
            ref={ref}
            className="chip-input"
            placeholder={value.length === 0 ? placeholder : undefined}
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); setActive(0); }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(filtered.length > 0)}
          />
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className={`chips-popover${placeUp ? ' is-up' : ''}`} role="listbox">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`chip-option${i === active ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => { pushToken(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
