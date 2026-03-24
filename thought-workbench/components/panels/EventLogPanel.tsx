import React, { useState } from "react";
import type { EventLogEntry, EventKind } from "../../types";

const KIND_ICONS: Record<EventKind, string> = {
  "node:create": "+N",
  "node:update": "~N",
  "node:delete": "-N",
  "edge:create": "+E",
  "edge:update": "~E",
  "edge:delete": "-E",
  "topic:create": "+T",
  "topic:update": "~T",
  "topic:delete": "-T",
  "journal:add": "+J",
  "method:toggle": "M",
  "snapshot:create": "S",
  "extensions:update": "X",
};

const KIND_COLORS: Record<string, string> = {
  "create": "#4ade80",
  "update": "#60a5fa",
  "delete": "#f87171",
  "add": "#4ade80",
  "toggle": "#c084fc",
};

function kindColor(kind: EventKind): string {
  const action = kind.split(":")[1];
  return KIND_COLORS[action] || "#94a3b8";
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function EventLogPanel({
  events,
  lang,
  onJumpToNode,
}: {
  events: EventLogEntry[];
  lang?: "ja" | "en";
  onJumpToNode?: (topicId: string, nodeId: string) => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? events
    : events.filter((e) => e.kind.startsWith(filter));

  const categories = ["all", "node", "edge", "topic", "journal", "method", "snapshot", "extensions"];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-0.5 mb-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="rounded-full px-1.5 py-0.5 text-[7px] border transition-colors"
            style={{
              borderColor: filter === cat ? "var(--tw-accent)" : "var(--tw-border)",
              background: filter === cat ? "var(--tw-accent)" : "transparent",
              color: filter === cat ? "#fff" : "var(--tw-text-dim)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-0.5 max-h-[300px] overflow-auto">
        {filtered.length === 0 && (
          <div className="text-[8px] py-2 text-center" style={{ color: "var(--tw-text-muted)" }}>
            No events
          </div>
        )}
        {filtered.slice(0, 100).map((evt) => (
          <div
            key={evt.id}
            className="flex items-center gap-1.5 rounded px-1 py-0.5"
            style={{ background: "var(--tw-bg-card)" }}
          >
            {/* Kind badge */}
            <span
              className="shrink-0 rounded text-[7px] font-mono px-1 py-0.5"
              style={{ background: kindColor(evt.kind) + "20", color: kindColor(evt.kind) }}
            >
              {KIND_ICONS[evt.kind] || evt.kind}
            </span>

            {/* Label / detail */}
            <span
              className="flex-1 truncate text-[8px]"
              style={{ color: "var(--tw-text-dim)" }}
              title={evt.targetLabel || evt.targetId || ""}
            >
              {evt.targetLabel || evt.kind}
              {evt.detail && Array.isArray(evt.detail.fields) ? (
                <span style={{ color: "var(--tw-text-muted)" }}>
                  {" "}({(evt.detail.fields as string[]).join(", ")})
                </span>
              ) : null}
            </span>

            {/* Relative time */}
            <span className="shrink-0 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
              {relativeTime(evt.ts)}
            </span>
          </div>
        ))}
      </div>

      {/* Total count */}
      <div className="mt-1 text-[7px] text-right" style={{ color: "var(--tw-text-muted)" }}>
        {events.length} events total
      </div>
    </div>
  );
}
