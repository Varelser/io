import React, { useState, useMemo, useCallback } from "react";
import type { TopicItem, SmartFolder } from "../../types";
import type { NodeItem } from "../../types/node";
import {
  WORK_STATUSES, INTAKE_STATUSES, VERSION_STATES,
  REVIEW_STATES, PUBLICATION_STATES, URL_STATES,
  HYPOTHESIS_STAGES, KNOWLEDGE_PHASES, MEMBERSHIP_STATUSES,
} from "../../types";
import { newId } from "../../utils/id";

// ── Filter types ──

type QueryFilters = {
  text: string;
  type: string;
  tense: string;
  layer: string;
  group: string;
  hasEdges: boolean;
  hasExtensions: boolean;
  createdAfter: string;
  createdBefore: string;
  confidenceMin: string;
  confidenceMax: string;
  noteContains: string;
  workStatus: string;
  intakeStatus: string;
  versionState: string;
  reviewState: string;
  publicationState: string;
  urlState: string;
  tags: string;
  hypothesisStage: string;
  knowledgePhase: string;
  membershipStatus: string;
};

type QueryResult = {
  topicId: string;
  topicTitle: string;
  node: NodeItem;
};

const EMPTY_FILTERS: QueryFilters = {
  text: "",
  type: "",
  tense: "",
  layer: "",
  group: "",
  hasEdges: false,
  hasExtensions: false,
  createdAfter: "",
  createdBefore: "",
  confidenceMin: "",
  confidenceMax: "",
  noteContains: "",
  workStatus: "",
  intakeStatus: "",
  versionState: "",
  reviewState: "",
  publicationState: "",
  urlState: "",
  tags: "",
  hypothesisStage: "",
  knowledgePhase: "",
  membershipStatus: "",
};

const NODE_TYPES = ["概念", "感情", "行動", "主張", "疑問", "仮説", "メタファー", "引用", "観測", "定義", "未分類"] as const;
const TENSES = ["過去", "現在", "未来", "不変", "仮定"] as const;

// ── Query logic ──

function matchesText(node: NodeItem, text: string): boolean {
  const lower = text.toLowerCase();
  return (
    node.label.toLowerCase().includes(lower) ||
    node.note.toLowerCase().includes(lower) ||
    node.group.toLowerCase().includes(lower) ||
    node.layer.toLowerCase().includes(lower)
  );
}

function queryNodes(topics: TopicItem[], filters: QueryFilters): QueryResult[] {
  const results: QueryResult[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      if (filters.text && !matchesText(node, filters.text)) continue;
      if (filters.type && node.type !== filters.type) continue;
      if (filters.tense && node.tense !== filters.tense) continue;
      if (filters.layer && !node.layer.toLowerCase().includes(filters.layer.toLowerCase())) continue;
      if (filters.group && !node.group.toLowerCase().includes(filters.group.toLowerCase())) continue;
      if (filters.hasEdges) {
        const hasEdge = topic.edges.some((e) => e.from === node.id || e.to === node.id);
        if (!hasEdge) continue;
      }
      if (filters.hasExtensions) {
        if (!node.extensions || Object.keys(node.extensions).length === 0) continue;
      }
      if (filters.createdAfter) {
        if (!node.createdAt || node.createdAt < filters.createdAfter) continue;
      }
      if (filters.createdBefore) {
        if (!node.createdAt || node.createdAt > filters.createdBefore) continue;
      }
      if (filters.confidenceMin) {
        const min = parseFloat(filters.confidenceMin);
        if (!isNaN(min) && (node.confidence === undefined || node.confidence < min)) continue;
      }
      if (filters.confidenceMax) {
        const max = parseFloat(filters.confidenceMax);
        if (!isNaN(max) && (node.confidence === undefined || node.confidence > max)) continue;
      }
      if (filters.noteContains) {
        if (!node.note.toLowerCase().includes(filters.noteContains.toLowerCase())) continue;
      }
      if (filters.workStatus) {
        const canonical = node.workStatus || "unprocessed";
        if (canonical !== filters.workStatus) continue;
      }
      if (filters.intakeStatus) {
        const canonical = node.intakeStatus || "inbox";
        if (canonical !== filters.intakeStatus) continue;
      }
      if (filters.versionState && node.versionState !== filters.versionState) continue;
      if (filters.reviewState && (node.reviewState || "none") !== filters.reviewState) continue;
      if (filters.publicationState && node.publicationState !== filters.publicationState) continue;
      if (filters.urlState && node.urlState !== filters.urlState) continue;
      if (filters.hypothesisStage && node.hypothesisStage !== filters.hypothesisStage) continue;
      if (filters.knowledgePhase && node.knowledgePhase !== filters.knowledgePhase) continue;
      if (filters.membershipStatus && node.membershipStatus !== filters.membershipStatus) continue;
      if (filters.tags) {
        const tagQuery = filters.tags.toLowerCase().trim();
        if (!(node.tags || []).some((t) => t.toLowerCase().includes(tagQuery))) continue;
      }
      results.push({ topicId: topic.id, topicTitle: topic.title, node });
    }
  }
  return results;
}

function hasActiveFilter(filters: QueryFilters): boolean {
  return (
    filters.text !== "" ||
    filters.type !== "" ||
    filters.tense !== "" ||
    filters.layer !== "" ||
    filters.group !== "" ||
    filters.hasEdges ||
    filters.hasExtensions ||
    filters.createdAfter !== "" ||
    filters.createdBefore !== "" ||
    filters.confidenceMin !== "" ||
    filters.confidenceMax !== "" ||
    filters.noteContains !== "" ||
    filters.workStatus !== "" ||
    filters.intakeStatus !== "" ||
    filters.versionState !== "" ||
    filters.reviewState !== "" ||
    filters.publicationState !== "" ||
    filters.urlState !== "" ||
    filters.tags !== "" ||
    filters.hypothesisStage !== "" ||
    filters.knowledgePhase !== "" ||
    filters.membershipStatus !== ""
  );
}

// ── Styles ──

const inputStyle: React.CSSProperties = {
  background: "var(--tw-bg-input)",
  borderColor: "var(--tw-border)",
  color: "var(--tw-text)",
  fontSize: "9px",
};

const labelStyle: React.CSSProperties = {
  color: "var(--tw-text-dim)",
  fontSize: "8px",
  marginBottom: "1px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto" as React.CSSProperties["appearance"],
};

// ── Component ──

export function QueryPanel({
  topics,
  onSelectNode,
  onSaveAsSmartFolder,
  lang = "ja",
}: {
  topics: TopicItem[];
  onSelectNode: (topicId: string, nodeId: string) => void;
  onSaveAsSmartFolder?: (folder: Omit<SmartFolder, "id">) => void;
  lang?: "ja" | "en";
}) {
  const [filters, setFilters] = useState<QueryFilters>({ ...EMPTY_FILTERS });
  const [executedFilters, setExecutedFilters] = useState<QueryFilters | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const results: QueryResult[] = useMemo(() => {
    if (!executedFilters || !hasActiveFilter(executedFilters)) return [];
    return queryNodes(topics, executedFilters);
  }, [executedFilters, topics]);

  const handleSearch = useCallback(() => {
    setExecutedFilters({ ...filters });
  }, [filters]);

  const handleClear = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setExecutedFilters(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  const updateFilter = useCallback(<K extends keyof QueryFilters>(key: K, value: QueryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const ja = lang === "ja";

  return (
    <div style={{ fontSize: "9px" }}>
      {/* Filter grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 6px" }}>
        {/* Text search - full width */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={labelStyle}>{ja ? "テキスト検索" : "Text search"}</div>
          <input
            type="text"
            value={filters.text}
            onChange={(e) => updateFilter("text", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ja ? "ラベル, メモ, グループ, レイヤー..." : "label, note, group, layer..."}
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Type */}
        <div>
          <div style={labelStyle}>{ja ? "タイプ" : "Type"}</div>
          <select
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="w-full rounded border px-1 py-0.5"
            style={selectStyle}
          >
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Tense */}
        <div>
          <div style={labelStyle}>{ja ? "時制" : "Tense"}</div>
          <select
            value={filters.tense}
            onChange={(e) => updateFilter("tense", e.target.value)}
            className="w-full rounded border px-1 py-0.5"
            style={selectStyle}
          >
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {TENSES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Layer */}
        <div>
          <div style={labelStyle}>{ja ? "レイヤー" : "Layer"}</div>
          <input
            type="text"
            value={filters.layer}
            onChange={(e) => updateFilter("layer", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ja ? "部分一致" : "partial match"}
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Group */}
        <div>
          <div style={labelStyle}>{ja ? "グループ" : "Group"}</div>
          <input
            type="text"
            value={filters.group}
            onChange={(e) => updateFilter("group", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ja ? "部分一致" : "partial match"}
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Has edges */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "2px" }}>
          <input
            type="checkbox"
            checked={filters.hasEdges}
            onChange={(e) => updateFilter("hasEdges", e.target.checked)}
            style={{ accentColor: "var(--tw-accent)" }}
          />
          <span style={{ color: "var(--tw-text-dim)", fontSize: "8px" }}>{ja ? "エッジあり" : "Has edges"}</span>
        </div>

        {/* Has extensions */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "2px" }}>
          <input
            type="checkbox"
            checked={filters.hasExtensions}
            onChange={(e) => updateFilter("hasExtensions", e.target.checked)}
            style={{ accentColor: "var(--tw-accent)" }}
          />
          <span style={{ color: "var(--tw-text-dim)", fontSize: "8px" }}>{ja ? "拡張あり" : "Has extensions"}</span>
        </div>

        {/* Created after */}
        <div>
          <div style={labelStyle}>{ja ? "作成日 (以降)" : "Created after"}</div>
          <input
            type="date"
            value={filters.createdAfter}
            onChange={(e) => updateFilter("createdAfter", e.target.value)}
            className="w-full rounded border px-1 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Created before */}
        <div>
          <div style={labelStyle}>{ja ? "作成日 (以前)" : "Created before"}</div>
          <input
            type="date"
            value={filters.createdBefore}
            onChange={(e) => updateFilter("createdBefore", e.target.value)}
            className="w-full rounded border px-1 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Confidence min */}
        <div>
          <div style={labelStyle}>{ja ? "確信度 (最小)" : "Confidence min"}</div>
          <input
            type="number"
            value={filters.confidenceMin}
            onChange={(e) => updateFilter("confidenceMin", e.target.value)}
            onKeyDown={handleKeyDown}
            min="0"
            max="1"
            step="0.1"
            placeholder="0.0"
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Confidence max */}
        <div>
          <div style={labelStyle}>{ja ? "確信度 (最大)" : "Confidence max"}</div>
          <input
            type="number"
            value={filters.confidenceMax}
            onChange={(e) => updateFilter("confidenceMax", e.target.value)}
            onKeyDown={handleKeyDown}
            min="0"
            max="1"
            step="0.1"
            placeholder="1.0"
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Note contains - full width */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={labelStyle}>{ja ? "メモ検索" : "Note contains"}</div>
          <input
            type="text"
            value={filters.noteContains}
            onChange={(e) => updateFilter("noteContains", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ja ? "メモ内テキスト..." : "text in note..."}
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Tags - full width */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={labelStyle}>{ja ? "タグ (部分一致)" : "Tag (partial)"}</div>
          <input
            type="text"
            value={filters.tags}
            onChange={(e) => updateFilter("tags", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ja ? "タグ名..." : "tag name..."}
            className="w-full rounded border px-1.5 py-0.5"
            style={inputStyle}
          />
        </div>

        {/* Work status */}
        <div>
          <div style={labelStyle}>{ja ? "作業状態" : "Work status"}</div>
          <select value={filters.workStatus} onChange={(e) => updateFilter("workStatus", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {WORK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Intake status */}
        <div>
          <div style={labelStyle}>{ja ? "取込状態" : "Intake status"}</div>
          <select value={filters.intakeStatus} onChange={(e) => updateFilter("intakeStatus", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {INTAKE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Version state */}
        <div>
          <div style={labelStyle}>{ja ? "バージョン状態" : "Version state"}</div>
          <select value={filters.versionState} onChange={(e) => updateFilter("versionState", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {VERSION_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Review state */}
        <div>
          <div style={labelStyle}>{ja ? "レビュー状態" : "Review state"}</div>
          <select value={filters.reviewState} onChange={(e) => updateFilter("reviewState", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {REVIEW_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Publication state */}
        <div>
          <div style={labelStyle}>{ja ? "公開状態" : "Publication"}</div>
          <select value={filters.publicationState} onChange={(e) => updateFilter("publicationState", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {PUBLICATION_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* URL state */}
        <div>
          <div style={labelStyle}>{ja ? "URL状態" : "URL state"}</div>
          <select value={filters.urlState} onChange={(e) => updateFilter("urlState", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {URL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Hypothesis stage */}
        <div>
          <div style={labelStyle}>{ja ? "仮説ステージ" : "Hyp. stage"}</div>
          <select value={filters.hypothesisStage} onChange={(e) => updateFilter("hypothesisStage", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {HYPOTHESIS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Knowledge phase */}
        <div>
          <div style={labelStyle}>{ja ? "知識フェーズ" : "Knowledge phase"}</div>
          <select value={filters.knowledgePhase} onChange={(e) => updateFilter("knowledgePhase", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {KNOWLEDGE_PHASES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Membership status */}
        <div>
          <div style={labelStyle}>{ja ? "メンバーシップ" : "Membership"}</div>
          <select value={filters.membershipStatus} onChange={(e) => updateFilter("membershipStatus", e.target.value)} className="w-full rounded border px-1 py-0.5" style={selectStyle}>
            <option value="">{ja ? "-- 全て --" : "-- All --"}</option>
            {MEMBERSHIP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "4px", marginTop: "6px", alignItems: "center" }}>
        <button
          onClick={handleSearch}
          className="rounded border px-3 py-1"
          style={{
            borderColor: "var(--tw-accent)",
            color: "var(--tw-accent)",
            background: "var(--tw-bg-card)",
            fontSize: "9px",
            fontWeight: 600,
          }}
        >
          {ja ? "検索" : "Search"}
        </button>
        <button
          onClick={handleClear}
          className="rounded border px-2 py-1"
          style={{
            borderColor: "var(--tw-border)",
            color: "var(--tw-text-dim)",
            background: "var(--tw-bg-card)",
            fontSize: "8px",
          }}
        >
          {ja ? "クリア" : "Clear"}
        </button>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="rounded border px-2 py-1"
          style={{
            borderColor: "var(--tw-border)",
            color: showHelp ? "var(--tw-accent)" : "var(--tw-text-muted)",
            background: "var(--tw-bg-card)",
            fontSize: "8px",
            marginLeft: "auto",
          }}
        >
          {ja ? "ヘルプ" : "Help"}
        </button>
        {executedFilters && hasActiveFilter(executedFilters) && (
          <>
            <span style={{ color: "var(--tw-text-muted)", fontSize: "8px" }}>
              {results.length} {ja ? "件" : "results"}
            </span>
            {onSaveAsSmartFolder && (
              <button
                onClick={() => {
                  const filter: SmartFolder["filter"] = {};
                  if (executedFilters.type) filter.type = executedFilters.type;
                  if (executedFilters.text) filter.textMatch = executedFilters.text;
                  else if (executedFilters.layer) filter.textMatch = executedFilters.layer;
                  if (executedFilters.hasEdges) filter.hasEdges = true;
                  if (executedFilters.hasExtensions) filter.hasExtensions = true;
                  if (executedFilters.confidenceMin) filter.lowConfidence = parseFloat(executedFilters.confidenceMin);
                  if (executedFilters.createdAfter) filter.createdAfter = executedFilters.createdAfter;
                  if (executedFilters.createdBefore) filter.createdBefore = executedFilters.createdBefore;
                  if (executedFilters.workStatus) filter.workStatus = executedFilters.workStatus;
                  if (executedFilters.intakeStatus) filter.intakeStatus = executedFilters.intakeStatus;
                  if (executedFilters.versionState) filter.versionState = executedFilters.versionState;
                  if (executedFilters.reviewState) filter.reviewState = executedFilters.reviewState;
                  if (executedFilters.publicationState) filter.publicationState = executedFilters.publicationState;
                  if (executedFilters.urlState) filter.urlState = executedFilters.urlState;
                  if (executedFilters.tags) filter.tags = executedFilters.tags;
                  if (executedFilters.hypothesisStage) filter.hypothesisStage = executedFilters.hypothesisStage;
                  if (executedFilters.knowledgePhase) filter.knowledgePhase = executedFilters.knowledgePhase;
                  if (executedFilters.membershipStatus) filter.membershipStatus = executedFilters.membershipStatus;
                  const label = [
                    executedFilters.text && `"${executedFilters.text}"`,
                    executedFilters.type && `type:${executedFilters.type}`,
                    executedFilters.layer && `layer:${executedFilters.layer}`,
                    executedFilters.workStatus && `work:${executedFilters.workStatus}`,
                    executedFilters.intakeStatus && `intake:${executedFilters.intakeStatus}`,
                    executedFilters.hypothesisStage && `hyp:${executedFilters.hypothesisStage}`,
                    executedFilters.knowledgePhase && `phase:${executedFilters.knowledgePhase}`,
                    executedFilters.membershipStatus && `member:${executedFilters.membershipStatus}`,
                    executedFilters.reviewState && `review:${executedFilters.reviewState}`,
                    executedFilters.publicationState && `pub:${executedFilters.publicationState}`,
                    executedFilters.urlState && `url:${executedFilters.urlState}`,
                    executedFilters.tags && `tag:${executedFilters.tags}`,
                  ].filter(Boolean).join(" ") || (ja ? "クエリ結果" : "Query result");
                  onSaveAsSmartFolder({ label, filter });
                }}
                className="rounded border px-2 py-0.5"
                style={{
                  borderColor: "var(--tw-border)",
                  color: "var(--tw-text-dim)",
                  background: "var(--tw-bg-card)",
                  fontSize: "8px",
                }}
                title={ja ? "現在のフィルターをスマートフォルダとして保存" : "Save filters as Smart Folder"}
              >
                {ja ? "SF保存" : "→ SmartFolder"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Operator cheat sheet */}
      {showHelp && (
        <div
          style={{
            marginTop: "6px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--tw-border)",
            background: "var(--tw-bg-card)",
            fontSize: "8px",
            color: "var(--tw-text-dim)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--tw-text)", fontSize: "8px" }}>
            {ja ? "フィルター説明" : "Filter Reference"}
          </div>
          {[
            { field: ja ? "テキスト検索" : "Text search", desc: ja ? "ラベル・メモ・グループ・レイヤーを部分一致で検索" : "Partial match across label, note, group, layer" },
            { field: ja ? "タイプ" : "Type", desc: ja ? "ノードタイプで完全一致フィルター" : "Exact match on node type" },
            { field: ja ? "時制" : "Tense", desc: ja ? "過去/現在/未来/不変/仮定で絞り込み" : "Filter by temporal tense" },
            { field: ja ? "レイヤー" : "Layer", desc: ja ? "レイヤー名を部分一致で検索" : "Partial match on layer name" },
            { field: ja ? "グループ" : "Group", desc: ja ? "グループ名を部分一致で検索" : "Partial match on group name" },
            { field: ja ? "エッジあり" : "Has edges", desc: ja ? "エッジが1本以上あるノードのみ" : "Nodes with at least one edge" },
            { field: ja ? "拡張あり" : "Has extensions", desc: ja ? "extensions フィールドに値があるノードのみ" : "Nodes with non-empty extensions" },
            { field: ja ? "作成日" : "Created", desc: ja ? "作成日の範囲（以降/以前）" : "Created date range (after / before)" },
            { field: ja ? "確信度" : "Confidence", desc: ja ? "0.0〜1.0 の数値範囲でフィルター" : "Numeric range 0.0–1.0" },
            { field: ja ? "メモ検索" : "Note contains", desc: ja ? "メモフィールド内の部分一致" : "Partial match inside note field" },
          ].map(({ field, desc }) => (
            <div key={field} style={{ display: "flex", gap: "6px", marginBottom: "3px" }}>
              <span style={{ color: "var(--tw-accent)", minWidth: "72px", flexShrink: 0 }}>{field}</span>
              <span style={{ color: "var(--tw-text-muted)" }}>{desc}</span>
            </div>
          ))}
          <div style={{ marginTop: "4px", color: "var(--tw-text-muted)", fontSize: "7px" }}>
            {ja ? "複数フィルターはすべて AND 条件で適用されます。Enter キーで検索実行。" : "Multiple filters are combined with AND. Press Enter to search."}
          </div>
        </div>
      )}

      {/* Results list */}
      {executedFilters && hasActiveFilter(executedFilters) && (
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            marginTop: "6px",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                color: "var(--tw-text-muted)",
                fontSize: "8px",
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              {ja ? "該当なし" : "No results"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {results.map((r) => (
                <div
                  key={`${r.topicId}-${r.node.id}`}
                  onClick={() => onSelectNode(r.topicId, r.node.id)}
                  className="rounded border cursor-pointer transition-colors"
                  style={{
                    borderColor: "var(--tw-border)",
                    background: "var(--tw-bg-card)",
                    padding: "4px 6px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tw-accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tw-border)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        color: "var(--tw-text)",
                        fontSize: "9px",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.node.label}
                    </span>
                    <span
                      style={{
                        fontSize: "7px",
                        borderRadius: "3px",
                        padding: "0 4px",
                        background: "var(--tw-accent, #f59e0b)20",
                        color: "var(--tw-accent, #f59e0b)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.node.type}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "1px",
                    }}
                  >
                    <span style={{ color: "var(--tw-text-muted)", fontSize: "7px" }}>
                      {r.topicTitle}
                    </span>
                    {r.node.createdAt && (
                      <span style={{ color: "var(--tw-text-muted)", fontSize: "7px", marginLeft: "auto" }}>
                        {r.node.createdAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
