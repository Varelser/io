import React from "react";

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mt-3 mb-1 flex items-center gap-2">
      <span
        className="text-[7px] uppercase tracking-[0.18em] shrink-0"
        style={{ color: "var(--tw-text-muted)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "var(--tw-border)" }}
      />
    </div>
  );
}
