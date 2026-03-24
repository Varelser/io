import React, { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative max-h-[80vh] overflow-auto rounded-2xl border p-4"
        style={{ width: `min(${width}px, calc(100vw - 32px))`, background: "var(--tw-bg-panel)", borderColor: "var(--tw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--tw-border)" }}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-[2px] rounded-full" style={{ background: "var(--tw-accent)" }} />
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--tw-text-dim)" }}>
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md border transition-all hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
            style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)", background: "var(--tw-button-bg)" }}
            aria-label="Close"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="8" y2="8" />
              <line x1="8" y1="2" x2="2" y2="8" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
