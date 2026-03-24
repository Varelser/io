import React from "react";
import type { ScenarioBranch } from "../../types";

const STATUS_LABELS = {
  draft: { ja: "草案", en: "Draft" },
  active: { ja: "進行", en: "Active" },
  archived: { ja: "保管", en: "Archived" },
} as const;

export function ScenarioBranchPanel({
  branches,
  topics,
  branchDiffs,
  branchReviews,
  branchConflicts,
  onNavigate,
  onDelete,
  onUpdateStatus,
  onUpdateBranch,
  onCaptureSnapshot,
  onMaterialize,
  onSyncFromSource,
  onBackport,
  onBackportNode,
  lang = "ja",
}: {
  branches: ScenarioBranch[];
  topics: { id: string; title: string }[];
  branchDiffs: Record<string, {
    sourceNodeId: string;
    label: string;
    changedPosition: boolean;
    changedSize: boolean;
    positionDelta?: [number, number, number];
    sizeDelta?: number;
    frameScaleDelta?: number;
    labelChanged?: boolean;
    nextLabel?: string;
    typeChanged?: boolean;
    nextType?: string;
    noteChanged?: boolean;
    groupChanged?: boolean;
    nextGroup?: string;
    layerChanged?: boolean;
    nextLayer?: string;
    tenseChanged?: boolean;
    nextTense?: string;
    tagsChanged?: boolean;
    nextTags?: string[];
  }[]>;
  branchReviews: Record<string, {
    score: number;
    changedNodeCount: number;
    positionCount: number;
    sizeCount: number;
    contentCount: number;
    warnings: string[];
    status: "ready" | "needs-review" | "thin";
  }>;
  branchConflicts: Record<string, {
    risk: "none" | "low" | "medium" | "high";
    conflictCount: number;
    summary: string[];
    nodes: {
      sourceNodeId: string;
      label: string;
      risk: "low" | "medium" | "high";
      reasons: string[];
    }[];
  }>;
  onNavigate: (branch: ScenarioBranch) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: ScenarioBranch["status"]) => void;
  onUpdateBranch: (id: string, patch: Partial<ScenarioBranch>) => void;
  onCaptureSnapshot: (id: string) => void;
  onMaterialize: (id: string) => void;
  onSyncFromSource: (id: string, mode: "all" | "position" | "size" | "content") => void;
  onBackport: (id: string, mode: "all" | "position" | "size" | "content") => void;
  onBackportNode: (id: string, sourceNodeId: string, mode: "all" | "position" | "size" | "content") => void;
  lang?: "ja" | "en";
}) {
  const topicMap = new Map(topics.map((topic) => [topic.id, topic.title]));
  const [panelTab, setPanelTab] = React.useState<"list" | "compare">("list");
  const [compareA, setCompareA] = React.useState<string>("");
  const [compareB, setCompareB] = React.useState<string>("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [sortMode, setSortMode] = React.useState<"recent" | "score" | "changes">("score");
  const [filterMode, setFilterMode] = React.useState<"all" | "needs-review" | "ready" | "changed" | "conflicted">("all");
  const [pendingAction, setPendingAction] = React.useState<{
    branchId: string;
    direction: "sync" | "backport";
    mode: "all" | "position" | "size" | "content";
  } | null>(null);
  const [pendingNodeAction, setPendingNodeAction] = React.useState<{
    branchId: string;
    sourceNodeId: string;
    mode: "all" | "position" | "size" | "content";
  } | null>(null);
  const getDiffCountForMode = React.useCallback((branchId: string, mode: "all" | "position" | "size" | "content") => {
    const diffs = branchDiffs[branchId] || [];
    if (mode === "position") return diffs.filter((diff) => diff.changedPosition).length;
    if (mode === "size") return diffs.filter((diff) => diff.changedSize).length;
    if (mode === "content") return diffs.filter((diff) => diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged).length;
    return diffs.length;
  }, [branchDiffs]);
  const getDiffPreviewLabels = React.useCallback((branchId: string, mode: "all" | "position" | "size" | "content") => {
    const diffs = branchDiffs[branchId] || [];
    const filtered = diffs.filter((diff) => {
      if (mode === "position") return diff.changedPosition;
      if (mode === "size") return diff.changedSize;
      if (mode === "content") return diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged;
      return true;
    });
    return filtered.slice(0, 4).map((diff) => diff.label);
  }, [branchDiffs]);
  const openPreview = React.useCallback((branchId: string, direction: "sync" | "backport", mode: "all" | "position" | "size" | "content") => {
    setPendingAction({ branchId, direction, mode });
  }, []);
  const confirmPreview = React.useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.direction === "sync") {
      onSyncFromSource(pendingAction.branchId, pendingAction.mode);
    } else {
      onBackport(pendingAction.branchId, pendingAction.mode);
    }
    setPendingAction(null);
  }, [pendingAction, onSyncFromSource, onBackport]);
  const confirmNodePreview = React.useCallback(() => {
    if (!pendingNodeAction) return;
    onBackportNode(pendingNodeAction.branchId, pendingNodeAction.sourceNodeId, pendingNodeAction.mode);
    setPendingNodeAction(null);
  }, [pendingNodeAction, onBackportNode]);
  const getRecommendedAction = React.useCallback((branch: ScenarioBranch) => {
    const review = branchReviews[branch.id];
    const conflict = branchConflicts[branch.id];
    const diffs = branchDiffs[branch.id] || [];
    if (!review || diffs.length === 0) {
      return {
        tone: "muted" as const,
        label: lang === "ja" ? "差分なし" : "No action",
        reason: lang === "ja" ? "この分岐には反映待ちの差分がありません。" : "There are no pending diffs for this branch.",
      };
    }
    if (!branch.materializedTopicId) {
      return {
        tone: "warn" as const,
        label: lang === "ja" ? "sandbox 作成を先行" : "Materialize first",
        reason: lang === "ja" ? "同期や再取り込みの前に sandbox を実体化してください。" : "Materialize the sandbox before sync or backport.",
      };
    }
    if (conflict?.risk === "high") {
      return {
        tone: "danger" as const,
        label: lang === "ja" ? "ノード単位で確認" : "Review node by node",
        reason: lang === "ja" ? "高リスク差分があるため、一括適用よりノード単位確認が安全です。" : "High-risk diffs remain. Review per node before applying.",
      };
    }
    const policy = branch.syncPolicy || "manual";
    const hasPos = review.positionCount > 0;
    const hasSize = review.sizeCount > 0;
    const hasAttr = review.contentCount > 0;
    const mixed = [hasPos, hasSize, hasAttr].filter(Boolean).length >= 2;
    const preferredMode = mixed ? "all" : hasAttr ? "content" : hasSize ? "size" : "position";
    if (policy === "prefer-source") {
      return {
        tone: "sync" as const,
        label: lang === "ja" ? "source を同期" : "Sync source",
        reason: lang === "ja" ? "この分岐は source 優先です。source を sandbox に寄せるのが推奨です。" : "This branch prefers source. Sync source into sandbox.",
        action: { direction: "sync" as const, mode: preferredMode as "all" | "position" | "size" | "content" },
      };
    }
    if (policy === "prefer-sandbox") {
      return {
        tone: "backport" as const,
        label: lang === "ja" ? "sandbox を再取り込み" : "Backport sandbox",
        reason: lang === "ja" ? "この分岐は sandbox 優先です。sandbox を source に戻すのが推奨です。" : "This branch prefers sandbox. Backport sandbox into source.",
        action: { direction: "backport" as const, mode: preferredMode as "all" | "position" | "size" | "content" },
      };
    }
    if (!mixed) {
      return {
        tone: "info" as const,
        label: lang === "ja" ? "単独差分を処理" : "Apply single diff type",
        reason: lang === "ja"
          ? `差分は ${preferredMode === "content" ? "属性" : preferredMode === "size" ? "サイズ" : "位置"} に寄っています。まずそこだけ処理するのが安全です。`
          : `Diffs are concentrated in ${preferredMode}. Applying only that mode is safer first.`,
        action: { direction: "backport" as const, mode: preferredMode as "all" | "position" | "size" | "content" },
      };
    }
    return {
      tone: "info" as const,
      label: lang === "ja" ? "プレビュー確認推奨" : "Preview recommended",
      reason: lang === "ja" ? "複数種類の差分があるため、プレビューで対象を見てから確定してください。" : "Multiple diff types remain. Review preview before applying.",
      action: { direction: "backport" as const, mode: "all" as const },
    };
  }, [branchReviews, branchConflicts, branchDiffs, lang]);
  const getRecommendedNodeAction = React.useCallback((branchId: string, diff: {
    sourceNodeId: string;
    changedPosition: boolean;
    changedSize: boolean;
    labelChanged?: boolean;
    typeChanged?: boolean;
    noteChanged?: boolean;
    groupChanged?: boolean;
    layerChanged?: boolean;
    tenseChanged?: boolean;
    tagsChanged?: boolean;
  }) => {
    const nodeConflict = branchConflicts[branchId]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId);
    const hasAttr = !!(diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged);
    const activeModes = [
      diff.changedPosition ? "position" : null,
      diff.changedSize ? "size" : null,
      hasAttr ? "content" : null,
    ].filter(Boolean) as ("position" | "size" | "content")[];
    if (activeModes.length === 0) {
      return {
        tone: "muted" as const,
        label: lang === "ja" ? "差分なし" : "No diff",
        reason: lang === "ja" ? "このノードに戻す差分はありません。" : "No diff to backport for this node.",
      };
    }
    if (nodeConflict?.risk === "high") {
      const firstMode = hasAttr ? "content" : diff.changedPosition ? "position" : "size";
      return {
        tone: "danger" as const,
        label: lang === "ja" ? "段階適用推奨" : "Stage apply",
        reason: lang === "ja" ? "高リスク差分です。全部ではなく 1 種類ずつ戻す方が安全です。" : "High-risk diff. Apply one mode at a time instead of all.",
        action: { mode: firstMode as "position" | "size" | "content" },
      };
    }
    if (activeModes.length === 1) {
      return {
        tone: "info" as const,
        label: lang === "ja" ? "単独差分を戻す" : "Apply single mode",
        reason: lang === "ja" ? "差分は 1 種類だけです。このモードだけ戻すのが最短です。" : "Only one diff type remains. Apply that mode directly.",
        action: { mode: activeModes[0] },
      };
    }
    if (hasAttr) {
      return {
        tone: "backport" as const,
        label: lang === "ja" ? "内容から確認" : "Review content first",
        reason: lang === "ja" ? "属性差分を先に確認すると意図のズレを見分けやすいです。" : "Checking content diffs first makes intent mismatches easier to spot.",
        action: { mode: "content" as const },
      };
    }
    return {
      tone: "backport" as const,
      label: lang === "ja" ? "全部を確認" : "Preview all",
      reason: lang === "ja" ? "空間差分が複数あるため、全体プレビューでまとめて確認するのが効率的です。" : "Multiple spatial diffs remain. Preview all changes together.",
      action: { mode: "all" as const },
    };
  }, [branchConflicts, lang]);
  const visibleBranches = [...branches]
    .filter((branch) => {
      const review = branchReviews[branch.id];
      const conflict = branchConflicts[branch.id];
      if (filterMode === "needs-review") return !!review && review.status !== "ready";
      if (filterMode === "ready") return !!review && review.status === "ready";
      if (filterMode === "changed") return !!review && review.changedNodeCount > 0;
      if (filterMode === "conflicted") return !!conflict && conflict.risk !== "none";
      return true;
    })
    .sort((a, b) => {
      const left = branchReviews[a.id];
      const right = branchReviews[b.id];
      if (sortMode === "score") return (right?.score || 0) - (left?.score || 0);
      if (sortMode === "changes") return (right?.changedNodeCount || 0) - (left?.changedNodeCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div>
      {/* Panel-level tab: List / Compare */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {(["list", "compare"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setPanelTab(tab)}
            style={{
              fontSize: 8,
              padding: "2px 8px",
              border: "1px solid",
              borderColor: panelTab === tab ? "var(--tw-accent, #f59e0b)" : "var(--tw-border, #333)",
              borderRadius: 4,
              background: panelTab === tab ? "var(--tw-accent, #f59e0b)20" : "transparent",
              color: panelTab === tab ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-muted, #888)",
              cursor: "pointer",
            }}
          >
            {tab === "list"
              ? (lang === "ja" ? `一覧 (${branches.length})` : `List (${branches.length})`)
              : (lang === "ja" ? "比較" : "Compare")}
          </button>
        ))}
      </div>

      {/* Compare tab */}
      {panelTab === "compare" && (
        <BranchComparePanel
          branches={branches}
          branchDiffs={branchDiffs}
          branchReviews={branchReviews}
          compareA={compareA}
          compareB={compareB}
          onSelectA={setCompareA}
          onSelectB={setCompareB}
          lang={lang || "ja"}
        />
      )}

      {panelTab === "list" && (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as "recent" | "score" | "changes")}
          style={{
            fontSize: 8,
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--tw-text-dim, #888)",
          }}
        >
          <option value="score">{lang === "ja" ? "準備度順" : "Score"}</option>
          <option value="changes">{lang === "ja" ? "差分順" : "Changes"}</option>
          <option value="recent">{lang === "ja" ? "新しい順" : "Recent"}</option>
        </select>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as "all" | "needs-review" | "ready" | "changed" | "conflicted")}
          style={{
            fontSize: 8,
            border: "1px solid var(--tw-border, #333)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--tw-text-dim, #888)",
          }}
        >
          <option value="all">{lang === "ja" ? "全件" : "All"}</option>
          <option value="needs-review">{lang === "ja" ? "要確認" : "Needs review"}</option>
          <option value="ready">{lang === "ja" ? "準備完了" : "Ready"}</option>
          <option value="changed">{lang === "ja" ? "差分あり" : "Changed"}</option>
          <option value="conflicted">{lang === "ja" ? "衝突注意" : "Conflict risk"}</option>
        </select>
      </div>
      {branches.length === 0 && (
        <div style={{ fontSize: 8, textAlign: "center", padding: "8px 0", color: "var(--tw-text-muted, #555)" }}>
          {lang === "ja" ? "分岐なし" : "No branches"}
        </div>
      )}
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {visibleBranches.map((branch) => {
          const diffs = branchDiffs[branch.id] || [];
          const review = branchReviews[branch.id];
          const conflict = branchConflicts[branch.id];
          const recommendation = getRecommendedAction(branch);
          return (
          <div
            key={branch.id}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 4,
              padding: "3px 4px",
              marginBottom: 3,
              borderRadius: 4,
              background: "var(--tw-bg-card, #1e1e30)",
              fontSize: 9,
            }}
          >
            <button
              onClick={() => setExpandedId((prev) => prev === branch.id ? null : branch.id)}
              style={{
                width: 14,
                height: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                border: "none",
                background: "transparent",
                color: "var(--tw-text-muted, #555)",
                cursor: "pointer",
                padding: 0,
              }}
              title={lang === "ja" ? "詳細" : "Details"}
            >
              {expandedId === branch.id ? "▾" : "▸"}
            </button>
            <button
              onClick={() => onNavigate(branch)}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                border: "none",
                background: "transparent",
                color: "var(--tw-text, #ccc)",
                cursor: "pointer",
                padding: 0,
              }}
              title={lang === "ja" ? "クリックで移動" : "Navigate"}
            >
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {branch.label}
              </div>
              <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {(branch.topicId && topicMap.get(branch.topicId)) || branch.anchorLabel || branch.anchorTs}
              </div>
              <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lang === "ja"
                  ? `policy:${branch.syncPolicy === "prefer-source" ? "source優先" : branch.syncPolicy === "prefer-sandbox" ? "sandbox優先" : "manual"}`
                  : `policy:${branch.syncPolicy === "prefer-source" ? "prefer-source" : branch.syncPolicy === "prefer-sandbox" ? "prefer-sandbox" : "manual"}`}
              </div>
              {review && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                  <span style={{ color: review.status === "ready" ? "#4ade80" : review.status === "needs-review" ? "#f59e0b" : "#94a3b8" }}>
                    {lang === "ja" ? `準備度 ${review.score}%` : `Score ${review.score}%`}
                  </span>
                  <span>{lang === "ja" ? `差分 ${review.changedNodeCount}` : `Diff ${review.changedNodeCount}`}</span>
                  {conflict && conflict.risk !== "none" && (
                    <span style={{ color: conflict.risk === "high" ? "#ef4444" : conflict.risk === "medium" ? "#f59e0b" : "#60a5fa" }}>
                      {lang === "ja" ? `衝突注意 ${conflict.conflictCount}` : `Risk ${conflict.conflictCount}`}
                    </span>
                  )}
                </div>
              )}
              {branch.materializedTopicId && (
                <div style={{ fontSize: 7, color: "#60a5fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  sandbox ready
                </div>
              )}
              {branch.snapshotLabel && (
                <div style={{ fontSize: 7, color: "var(--tw-accent, #f59e0b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  snap: {branch.snapshotLabel}
                </div>
              )}
              {branch.lastSourceSyncAt && (
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  src sync: {new Date(branch.lastSourceSyncAt).toLocaleString()}
                </div>
              )}
              {branch.lastBackportAt && (
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  backport: {new Date(branch.lastBackportAt).toLocaleString()}
                </div>
              )}
            </button>

            <select
              value={branch.status}
              onChange={(e) => onUpdateStatus(branch.id, e.target.value as ScenarioBranch["status"])}
              style={{
                fontSize: 8,
                border: "1px solid var(--tw-border, #333)",
                borderRadius: 3,
                background: "transparent",
                color: "var(--tw-text-dim, #888)",
              }}
            >
              {(["draft", "active", "archived"] as const).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status][lang]}
                </option>
              ))}
            </select>

            <button
              onClick={() => onDelete(branch.id)}
              style={{
                width: 16,
                height: 16,
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
              ×
            </button>

            {expandedId === branch.id && (
              <div style={{ width: "100%", marginTop: 4, display: "grid", gap: 4 }}>
                {review && (
                  <div
                    style={{
                      display: "grid",
                      gap: 4,
                      padding: "4px 5px",
                      border: "1px solid var(--tw-border, #333)",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                      <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                        {lang === "ja" ? "Review" : "Review"}
                      </div>
                      <div style={{ fontSize: 8, color: review.status === "ready" ? "#4ade80" : review.status === "needs-review" ? "#f59e0b" : "#94a3b8" }}>
                        {lang === "ja" ? `準備度 ${review.score}%` : `Score ${review.score}%`}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
                      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>{lang === "ja" ? `差分 ${review.changedNodeCount}` : `Diff ${review.changedNodeCount}`}</div>
                      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>{lang === "ja" ? `位置 ${review.positionCount}` : `Pos ${review.positionCount}`}</div>
                      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>{lang === "ja" ? `サイズ ${review.sizeCount}` : `Size ${review.sizeCount}`}</div>
                      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>{lang === "ja" ? `属性 ${review.contentCount}` : `Attr ${review.contentCount}`}</div>
                    </div>
                    {review.warnings.length > 0 && (
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {review.warnings.map((warning) => (
                          <span
                            key={warning}
                            style={{
                              fontSize: 7,
                              padding: "1px 4px",
                              borderRadius: 999,
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              color: "#f59e0b",
                              background: "rgba(245, 158, 11, 0.08)",
                            }}
                          >
                            {warning}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gap: 4,
                        padding: "4px 5px",
                        borderRadius: 4,
                        border: `1px solid ${
                          recommendation.tone === "danger"
                            ? "rgba(239, 68, 68, 0.35)"
                            : recommendation.tone === "warn"
                              ? "rgba(245, 158, 11, 0.35)"
                              : recommendation.tone === "sync"
                                ? "rgba(52, 211, 153, 0.35)"
                                : recommendation.tone === "backport"
                                  ? "rgba(96, 165, 250, 0.35)"
                                  : "rgba(148, 163, 184, 0.35)"
                        }`,
                        background: recommendation.tone === "danger"
                          ? "rgba(239, 68, 68, 0.08)"
                          : recommendation.tone === "warn"
                            ? "rgba(245, 158, 11, 0.08)"
                            : recommendation.tone === "sync"
                              ? "rgba(52, 211, 153, 0.08)"
                              : recommendation.tone === "backport"
                                ? "rgba(96, 165, 250, 0.08)"
                                : "rgba(148, 163, 184, 0.08)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                        <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                          {lang === "ja" ? "推奨操作" : "Recommended action"}
                        </div>
                        <div style={{ fontSize: 8, color: "var(--tw-text-muted, #555)" }}>
                          {recommendation.label}
                        </div>
                      </div>
                      <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                        {recommendation.reason}
                      </div>
                      {recommendation.action && (
                        <button
                          onClick={() => openPreview(branch.id, recommendation.action.direction, recommendation.action.mode)}
                          style={{
                            fontSize: 8,
                            border: "1px solid var(--tw-border, #333)",
                            borderRadius: 3,
                            background: "transparent",
                            color: recommendation.action.direction === "sync" ? "#34d399" : "#60a5fa",
                            cursor: "pointer",
                            padding: "3px 4px",
                          }}
                        >
                          {lang === "ja" ? "推奨プレビューを開く" : "Open recommended preview"}
                        </button>
                      )}
                    </div>
                    {conflict && conflict.risk !== "none" && (
                      <div style={{ display: "grid", gap: 3 }}>
                        <div style={{ fontSize: 7, color: conflict.risk === "high" ? "#ef4444" : conflict.risk === "medium" ? "#f59e0b" : "#60a5fa" }}>
                          {lang === "ja" ? `衝突注意 ${conflict.conflictCount}` : `Conflict risk ${conflict.conflictCount}`}
                        </div>
                        {conflict.summary.length > 0 && (
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {conflict.summary.map((item) => (
                              <span
                                key={item}
                                style={{
                                  fontSize: 7,
                                  padding: "1px 4px",
                                  borderRadius: 999,
                                  border: `1px solid ${conflict.risk === "high" ? "rgba(239, 68, 68, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                                  color: conflict.risk === "high" ? "#ef4444" : "#f59e0b",
                                  background: conflict.risk === "high" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                                }}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <input
                  defaultValue={branch.label}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== branch.label) onUpdateBranch(branch.id, { label: value });
                  }}
                  placeholder={lang === "ja" ? "分岐名" : "Branch label"}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text, #ccc)",
                    padding: "2px 4px",
                  }}
                />
                <textarea
                  defaultValue={branch.hypothesis || ""}
                  onBlur={(e) => onUpdateBranch(branch.id, { hypothesis: e.target.value.trim() || undefined })}
                  placeholder={lang === "ja" ? "仮説" : "Hypothesis"}
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text, #ccc)",
                    padding: "3px 4px",
                    resize: "vertical",
                  }}
                />
                <textarea
                  defaultValue={branch.nextAction || ""}
                  onBlur={(e) => onUpdateBranch(branch.id, { nextAction: e.target.value.trim() || undefined })}
                  placeholder={lang === "ja" ? "次アクション" : "Next action"}
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text, #ccc)",
                    padding: "3px 4px",
                    resize: "vertical",
                  }}
                />
                <select
                  value={branch.syncPolicy || "manual"}
                  onChange={(e) => onUpdateBranch(branch.id, { syncPolicy: e.target.value as ScenarioBranch["syncPolicy"] })}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text-dim, #888)",
                    padding: "3px 4px",
                  }}
                >
                  <option value="manual">{lang === "ja" ? "manual" : "manual"}</option>
                  <option value="prefer-source">{lang === "ja" ? "source優先" : "prefer-source"}</option>
                  <option value="prefer-sandbox">{lang === "ja" ? "sandbox優先" : "prefer-sandbox"}</option>
                </select>
                <textarea
                  defaultValue={branch.note || ""}
                  onBlur={(e) => onUpdateBranch(branch.id, { note: e.target.value.trim() || undefined })}
                  placeholder={lang === "ja" ? "メモ" : "Note"}
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text, #ccc)",
                    padding: "3px 4px",
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={() => onCaptureSnapshot(branch.id)}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-accent, #f59e0b)",
                    cursor: "pointer",
                    padding: "3px 4px",
                  }}
                >
                  {lang === "ja" ? "現在状態を分岐スナップショット化" : "Capture current state to branch"}
                </button>
                <button
                  onClick={() => onMaterialize(branch.id)}
                  style={{
                    width: "100%",
                    fontSize: 8,
                    border: "1px solid var(--tw-border, #333)",
                    borderRadius: 3,
                    background: "transparent",
                    color: "var(--tw-text, #ccc)",
                    cursor: "pointer",
                    padding: "3px 4px",
                  }}
                >
                  {branch.materializedTopicId
                    ? (lang === "ja" ? "Sandbox を開く" : "Open sandbox")
                    : (lang === "ja" ? "Sandbox として実体化" : "Materialize as sandbox")}
                </button>
                {branch.materializedTopicId && (
                  <div style={{ display: "grid", gap: 3 }}>
                    <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                      {lang === "ja" ? "source -> sandbox 同期" : "Sync source -> sandbox"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
                      <button
                        onClick={() => openPreview(branch.id, "sync", "position")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "sync" && pendingAction.mode === "position" ? "rgba(52, 211, 153, 0.12)" : "transparent",
                          color: "#34d399",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "位置" : "Pos"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "sync", "size")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "sync" && pendingAction.mode === "size" ? "rgba(52, 211, 153, 0.12)" : "transparent",
                          color: "#34d399",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "サイズ" : "Size"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "sync", "content")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "sync" && pendingAction.mode === "content" ? "rgba(52, 211, 153, 0.12)" : "transparent",
                          color: "#34d399",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "内容" : "Attr"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "sync", "all")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "sync" && pendingAction.mode === "all" ? "rgba(52, 211, 153, 0.12)" : "transparent",
                          color: "#34d399",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "全部" : "All"}
                      </button>
                    </div>
                    <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                      {lang === "ja" ? "再取り込み" : "Backport"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
                      <button
                        onClick={() => openPreview(branch.id, "backport", "position")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "backport" && pendingAction.mode === "position" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                          color: "#60a5fa",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "位置" : "Pos"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "backport", "size")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "backport" && pendingAction.mode === "size" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                          color: "#60a5fa",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "サイズ" : "Size"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "backport", "content")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "backport" && pendingAction.mode === "content" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                          color: "#60a5fa",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "内容" : "Attr"}
                      </button>
                      <button
                        onClick={() => openPreview(branch.id, "backport", "all")}
                        style={{
                          fontSize: 8,
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 3,
                          background: pendingAction?.branchId === branch.id && pendingAction.direction === "backport" && pendingAction.mode === "all" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                          color: "#60a5fa",
                          cursor: "pointer",
                          padding: "3px 4px",
                        }}
                      >
                        {lang === "ja" ? "全部" : "All"}
                      </button>
                    </div>
                    {pendingAction?.branchId === branch.id && (
                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                          padding: "4px 5px",
                          border: "1px solid var(--tw-border, #333)",
                          borderRadius: 4,
                          background: pendingAction.direction === "sync" ? "rgba(52, 211, 153, 0.08)" : "rgba(96, 165, 250, 0.08)",
                        }}
                      >
                        <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                          {pendingAction.direction === "sync"
                            ? (lang === "ja" ? "同期プレビュー" : "Sync preview")
                            : (lang === "ja" ? "再取り込みプレビュー" : "Backport preview")}
                        </div>
                        <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                          {[
                            pendingAction.mode === "position" ? (lang === "ja" ? "位置" : "Pos") : "",
                            pendingAction.mode === "size" ? (lang === "ja" ? "サイズ" : "Size") : "",
                            pendingAction.mode === "content" ? (lang === "ja" ? "内容" : "Attr") : "",
                            pendingAction.mode === "all" ? (lang === "ja" ? "全部" : "All") : "",
                            lang === "ja"
                              ? `対象ノード ${getDiffCountForMode(branch.id, pendingAction.mode)}`
                              : `Nodes ${getDiffCountForMode(branch.id, pendingAction.mode)}`,
                            branchConflicts[branch.id]?.conflictCount
                              ? (lang === "ja"
                                ? `衝突注意 ${branchConflicts[branch.id].conflictCount}`
                                : `Risk ${branchConflicts[branch.id].conflictCount}`)
                              : "",
                          ].filter(Boolean).join(" / ")}
                        </div>
                        {getDiffPreviewLabels(branch.id, pendingAction.mode).length > 0 && (
                          <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {getDiffPreviewLabels(branch.id, pendingAction.mode).join(", ")}
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          <button
                            onClick={confirmPreview}
                            style={{
                              fontSize: 8,
                              border: "1px solid var(--tw-border, #333)",
                              borderRadius: 3,
                              background: "transparent",
                              color: pendingAction.direction === "sync" ? "#34d399" : "#60a5fa",
                              cursor: "pointer",
                              padding: "3px 4px",
                            }}
                          >
                            {lang === "ja" ? "実行" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setPendingAction(null)}
                            style={{
                              fontSize: 8,
                              border: "1px solid var(--tw-border, #333)",
                              borderRadius: 3,
                              background: "transparent",
                              color: "var(--tw-text-muted, #555)",
                              cursor: "pointer",
                              padding: "3px 4px",
                            }}
                          >
                            {lang === "ja" ? "取消" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                    {diffs.length > 0 && (
                      <div style={{ display: "grid", gap: 3 }}>
                        <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                          {lang === "ja" ? "変更ノード" : "Changed nodes"}
                        </div>
                        <div style={{ maxHeight: 140, overflowY: "auto", display: "grid", gap: 3 }}>
                          {diffs.map((diff) => (
                            (() => {
                              const nodeRecommendation = getRecommendedNodeAction(branch.id, diff);
                              return (
                            <div
                              key={diff.sourceNodeId}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 4,
                                alignItems: "center",
                                padding: "3px 4px",
                                border: "1px solid var(--tw-border, #333)",
                                borderRadius: 3,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", gap: 4, alignItems: "center", minWidth: 0 }}>
                                  <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {diff.label}
                                  </div>
                                  {branchConflicts[branch.id]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId) && (
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        fontSize: 7,
                                        padding: "1px 4px",
                                        borderRadius: 999,
                                        color: (() => {
                                          const risk = branchConflicts[branch.id]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId)?.risk;
                                          return risk === "high" ? "#ef4444" : risk === "medium" ? "#f59e0b" : "#60a5fa";
                                        })(),
                                        border: "1px solid var(--tw-border, #333)",
                                      }}
                                    >
                                      {(() => {
                                        const risk = branchConflicts[branch.id]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId)?.risk;
                                        return risk === "high" ? (lang === "ja" ? "高" : "High") : risk === "medium" ? (lang === "ja" ? "中" : "Med") : (lang === "ja" ? "低" : "Low");
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                                  {[
                                    diff.changedPosition ? (lang === "ja" ? "位置" : "Pos") : "",
                                    diff.changedSize ? (lang === "ja" ? "サイズ" : "Size") : "",
                                    diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged ? (lang === "ja" ? "内容" : "Attr") : "",
                                  ].filter(Boolean).join(" / ")}
                                </div>
                                {(diff.positionDelta || typeof diff.sizeDelta === "number" || typeof diff.frameScaleDelta === "number") && (
                                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {[
                                      diff.positionDelta ? `x:${diff.positionDelta[0] >= 0 ? "+" : ""}${diff.positionDelta[0].toFixed(1)} y:${diff.positionDelta[1] >= 0 ? "+" : ""}${diff.positionDelta[1].toFixed(1)} z:${diff.positionDelta[2] >= 0 ? "+" : ""}${diff.positionDelta[2].toFixed(1)}` : "",
                                      typeof diff.sizeDelta === "number" ? `size:${diff.sizeDelta >= 0 ? "+" : ""}${diff.sizeDelta.toFixed(2)}` : "",
                                      typeof diff.frameScaleDelta === "number" ? `frame:${diff.frameScaleDelta >= 0 ? "+" : ""}${diff.frameScaleDelta.toFixed(2)}` : "",
                                    ].filter(Boolean).join(" / ")}
                                  </div>
                                )}
                                {(diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged) && (
                                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {[
                                      diff.labelChanged ? `label:${diff.nextLabel || ""}` : "",
                                      diff.typeChanged ? `type:${diff.nextType || ""}` : "",
                                      diff.noteChanged ? (lang === "ja" ? "note:変更あり" : "note:changed") : "",
                                      diff.groupChanged ? `group:${diff.nextGroup || ""}` : "",
                                      diff.layerChanged ? `layer:${diff.nextLayer || ""}` : "",
                                      diff.tenseChanged ? `tense:${diff.nextTense || ""}` : "",
                                      diff.tagsChanged ? `tags:${(diff.nextTags || []).join(", ")}` : "",
                                    ].filter(Boolean).join(" / ")}
                                  </div>
                                )}
                                {branchConflicts[branch.id]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId)?.reasons.length ? (
                                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {branchConflicts[branch.id]?.nodes.find((item) => item.sourceNodeId === diff.sourceNodeId)?.reasons.join(" / ")}
                                  </div>
                                ) : null}
                                <div
                                  style={{
                                    marginTop: 4,
                                    display: "grid",
                                    gap: 3,
                                    padding: "4px 5px",
                                    borderRadius: 4,
                                    border: `1px solid ${
                                      nodeRecommendation.tone === "danger"
                                        ? "rgba(239, 68, 68, 0.35)"
                                        : nodeRecommendation.tone === "backport"
                                          ? "rgba(96, 165, 250, 0.35)"
                                          : "rgba(148, 163, 184, 0.35)"
                                    }`,
                                    background: nodeRecommendation.tone === "danger"
                                      ? "rgba(239, 68, 68, 0.08)"
                                      : nodeRecommendation.tone === "backport"
                                        ? "rgba(96, 165, 250, 0.08)"
                                        : "rgba(148, 163, 184, 0.08)",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                                    <div style={{ fontSize: 7, color: "var(--tw-text, #ccc)" }}>
                                      {lang === "ja" ? "推奨" : "Recommend"}
                                    </div>
                                    <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                                      {nodeRecommendation.label}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                                    {nodeRecommendation.reason}
                                  </div>
                                  {nodeRecommendation.action && (
                                    <button
                                      onClick={() => setPendingNodeAction({ branchId: branch.id, sourceNodeId: diff.sourceNodeId, mode: nodeRecommendation.action.mode })}
                                      style={{
                                        fontSize: 7,
                                        border: "1px solid var(--tw-border, #333)",
                                        borderRadius: 3,
                                        background: "transparent",
                                        color: "#60a5fa",
                                        cursor: "pointer",
                                        padding: "2px 4px",
                                      }}
                                    >
                                      {lang === "ja" ? "推奨プレビュー" : "Recommended preview"}
                                    </button>
                                  )}
                                </div>
                                {pendingNodeAction?.branchId === branch.id && pendingNodeAction.sourceNodeId === diff.sourceNodeId && (
                                  <div
                                    style={{
                                      marginTop: 4,
                                      display: "grid",
                                      gap: 4,
                                      padding: "4px 5px",
                                      border: "1px solid var(--tw-border, #333)",
                                      borderRadius: 4,
                                      background: "rgba(96, 165, 250, 0.08)",
                                    }}
                                  >
                                    <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)" }}>
                                      {lang === "ja" ? "ノード再取り込みプレビュー" : "Node backport preview"}
                                    </div>
                                    <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)" }}>
                                      {[
                                        pendingNodeAction.mode === "position" ? (lang === "ja" ? "位置" : "Pos") : "",
                                        pendingNodeAction.mode === "size" ? (lang === "ja" ? "サイズ" : "Size") : "",
                                        pendingNodeAction.mode === "content" ? (lang === "ja" ? "内容" : "Attr") : "",
                                        pendingNodeAction.mode === "all" ? (lang === "ja" ? "全部" : "All") : "",
                                      ].filter(Boolean).join(" / ")}
                                    </div>
                                    <div style={{ fontSize: 7, color: "var(--tw-text-muted, #555)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {[
                                        diff.positionDelta ? `x:${diff.positionDelta[0] >= 0 ? "+" : ""}${diff.positionDelta[0].toFixed(1)} y:${diff.positionDelta[1] >= 0 ? "+" : ""}${diff.positionDelta[1].toFixed(1)} z:${diff.positionDelta[2] >= 0 ? "+" : ""}${diff.positionDelta[2].toFixed(1)}` : "",
                                        typeof diff.sizeDelta === "number" ? `size:${diff.sizeDelta >= 0 ? "+" : ""}${diff.sizeDelta.toFixed(2)}` : "",
                                        typeof diff.frameScaleDelta === "number" ? `frame:${diff.frameScaleDelta >= 0 ? "+" : ""}${diff.frameScaleDelta.toFixed(2)}` : "",
                                        diff.labelChanged ? `label:${diff.nextLabel || ""}` : "",
                                        diff.typeChanged ? `type:${diff.nextType || ""}` : "",
                                        diff.groupChanged ? `group:${diff.nextGroup || ""}` : "",
                                        diff.layerChanged ? `layer:${diff.nextLayer || ""}` : "",
                                        diff.tenseChanged ? `tense:${diff.nextTense || ""}` : "",
                                        diff.tagsChanged ? `tags:${(diff.nextTags || []).join(", ")}` : "",
                                      ].filter(Boolean).join(" / ")}
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                      <button
                                        onClick={confirmNodePreview}
                                        style={{
                                          fontSize: 8,
                                          border: "1px solid var(--tw-border, #333)",
                                          borderRadius: 3,
                                          background: "transparent",
                                          color: "#60a5fa",
                                          cursor: "pointer",
                                          padding: "3px 4px",
                                        }}
                                      >
                                        {lang === "ja" ? "実行" : "Confirm"}
                                      </button>
                                      <button
                                        onClick={() => setPendingNodeAction(null)}
                                        style={{
                                          fontSize: 8,
                                          border: "1px solid var(--tw-border, #333)",
                                          borderRadius: 3,
                                          background: "transparent",
                                          color: "var(--tw-text-muted, #555)",
                                          cursor: "pointer",
                                          padding: "3px 4px",
                                        }}
                                      >
                                        {lang === "ja" ? "取消" : "Cancel"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 3 }}>
                                {diff.changedPosition && (
                                  <button
                                    onClick={() => setPendingNodeAction({ branchId: branch.id, sourceNodeId: diff.sourceNodeId, mode: "position" })}
                                    style={{
                                      fontSize: 7,
                                      border: "1px solid var(--tw-border, #333)",
                                      borderRadius: 3,
                                      background: pendingNodeAction?.branchId === branch.id && pendingNodeAction.sourceNodeId === diff.sourceNodeId && pendingNodeAction.mode === "position" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                                      color: "#60a5fa",
                                      cursor: "pointer",
                                      padding: "2px 4px",
                                    }}
                                  >
                                    {lang === "ja" ? "位置" : "Pos"}
                                  </button>
                                )}
                                {diff.changedSize && (
                                  <button
                                    onClick={() => setPendingNodeAction({ branchId: branch.id, sourceNodeId: diff.sourceNodeId, mode: "size" })}
                                    style={{
                                      fontSize: 7,
                                      border: "1px solid var(--tw-border, #333)",
                                      borderRadius: 3,
                                      background: pendingNodeAction?.branchId === branch.id && pendingNodeAction.sourceNodeId === diff.sourceNodeId && pendingNodeAction.mode === "size" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                                      color: "#60a5fa",
                                      cursor: "pointer",
                                      padding: "2px 4px",
                                    }}
                                  >
                                    {lang === "ja" ? "サイズ" : "Size"}
                                  </button>
                                )}
                                {(diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged) && (
                                  <button
                                    onClick={() => setPendingNodeAction({ branchId: branch.id, sourceNodeId: diff.sourceNodeId, mode: "content" })}
                                    style={{
                                      fontSize: 7,
                                      border: "1px solid var(--tw-border, #333)",
                                      borderRadius: 3,
                                      background: pendingNodeAction?.branchId === branch.id && pendingNodeAction.sourceNodeId === diff.sourceNodeId && pendingNodeAction.mode === "content" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                                      color: "#60a5fa",
                                      cursor: "pointer",
                                      padding: "2px 4px",
                                    }}
                                  >
                                    {lang === "ja" ? "内容" : "Attr"}
                                  </button>
                                )}
                                {(diff.changedPosition || diff.changedSize || diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged) && (
                                  <button
                                    onClick={() => setPendingNodeAction({ branchId: branch.id, sourceNodeId: diff.sourceNodeId, mode: "all" })}
                                    style={{
                                      fontSize: 7,
                                      border: "1px solid var(--tw-border, #333)",
                                      borderRadius: 3,
                                      background: pendingNodeAction?.branchId === branch.id && pendingNodeAction.sourceNodeId === diff.sourceNodeId && pendingNodeAction.mode === "all" ? "rgba(96, 165, 250, 0.12)" : "transparent",
                                      color: "#60a5fa",
                                      cursor: "pointer",
                                      padding: "2px 4px",
                                    }}
                                  >
                                    {lang === "ja" ? "全部" : "All"}
                                  </button>
                                )}
                              </div>
                            </div>
                              );
                            })()
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
      <div style={{ marginTop: 4, fontSize: 7, textAlign: "right", color: "var(--tw-text-muted, #555)" }}>
        {visibleBranches.length}/{branches.length} {lang === "ja" ? "分岐" : "branches"}
      </div>
      </> )} {/* end panelTab === "list" */}
    </div>
  );
}

// ── BranchComparePanel ────────────────────────────────────────────────────

type BranchDiffEntry = {
  sourceNodeId: string;
  label: string;
  changedPosition: boolean;
  changedSize: boolean;
  positionDelta?: [number, number, number];
  sizeDelta?: number;
  labelChanged?: boolean;
  nextLabel?: string;
  typeChanged?: boolean;
  nextType?: string;
  noteChanged?: boolean;
  groupChanged?: boolean;
  layerChanged?: boolean;
  tenseChanged?: boolean;
  tagsChanged?: boolean;
};

function diffChangeLabel(d: BranchDiffEntry, lang: "ja" | "en"): string[] {
  const items: string[] = [];
  if (d.changedPosition) items.push(lang === "ja" ? "位置" : "pos");
  if (d.changedSize) items.push(lang === "ja" ? "サイズ" : "size");
  if (d.labelChanged) items.push(lang === "ja" ? "ラベル" : "label");
  if (d.typeChanged) items.push(lang === "ja" ? "タイプ" : "type");
  if (d.noteChanged) items.push(lang === "ja" ? "ノート" : "note");
  if (d.groupChanged) items.push("group");
  if (d.layerChanged) items.push("layer");
  if (d.tagsChanged) items.push("tags");
  return items;
}

function BranchComparePanel({
  branches,
  branchDiffs,
  branchReviews,
  compareA,
  compareB,
  onSelectA,
  onSelectB,
  lang,
}: {
  branches: ScenarioBranch[];
  branchDiffs: Record<string, BranchDiffEntry[]>;
  branchReviews: Record<string, { score: number; changedNodeCount: number; status: string }>;
  compareA: string;
  compareB: string;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
  lang: "ja" | "en";
}) {
  const diffsA = branchDiffs[compareA] || [];
  const diffsB = branchDiffs[compareB] || [];

  // ノードIDセットで重複検出
  const idsA = new Set(diffsA.map((d) => d.sourceNodeId));
  const idsB = new Set(diffsB.map((d) => d.sourceNodeId));
  const shared = new Set([...idsA].filter((id) => idsB.has(id)));

  const reviewA = branchReviews[compareA];
  const reviewB = branchReviews[compareB];

  const SCORE_COLOR = (score: number) => score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  const renderDiffList = (diffs: BranchDiffEntry[], sharedIds: Set<string>) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 300, overflowY: "auto" }}>
      {diffs.length === 0 && (
        <div style={{ fontSize: 8, color: "var(--tw-text-muted, #888)", textAlign: "center", padding: "8px 0" }}>
          {lang === "ja" ? "差分なし" : "No diffs"}
        </div>
      )}
      {diffs.map((d) => {
        const isShared = sharedIds.has(d.sourceNodeId);
        const changes = diffChangeLabel(d, lang);
        return (
          <div
            key={d.sourceNodeId}
            style={{
              borderRadius: 4,
              padding: "3px 6px",
              background: isShared ? "#f97316" + "18" : "var(--tw-bg-card, #1e1e30)",
              border: `1px solid ${isShared ? "#f97316" + "44" : "var(--tw-border, #333)"}`,
            }}
          >
            <div style={{ fontSize: 8, color: "var(--tw-text, #ccc)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.nextLabel && d.labelChanged ? `${d.label} → ${d.nextLabel}` : d.label}
              {isShared && (
                <span style={{ marginLeft: 4, fontSize: 7, color: "#f97316", fontWeight: 700 }}>
                  {lang === "ja" ? "共通変更" : "conflict?"}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 1 }}>
              {changes.map((c) => (
                <span key={c} style={{ fontSize: 7, padding: "0 4px", borderRadius: 9999, background: "#60a5fa20", color: "#60a5fa" }}>{c}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {/* Branch selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[
          { label: lang === "ja" ? "分岐 A" : "Branch A", value: compareA, onChange: onSelectA, accent: "#f59e0b" },
          { label: lang === "ja" ? "分岐 B" : "Branch B", value: compareB, onChange: onSelectB, accent: "#60a5fa" },
        ].map(({ label, value, onChange, accent }) => (
          <div key={label}>
            <div style={{ fontSize: 7, color: accent, marginBottom: 2 }}>{label}</div>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: "100%", fontSize: 8,
                border: `1px solid ${accent}44`,
                borderRadius: 4, padding: "2px 4px",
                background: `${accent}10`, color: "var(--tw-text, #ccc)",
              }}
            >
              <option value="">-</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Score badges */}
      {(compareA || compareB) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
          {[{ review: reviewA, accent: "#f59e0b" }, { review: reviewB, accent: "#60a5fa" }].map(({ review, accent }, i) => (
            <div key={i} style={{ borderRadius: 4, padding: "4px 6px", border: `1px solid ${accent}33`, background: `${accent}10` }}>
              {review ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: SCORE_COLOR(review.score) }}>{review.score}</div>
                  <div style={{ fontSize: 7, color: "var(--tw-text-muted, #888)" }}>{review.changedNodeCount} {lang === "ja" ? "変更" : "changes"}</div>
                </>
              ) : (
                <div style={{ fontSize: 7, color: "var(--tw-text-muted, #888)" }}>-</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shared node count warning */}
      {compareA && compareB && compareA !== compareB && shared.size > 0 && (
        <div style={{ marginBottom: 6, fontSize: 8, padding: "4px 8px", borderRadius: 4, background: "#f9731620", color: "#f97316", border: "1px solid #f9731644" }}>
          {lang === "ja"
            ? `⚠ ${shared.size}件のノードが両ブランチで変更されています（潜在的衝突）`
            : `⚠ ${shared.size} node(s) changed in both branches (potential conflict)`}
        </div>
      )}

      {/* Side-by-side diff */}
      {compareA && compareB ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div>
            <div style={{ fontSize: 7, color: "#f59e0b", marginBottom: 3 }}>
              {branches.find((b) => b.id === compareA)?.label || "A"} ({diffsA.length})
            </div>
            {renderDiffList(diffsA, shared)}
          </div>
          <div>
            <div style={{ fontSize: 7, color: "#60a5fa", marginBottom: 3 }}>
              {branches.find((b) => b.id === compareB)?.label || "B"} ({diffsB.length})
            </div>
            {renderDiffList(diffsB, shared)}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 8, textAlign: "center", padding: "12px 0", color: "var(--tw-text-muted, #888)" }}>
          {lang === "ja" ? "比較する2つの分岐を選択してください" : "Select two branches to compare"}
        </div>
      )}
    </div>
  );
}
