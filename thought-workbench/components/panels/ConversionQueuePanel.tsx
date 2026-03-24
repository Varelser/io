import React, { useState } from "react";
import type { ConversionItem, ConversionRule, TopicItem } from "../../types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";

const STATUSES = ["pending", "review", "ready", "hold", "done", "cancelled"] as const;
type Status = ConversionItem["status"];

const STATUS_LABELS: Record<Status, Record<"ja" | "en", string>> = {
  pending: { ja: "未処理", en: "Pending" },
  review: { ja: "レビュー", en: "Review" },
  ready: { ja: "実行可能", en: "Ready" },
  hold: { ja: "保留", en: "Hold" },
  done: { ja: "完了", en: "Done" },
  cancelled: { ja: "取消", en: "Cancelled" },
};

const STATUS_COLORS: Record<Status, string> = {
  pending: "#9ca3af",
  review: "#eab308",
  ready: "#22c55e",
  hold: "#f97316",
  done: "#3b82f6",
  cancelled: "#ef4444",
};

const TARGET_TYPE_COLORS: Record<string, string> = {
  task: "#3b82f6",
  hypothesis: "#a855f7",
  definition: "#22c55e",
  "work-idea": "#f97316",
  material: "#14b8a6",
  split: "#ef4444",
  merge: "#eab308",
};

const FILTER_TABS: { key: "all" | Status; labelJa: string; labelEn: string }[] = [
  { key: "all", labelJa: "全て", labelEn: "All" },
  { key: "pending", labelJa: "未処理", labelEn: "Pending" },
  { key: "review", labelJa: "レビュー", labelEn: "Review" },
  { key: "ready", labelJa: "実行可能", labelEn: "Ready" },
  { key: "hold", labelJa: "保留", labelEn: "Hold" },
  { key: "done", labelJa: "完了", labelEn: "Done" },
];

const TARGET_TYPES = Object.keys(TARGET_TYPE_COLORS);

type Props = {
  queue: ConversionItem[];
  topics: TopicItem[];
  rules?: ConversionRule[];
  selectedNodeId?: string | null;
  selectedTopicId?: string | null;
  onAddToQueue: (item: Omit<ConversionItem, "id" | "createdAt">) => void;
  onUpdateStatus: (id: string, status: ConversionItem["status"]) => void;
  onRemoveFromQueue: (id: string) => void;
  onNavigate: (topicId: string, nodeId: string) => void;
  onAddRule?: (rule: Omit<ConversionRule, "id" | "createdAt">) => void;
  onUpdateRule?: (id: string, patch: Partial<ConversionRule>) => void;
  onDeleteRule?: (id: string) => void;
  onRunRules?: () => void;
  lang?: "ja" | "en";
};

export function ConversionQueuePanel({ queue, topics, rules = [], selectedNodeId, selectedTopicId, onAddToQueue, onUpdateStatus, onRemoveFromQueue, onNavigate, onAddRule, onUpdateRule, onDeleteRule, onRunRules, lang }: Props) {
  const l = lang || "ja";
  const [activeTab, setActiveTab] = useState<"queue" | "rules">("queue");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  // Rules form state
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleLabel, setRuleLabel] = useState("");
  const [ruleIntakeStatus, setRuleIntakeStatus] = useState("");
  const [ruleWorkStatus, setRuleWorkStatus] = useState("");
  const [ruleNodeType, setRuleNodeType] = useState("");
  const [ruleHypothesisStage, setRuleHypothesisStage] = useState("");
  const [ruleKnowledgePhase, setRuleKnowledgePhase] = useState("");
  const [ruleTargetType, setRuleTargetType] = useState("task");
  const [formNodeId, setFormNodeId] = useState("");
  const [formTopicId, setFormTopicId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formTargetType, setFormTargetType] = useState("task");
  const [formNote, setFormNote] = useState("");

  const handleSubmitRuleForm = () => {
    const label = ruleLabel.trim();
    if (!label) return;
    const conditions: ConversionRule["conditions"] = {};
    if (ruleIntakeStatus) conditions.intakeStatus = ruleIntakeStatus;
    if (ruleWorkStatus) conditions.workStatus = ruleWorkStatus;
    if (ruleNodeType) conditions.nodeType = ruleNodeType;
    if (ruleHypothesisStage) conditions.hypothesisStage = ruleHypothesisStage;
    if (ruleKnowledgePhase) conditions.knowledgePhase = ruleKnowledgePhase;
    onAddRule?.({ label, conditions, targetType: ruleTargetType, enabled: true });
    setRuleFormOpen(false);
    setRuleLabel(""); setRuleIntakeStatus(""); setRuleWorkStatus("");
    setRuleNodeType(""); setRuleHypothesisStage(""); setRuleKnowledgePhase("");
    setRuleTargetType("task");
  };

  const handleSubmitForm = () => {
    const nodeId = formNodeId.trim() || selectedNodeId || "";
    const topicId = formTopicId || selectedTopicId || topics[0]?.id || "";
    const label = formLabel.trim() || nodeId;
    if (!nodeId || !topicId) return;
    onAddToQueue({ sourceTopicId: topicId, sourceNodeId: nodeId, sourceLabel: label, targetType: formTargetType, status: "pending", note: formNote.trim() || undefined });
    setFormOpen(false);
    setFormNodeId(""); setFormTopicId(""); setFormLabel(""); setFormTargetType("task"); setFormNote("");
  };

  const counts: Record<Status, number> = { pending: 0, review: 0, ready: 0, hold: 0, done: 0, cancelled: 0 };
  for (const item of queue) {
    counts[item.status]++;
  }

  const filtered = filter === "all" ? queue : queue.filter((item) => item.status === filter);

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border p-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
      {/* Tab header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex gap-0.5">
          {(["queue", "rules"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="rounded px-2 py-0.5 text-[8px] transition"
              style={{
                background: activeTab === tab ? "var(--tw-accent)" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--tw-text-muted)",
                border: "1px solid",
                borderColor: activeTab === tab ? "var(--tw-accent)" : "var(--tw-border)",
              }}
            >
              {tab === "queue"
                ? `${l === "ja" ? "キュー" : "Queue"} (${queue.length})`
                : `${l === "ja" ? "ルール" : "Rules"} (${rules.length})`}
            </button>
          ))}
        </div>
        {activeTab === "queue" && (
          <Button onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? (l === "ja" ? "閉じる" : "Close") : (l === "ja" ? "＋ 追加" : "＋ Add")}
          </Button>
        )}
        {activeTab === "rules" && (
          <div className="flex gap-1">
            {onRunRules && rules.filter((r) => r.enabled).length > 0 && (
              <Button onClick={onRunRules}>{l === "ja" ? "▶ 実行" : "▶ Run"}</Button>
            )}
            <Button onClick={() => setRuleFormOpen((v) => !v)}>
              {ruleFormOpen ? (l === "ja" ? "閉じる" : "Close") : (l === "ja" ? "＋ 追加" : "＋ Add")}
            </Button>
          </div>
        )}
      </div>

      {/* Queue tab */}
      {activeTab === "queue" && (
        <>
          {formOpen && (
            <div className="mb-1.5 rounded border p-1.5 space-y-1" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}>
              <div>
                <FieldLabel>{l === "ja" ? "ノードID" : "Node ID"}</FieldLabel>
                <Input value={formNodeId} onChange={(e) => setFormNodeId(e.target.value)} placeholder={selectedNodeId || ""} />
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "ラベル" : "Label"}</FieldLabel>
                <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder={l === "ja" ? "ノードラベル" : "Node label"} />
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "球体" : "Topic"}</FieldLabel>
                <Select value={formTopicId || selectedTopicId || ""} onChange={(e) => setFormTopicId(e.target.value)}>
                  <option value="">-</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "変換先タイプ" : "Target Type"}</FieldLabel>
                <Select value={formTargetType} onChange={(e) => setFormTargetType(e.target.value)}>
                  {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "ノート（任意）" : "Note (optional)"}</FieldLabel>
                <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} />
              </div>
              <Button onClick={handleSubmitForm} className="w-full">{l === "ja" ? "追加" : "Add"}</Button>
            </div>
          )}

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-0.5 mb-1.5">
            {FILTER_TABS.map((tab) => {
              const isActive = filter === tab.key;
              const count = tab.key === "all" ? queue.length : counts[tab.key as Status];
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as "all" | Status)}
                  className="inline-flex items-center gap-0.5 rounded-md border px-1.5 py-[2px] text-[8px] leading-none transition"
                  style={{
                    borderColor: isActive ? "var(--tw-accent)" : "var(--tw-border)",
                    background: isActive ? "var(--tw-accent)" : "var(--tw-bg-input)",
                    color: isActive ? "#fff" : "var(--tw-text-dim)",
                  }}
                >
                  {l === "ja" ? tab.labelJa : tab.labelEn}
                  <span
                    className="inline-flex items-center justify-center rounded-full min-w-[14px] h-[12px] text-[7px] leading-none px-0.5"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.25)" : "var(--tw-bg-card)",
                      color: isActive ? "#fff" : "var(--tw-text-muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Queue items */}
          {filtered.length === 0 && (
            <div className="text-[8px] py-2 text-center" style={{ color: "var(--tw-text-muted)" }}>
              {l === "ja" ? "アイテムなし" : "No items"}
            </div>
          )}

          <div className="space-y-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-md border p-1"
                style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}
              >
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => onNavigate(item.sourceTopicId, item.sourceNodeId)}
                    className="text-[9px] truncate max-w-[120px] underline cursor-pointer"
                    style={{ color: "var(--tw-accent)" }}
                    title={item.sourceLabel}
                  >
                    {item.sourceLabel}
                  </button>
                  <span className="text-[8px]" style={{ color: "var(--tw-text-muted)" }}>&rarr;</span>
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[7px] leading-none font-medium"
                    style={{
                      background: `${TARGET_TYPE_COLORS[item.targetType] || "#6b7280"}22`,
                      color: TARGET_TYPE_COLORS[item.targetType] || "#6b7280",
                      border: `1px solid ${TARGET_TYPE_COLORS[item.targetType] || "#6b7280"}44`,
                    }}
                  >
                    {item.targetType}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[7px] leading-none font-medium"
                    style={{
                      background: `${STATUS_COLORS[item.status]}22`,
                      color: STATUS_COLORS[item.status],
                      border: `1px solid ${STATUS_COLORS[item.status]}44`,
                    }}
                  >
                    {STATUS_LABELS[item.status][l]}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => onRemoveFromQueue(item.id)}
                    className="text-[8px] px-1 py-[1px] rounded border"
                    style={{ borderColor: "var(--tw-border)", color: "#ef4444", background: "var(--tw-bg-card)" }}
                    title={l === "ja" ? "削除" : "Delete"}
                  >
                    &times;
                  </button>
                </div>
                <div className="mt-0.5 flex items-center gap-0.5">
                  <Select
                    value={item.status}
                    onChange={(e) => onUpdateStatus(item.id, e.target.value as Status)}
                    className="!text-[8px] !py-0.5 !px-1"
                    style={{ maxWidth: "100px" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s][l]}</option>
                    ))}
                  </Select>
                  {item.note && (
                    <button
                      onClick={() => toggleNote(item.id)}
                      className="text-[7px] px-1 rounded border"
                      style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)", background: "var(--tw-bg-card)" }}
                    >
                      {expandedNotes.has(item.id) ? (l === "ja" ? "メモ閉" : "hide") : (l === "ja" ? "メモ" : "note")}
                    </button>
                  )}
                </div>
                {item.note && expandedNotes.has(item.id) && (
                  <div className="mt-0.5 text-[8px] rounded p-1" style={{ color: "var(--tw-text-dim)", background: "var(--tw-bg-card)" }}>
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rules tab */}
      {activeTab === "rules" && (
        <>
          {ruleFormOpen && (
            <div className="mb-1.5 rounded border p-1.5 space-y-1" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}>
              <div>
                <FieldLabel>{l === "ja" ? "ルール名" : "Rule name"}</FieldLabel>
                <Input value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder={l === "ja" ? "例: inbox→hypothesis" : "e.g. inbox→hypothesis"} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <FieldLabel>{l === "ja" ? "流入状態" : "Intake"}</FieldLabel>
                  <Select value={ruleIntakeStatus} onChange={(e) => setRuleIntakeStatus(e.target.value)}>
                    <option value="">-</option>
                    {["inbox", "staging", "structured", "archive"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <FieldLabel>{l === "ja" ? "作業状態" : "Work"}</FieldLabel>
                  <Select value={ruleWorkStatus} onChange={(e) => setRuleWorkStatus(e.target.value)}>
                    <option value="">-</option>
                    {["unprocessed", "active", "review", "onHold", "done", "frozen"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <FieldLabel>{l === "ja" ? "タイプ" : "Type"}</FieldLabel>
                  <Input value={ruleNodeType} onChange={(e) => setRuleNodeType(e.target.value)} placeholder="fragment..." />
                </div>
                <div>
                  <FieldLabel>{l === "ja" ? "仮説段階" : "Hypothesis"}</FieldLabel>
                  <Input value={ruleHypothesisStage} onChange={(e) => setRuleHypothesisStage(e.target.value)} placeholder="abduced..." />
                </div>
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "変換先タイプ" : "Target Type"}</FieldLabel>
                <Select value={ruleTargetType} onChange={(e) => setRuleTargetType(e.target.value)}>
                  {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <Button onClick={handleSubmitRuleForm} className="w-full">{l === "ja" ? "追加" : "Add"}</Button>
            </div>
          )}

          {rules.length === 0 && !ruleFormOpen && (
            <div className="text-[8px] py-2 text-center" style={{ color: "var(--tw-text-muted)" }}>
              {l === "ja" ? "ルールなし" : "No rules"}
            </div>
          )}

          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-md border p-1.5"
                style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)", opacity: rule.enabled ? 1 : 0.5 }}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateRule?.(rule.id, { enabled: !rule.enabled })}
                    className="text-[8px] shrink-0 rounded px-1 py-0.5"
                    style={{
                      background: rule.enabled ? "#22c55e20" : "#6b728020",
                      color: rule.enabled ? "#22c55e" : "#9ca3af",
                      border: `1px solid ${rule.enabled ? "#22c55e" : "#6b7280"}44`,
                    }}
                    title={l === "ja" ? "有効/無効切り替え" : "Toggle enabled"}
                  >
                    {rule.enabled ? "ON" : "OFF"}
                  </button>
                  <span className="flex-1 text-[8px] truncate" style={{ color: "var(--tw-text)" }}>{rule.label}</span>
                  <span
                    className="text-[7px] rounded-full px-1.5 py-0.5"
                    style={{ background: `${TARGET_TYPE_COLORS[rule.targetType] || "#6b7280"}22`, color: TARGET_TYPE_COLORS[rule.targetType] || "#6b7280" }}
                  >
                    {rule.targetType}
                  </span>
                  <button
                    onClick={() => onDeleteRule?.(rule.id)}
                    className="text-[8px] px-1 py-[1px] rounded border shrink-0"
                    style={{ borderColor: "var(--tw-border)", color: "#ef4444", background: "var(--tw-bg-card)" }}
                  >
                    &times;
                  </button>
                </div>
                {Object.keys(rule.conditions).length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {Object.entries(rule.conditions).map(([k, v]) => v ? (
                      <span key={k} className="text-[7px] rounded px-1 py-0.5" style={{ background: "#ffffff10", color: "var(--tw-text-dim)" }}>
                        {k}={v}
                      </span>
                    ) : null)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
