import React from "react";
import type { NodeItem, NodeSelectionSet } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

export function NodeOutlinerPanel({
  nodes,
  selectedNodeId,
  lockedNodeId,
  multiSelectedNodeIds,
  savedSets,
  compareSetId,
  lang = "ja",
  onSelectNode,
  recommendedSortKey,
  onPinNode,
  onSaveSelectionSet,
  onApplySelectionSet,
  onRenameSelectionSet,
  onCycleSelectionSetColor,
  onDeleteSelectionSet,
  onChangeCompareSetId,
  onUpdateSelectionSet,
}: {
  nodes: NodeItem[];
  selectedNodeId: string | null;
  lockedNodeId?: string | null;
  multiSelectedNodeIds: string[];
  savedSets: NodeSelectionSet[];
  compareSetId: string;
  lang?: "ja" | "en";
  onSelectNode: (nodeId: string) => void;
  onPinNode: (nodeId: string) => void;
  onSaveSelectionSet: (label: string) => void;
  onApplySelectionSet: (setId: string) => void;
  onRenameSelectionSet: (setId: string, label: string) => void;
  onCycleSelectionSetColor: (setId: string) => void;
  onDeleteSelectionSet: (setId: string) => void;
  onChangeCompareSetId: (setId: string) => void;
  onUpdateSelectionSet?: (setId: string, patch: Partial<NodeSelectionSet>) => void;
  recommendedSortKey?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<"label" | "type" | "layer" | "group" | "updatedAt">("label");
  const [setLabel, setSetLabel] = React.useState("");
  const [editingSetId, setEditingSetId] = React.useState<string | null>(null);
  const [editingSetLabel, setEditingSetLabel] = React.useState("");
  const filteredNodes = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = !normalized ? nodes : nodes.filter((node) => {
      const haystack = [node.label, node.type, node.layer, node.group, ...(node.tags || [])].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
    return [...filtered].sort((a, b) => {
      const av = sortKey === "updatedAt" ? (a.updatedAt || "") : String(a[sortKey] || "");
      const bv = sortKey === "updatedAt" ? (b.updatedAt || "") : String(b[sortKey] || "");
      return av.localeCompare(bv, lang === "ja" ? "ja" : "en");
    });
  }, [lang, nodes, query, sortKey]);

  const handleSaveSet = () => {
    onSaveSelectionSet(setLabel);
    setSetLabel("");
  };

  const compareSummary = React.useMemo(() => {
    const target = savedSets.find((set) => set.id === compareSetId);
    if (!target) return null;
    const current = new Set(multiSelectedNodeIds);
    const targetIds = new Set(target.nodeIds);
    const overlap = target.nodeIds.filter((nodeId) => current.has(nodeId));
    const onlyCurrent = multiSelectedNodeIds.filter((nodeId) => !targetIds.has(nodeId));
    const onlyTarget = target.nodeIds.filter((nodeId) => !current.has(nodeId));
    const resolveLabel = (nodeId: string) => nodes.find((node) => node.id === nodeId)?.label || nodeId;
    return {
      target,
      overlap,
      onlyCurrent,
      onlyTarget,
      overlapLabels: overlap.slice(0, 5).map(resolveLabel),
      onlyCurrentLabels: onlyCurrent.slice(0, 5).map(resolveLabel),
      onlyTargetLabels: onlyTarget.slice(0, 5).map(resolveLabel),
    };
  }, [compareSetId, multiSelectedNodeIds, nodes, savedSets]);

  const startRename = (set: NodeSelectionSet) => {
    setEditingSetId(set.id);
    setEditingSetLabel(set.label);
  };

  const commitRename = () => {
    if (!editingSetId) return;
    onRenameSelectionSet(editingSetId, editingSetLabel);
    setEditingSetId(null);
    setEditingSetLabel("");
  };

  const compareMembership = React.useMemo(() => {
    if (!compareSummary) return new Map<string, "shared" | "current-only" | "set-only">();
    const map = new Map<string, "shared" | "current-only" | "set-only">();
    compareSummary.overlap.forEach((nodeId) => map.set(nodeId, "shared"));
    compareSummary.onlyCurrent.forEach((nodeId) => map.set(nodeId, "current-only"));
    compareSummary.onlyTarget.forEach((nodeId) => map.set(nodeId, "set-only"));
    return map;
  }, [compareSummary]);

  const compareStyleForNode = (nodeId: string) => {
    const membership = compareMembership.get(nodeId);
    if (membership === "shared") {
      return { borderColor: "rgba(52, 211, 153, 0.45)", background: "rgba(52, 211, 153, 0.08)" };
    }
    if (membership === "current-only") {
      return { borderColor: "rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.08)" };
    }
    if (membership === "set-only") {
      return { borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(56, 189, 248, 0.08)" };
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
        <span>{lang === "ja" ? `ノード ${nodes.length}` : `${nodes.length} nodes`}</span>
        <span>{lang === "ja" ? `複数選択 ${multiSelectedNodeIds.length}` : `${multiSelectedNodeIds.length} multi-selected`}</span>
      </div>
      <div className="flex items-center gap-1">
        <Select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)} className="flex-1">
          <option value="label">{lang === "ja" ? "並び替え: ラベル" : "Sort: Label"}</option>
          <option value="type">{lang === "ja" ? "並び替え: Type" : "Sort: Type"}</option>
          <option value="layer">{lang === "ja" ? "並び替え: Layer" : "Sort: Layer"}</option>
          <option value="group">{lang === "ja" ? "並び替え: Group" : "Sort: Group"}</option>
          <option value="updatedAt">{lang === "ja" ? "並び替え: 更新日時" : "Sort: Updated"}</option>
        </Select>
        {recommendedSortKey && recommendedSortKey !== sortKey && (
          <button
            onClick={() => setSortKey(recommendedSortKey as typeof sortKey)}
            title={`${lang === "ja" ? "推奨: " : "Recommended: "}${recommendedSortKey}`}
            className="rounded border px-1.5 py-0.5 text-[8px] leading-none"
            style={{ borderColor: "var(--tw-accent)", color: "var(--tw-accent)", background: "transparent" }}
          >
            ★
          </button>
        )}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={lang === "ja" ? "ラベル / type / layer / group を検索" : "Search label / type / layer / group"}
      />
      <div className="rounded-md border p-2" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
        <div className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "Selection Sets" : "Selection Sets"}
        </div>
        <div className="mt-2 flex items-center gap-1">
          <Input
            value={setLabel}
            onChange={(event) => setSetLabel(event.target.value)}
            placeholder={lang === "ja" ? "現在の複数選択を保存" : "Save current multi-selection"}
          />
          <Button onClick={handleSaveSet} disabled={multiSelectedNodeIds.length === 0}>
            {lang === "ja" ? "保存" : "Save"}
          </Button>
        </div>
        <div className="mt-2 space-y-1">
          {savedSets.length === 0 ? (
            <div className="text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
              {lang === "ja" ? "この topic の保存済みセットはまだありません" : "No saved sets for this topic yet"}
            </div>
          ) : (
            <>
              <Select value={compareSetId} onChange={(event) => onChangeCompareSetId(event.target.value)}>
                <option value="">{lang === "ja" ? "現在の複数選択と比較..." : "Compare against current multi-selection..."}</option>
                {savedSets.map((set) => (
                  <option key={`compare-${set.id}`} value={set.id}>{set.label}</option>
                ))}
              </Select>
              {compareSummary ? (
                <div className="rounded-md border px-2 py-2 text-[8px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}>
                  <div style={{ color: "var(--tw-text)" }}>
                    {lang === "ja" ? `比較対象: ${compareSummary.target.label}` : `Comparing: ${compareSummary.target.label}`}
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1" style={{ color: "var(--tw-text-muted)" }}>
                    <div>{lang === "ja" ? `共通 ${compareSummary.overlap.length}` : `Shared ${compareSummary.overlap.length}`}</div>
                    <div>{lang === "ja" ? `現在のみ ${compareSummary.onlyCurrent.length}` : `Current only ${compareSummary.onlyCurrent.length}`}</div>
                    <div>{lang === "ja" ? `セットのみ ${compareSummary.onlyTarget.length}` : `Set only ${compareSummary.onlyTarget.length}`}</div>
                  </div>
                  <div className="mt-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                    {compareSummary.overlapLabels.length > 0 ? `${lang === "ja" ? "共通" : "Shared"}: ${compareSummary.overlapLabels.join(", ")}` : null}
                    {compareSummary.onlyCurrentLabels.length > 0 ? ` ${lang === "ja" ? "現在のみ" : "Current only"}: ${compareSummary.onlyCurrentLabels.join(", ")}` : null}
                    {compareSummary.onlyTargetLabels.length > 0 ? ` ${lang === "ja" ? "セットのみ" : "Set only"}: ${compareSummary.onlyTargetLabels.join(", ")}` : null}
                  </div>
                </div>
              ) : null}
              {savedSets.map((set) => (
                <div key={set.id} className="rounded-md border px-2 py-1.5" style={{ borderColor: compareSetId === set.id ? (set.color || "var(--tw-accent)") : "var(--tw-border)" }}>
                  <div className="flex items-center justify-between gap-2">
                    {editingSetId === set.id ? (
                      <div className="min-w-0 flex-1">
                        <Input
                          value={editingSetLabel}
                          onChange={(event) => setEditingSetLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitRename();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <button className="min-w-0 flex-1 text-left" onClick={() => onApplySelectionSet(set.id)}>
                        <>
                          <div className="flex items-center gap-1 truncate text-[9px]" style={{ color: "var(--tw-text)" }}>
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: set.color || "var(--tw-accent)" }} />
                            <span className="truncate">{set.label}</span>
                          </div>
                          <div className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                            {lang === "ja" ? `${set.nodeIds.length} ノード` : `${set.nodeIds.length} nodes`}
                          </div>
                        </>
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {editingSetId === set.id ? (
                        <>
                          <Button onClick={commitRename}>{lang === "ja" ? "保存" : "Save"}</Button>
                          <Button onClick={() => { setEditingSetId(null); setEditingSetLabel(""); }}>{lang === "ja" ? "戻す" : "Cancel"}</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => onApplySelectionSet(set.id)}>{lang === "ja" ? "適用" : "Apply"}</Button>
                          {onUpdateSelectionSet ? (
                            <input
                              type="color"
                              value={set.color || "#f59e0b"}
                              onChange={(e) => onUpdateSelectionSet(set.id, { color: e.target.value })}
                              className="h-5 w-5 cursor-pointer rounded border border-white/10 bg-transparent p-0"
                              title={lang === "ja" ? "色を変更" : "Change color"}
                            />
                          ) : (
                            <Button onClick={() => onCycleSelectionSetColor(set.id)}>{lang === "ja" ? "色" : "Color"}</Button>
                          )}
                          <Button onClick={() => startRename(set)}>{lang === "ja" ? "名前" : "Rename"}</Button>
                          <Button danger onClick={() => onDeleteSelectionSet(set.id)}>{lang === "ja" ? "削除" : "Delete"}</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="max-h-[220px] space-y-1 overflow-auto pr-1">
        {filteredNodes.length === 0 ? (
          <div className="rounded-md border px-2 py-2 text-[8px]" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
            {lang === "ja" ? "該当ノードなし" : "No matching nodes"}
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isLocked = lockedNodeId === node.id;
            const compareStyle = compareStyleForNode(node.id);
            return (
              <div
                key={node.id}
                className="rounded-md border px-2 py-1.5"
                style={isLocked
                  ? { borderColor: "var(--tw-accent)", background: "color-mix(in srgb, var(--tw-accent) 10%, var(--tw-bg-card))" }
                  : compareStyle
                    ? compareStyle
                  : { borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => onSelectNode(node.id)}>
                    <div className="truncate text-[10px]" style={{ color: "var(--tw-text)" }}>{node.label}</div>
                    <div className="mt-0.5 truncate text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                      {[node.type, node.layer, node.group].filter(Boolean).join(" / ")}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {isSelected ? (
                      <span className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
                        {lang === "ja" ? "選択中" : "Selected"}
                      </span>
                    ) : null}
                    {!isLocked && compareMembership.get(node.id) === "shared" ? (
                      <span className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "rgba(52, 211, 153, 0.4)", color: "#34d399" }}>
                        {lang === "ja" ? "共通" : "Shared"}
                      </span>
                    ) : null}
                    {!isLocked && compareMembership.get(node.id) === "current-only" ? (
                      <span className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#f59e0b" }}>
                        {lang === "ja" ? "現在のみ" : "Current"}
                      </span>
                    ) : null}
                    {!isLocked && compareMembership.get(node.id) === "set-only" ? (
                      <span className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}>
                        {lang === "ja" ? "セットのみ" : "Set"}
                      </span>
                    ) : null}
                    <button
                      onClick={() => onPinNode(node.id)}
                      className="rounded-full border px-1.5 py-0.5 text-[7px]"
                      style={isLocked
                        ? { borderColor: "var(--tw-accent)", color: "var(--tw-text)" }
                        : { borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}
                    >
                      {isLocked ? (lang === "ja" ? "固定中" : "Pinned") : (lang === "ja" ? "固定" : "Pin")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
