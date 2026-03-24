import React, { useState } from "react";

export function Section({ title, defaultOpen = false, children, className = "" }: { title: string; defaultOpen?: boolean; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`mt-2 rounded-md border overflow-hidden transition-all duration-150 ${className}`}
      style={{
        borderColor: open ? "color-mix(in srgb, var(--tw-accent) 28%, var(--tw-border))" : "var(--tw-border)",
        background: "var(--tw-bg-card)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[8px] uppercase tracking-[0.14em] transition-colors hover:bg-white/[0.02]"
        style={{ color: open ? "var(--tw-text-dim)" : "var(--tw-text-muted)" }}
      >
        <span className="flex items-center gap-1.5">
          {open && (
            <span
              className="inline-block h-3 w-[2px] rounded-full"
              style={{ background: "var(--tw-accent)", opacity: 0.7 }}
            />
          )}
          {title}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 10"
          fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
          className={`transition-transform duration-150 shrink-0 ${open ? "rotate-90" : ""}`}
          style={{ color: open ? "var(--tw-accent)" : "var(--tw-text-muted)", opacity: open ? 0.7 : 0.5 }}
        >
          <polyline points="3,2 7,5 3,8" />
        </svg>
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}
