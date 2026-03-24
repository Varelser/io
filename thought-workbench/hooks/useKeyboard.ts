import { useEffect } from "react";

export type KeyboardOpts = {
  onEsc?: () => void;
  onSpace?: () => void;
  onFocusSelected?: () => void;
  onCommandPalette?: () => void;
  onShowShortcuts?: () => void;
};

export function useKeyboard(
  onUndo: () => void,
  onRedo: () => void,
  opts?: KeyboardOpts,
) {
  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      /* ── Escape ── */
      if (e.key === "Escape") {
        opts?.onEsc?.();
        return;
      }

      /* ── Space (play/pause) ── */
      if (e.key === " " && !isInputFocused()) {
        e.preventDefault();
        opts?.onSpace?.();
        return;
      }

      /* ── F (focus selected node) ── */
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        opts?.onFocusSelected?.();
        return;
      }

      /* ── ? (show keyboard shortcuts) ── */
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        opts?.onShowShortcuts?.();
        return;
      }

      /* ── Cmd/Ctrl+K (command palette) ── */
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        opts?.onCommandPalette?.();
        return;
      }

      /* ── Cmd/Ctrl+Z (undo) / Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y (redo) ── */
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onUndo, onRedo, opts]);
}
