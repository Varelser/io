import React from "react";
import type { NodeItem } from "../../types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";

export type SearchFilterPanelProps = {
  layerFilter: string;
  onChangeLayerFilter: (value: string) => void;
  groupFilter: string;
  onChangeGroupFilter: (value: string) => void;
  uniqueLayers: string[];
  uniqueGroups: string[];
  onSelectFiltered: () => void;
  onClearSelected: () => void;
  filteredNodes: NodeItem[];
  multiNodeIdSet: Set<string>;
  onToggleMultiNode: (nodeId: string) => void;
  onFocusNode: (nodeId: string) => void;
  lang?: "ja" | "en";
};

export function SearchFilterPanel({
  layerFilter,
  onChangeLayerFilter,
  groupFilter,
  onChangeGroupFilter,
  uniqueLayers,
  uniqueGroups,
  onSelectFiltered,
  onClearSelected,
  filteredNodes,
  multiNodeIdSet,
  onToggleMultiNode,
  onFocusNode,
  lang = "ja",
}: SearchFilterPanelProps) {
  const isJa = lang === "ja";
  return (
    <div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div><FieldLabel>{isJa ? "レイヤー" : "Layer"}</FieldLabel><Select value={layerFilter} onChange={(e) => onChangeLayerFilter(e.target.value)}><option value="">{isJa ? "すべて" : "all"}</option>{uniqueLayers.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div>
        <div><FieldLabel>{isJa ? "グループ" : "Group"}</FieldLabel><Select value={groupFilter} onChange={(e) => onChangeGroupFilter(e.target.value)}><option value="">{isJa ? "すべて" : "all"}</option>{uniqueGroups.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button onClick={onSelectFiltered} className="w-full">{isJa ? "抽出を選択" : "Select filtered"}</Button>
        <Button onClick={onClearSelected} className="w-full">{isJa ? "選択解除" : "Clear selected"}</Button>
      </div>
      <div className="mt-1.5 max-h-44 space-y-1 overflow-auto">
        {filteredNodes.slice(0, 32).map((node) => (
          <div key={node.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-[9px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text)" }}>
            <button
              onClick={() => onToggleMultiNode(node.id)}
              className="h-3.5 w-3.5 rounded-sm border"
              style={multiNodeIdSet.has(node.id) ? { borderColor: "var(--tw-text)", background: "var(--tw-text)" } : { borderColor: "var(--tw-text-muted)", background: "transparent" }}
              aria-label={isJa ? "選択切替" : "toggle selection"}
            />
            <button className="flex min-w-0 flex-1 items-center justify-between" onClick={() => onFocusNode(node.id)}>
              <span className="truncate">{node.label}</span>
              <span style={{ color: "var(--tw-text-muted)" }}>{isJa ? "移動" : "jump"}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
