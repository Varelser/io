import React from "react";
import type { NodeItem, EdgeItem } from "../../types";
import { CONTRADICTION_TYPES, TRANSFORM_OPS, RELATION_TYPES, RELATION_TYPE_LABELS } from "../../types";
import { CONTRADICTION_TYPE_LABELS, TRANSFORM_OP_LABELS } from "../../constants/theory-fields";
import { buildSemanticRelationSuggestions } from "../../utils/semantic-assist";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";

export function NodeNetworkPanel({ title, nodes, edges, lang, relationLabel, meaningLabel, newEdgeFrom, onChangeNewEdgeFrom, newEdgeTo, onChangeNewEdgeTo, newEdgeRelation, onChangeNewEdgeRelation, newEdgeMeaning, onChangeNewEdgeMeaning, newEdgeWeight, onChangeNewEdgeWeight, newEdgeContradictionType, onChangeNewEdgeContradictionType, newEdgeTransformOp, onChangeNewEdgeTransformOp, onAddEdge, onToggleEdgeVisible, onDuplicateEdge, onReverseEdge, onDeleteEdge, onUpdateEdgeWeight, onUpdateEdge, onAllOn, onAllOff, edgeMessage, preferredRelations }: { title: string; nodes: NodeItem[]; edges: EdgeItem[]; lang?: "ja" | "en"; relationLabel: string; meaningLabel: string; newEdgeFrom: string; onChangeNewEdgeFrom: (value: string) => void; newEdgeTo: string; onChangeNewEdgeTo: (value: string) => void; newEdgeRelation: string; onChangeNewEdgeRelation: (value: string) => void; newEdgeMeaning: string; onChangeNewEdgeMeaning: (value: string) => void; newEdgeWeight: string; onChangeNewEdgeWeight: (value: string) => void; newEdgeContradictionType?: string; onChangeNewEdgeContradictionType?: (value: string) => void; newEdgeTransformOp?: string; onChangeNewEdgeTransformOp?: (value: string) => void; onAddEdge: () => void; onToggleEdgeVisible: (edgeId: string) => void; onDuplicateEdge: (edgeId: string) => void; onReverseEdge: (edgeId: string) => void; onDeleteEdge: (edgeId: string) => void; onUpdateEdgeWeight: (edgeId: string, weight: number) => void; onUpdateEdge?: (edgeId: string, patch: Partial<EdgeItem>) => void; onAllOn: () => void; onAllOff: () => void; edgeMessage: string; preferredRelations?: string[] }) {
  const l = lang || "ja";
  const semanticSuggestions = buildSemanticRelationSuggestions(nodes, newEdgeFrom, newEdgeTo);

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      <div className="flex items-center justify-between gap-2"><div className="text-[9px] text-white/92">{title}</div><div className="flex gap-1"><Button onClick={onAllOn}>{l === "ja" ? "全表示" : "All on"}</Button><Button onClick={onAllOff}>{l === "ja" ? "全非表示" : "All off"}</Button></div></div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div><FieldLabel>{l === "ja" ? "From" : "From"}</FieldLabel><Select value={newEdgeFrom} onChange={(e) => onChangeNewEdgeFrom(e.target.value)}><option value="">{l === "ja" ? "選択" : "select"}</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</Select></div>
        <div><FieldLabel>{l === "ja" ? "To" : "To"}</FieldLabel><Select value={newEdgeTo} onChange={(e) => onChangeNewEdgeTo(e.target.value)}><option value="">{l === "ja" ? "選択" : "select"}</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</Select></div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div>
          <FieldLabel>{relationLabel}</FieldLabel>
          <datalist id="relation-list">
            {RELATION_TYPES.map((r) => (
              <option key={r} value={r}>{RELATION_TYPE_LABELS[r][l]}</option>
            ))}
            {(preferredRelations || []).filter((r) => !RELATION_TYPES.includes(r as typeof RELATION_TYPES[number])).map((r) => (
              <option key={`pref-${r}`} value={r}>{r}</option>
            ))}
          </datalist>
          <Input
            value={newEdgeRelation}
            list="relation-list"
            onChange={(e) => onChangeNewEdgeRelation(e.target.value)}
            placeholder={l === "ja" ? "supports / 自由入力" : "supports / free text"}
          />
          {(preferredRelations || []).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {(preferredRelations || []).map((rel) => (
                <button
                  key={rel}
                  onClick={() => onChangeNewEdgeRelation(rel)}
                  className="rounded-full border px-1.5 py-[1px] text-[7px] leading-none transition"
                  style={{
                    borderColor: newEdgeRelation === rel ? "var(--tw-accent)" : "var(--tw-border)",
                    background: newEdgeRelation === rel ? "var(--tw-accent)" : "transparent",
                    color: newEdgeRelation === rel ? "#fff" : "var(--tw-text-muted)",
                  }}
                >
                  {rel}
                </button>
              ))}
            </div>
          )}
        </div>
        <div><FieldLabel>{meaningLabel}</FieldLabel><Input value={newEdgeMeaning} onChange={(e) => onChangeNewEdgeMeaning(e.target.value)} /></div>
      </div>
      <div className="mt-1.5 rounded-md border border-white/8 bg-black/20 p-2">
        <div className="text-[8px] uppercase tracking-wider text-white/34">
          {l === "ja" ? "Semantic Suggestions" : "Semantic Suggestions"}
        </div>
        <div className="mt-1 grid gap-1">
          {semanticSuggestions.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5 text-left"
              onClick={() => {
                onChangeNewEdgeRelation(item.relation);
                onChangeNewEdgeMeaning(l === "ja" ? item.meaningJa : item.meaningEn);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] text-white/84">{item.relation}</span>
                <span className="text-[7px] text-white/26">{l === "ja" ? "適用" : "Apply"}</span>
              </div>
              <div className="mt-0.5 text-[7px] text-white/46">{l === "ja" ? item.meaningJa : item.meaningEn}</div>
              <div className="mt-0.5 text-[7px] text-white/24">{l === "ja" ? item.reasonJa : item.reasonEn}</div>
            </button>
          ))}
        </div>
      </div>
      {/* Contradiction Type & Transform Op for new edge */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div>
          <FieldLabel>{l === "ja" ? "対立タイプ" : "Contradiction"}</FieldLabel>
          <Select value={newEdgeContradictionType || ""} onChange={(e) => onChangeNewEdgeContradictionType?.(e.target.value)}>
            <option value="">-</option>
            {CONTRADICTION_TYPES.map((ct) => <option key={ct} value={ct}>{CONTRADICTION_TYPE_LABELS[ct][l]}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>{l === "ja" ? "変換演算" : "Transform"}</FieldLabel>
          <Select value={newEdgeTransformOp || ""} onChange={(e) => onChangeNewEdgeTransformOp?.(e.target.value)}>
            <option value="">-</option>
            {TRANSFORM_OPS.map((op) => <option key={op} value={op}>{TRANSFORM_OP_LABELS[op][l]}</option>)}
          </Select>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-[1fr_58px] gap-1.5">
        <div><FieldLabel>{l === "ja" ? "重み" : "Weight"}</FieldLabel><Input type="range" min="0.2" max="6" step="0.1" value={newEdgeWeight} onChange={(e) => onChangeNewEdgeWeight(e.target.value)} /></div>
        <div><FieldLabel>{l === "ja" ? "値" : "Value"}</FieldLabel><Input type="number" min="0.2" max="6" step="0.1" value={newEdgeWeight} onChange={(e) => onChangeNewEdgeWeight(e.target.value)} /></div>
      </div>
      <div className="mt-1.5"><Button onClick={onAddEdge} className="w-full">{l === "ja" ? "+ エッジ" : "+ edge"}</Button></div>
      <div className="mt-1.5 space-y-1">
        {edges.map((edge) => {
          const fromNode = nodes.find((node) => node.id === edge.from);
          const toNode = nodes.find((node) => node.id === edge.to);
          return (
            <div key={edge.id} className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5">
              <div className="flex items-center justify-between gap-1.5 text-[9px] text-white/74">
                <span>{fromNode?.label || "?"} → {toNode?.label || "?"}</span>
                <span className="text-white/32">{edge.relation}</span>
              </div>
              <div className="mt-0.5 text-[8px] leading-4 text-white/54">{edge.meaning}</div>
              {/* Contradiction / Transform badges */}
              {(edge.contradictionType || edge.transformOp) && (
                <div className="mt-0.5 flex gap-1 flex-wrap">
                  {edge.contradictionType && (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[7px] text-red-300/70">
                      {CONTRADICTION_TYPE_LABELS[edge.contradictionType][l]}
                    </span>
                  )}
                  {edge.transformOp && (
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[7px] text-blue-300/70">
                      {TRANSFORM_OP_LABELS[edge.transformOp][l]}
                    </span>
                  )}
                </div>
              )}
              {/* Edit contradiction/transform inline */}
              {onUpdateEdge && (
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <Select value={edge.contradictionType || ""} onChange={(e) => onUpdateEdge(edge.id, { contradictionType: (e.target.value || undefined) as EdgeItem["contradictionType"] })}>
                    <option value="">-</option>
                    {CONTRADICTION_TYPES.map((ct) => <option key={ct} value={ct}>{CONTRADICTION_TYPE_LABELS[ct][l]}</option>)}
                  </Select>
                  <Select value={edge.transformOp || ""} onChange={(e) => onUpdateEdge(edge.id, { transformOp: (e.target.value || undefined) as EdgeItem["transformOp"] })}>
                    <option value="">-</option>
                    {TRANSFORM_OPS.map((op) => <option key={op} value={op}>{TRANSFORM_OP_LABELS[op][l]}</option>)}
                  </Select>
                </div>
              )}
              <div className="mt-1 grid grid-cols-[1fr_54px] gap-1.5">
                <div><FieldLabel>{l === "ja" ? "重み" : "Weight"}</FieldLabel><Input type="range" min="0.2" max="6" step="0.1" value={edge.weight} onChange={(e) => onUpdateEdgeWeight(edge.id, Number(e.target.value))} /></div>
                <div><FieldLabel>{l === "ja" ? "値" : "Value"}</FieldLabel><Input type="number" min="0.2" max="6" step="0.1" value={edge.weight} onChange={(e) => onUpdateEdgeWeight(edge.id, Number(e.target.value))} /></div>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button active={edge.visible !== false} onClick={() => onToggleEdgeVisible(edge.id)} className="w-full">{edge.visible === false ? (l === "ja" ? "オフ" : "Off") : (l === "ja" ? "オン" : "On")}</Button>
                <Button onClick={() => onDuplicateEdge(edge.id)} className="w-full">{l === "ja" ? "複製" : "Copy"}</Button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button onClick={() => onReverseEdge(edge.id)} className="w-full">{l === "ja" ? "反転" : "Reverse"}</Button>
                <Button danger onClick={() => onDeleteEdge(edge.id)} className="w-full">{l === "ja" ? "削除" : "Delete"}</Button>
              </div>
            </div>
          );
        })}
        {edgeMessage ? <div className="text-[8px] text-white/42">{edgeMessage}</div> : null}
      </div>
    </div>
  );
}
