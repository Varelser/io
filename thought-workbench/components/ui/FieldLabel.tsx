import React from "react";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[8px] uppercase tracking-[0.14em]" style={{ color: "var(--tw-text-muted)" }}>{children}</div>;
}
