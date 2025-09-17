"use client";

import * as RSelect from "@radix-ui/react-select";
import { ReactNode } from "react";

export function Select({ value, onValueChange, children, className, displayLabel }: { value: string; onValueChange: (v: string) => void; children: ReactNode; className?: string; displayLabel?: string }) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange}>
      <RSelect.Trigger className={"select-trigger " + (className ?? "")} aria-label="Select">
        {displayLabel ? <span>{displayLabel}</span> : <RSelect.Value />}
        <RSelect.Icon className="select-icon">▾</RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="select-content" position="popper" sideOffset={6}>
          <RSelect.Viewport className="select-viewport">
            {children}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RSelect.Item value={value} className="select-item">
      <RSelect.ItemText>{children}</RSelect.ItemText>
    </RSelect.Item>
  );
}
