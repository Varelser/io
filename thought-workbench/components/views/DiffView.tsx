import React, { useMemo, useState } from "react";
import type { TopicItem, HistoryFrame, NodeItem } from "../../types";

type DiffStatus = "added" | "removed" | "moved" | "resized" | "fieldChanged" | "unchanged";

type FieldChange = { field: string; before: string; after: string };

type DiffEntry = {
  nodeId: string;
  label: string;
  type: string;
  status: DiffStatus;
  before?: { position: [number, number, number]; size: number };
  after?: { position: [number, number, number]; size: number };
  distance?: number;
  fieldChanges?: FieldChange[];
};

const STATUS_COLORS: Record<DiffStatus, string> = {
  added: "#4ade80",
  removed: "#f87171",
  moved: "#60a5fa",
  resized: "#fbbf24",
  fieldChanged: "#a78bfa",
  unchanged: "#64748b",
};

const STATUS_LABELS: Record<DiffStatus, { ja: string; en: string }> = {
  added: { ja: "追加", en: "Added" },
  removed: { ja: "削除", en: "Removed" },
  moved: { ja: "移動", en: "Moved" },
  resized: { ja: "サイズ変更", en: "Resized" },
  fieldChanged: { ja: "内容変更", en: "Changed" },
  unchanged: { ja: "変更なし", en: "Unchanged" },
};

function detectFieldChanges(
  a: HistoryFrame["nodes"][0],
  b: HistoryFrame["nodes"][0],
): FieldChange[] {
  const changes: FieldChange[] = [];
  if (a.label !== undefined && b.label !== undefined && a.label !== b.label) {
    changes.push({ field: "label", before: a.label, after: b.label });
  }
  if (a.nodeType !== undefined && b.nodeType !== undefined && a.nodeType !== b.nodeType) {
    changes.push({ field: "type", before: a.nodeType, after: b.nodeType });
  }
  if ((a.workStatus || "") !== (b.workStatus || "")) {
    changes.push({ field: "work", before: a.workStatus || "-", after: b.workStatus || "-" });
  }
  if ((a.intakeStatus || "") !== (b.intakeStatus || "")) {
    changes.push({ field: "intake", before: a.intakeStatus || "-", after: b.intakeStatus || "-" });
  }
  return changes;
}

function computeDiff(
  topic: TopicItem,
  frameA: HistoryFrame,
  frameB: HistoryFrame,
): DiffEntry[] {
  const nodeMap = new Map<string, NodeItem>();
  topic.nodes.forEach((n) => nodeMap.set(n.id, n));

  const aMap = new Map(frameA.nodes.map((n) => [n.id, n]));
  const bMap = new Map(frameB.nodes.map((n) => [n.id, n]));
  const allIds = new Set([...aMap.keys(), ...bMap.keys()]);

  const entries: DiffEntry[] = [];
  for (const id of allIds) {
    const inA = aMap.get(id);
    const inB = bMap.get(id);
    const node = nodeMap.get(id);
    const label = inB?.label || inA?.label || node?.label || id.slice(0, 8);
    const type = inB?.nodeType || inA?.nodeType || node?.type || "unknown";

    if (!inA && inB) {
      entries.push({ nodeId: id, label, type, status: "added", after: inB });
    } else if (inA && !inB) {
      entries.push({ nodeId: id, label, type, status: "removed", before: inA });
    } else if (inA && inB) {
      const dx = inA.position[0] - inB.position[0];
      const dy = inA.position[1] - inB.position[1];
      const dz = inA.position[2] - inB.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const sizeDiff = Math.abs(inA.size - inB.size);
      const fieldChanges = detectFieldChanges(inA, inB);

      if (dist > 0.05) {
        entries.push({ nodeId: id, label, type, status: "moved", before: inA, after: inB, distance: dist, fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined });
      } else if (sizeDiff > 0.01) {
        entries.push({ nodeId: id, label, type, status: "resized", before: inA, after: inB, fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined });
      } else if (fieldChanges.length > 0) {
        entries.push({ nodeId: id, label, type, status: "fieldChanged", before: inA, after: inB, fieldChanges });
      } else {
        entries.push({ nodeId: id, label, type, status: "unchanged", before: inA, after: inB });
      }
    }
  }

  // Sort: added/removed/moved/fieldChanged first, unchanged last
  const order: DiffStatus[] = ["added", "removed", "moved", "resized", "fieldChanged", "unchanged"];
  entries.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return entries;
}

export function DiffView({
  topic,
  lang,
  onSelectNode,
}: {
  topic: TopicItem | null;
  lang?: "ja" | "en";
  onSelectNode?: (nodeId: string) => void;
}) {
  const l = lang || "ja";
  const frames = topic?.history || [];
  const [frameAIdx, setFrameAIdx] = useState(frames.length > 1 ? 0 : -1);
  const [frameBIdx, setFrameBIdx] = useState(frames.length > 1 ? 1 : -1);
  const [hideUnchanged, setHideUnchanged] = useState(true);

  const diff = useMemo(() => {
    if (!topic || frameAIdx < 0 || frameBIdx < 0 || frameAIdx === frameBIdx) return [];
    const fA = frames[frameAIdx];
    const fB = frames[frameBIdx];
    if (!fA || !fB) return [];
    return computeDiff(topic, fA, fB);
  }, [topic, frames, frameAIdx, frameBIdx]);

  const filtered = hideUnchanged ? diff.filter((d) => d.status !== "unchanged") : diff;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    diff.forEach((d) => c[d.status] = (c[d.status] || 0) + 1);
    return c;
  }, [diff]);

  if (!topic) {
    return (
      <div className="p-4 h-full flex items-center justify-center" style={{ background: "var(--tw-bg)", color: "var(--tw-text-muted)" }}>
        <div className="text-[10px]">{l === "ja" ? "球体を選択してください" : "Select a sphere"}</div>
      </div>
    );
  }

  if (frames.length < 2) {
    return (
      <div className="p-4 h-full flex items-center justify-center" style={{ background: "var(--tw-bg)", color: "var(--tw-text-muted)" }}>
        <div className="text-center">
          <div className="text-[10px]">{l === "ja" ? "比較するにはスナップショットが2つ以上必要です" : "Need at least 2 snapshots to compare"}</div>
          <div className="text-[8px] mt-1">{l === "ja" ? "History パネルでスナップショットを作成してください" : "Create snapshots in the History panel"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto" style={{ background: "var(--tw-bg)", color: "var(--tw-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[13px] font-medium">{l === "ja" ? "差分比較" : "Diff"}</div>
      </div>

      {/* Frame selectors */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[8px] mb-0.5" style={{ color: "var(--tw-text-muted)" }}>
            {l === "ja" ? "比較元 (Before)" : "Before"}
          </div>
          <select
            value={frameAIdx}
            onChange={(e) => setFrameAIdx(Number(e.target.value))}
            className="w-full rounded border px-1.5 py-1 text-[9px]"
            style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
          >
            {frames.map((f, i) => (
              <option key={f.id} value={i}>{f.label} ({new Date(f.createdAt).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[8px] mb-0.5" style={{ color: "var(--tw-text-muted)" }}>
            {l === "ja" ? "比較先 (After)" : "After"}
          </div>
          <select
            value={frameBIdx}
            onChange={(e) => setFrameBIdx(Number(e.target.value))}
            className="w-full rounded border px-1.5 py-1 text-[9px]"
            style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
          >
            {frames.map((f, i) => (
              <option key={f.id} value={i}>{f.label} ({new Date(f.createdAt).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(["added", "removed", "moved", "resized", "fieldChanged", "unchanged"] as DiffStatus[]).map((s) => (
          <span
            key={s}
            className="rounded-full px-2 py-0.5 text-[7px]"
            style={{ background: STATUS_COLORS[s] + "20", color: STATUS_COLORS[s] }}
          >
            {STATUS_LABELS[s][l]} {statusCounts[s] || 0}
          </span>
        ))}
        <label className="flex items-center gap-1 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={hideUnchanged}
            onChange={(e) => setHideUnchanged(e.target.checked)}
            className="accent-blue-400"
          />
          <span className="text-[8px]" style={{ color: "var(--tw-text-dim)" }}>
            {l === "ja" ? "変更なしを非表示" : "Hide unchanged"}
          </span>
        </label>
      </div>

      {/* Diff entries */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-[9px] py-4 text-center" style={{ color: "var(--tw-text-muted)" }}>
            {frameAIdx === frameBIdx
              ? (l === "ja" ? "同じフレームが選択されています" : "Same frame selected")
              : (l === "ja" ? "差分なし" : "No differences")}
          </div>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.nodeId}
            className="rounded-md border px-2 py-1.5 cursor-pointer transition-colors hover:border-blue-500/40"
            style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}
            onClick={() => onSelectNode?.(entry.nodeId)}
          >
            <div className="flex items-center gap-2">
              {/* Status badge */}
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[7px] font-medium"
                style={{ background: STATUS_COLORS[entry.status] + "20", color: STATUS_COLORS[entry.status] }}
              >
                {STATUS_LABELS[entry.status][l]}
              </span>

              {/* Node info */}
              <div className="flex-1 min-w-0">
                <div className="text-[9px] truncate" style={{ color: "var(--tw-text)" }}>{entry.label}</div>
                <div className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>{entry.type}</div>
              </div>

              {/* Position change distance */}
              {entry.status === "moved" && entry.distance != null && (
                <span className="text-[7px] shrink-0" style={{ color: STATUS_COLORS.moved }}>
                  Δ{entry.distance.toFixed(2)}
                </span>
              )}
            </div>

            {/* Field changes detail */}
            {entry.fieldChanges && entry.fieldChanges.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {entry.fieldChanges.map((fc) => (
                  <span key={fc.field} className="rounded px-1.5 py-0.5 text-[7px]" style={{ background: "#a78bfa20", color: "#a78bfa" }}>
                    {fc.field}: <span style={{ color: "#f87171", textDecoration: "line-through" }}>{fc.before}</span>{" → "}<span style={{ color: "#4ade80" }}>{fc.after}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
