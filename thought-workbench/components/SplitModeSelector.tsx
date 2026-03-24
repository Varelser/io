import React from "react";
import type { SplitMode } from "./MultiPaneLayout";

const SPLIT_ICONS: Record<SplitMode, string> = {
  single: "▣",
  "vertical-2": "▥",
  "horizontal-2": "▤",
  triple: "⊞",
  quad: "▦",
};

const SPLIT_LABELS: Record<SplitMode, { ja: string; en: string }> = {
  single: { ja: "シングル", en: "Single" },
  "vertical-2": { ja: "左右2分割", en: "Vertical Split" },
  "horizontal-2": { ja: "上下2分割", en: "Horizontal Split" },
  triple: { ja: "3分割", en: "Triple" },
  quad: { ja: "4分割", en: "Quad" },
};

export function SplitModeSelector({
  splitMode,
  onChangeSplitMode,
  lang = "ja",
}: {
  splitMode: SplitMode;
  onChangeSplitMode: (mode: SplitMode) => void;
  lang?: "ja" | "en";
}) {
  const modes: SplitMode[] = ["single", "vertical-2", "horizontal-2", "triple", "quad"];
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChangeSplitMode(mode)}
          title={SPLIT_LABELS[mode][lang]}
          style={{
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            border: splitMode === mode ? "1px solid var(--tw-accent, #f59e0b)" : "1px solid var(--tw-border, #333)",
            borderRadius: 4,
            background: splitMode === mode ? "var(--tw-accent, #f59e0b)20" : "transparent",
            color: splitMode === mode ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
            cursor: "pointer",
          }}
        >
          {SPLIT_ICONS[mode]}
        </button>
      ))}
    </div>
  );
}
