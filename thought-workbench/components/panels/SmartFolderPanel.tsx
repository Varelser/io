import React, { useMemo, useState } from "react";
import { EVIDENCE_BASES, HYPOTHESIS_STAGES, INTAKE_STATUSES, KNOWLEDGE_PHASES, MEMBERSHIP_STATUSES, REVIEW_STATES, PUBLICATION_STATES, URL_STATES, VERSION_STATES, WORK_STATUSES } from "../../types";
import type { SmartFolder, TopicItem, VocabTerm } from "../../types";
import {
  countSmartFolderMatches,
  sanitizeSmartFolderFilter,
} from "../../utils/smart-folder";
import {
  getIntakeStatusLabel,
  getPublicationStateLabel,
  getReviewStateLabel,
  getUrlStateLabel,
  getVersionStateLabel,
  getWorkStatusLabel,
} from "../../utils/state-model";

export interface SmartFolderPanelProps {
  folders: SmartFolder[];
  topics: TopicItem[];
  onAddFolder: (folder: SmartFolder) => void;
  onUpdateFolder?: (id: string, patch: Partial<SmartFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onSelectFolder: (folder: SmartFolder) => void;
  lang?: "ja" | "en";
  vocabulary?: VocabTerm[];
}

const BUILTIN_FOLDERS: SmartFolder[] = [
  { id: "__builtin_inbox", label: "未整理 Inbox", builtin: true, filter: { intakeStatus: "inbox" } },
  { id: "__builtin_staging", label: "ステージング", builtin: true, filter: { intakeStatus: "staging" } },
  { id: "__builtin_review", label: "要レビュー", builtin: true, filter: { workStatus: "review" } },
  { id: "__builtin_recent", label: "最近更新", builtin: true, filter: { staleDays: 7 } },
  { id: "__builtin_low_conf", label: "低確信度", builtin: true, filter: { lowConfidence: 0.3 } },
  { id: "__builtin_unverified", label: "未検証", builtin: true, filter: { evidenceBasis: "unverified" } },
  { id: "__builtin_hold", label: "保留中", builtin: true, filter: { workStatus: "onHold" } },
  { id: "__builtin_orphan", label: "孤立ノード", builtin: true, filter: { hasEdges: false } },
  { id: "__builtin_unprocessed", label: "未処理", builtin: true, filter: { workStatus: "unprocessed" } },
  { id: "__builtin_archive", label: "アーカイブ", builtin: true, filter: { intakeStatus: "archive" } },
];

type EditorDraft = {
  label: string;
  filter: SmartFolder["filter"];
};

function filterLabel(lang: "ja" | "en", labelJa: string, labelEn: string) {
  return lang === "ja" ? labelJa : labelEn;
}

export function SmartFolderPanel({
  folders,
  topics,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onSelectFolder,
  lang = "ja",
  vocabulary = [],
}: SmartFolderPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);

  const customFolders = useMemo(() => folders.filter((f) => !f.builtin), [folders]);
  const allFolders = useMemo(() => [...BUILTIN_FOLDERS, ...customFolders], [customFolders]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const folder of allFolders) {
      map.set(folder.id, countSmartFolderMatches(topics, folder.filter));
    }
    return map;
  }, [allFolders, topics]);

  const beginEdit = (folder: SmartFolder) => {
    setEditingFolderId(folder.id);
    setDraft({
      label: folder.label,
      filter: {
        ...folder.filter,
      },
    });
  };

  const cancelEdit = () => {
    setEditingFolderId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!editingFolderId || !draft || !onUpdateFolder) return;
    const label = draft.label.trim();
    if (!label) return;
    onUpdateFolder(editingFolderId, {
      label,
      filter: sanitizeSmartFolderFilter(draft.filter),
    });
    cancelEdit();
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const folderId = `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder: SmartFolder = {
      id: folderId,
      label: newLabel.trim(),
      filter: {},
    };
    onAddFolder(folder);
    setShowAddForm(false);
    setNewLabel("");
    beginEdit(folder);
  };

  const editFilter = draft?.filter || {};

  return (
    <div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {/* System folders section */}
        <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 4px", marginBottom: 2 }}>
          {lang === "ja" ? "System" : "System"}
        </div>
        {BUILTIN_FOLDERS.map((folder) => {
          const count = counts.get(folder.id) ?? 0;
          return (
            <div key={folder.id} style={{ marginBottom: 4 }}>
              <div
                onClick={() => onSelectFolder(folder)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 4px",
                  borderRadius: 3,
                  background: "var(--tw-bg-card, #1e1e30)",
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 14,
                    textAlign: "center",
                    fontSize: 10,
                    color: "var(--tw-accent, #f59e0b)",
                  }}
                  title={lang === "ja" ? "システムフォルダ" : "System folder"}
                >
                  {"\u{1F512}"}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "var(--tw-text, #ccc)",
                  }}
                >
                  {folder.label}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    minWidth: 18,
                    textAlign: "center",
                    fontSize: 8,
                    padding: "0 3px",
                    borderRadius: 6,
                    background: count > 0 ? "var(--tw-accent, #f59e0b)30" : "transparent",
                    color: count > 0 ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)",
                  }}
                >
                  {count}
                </span>
              </div>
            </div>
          );
        })}

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--tw-border, #333)", margin: "6px 0" }} />

        {/* Custom folders section */}
        <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 4px", marginBottom: 2 }}>
          {lang === "ja" ? "Custom" : "Custom"} ({customFolders.length})
        </div>
        {customFolders.map((folder) => {
          const count = counts.get(folder.id) ?? 0;
          const isEditing = editingFolderId === folder.id;
          return (
            <div key={folder.id} style={{ marginBottom: 4 }}>
              <div
                onClick={() => onSelectFolder(folder)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 4px",
                  borderRadius: 3,
                  background: "var(--tw-bg-card, #1e1e30)",
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 14,
                    textAlign: "center",
                    fontSize: 10,
                    color: "var(--tw-text, #ccc)",
                  }}
                >
                  {"\u25A1"}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "var(--tw-text, #ccc)",
                  }}
                >
                  {folder.label}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    minWidth: 18,
                    textAlign: "center",
                    fontSize: 8,
                    padding: "0 3px",
                    borderRadius: 6,
                    background: count > 0 ? "var(--tw-accent, #f59e0b)30" : "transparent",
                    color: count > 0 ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)",
                  }}
                >
                  {count}
                </span>
                {!folder.builtin && onUpdateFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      isEditing ? cancelEdit() : beginEdit(folder);
                    }}
                    style={{
                      flexShrink: 0,
                      width: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      border: "none",
                      background: "transparent",
                      color: isEditing ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #555)",
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                    title={lang === "ja" ? "編集" : "Edit"}
                  >
                    {isEditing ? "•" : "✎"}
                  </button>
                )}
                {!folder.builtin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditing) cancelEdit();
                      onDeleteFolder(folder.id);
                    }}
                    style={{
                      flexShrink: 0,
                      width: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      border: "none",
                      background: "transparent",
                      color: "var(--tw-text-muted, #555)",
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                    title={lang === "ja" ? "削除" : "Delete"}
                  >
                    x
                  </button>
                )}
              </div>
              {isEditing && draft && (
                <div
                  style={{
                    marginTop: 3,
                    padding: 6,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.02)",
                    display: "grid",
                    gap: 5,
                  }}
                >
                  <input
                    value={draft.label}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, label: e.target.value } : prev)}
                    placeholder={lang === "ja" ? "フォルダ名" : "Folder name"}
                    style={{
                      width: "100%",
                      fontSize: 9,
                      padding: "3px 4px",
                      background: "transparent",
                      border: "1px solid var(--tw-border, #333)",
                      borderRadius: 3,
                      color: "var(--tw-text, #ccc)",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "分野", "Domain")}</span>
                      <input
                        value={editFilter.topicDomain || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, topicDomain: e.target.value || undefined } } : prev)}
                        placeholder={lang === "ja" ? "部分一致" : "partial match"}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "文字列", "Text")}</span>
                      <input
                        value={editFilter.textMatch || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, textMatch: e.target.value } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "タイプ", "Type")}</span>
                      <input
                        value={editFilter.type || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, type: e.target.value } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "取り込み", "Intake")}</span>
                      <select
                        value={editFilter.intakeStatus || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, intakeStatus: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {INTAKE_STATUSES.map((status) => <option key={status} value={status}>{getIntakeStatusLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "作業", "Work")}</span>
                      <select
                        value={editFilter.workStatus || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, workStatus: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {WORK_STATUSES.map((status) => <option key={status} value={status}>{getWorkStatusLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "版", "Version")}</span>
                      <select
                        value={editFilter.versionState || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, versionState: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {VERSION_STATES.map((status) => <option key={status} value={status}>{getVersionStateLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "レビュー", "Review")}</span>
                      <select
                        value={editFilter.reviewState || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, reviewState: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {REVIEW_STATES.map((status) => <option key={status} value={status}>{getReviewStateLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "公開", "Publication")}</span>
                      <select
                        value={editFilter.publicationState || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, publicationState: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {PUBLICATION_STATES.map((status) => <option key={status} value={status}>{getPublicationStateLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "URL", "URL")}</span>
                      <select
                        value={editFilter.urlState || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, urlState: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {URL_STATES.map((status) => <option key={status} value={status}>{getUrlStateLabel(status, lang)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "根拠", "Evidence")}</span>
                      <select
                        value={editFilter.evidenceBasis || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, evidenceBasis: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {EVIDENCE_BASES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "最近日数", "Recent days")}</span>
                      <input
                        type="number"
                        min={0}
                        value={editFilter.staleDays ?? ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, staleDays: e.target.value === "" ? undefined : Number(e.target.value) } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "低確信度", "Low confidence")}</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={editFilter.lowConfidence ?? ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, lowConfidence: e.target.value === "" ? undefined : Number(e.target.value) } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "接続", "Edges")}</span>
                      <select
                        value={editFilter.hasEdges == null ? "" : editFilter.hasEdges ? "yes" : "no"}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, hasEdges: e.target.value === "" ? undefined : e.target.value === "yes" } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        <option value="yes">{lang === "ja" ? "あり" : "Has edges"}</option>
                        <option value="no">{lang === "ja" ? "なし" : "No edges"}</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "拡張", "Extensions")}</span>
                      <select
                        value={editFilter.hasExtensions == null ? "" : editFilter.hasExtensions ? "yes" : "no"}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, hasExtensions: e.target.value === "" ? undefined : e.target.value === "yes" } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        <option value="yes">{lang === "ja" ? "あり" : "Has ext"}</option>
                        <option value="no">{lang === "ja" ? "なし" : "No ext"}</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "タグ", "Tag")}</span>
                      <input
                        value={editFilter.tags || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, tags: e.target.value || undefined } } : prev)}
                        placeholder={lang === "ja" ? "部分一致" : "partial match"}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "仮説ステージ", "Hypothesis")}</span>
                      <select
                        value={editFilter.hypothesisStage || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, hypothesisStage: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {HYPOTHESIS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "知識フェーズ", "SECI Phase")}</span>
                      <select
                        value={editFilter.knowledgePhase || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, knowledgePhase: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {KNOWLEDGE_PHASES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "メンバー", "Membership")}</span>
                      <select
                        value={editFilter.membershipStatus || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, membershipStatus: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {MEMBERSHIP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "作成以降", "Created after")}</span>
                      <input
                        type="date"
                        value={editFilter.createdAfter || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, createdAfter: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "作成以前", "Created before")}</span>
                      <input
                        type="date"
                        value={editFilter.createdBefore || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, createdBefore: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "更新以降", "Updated after")}</span>
                      <input
                        type="date"
                        value={editFilter.updatedAfter || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, updatedAfter: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)" }}>
                      <span>{filterLabel(lang, "更新以前", "Updated before")}</span>
                      <input
                        type="date"
                        value={editFilter.updatedBefore || ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, updatedBefore: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      />
                    </label>
                  {vocabulary.length > 0 && (
                    <label style={{ display: "grid", gap: 2, fontSize: 8, color: "var(--tw-text-muted, #888)", gridColumn: "1 / -1" }}>
                      <span>{lang === "ja" ? "主題語" : "Subject Term"}</span>
                      <select
                        value={editFilter.subjectTermId ?? ""}
                        onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, subjectTermId: e.target.value || undefined } } : prev)}
                        style={{ fontSize: 9, padding: "2px 4px", background: "transparent", border: "1px solid var(--tw-border, #333)", borderRadius: 3, color: "var(--tw-text, #ccc)" }}
                      >
                        <option value="">-</option>
                        {vocabulary.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                      {editFilter.subjectTermId && (
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8, marginTop: 2 }}>
                          <input
                            type="checkbox"
                            checked={!!editFilter.usesBroaderMatch}
                            onChange={(e) => setDraft((prev) => prev ? { ...prev, filter: { ...prev.filter, usesBroaderMatch: e.target.checked || undefined } } : prev)}
                          />
                          <span>{lang === "ja" ? "上位語も含める" : "Include broader terms"}</span>
                        </label>
                      )}
                    </label>
                  )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                      {countSmartFolderMatches(topics, sanitizeSmartFolderFilter(editFilter))} {lang === "ja" ? "件一致" : "matches"}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={cancelEdit}
                        style={{ fontSize: 8, padding: "2px 5px", border: "1px solid var(--tw-border, #333)", borderRadius: 3, background: "transparent", color: "var(--tw-text-muted, #888)", cursor: "pointer" }}
                      >
                        {lang === "ja" ? "取消" : "Cancel"}
                      </button>
                      <button
                        onClick={saveEdit}
                        style={{ fontSize: 8, padding: "2px 5px", border: "1px solid var(--tw-border, #333)", borderRadius: 3, background: "var(--tw-accent, #f59e0b)20", color: "var(--tw-accent, #f59e0b)", cursor: "pointer" }}
                      >
                        {lang === "ja" ? "保存" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddForm ? (
        <div style={{ marginTop: 4, display: "flex", gap: 2 }}>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setShowAddForm(false);
            }}
            placeholder={lang === "ja" ? "フォルダ名" : "Folder name"}
            style={{
              flex: 1,
              fontSize: 9,
              padding: "2px 4px",
              background: "transparent",
              border: "1px solid var(--tw-border, #333)",
              borderRadius: 3,
              color: "var(--tw-text, #ccc)",
              outline: "none",
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              fontSize: 9,
              padding: "2px 6px",
              border: "1px solid var(--tw-border, #333)",
              borderRadius: 3,
              background: "var(--tw-accent, #f59e0b)20",
              color: "var(--tw-accent, #f59e0b)",
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: "100%",
            marginTop: 4,
            padding: "3px 6px",
            fontSize: 9,
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 4,
            background: "var(--tw-accent, #f59e0b)20",
            color: "var(--tw-accent, #f59e0b)",
            cursor: "pointer",
          }}
        >
          + {lang === "ja" ? "カスタムフォルダ追加" : "Add Custom Folder"}
        </button>
      )}

      <div style={{ marginTop: 4, fontSize: 7, textAlign: "right", color: "var(--tw-text-muted, #555)" }}>
        {allFolders.length} {lang === "ja" ? "フォルダ" : "folders"}
      </div>
    </div>
  );
}
