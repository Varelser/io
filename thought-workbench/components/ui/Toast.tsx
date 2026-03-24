import React, { useEffect, useState } from "react";
import type { ToastItem } from "../../hooks/useToast";

const KIND_COLORS: Record<NonNullable<ToastItem["kind"]>, string> = {
  info: "#60a5fa",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
};

function SingleToast({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    // start fade-out 500ms before removal (total lifetime = 3000ms)
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  const borderColor = KIND_COLORS[toast.kind ?? "info"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 14px 5px 10px",
        borderRadius: 8,
        border: `1px solid color-mix(in srgb, ${borderColor} 30%, transparent)`,
        borderLeft: `2px solid ${borderColor}`,
        background: `color-mix(in srgb, ${borderColor} 7%, var(--tw-bg-panel, #0a0c1a))`,
        color: "var(--tw-text, #e4e8ff)",
        fontSize: 10,
        fontFamily: "inherit",
        letterSpacing: "0.02em",
        lineHeight: "18px",
        boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, ${borderColor} 12%, transparent)`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.97)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        pointerEvents: "auto",
        maxWidth: 360,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: borderColor, flexShrink: 0, boxShadow: `0 0 6px ${borderColor}` }} />
      {toast.message}
    </div>
  );
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} />
      ))}
    </div>
  );
}
