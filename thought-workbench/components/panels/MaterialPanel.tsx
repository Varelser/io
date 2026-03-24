import React, { useState } from "react";
import type { Material, TopicItem } from "../../types";
import { MATERIAL_TYPES, MATERIAL_STATUSES } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { newId } from "../../utils/id";
import { extractNodeCandidatesFromMaterial, type ExtractionCandidate } from "../../utils/material-extractor";

const STATUS_COLORS: Record<string, string> = {
  unread: "#9ca3af",
  skimmed: "#eab308",
  reading: "#3b82f6",
  summarized: "#22c55e",
  cited: "#f59e0b",
};

export function MaterialPanel({
  materials,
  topics = [],
  fullTopics = [],
  lang,
  onUpdate,
  onNavigate: _onNavigate,
}: {
  materials: Material[];
  topics?: { id: string; title: string }[];
  fullTopics?: TopicItem[];
  lang: "ja" | "en";
  onUpdate: (materials: Material[]) => void;
  onNavigate?: (topicId: string, nodeId: string | null) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extractionResults, setExtractionResults] = useState<Record<string, ExtractionCandidate[]>>({});

  const handleAdd = () => {
    const m: Material = {
      id: newId("mat"),
      label: lang === "ja" ? "新しい資料" : "New Material",
      type: "document",
      status: "unread",
      createdAt: new Date().toISOString(),
    };
    onUpdate([m, ...materials]);
    setExpandedId(m.id);
  };

  const updateItem = (id: string, patch: Partial<Material>) => {
    onUpdate(materials.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)));
  };

  const deleteItem = (id: string) => {
    onUpdate(materials.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          {materials.length} {lang === "ja" ? "件" : "items"}
        </span>
        <Button onClick={handleAdd}>+ {lang === "ja" ? "追加" : "Add"}</Button>
      </div>
      {materials.map((mat) => {
        const isExpanded = expandedId === mat.id;
        return (
          <div key={mat.id} className="rounded-md border p-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
            <div
              className="flex cursor-pointer items-center gap-1.5"
              onClick={() => setExpandedId(isExpanded ? null : mat.id)}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[mat.status] || "#9ca3af" }}
              />
              <span className="flex-1 truncate text-[8px]" style={{ color: "var(--tw-text)" }}>{mat.label}</span>
              <span className="shrink-0 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>{mat.type}</span>
            </div>
            {isExpanded && (
              <div className="mt-1.5 space-y-1">
                <div>
                  <FieldLabel>{lang === "ja" ? "タイトル" : "Label"}</FieldLabel>
                  <Input value={mat.label} onChange={(e) => updateItem(mat.id, { label: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <FieldLabel>{lang === "ja" ? "種別" : "Type"}</FieldLabel>
                    <Select value={mat.type} onChange={(e) => updateItem(mat.id, { type: e.target.value as Material["type"] })}>
                      {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>{lang === "ja" ? "状態" : "Status"}</FieldLabel>
                    <Select value={mat.status} onChange={(e) => updateItem(mat.id, { status: e.target.value as Material["status"] })}>
                      {MATERIAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                </div>
                <div>
                  <FieldLabel>URL</FieldLabel>
                  <Input value={mat.url || ""} onChange={(e) => updateItem(mat.id, { url: e.target.value || undefined })} placeholder="https://..." />
                </div>
                <div>
                  <FieldLabel>{lang === "ja" ? "ノート" : "Note"}</FieldLabel>
                  <Input value={mat.note || ""} onChange={(e) => updateItem(mat.id, { note: e.target.value || undefined })} />
                </div>
                <div>
                  <FieldLabel>{lang === "ja" ? "リンクノードID（カンマ区切り）" : "Linked Node IDs"}</FieldLabel>
                  <Input
                    value={(mat.linkedNodeIds || []).join(", ")}
                    onChange={(e) => updateItem(mat.id, { linkedNodeIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="nodeId1, nodeId2"
                  />
                </div>
                <div>
                  <FieldLabel>{lang === "ja" ? "トピック" : "Topic"}</FieldLabel>
                  <Select
                    value={mat.topicId || ""}
                    onChange={(e) => onUpdate(materials.map((m) => m.id === mat.id ? { ...m, topicId: e.target.value || undefined } : m))}
                  >
                    <option value="">-</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </Select>
                </div>
                {/* ── ノード候補抽出 ── */}
                {fullTopics.length > 0 && (
                  <div>
                    <Button
                      onClick={() => {
                        const candidates = extractNodeCandidatesFromMaterial(mat, fullTopics);
                        setExtractionResults((prev) => ({ ...prev, [mat.id]: candidates }));
                        setExtractingId(extractingId === mat.id ? null : mat.id);
                      }}
                      className="w-full"
                    >
                      {lang === "ja" ? "ノード候補を抽出" : "Extract node candidates"}
                    </Button>
                    {extractingId === mat.id && extractionResults[mat.id] && (
                      <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto rounded border p-1" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}>
                        {extractionResults[mat.id].length === 0 ? (
                          <div className="text-[7px] text-center py-1" style={{ color: "var(--tw-text-muted)" }}>
                            {lang === "ja" ? "候補なし" : "No candidates"}
                          </div>
                        ) : extractionResults[mat.id].map((c, i) => (
                          <div key={i} className="flex items-center gap-1 rounded px-1 py-0.5" style={{ background: "var(--tw-bg-card)" }}>
                            <span
                              className="text-[7px] shrink-0 rounded-full px-1.5 py-0.5"
                              style={{
                                background: c.isNew ? "#a78bfa20" : "#22c55e20",
                                color: c.isNew ? "#a78bfa" : "#22c55e",
                              }}
                            >
                              {c.isNew ? (lang === "ja" ? "新規" : "New") : (lang === "ja" ? "既存" : "Match")}
                            </span>
                            <span className="flex-1 truncate text-[8px]" style={{ color: "var(--tw-text)" }}>
                              {c.isNew ? c.keyword : c.matchedNode?.label}
                            </span>
                            {!c.isNew && c.matchedNode && (
                              <>
                                <span className="text-[7px] shrink-0" style={{ color: "var(--tw-text-muted)" }}>{c.matchedNode.topicTitle}</span>
                                <button
                                  className="text-[7px] shrink-0 rounded border px-1 py-0.5"
                                  style={{ borderColor: "#22c55e44", color: "#22c55e", background: "#22c55e10" }}
                                  onClick={() => {
                                    const prev = mat.linkedNodeIds || [];
                                    if (!prev.includes(c.matchedNode!.nodeId)) {
                                      updateItem(mat.id, { linkedNodeIds: [...prev, c.matchedNode!.nodeId] });
                                    }
                                  }}
                                >
                                  {lang === "ja" ? "リンク" : "Link"}
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Button danger onClick={() => deleteItem(mat.id)} className="w-full">{lang === "ja" ? "削除" : "Delete"}</Button>
              </div>
            )}
          </div>
        );
      })}
      {materials.length === 0 && (
        <div className="py-3 text-center text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "資料がありません" : "No materials"}
        </div>
      )}
    </div>
  );
}
