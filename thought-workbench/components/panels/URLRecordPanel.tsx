import React, { useState } from "react";
import type { URLRecord, UrlState } from "../../types";
import { URL_STATES } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { newId } from "../../utils/id";

const STATUS_COLORS: Record<UrlState, string> = {
  unverified: "#9ca3af",
  verified: "#22c55e",
  broken: "#ef4444",
  duplicated: "#f97316",
  archived: "#6b7280",
};

export function URLRecordPanel({
  urlRecords,
  lang,
  onUpdate,
}: {
  urlRecords: URLRecord[];
  lang: "ja" | "en";
  onUpdate: (records: URLRecord[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    const rec: URLRecord = {
      id: newId("url"),
      url: "",
      status: "unverified",
      createdAt: new Date().toISOString(),
    };
    onUpdate([rec, ...urlRecords]);
    setExpandedId(rec.id);
  };

  const updateItem = (id: string, patch: Partial<URLRecord>) => {
    onUpdate(urlRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteItem = (id: string) => {
    onUpdate(urlRecords.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          {urlRecords.length} {lang === "ja" ? "件" : "records"}
        </span>
        <Button onClick={handleAdd}>+ {lang === "ja" ? "追加" : "Add"}</Button>
      </div>
      {urlRecords.map((rec) => {
        const isExpanded = expandedId === rec.id;
        return (
          <div key={rec.id} className="rounded-md border p-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
            <div
              className="flex cursor-pointer items-center gap-1.5"
              onClick={() => setExpandedId(isExpanded ? null : rec.id)}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[rec.status] }}
              />
              <span className="flex-1 truncate text-[8px]" style={{ color: "var(--tw-text)" }}>
                {rec.label || rec.url || "(empty)"}
              </span>
              <span className="shrink-0 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>{rec.status}</span>
            </div>
            {isExpanded && (
              <div className="mt-1.5 space-y-1">
                <FieldLabel>URL</FieldLabel>
                <Input
                  value={rec.url}
                  onChange={(e) => updateItem(rec.id, { url: e.target.value })}
                  placeholder="https://..."
                  style={!rec.url ? { borderColor: "#ef4444" } : undefined}
                />
                <FieldLabel>{lang === "ja" ? "ラベル" : "Label"}</FieldLabel>
                <Input value={rec.label || ""} onChange={(e) => updateItem(rec.id, { label: e.target.value || undefined })} />
                <FieldLabel>{lang === "ja" ? "状態" : "Status"}</FieldLabel>
                <Select value={rec.status} onChange={(e) => updateItem(rec.id, { status: e.target.value as URLRecord["status"] })}>
                  {URL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <FieldLabel>{lang === "ja" ? "最終確認日時" : "Last Checked"}</FieldLabel>
                <Input type="datetime-local" value={rec.lastCheckedAt ? rec.lastCheckedAt.slice(0, 16) : ""} onChange={(e) => updateItem(rec.id, { lastCheckedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                <FieldLabel>{lang === "ja" ? "リダイレクト先" : "Resolved URL"}</FieldLabel>
                <Input value={rec.resolvedUrl || ""} onChange={(e) => updateItem(rec.id, { resolvedUrl: e.target.value || undefined })} placeholder="https://..." />
                <FieldLabel>{lang === "ja" ? "ノート" : "Note"}</FieldLabel>
                <Input value={rec.note || ""} onChange={(e) => updateItem(rec.id, { note: e.target.value || undefined })} />
                <Button danger onClick={() => deleteItem(rec.id)} className="w-full">{lang === "ja" ? "削除" : "Delete"}</Button>
              </div>
            )}
          </div>
        );
      })}
      {urlRecords.length === 0 && (
        <div className="py-3 text-center text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "URL記録がありません" : "No URL records"}
        </div>
      )}
    </div>
  );
}
