import React from "react";

export function Button({ children, active = false, onClick, className = "", danger = false, disabled = false }: { children: React.ReactNode; active?: boolean; onClick?: () => void; className?: string; danger?: boolean; disabled?: boolean }) {
  const baseStyle = active
    ? {
      borderColor: "var(--tw-accent)",
      background: "color-mix(in srgb, var(--tw-accent) 14%, var(--tw-button-bg))",
      color: "var(--tw-button-text)",
      boxShadow: "0 0 0 1px var(--tw-accent) inset",
    }
    : {
      borderColor: "var(--tw-border)",
      background: "var(--tw-button-bg)",
      color: "var(--tw-button-text)",
    };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group inline-flex items-center justify-center rounded-md border px-1.5 py-[4px] text-[9px] leading-none transition-all duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)] ${disabled ? "opacity-40 cursor-not-allowed" : "hover:brightness-125"} ${className}`}
      style={disabled
        ? { borderColor: "var(--tw-border)", background: "var(--tw-button-bg)", color: "var(--tw-text-muted)" }
        : danger
        ? { borderColor: "color-mix(in srgb, var(--tw-danger) 45%, var(--tw-border))", background: "color-mix(in srgb, var(--tw-danger) 6%, var(--tw-button-bg))", color: "var(--tw-danger)" }
        : baseStyle
      }
    >
      {children}
    </button>
  );
}
