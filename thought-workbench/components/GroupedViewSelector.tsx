import React from "react";
import { VIEW_LABELS, type ViewType } from "../constants/views";

const VIEW_GROUPS: { label: { ja: string; en: string }; views: ViewType[] }[] = [
  { label: { ja: "空間", en: "Spatial" }, views: ["sphere", "workspace", "network", "mindmap", "canvas2d", "depth"] },
  { label: { ja: "一覧", en: "List" }, views: ["table", "folder", "timeline", "diff"] },
  { label: { ja: "ワークフロー", en: "Workflow" }, views: ["intake", "review", "task", "maintenance"] },
  { label: { ja: "メタ", en: "Meta" }, views: ["stats", "journal", "calendar"] },
];

export function GroupedViewSelector({
  value,
  onChange,
  recommendedViews,
  lang,
}: {
  value: ViewType;
  onChange: (view: ViewType) => void;
  recommendedViews: Set<ViewType>;
  lang: "ja" | "en";
}) {
  return (
    <div className="space-y-1.5">
      {VIEW_GROUPS.map((group) => (
        <div key={group.label.en}>
          <div className="mb-0.5 text-[7px] uppercase tracking-wider" style={{ color: "var(--tw-text-dim)" }}>
            {group.label[lang]}
          </div>
          <div className="flex flex-wrap gap-1">
            {group.views.map((v) => (
              <button
                key={v}
                onClick={() => onChange(v)}
                className="rounded-md border px-1.5 py-1 text-[8px] transition-colors"
                style={v === value
                  ? { borderColor: "var(--tw-accent)", background: "color-mix(in srgb, var(--tw-accent) 18%, transparent)", color: "var(--tw-text)" }
                  : { borderColor: "var(--tw-border)", background: "transparent", color: "var(--tw-text-muted)" }}
                title={VIEW_LABELS[v][lang]}
              >
                {VIEW_LABELS[v].icon} {VIEW_LABELS[v][lang]}{recommendedViews.has(v) ? " ★" : ""}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
