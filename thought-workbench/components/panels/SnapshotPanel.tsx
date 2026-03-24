import React, { useState } from "react";
import type { Snapshot, SnapshotScope } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";

interface SnapshotPanelProps {
  snapshots: Snapshot[];
  lang: "ja" | "en";
  onCapture: (label: string, scope: SnapshotScope) => void;
  onDelete: (id: string) => void;
}

const SCOPE_OPTIONS: { value: SnapshotScope; label: string }[] = [
  { value: "topic", label: "Topic" },
  { value: "workspace", label: "Workspace" },
  { value: "selection", label: "Selection" },
];

const TRIGGER_COLORS: Record<string, string> = {
  manual: "#6b7280",
  branch: "#3b82f6",
  integrity: "#f59e0b",
  import: "#22c55e",
};

const SCOPE_COLORS: Record<string, string> = {
  topic: "#8b5cf6",
  workspace: "#0ea5e9",
  selection: "#f97316",
};

export function SnapshotPanel({ snapshots, lang, onCapture, onDelete }: SnapshotPanelProps) {
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<SnapshotScope>("topic");

  const handleCapture = () => {
    onCapture(label.trim() || (lang === "ja" ? "スナップショット" : "Snapshot"), scope);
    setLabel("");
  };

  const sorted = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <FieldLabel>{lang === "ja" ? "新規スナップショット" : "Capture Snapshot"}</FieldLabel>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={lang === "ja" ? "ラベル（省略可）" : "Label (optional)"}
        />
        <Select value={scope} onChange={(e) => setScope(e.target.value as SnapshotScope)}>
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Button onClick={handleCapture}>
          {lang === "ja" ? "保存" : "Save"}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--tw-text-muted)", marginTop: 12 }}>
          {lang === "ja" ? "スナップショットなし" : "No snapshots"}
        </p>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((snap) => (
            <div
              key={snap.id}
              style={{
                background: "var(--tw-bg-card)",
                border: "1px solid var(--tw-border)",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--tw-text)" }}>{snap.label}</span>
                <Button onClick={() => onDelete(snap.id)}>✕</Button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 9999,
                  background: SCOPE_COLORS[snap.scope] + "33",
                  color: SCOPE_COLORS[snap.scope], fontWeight: 600,
                }}>
                  {snap.scope}
                </span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 9999,
                  background: TRIGGER_COLORS[snap.triggeredBy] + "33",
                  color: TRIGGER_COLORS[snap.triggeredBy], fontWeight: 600,
                }}>
                  {snap.triggeredBy}
                </span>
                <span style={{ fontSize: 10, color: "var(--tw-text-muted)" }}>
                  {new Date(snap.createdAt).toLocaleString(lang === "ja" ? "ja-JP" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              {snap.note && (
                <p style={{ fontSize: 11, color: "var(--tw-text-muted)", margin: 0 }}>{snap.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
