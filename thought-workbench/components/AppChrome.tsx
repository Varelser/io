import React from "react";
import { useDraggablePosition } from "../hooks/useDraggablePosition";

type BreadcrumbSegment = {
  label: string;
  sub?: string;
  onClick?: () => void;
};

export function AppChrome({
  breadcrumbSegments,
  leftOpen,
  rightOpen,
  focusMode,
  onToggleLeft,
  onToggleRight,
  onToggleFocusMode,
  onOpenCommandPalette,
  onOpenShortcuts,
  lang,
}: {
  breadcrumbSegments: BreadcrumbSegment[];
  leftOpen: boolean;
  rightOpen: boolean;
  focusMode: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleFocusMode: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts?: () => void;
  lang: "ja" | "en";
}) {
  const { position: breadcrumbPosition, startDrag: startBreadcrumbDrag, resetPosition: resetBreadcrumbPosition } = useDraggablePosition("tw-overlay-breadcrumb", { x: 0, y: 0 });
  const { position: commandPosition, startDrag: startCommandDrag, resetPosition: resetCommandPosition } = useDraggablePosition("tw-overlay-command", { x: 0, y: 0 });
  const leftToggleTitle = leftOpen
    ? (lang === "ja" ? "左パネルを閉じる" : "Hide left panel")
    : (lang === "ja" ? "左パネルを開く" : "Show left panel");
  const rightToggleTitle = rightOpen
    ? (lang === "ja" ? "右パネルを閉じる" : "Hide right panel")
    : (lang === "ja" ? "右パネルを開く" : "Show right panel");
  const focusModeTitle = focusMode
    ? (lang === "ja" ? "集中モードを終了" : "Exit focus mode")
    : (lang === "ja" ? "集中モード" : "Focus mode");
  return (
    <>
      {breadcrumbSegments.length > 0 && (
        <div
          className="absolute z-20 flex items-center gap-1 pointer-events-auto"
          style={{
            top: `${8 + breadcrumbPosition.y}px`,
            left: `calc(50% + ${breadcrumbPosition.x}px)`,
            transform: "translateX(-50%)",
          }}
        >
          <button
            onMouseDown={startBreadcrumbDrag}
            onDoubleClick={resetBreadcrumbPosition}
            className="flex h-8 w-7 items-center justify-center rounded-md border backdrop-blur-sm"
            style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)", color: "var(--tw-text-muted)", cursor: "grab" }}
            title={lang === "ja" ? "ドラッグで移動 / ダブルクリックで戻す" : "Drag to move / double click to reset"}
          >
            ⋮⋮
          </button>
          {breadcrumbSegments.map((segment, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg width="24" height="16" className="shrink-0 opacity-40">
                  <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1" />
                  <circle cx="22" cy="8" r="2" fill="currentColor" />
                </svg>
              )}
              <button
                onClick={segment.onClick}
                className={`shrink-0 flex flex-col items-center rounded-md border backdrop-blur-sm px-2.5 py-1 ${segment.onClick ? "cursor-pointer" : "cursor-default"}`}
                style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)" }}
              >
                <span className="text-[7px] uppercase tracking-wider" style={{ color: "var(--tw-text-muted)" }}>{segment.sub}</span>
                <span className="text-[10px] max-w-[100px] truncate" style={{ color: "var(--tw-text)" }}>{segment.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <button
        onClick={onToggleLeft}
        className="absolute top-2 left-2 z-30 flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
        style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)" }}
        title={leftToggleTitle}
        aria-label={leftToggleTitle}
        aria-expanded={leftOpen}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          {leftOpen ? (<><line x1="3" y1="3" x2="3" y2="11" /><line x1="6" y1="3" x2="11" y2="7" /><line x1="6" y1="11" x2="11" y2="7" /></>) : (<><line x1="3" y1="3" x2="3" y2="11" /><line x1="11" y1="3" x2="6" y2="7" /><line x1="11" y1="11" x2="6" y2="7" /></>)}
        </svg>
      </button>

      <button
        onClick={onToggleRight}
        className="absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
        style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)" }}
        title={rightToggleTitle}
        aria-label={rightToggleTitle}
        aria-expanded={rightOpen}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          {rightOpen ? (<><line x1="11" y1="3" x2="11" y2="11" /><line x1="8" y1="3" x2="3" y2="7" /><line x1="8" y1="11" x2="3" y2="7" /></>) : (<><line x1="11" y1="3" x2="11" y2="11" /><line x1="3" y1="3" x2="8" y2="7" /><line x1="3" y1="11" x2="8" y2="7" /></>)}
        </svg>
      </button>

      <div
        className="absolute z-30 flex items-center gap-2"
        style={{
          top: `${8 + commandPosition.y}px`,
          left: `calc(50% + ${commandPosition.x}px)`,
          transform: "translateX(-50%)",
        }}
      >
        <button
          onMouseDown={startCommandDrag}
          onDoubleClick={resetCommandPosition}
          className="flex h-8 w-7 items-center justify-center rounded-full border backdrop-blur-sm"
          style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)", color: "var(--tw-text-muted)", cursor: "grab" }}
          title={lang === "ja" ? "ドラッグで移動 / ダブルクリックで戻す" : "Drag to move / double click to reset"}
        >
          ⋮⋮
        </button>
        <button
          onClick={onOpenCommandPalette}
          className="flex h-8 items-center gap-2 rounded-full border px-3 text-[10px] backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
          style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)", color: "var(--tw-text)" }}
          title={lang === "ja" ? "コマンドパレットを開く" : "Open command palette"}
          aria-label={lang === "ja" ? "コマンドパレットを開く" : "Open command palette"}
        >
          <span>{lang === "ja" ? "コマンド" : "Command"}</span>
          <span style={{ color: "var(--tw-text-muted)" }}>⌘K</span>
        </button>
        <button
          onClick={onToggleFocusMode}
          className="flex h-8 items-center rounded-full border px-3 text-[10px] backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
          style={focusMode
            ? { borderColor: "var(--tw-accent)", background: "color-mix(in srgb, var(--tw-accent) 16%, transparent)", color: "var(--tw-text)" }
            : { borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)", color: "var(--tw-text)" }}
          title={focusModeTitle}
          aria-label={focusModeTitle}
          aria-pressed={focusMode}
        >
          {focusMode ? (lang === "ja" ? "集中解除" : "Exit Focus") : (lang === "ja" ? "集中" : "Focus")}
        </button>
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-[12px] backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
            style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-panel)", color: "var(--tw-text-muted)" }}
            title={lang === "ja" ? "ショートカット一覧" : "Keyboard shortcuts"}
            aria-label={lang === "ja" ? "ショートカット一覧" : "Keyboard shortcuts"}
          >
            ?
          </button>
        )}
      </div>
    </>
  );
}
