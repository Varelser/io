import React, { useEffect, useRef } from "react";

export type ContextMenuItem = {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 10000,
        minWidth: 160,
        padding: "4px 0",
        borderRadius: 6,
        border: "1px solid var(--tw-border, #333)",
        background: "var(--tw-bg-panel, #1e1e2e)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontSize: 9,
        color: "var(--tw-text, #e0e0e0)",
      }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${i}`}
              style={{
                height: 1,
                margin: "4px 8px",
                background: "var(--tw-border, #333)",
              }}
            />
          );
        }
        return (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "5px 12px",
              border: "none",
              background: "transparent",
              color: item.danger
                ? "#f87171"
                : item.disabled
                  ? "var(--tw-text-dim, #666)"
                  : "var(--tw-text, #e0e0e0)",
              fontSize: 9,
              textAlign: "left",
              cursor: item.disabled ? "default" : "pointer",
              opacity: item.disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.06)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
