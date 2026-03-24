import React from "react";
import { NODE_TYPES, TENSES } from "../../constants/node-types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type BulkOpsPanelProps = {
  multiNodeIdsCount: number;
  onBulkSnap: () => void;
  onBulkCopy: () => void;
  onBulkDelete: () => void;
  bulkGroupValue: string;
  onChangeBulkGroupValue: (value: string) => void;
  onApplyBulkGroup: () => void;
  bulkLayerValue: string;
  onChangeBulkLayerValue: (value: string) => void;
  onApplyBulkLayer: () => void;
  bulkTypeValue: string;
  onChangeBulkTypeValue: (value: string) => void;
  onApplyBulkType: () => void;
  bulkTenseValue: string;
  onChangeBulkTenseValue: (value: string) => void;
  onApplyBulkTense: () => void;
  bulkNodeSizeValue: string;
  onChangeBulkNodeSizeValue: (value: string) => void;
  onApplyBulkNodeSize: () => void;
  bulkFrameScaleValue: string;
  onChangeBulkFrameScaleValue: (value: string) => void;
  onApplyBulkFrameScale: () => void;
  bulkOffsetX: string;
  onChangeBulkOffsetX: (value: string) => void;
  bulkOffsetY: string;
  onChangeBulkOffsetY: (value: string) => void;
  bulkOffsetZ: string;
  onChangeBulkOffsetZ: (value: string) => void;
  onBulkMove: () => void;
  bulkAddTagValue: string;
  onChangeBulkAddTagValue: (value: string) => void;
  onApplyBulkAddTag: () => void;
  bulkRemoveTagValue: string;
  onChangeBulkRemoveTagValue: (value: string) => void;
  onApplyBulkRemoveTag: () => void;
  bulkMessage: string;
  lang?: "ja" | "en";
};

export function BulkOpsPanel({
  multiNodeIdsCount,
  onBulkSnap,
  onBulkCopy,
  onBulkDelete,
  bulkGroupValue,
  onChangeBulkGroupValue,
  onApplyBulkGroup,
  bulkLayerValue,
  onChangeBulkLayerValue,
  onApplyBulkLayer,
  bulkTypeValue,
  onChangeBulkTypeValue,
  onApplyBulkType,
  bulkTenseValue,
  onChangeBulkTenseValue,
  onApplyBulkTense,
  bulkNodeSizeValue,
  onChangeBulkNodeSizeValue,
  onApplyBulkNodeSize,
  bulkFrameScaleValue,
  onChangeBulkFrameScaleValue,
  onApplyBulkFrameScale,
  bulkOffsetX,
  onChangeBulkOffsetX,
  bulkOffsetY,
  onChangeBulkOffsetY,
  bulkOffsetZ,
  onChangeBulkOffsetZ,
  onBulkMove,
  bulkAddTagValue,
  onChangeBulkAddTagValue,
  onApplyBulkAddTag,
  bulkRemoveTagValue,
  onChangeBulkRemoveTagValue,
  onApplyBulkRemoveTag,
  bulkMessage,
  lang = "ja",
}: BulkOpsPanelProps) {
  const isJa = lang === "ja";
  const disabled = multiNodeIdsCount === 0;
  return (
    <div style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
      <div className="mb-1.5 rounded-md border px-2 py-1 text-[8px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-muted)" }}>
        {isJa ? "選択数" : "selected"}: {multiNodeIdsCount}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={onBulkSnap} className="w-full">{isJa ? "一括整列" : "Bulk snap"}</Button>
        <Button onClick={onBulkCopy} className="w-full">{isJa ? "一括複製" : "Bulk copy"}</Button>
      </div>
      <div className="mt-1.5">
        <Button danger onClick={onBulkDelete} className="w-full">{isJa ? "一括削除" : "Bulk delete"}</Button>
      </div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkGroupValue} onChange={(e) => onChangeBulkGroupValue(e.target.value)} placeholder={isJa ? "一括グループ" : "bulk group"} /><Button onClick={onApplyBulkGroup}>{isJa ? "適用" : "Apply"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkLayerValue} onChange={(e) => onChangeBulkLayerValue(e.target.value)} placeholder={isJa ? "一括レイヤー" : "bulk layer"} /><Button onClick={onApplyBulkLayer}>{isJa ? "適用" : "Apply"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Select value={bulkTypeValue} onChange={(e) => onChangeBulkTypeValue(e.target.value)}>{NODE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</Select><Button onClick={onApplyBulkType}>{isJa ? "型" : "Type"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Select value={bulkTenseValue} onChange={(e) => onChangeBulkTenseValue(e.target.value)}>{TENSES.map((value) => <option key={value} value={value}>{value}</option>)}</Select><Button onClick={onApplyBulkTense}>{isJa ? "時制" : "Tense"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkNodeSizeValue} onChange={(e) => onChangeBulkNodeSizeValue(e.target.value)} placeholder={isJa ? "一括サイズ" : "bulk size"} type="number" min="0.05" max="2.4" step="0.01" /><Button onClick={onApplyBulkNodeSize}>{isJa ? "サイズ" : "Size"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkFrameScaleValue} onChange={(e) => onChangeBulkFrameScaleValue(e.target.value)} placeholder={isJa ? "一括フレーム" : "bulk frame"} type="number" min="0.3" max="2.6" step="0.01" /><Button onClick={onApplyBulkFrameScale}>{isJa ? "枠" : "Frame"}</Button></div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5"><Input value={bulkOffsetX} onChange={(e) => onChangeBulkOffsetX(e.target.value)} placeholder="dx" type="number" step="0.1" /><Input value={bulkOffsetY} onChange={(e) => onChangeBulkOffsetY(e.target.value)} placeholder="dy" type="number" step="0.1" /><Input value={bulkOffsetZ} onChange={(e) => onChangeBulkOffsetZ(e.target.value)} placeholder="dz" type="number" step="0.1" /></div>
      <div className="mt-1.5"><Button onClick={onBulkMove} className="w-full">{isJa ? "一括移動" : "Bulk move"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkAddTagValue} onChange={(e) => onChangeBulkAddTagValue(e.target.value)} placeholder={isJa ? "タグ追加" : "add tag"} /><Button onClick={onApplyBulkAddTag}>{isJa ? "+タグ" : "+Tag"}</Button></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5"><Input value={bulkRemoveTagValue} onChange={(e) => onChangeBulkRemoveTagValue(e.target.value)} placeholder={isJa ? "タグ削除" : "remove tag"} /><Button onClick={onApplyBulkRemoveTag}>{isJa ? "−タグ" : "−Tag"}</Button></div>
      {bulkMessage ? <div className="mt-1 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>{bulkMessage}</div> : null}
    </div>
  );
}
