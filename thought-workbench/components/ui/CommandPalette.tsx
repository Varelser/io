import React from "react";

export type CommandPaletteAction = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void;
};

export function CommandPalette({
  open,
  title,
  placeholder,
  emptyLabel,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  emptyLabel: string;
  actions: CommandPaletteAction[];
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filteredActions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter((action) => {
      const haystack = [action.label, action.hint || "", ...(action.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [actions, query]);

  React.useEffect(() => {
    if (activeIndex >= filteredActions.length) {
      setActiveIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [activeIndex, filteredActions.length]);

  const runAction = React.useCallback((action: CommandPaletteAction | undefined) => {
    if (!action) return;
    action.run();
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, filteredActions.length - 1)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runAction(filteredActions[activeIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredActions, onClose, open, runAction]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/35 px-4 py-16" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)" }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--tw-border)" }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--tw-text-muted)" }}>
            {title}
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder={placeholder}
            className="mt-2 w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--tw-text)" }}
          />
        </div>
        <div className="max-h-[60vh] overflow-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="rounded-xl px-3 py-4 text-sm" style={{ color: "var(--tw-text-muted)" }}>
              {emptyLabel}
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => runAction(action)}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors"
                style={index === activeIndex
                  ? { background: "color-mix(in srgb, var(--tw-accent) 16%, transparent)" }
                  : { background: "transparent" }}
              >
                <span className="text-sm" style={{ color: "var(--tw-text)" }}>{action.label}</span>
                {action.hint ? (
                  <span className="ml-4 text-[11px]" style={{ color: "var(--tw-text-muted)" }}>{action.hint}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
