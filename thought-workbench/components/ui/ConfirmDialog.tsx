import React, { useEffect } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative rounded-2xl border p-4"
        style={{ width: "min(320px, calc(100vw - 32px))", background: "var(--tw-bg-panel)", borderColor: "var(--tw-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--tw-border)" }}>
            <span className="h-3 w-[2px] rounded-full" style={{ background: "var(--tw-danger)" }} />
            <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--tw-text-dim)" }}>{title}</div>
          </div>
        )}
        <div className="mb-4 text-[10px] leading-relaxed" style={{ color: "var(--tw-text-muted)" }}>
          {message}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button danger={danger} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
