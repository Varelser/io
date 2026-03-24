import React, { useMemo, useState } from "react";
import type { TopicItem, NodeItem, IntakeStatus } from "../../types";
import { INTAKE_STATUSES } from "../../types";
import { matchesIntakeStatus, normalizeIntakeStatus } from "../../utils/state-model";

type IntakeTab = IntakeStatus;

const TAB_LABELS: Record<IntakeTab, { ja: string; en: string }> = {
  inbox:   { ja: "インボックス", en: "Inbox" },
  staging: { ja: "ステージング", en: "Staging" },
  archive: { ja: "アーカイブ",   en: "Archive" },
  structured:  { ja: "構造化済",     en: "Structured" },
};

const TAB_COLORS: Record<IntakeTab, { bg: string; border: string; text: string }> = {
  inbox:   { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.3)",  text: "#60a5fa" },
  staging: { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.3)",   text: "#facc15" },
  archive: { bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.2)", text: "#94a3b8" },
  structured:  { bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.2)",   text: "#4ade80" },
};

type IntakeNode = {
  node: NodeItem;
  topicId: string;
  topicTitle: string;
};

function collectIntakeNodes(topics: TopicItem[]): Record<IntakeTab, IntakeNode[]> {
  const groups: Record<IntakeTab, IntakeNode[]> = {
    inbox: [],
    staging: [],
    archive: [],
    structured: [],
  };

  for (const topic of topics) {
    for (const node of topic.nodes) {
      const status = node.intakeStatus;
      if (status && status !== "structured" && (INTAKE_STATUSES as readonly string[]).includes(status)) {
        groups[status as IntakeTab].push({ node, topicId: topic.id, topicTitle: topic.title });
      } else {
        // No intakeStatus or "structured" -> structured group
        groups.structured.push({ node, topicId: topic.id, topicTitle: topic.title });
      }
    }
  }

  // Sort each group by createdAt descending (newest first)
  for (const key of Object.keys(groups) as IntakeTab[]) {
    groups[key].sort((a, b) => {
      const da = a.node.createdAt || "";
      const db = b.node.createdAt || "";
      return db.localeCompare(da);
    });
  }

  return groups;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export function IntakeView({
  topics,
  onSelectNode,
  onUpdateNode,
  lang,
}: {
  topics: TopicItem[];
  onSelectNode: (topicId: string, nodeId: string) => void;
  onUpdateNode: (topicId: string, nodeId: string, patch: Partial<NodeItem>) => void;
  lang?: "ja" | "en";
}) {
  const l = lang || "ja";
  const [activeTab, setActiveTab] = useState<IntakeTab>("inbox");

  const groups = useMemo(() => collectIntakeNodes(topics), [topics]);

  const tabs: IntakeTab[] = ["inbox", "staging", "archive", "structured"];

  const moveButtons: { target: IntakeStatus | undefined; label: Record<"ja" | "en", string>; icon: string }[] = [
    { target: "inbox",   label: { ja: "受信", en: "Inbox" },   icon: "📥" },
    { target: "staging", label: { ja: "仮置", en: "Stage" },   icon: "📋" },
    { target: "archive", label: { ja: "保管", en: "Archive" }, icon: "🗄" },
    { target: "structured",  label: { ja: "構造化", en: "Structure" },   icon: "📌" },
  ];

  return (
    <div className="p-4 h-full overflow-auto" style={{ background: "var(--tw-bg)", color: "var(--tw-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[13px] font-medium">{l === "ja" ? "インテーク" : "Intake"}</div>
        <div className="text-[9px]" style={{ color: "var(--tw-text-dim)" }}>
          {topics.reduce((sum, t) => sum + t.nodes.length, 0)} {l === "ja" ? "件のノード" : "total nodes"}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "var(--tw-border)" }} role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const colors = TAB_COLORS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-3 py-1.5 text-[10px] font-medium rounded-t-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
              style={{
                background: isActive ? colors.bg : "transparent",
                color: isActive ? colors.text : "var(--tw-text-dim)",
                borderBottom: isActive ? `2px solid ${colors.text}` : "2px solid transparent",
              }}
              role="tab"
              aria-selected={isActive}
            >
              {TAB_LABELS[tab][l]} ({groups[tab].length})
            </button>
          );
        })}
      </div>

      {/* Node list */}
      <div className="space-y-1">
        {groups[activeTab].length === 0 && (
          <div className="text-[10px] py-8 text-center" style={{ color: "var(--tw-text-muted)" }}>
            {l === "ja" ? "このカテゴリにノードはありません" : "No nodes in this category"}
          </div>
        )}
        {groups[activeTab].map((item) => {
          const colors = TAB_COLORS[activeTab];
          return (
            <div
              key={`${item.topicId}-${item.node.id}`}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors"
              style={{
                borderColor: colors.border,
                background: colors.bg,
              }}
              onClick={() => onSelectNode(item.topicId, item.node.id)}
            >
              {/* Type badge */}
              <span
                className="shrink-0 rounded px-1 py-0.5 text-[7px] font-medium"
                style={{ background: "var(--tw-bg-card)", color: "var(--tw-text-dim)", border: "1px solid var(--tw-border)" }}
              >
                {item.node.type}
              </span>

              {/* Node info */}
              <div className="flex-1 min-w-0">
                <div className="text-[9px] truncate" style={{ color: "var(--tw-text)" }}>
                  {item.node.label}
                </div>
                <div className="text-[7px] truncate" style={{ color: "var(--tw-text-muted)" }}>
                  {item.topicTitle}
                  {item.node.createdAt ? ` / ${formatDate(item.node.createdAt)}` : ""}
                  {item.node.note ? ` / ${item.node.note.slice(0, 40)}${item.node.note.length > 40 ? "..." : ""}` : ""}
                </div>
              </div>

              {/* Move buttons */}
              <div className="flex shrink-0 gap-0.5">
                {moveButtons.map((btn) => {
                  // Determine the actual intakeStatus to set
                  const targetStatus: IntakeStatus | undefined = normalizeIntakeStatus(btn.target) || "structured";
                  const currentStatus = item.node.intakeStatus || "structured";
                  const btnTarget = btn.target || "structured";
                  if (matchesIntakeStatus(currentStatus, btnTarget)) return null;
                  return (
                    <button
                      key={btnTarget}
                      className="rounded px-1 py-0.5 text-[7px] transition-colors hover:brightness-125"
                      style={{
                        background: TAB_COLORS[btnTarget as IntakeTab].bg,
                        color: TAB_COLORS[btnTarget as IntakeTab].text,
                        border: `1px solid ${TAB_COLORS[btnTarget as IntakeTab].border}`,
                      }}
                      title={btn.label[l]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNode(item.topicId, item.node.id, { intakeStatus: targetStatus });
                      }}
                    >
                      <span aria-hidden>{btn.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
