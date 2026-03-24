import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Section } from "./ui/Section";
import { FieldLabel } from "./ui/FieldLabel";
import { FILE_IMPORT_ACCEPT } from "../import/file-converters";
import { SAMPLE_WORKSPACE_PRESETS, type SampleWorkspaceStats } from "../utils/sample-state";
import { VIEW_LABELS } from "../constants/views";
import type { ViewType } from "../constants/views";
import type { SampleActionPreview } from "../hooks/useSampleWorkspace";

function formatGrowth(base: number, added: number) {
  if (added <= 0) return "0%";
  if (base <= 0) return "new";
  return `+${Math.round((added / base) * 100)}%`;
}

export type ImportExportModalProps = {
  open: boolean;
  onClose: () => void;
  lang: "ja" | "en";
  importReport: string;
  mdImportMode: string;
  onChangeMdImportMode: (mode: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImportFiles: React.ChangeEventHandler<HTMLInputElement>;
  onExportNodesCsv: () => void;
  onExportEdgesCsv: () => void;
  onExportObsidianZip: () => void;
  onExportStandaloneHtml: () => void;
  samplePresetId: (typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"];
  onChangeSamplePresetId: (id: (typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"]) => void;
  samplePresetStats: Record<(typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"], SampleWorkspaceStats>;
  selectedSamplePreset: (typeof SAMPLE_WORKSPACE_PRESETS)[number];
  selectedSampleStats: SampleWorkspaceStats;
  currentWorkspaceStats: SampleWorkspaceStats;
  recommendedSampleAction: "replace" | "append";
  sampleActionPreview: SampleActionPreview | null;
  onOpenReplaceSamplePreview: () => void;
  onOpenAppendSamplePreview: () => void;
  onDownloadSampleJson: () => void;
  onConfirmSampleAction: () => void;
  onClearSamplePreview: () => void;
  onChangeSamplePreviewTargetView: (view: ViewType) => void;
};

export function ImportExportModal({
  open,
  onClose,
  lang,
  importReport,
  mdImportMode,
  onChangeMdImportMode,
  fileInputRef,
  onImportFiles,
  onExportNodesCsv,
  onExportEdgesCsv,
  onExportObsidianZip,
  onExportStandaloneHtml,
  samplePresetId,
  onChangeSamplePresetId,
  samplePresetStats,
  selectedSamplePreset,
  selectedSampleStats,
  currentWorkspaceStats,
  recommendedSampleAction,
  sampleActionPreview,
  onOpenReplaceSamplePreview,
  onOpenAppendSamplePreview,
  onDownloadSampleJson,
  onConfirmSampleAction,
  onClearSamplePreview,
  onChangeSamplePreviewTargetView,
}: ImportExportModalProps) {
  const importModeLabels = {
    simple: lang === "ja" ? "シンプル" : "Simple",
    links: lang === "ja" ? "リンク重視" : "Link-aware",
    native: lang === "ja" ? "ネイティブ" : "Native",
  } as const;

  return (
    <Modal open={open} onClose={onClose} title={lang === "ja" ? "入出力" : "Import / Export"} width={480}>
      {/* File Import */}
      <Section title={lang === "ja" ? "ファイル取込" : "File Import"} defaultOpen>
        <div className="grid grid-cols-2 gap-1.5">
          <Select value={mdImportMode} onChange={(e) => onChangeMdImportMode(e.target.value)}>
            <option value="simple">{importModeLabels.simple}</option>
            <option value="links">{importModeLabels.links}</option>
            <option value="native">{importModeLabels.native}</option>
          </Select>
          <Button onClick={() => fileInputRef.current?.click()} className="w-full">
            {lang === "ja" ? "ファイルを選択" : "Choose Files"}
          </Button>
        </div>
        <div className="mt-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "MD / PDF / DOCX / HTML / SVG を読込" : "Import MD / PDF / DOCX / HTML / SVG"}
        </div>
        <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" accept={FILE_IMPORT_ACCEPT} multiple className="hidden" onChange={onImportFiles} />
        {importReport ? <div className="mt-1.5 text-[8px] leading-4" style={{ color: "var(--tw-text-muted)" }}>{importReport}</div> : null}
      </Section>

      {/* Export */}
      <Section title={lang === "ja" ? "エクスポート" : "Export"} defaultOpen>
        <div className="grid grid-cols-2 gap-1.5">
          <Button onClick={onExportNodesCsv} className="w-full">{lang === "ja" ? "CSV ノード" : "CSV Nodes"}</Button>
          <Button onClick={onExportEdgesCsv} className="w-full">{lang === "ja" ? "CSV エッジ" : "CSV Edges"}</Button>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Button onClick={onExportStandaloneHtml} className="w-full">{lang === "ja" ? "単体 HTML" : "Standalone HTML"}</Button>
          <Button onClick={onExportObsidianZip} className="w-full">{lang === "ja" ? "Obsidian ZIP" : "Obsidian ZIP"}</Button>
        </div>
        <div className="mt-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "HTML 1枚の閲覧スナップショット、または Obsidian / Logseq 互換 Vault を出力" : "Export a single-file HTML snapshot or an Obsidian / Logseq compatible vault"}
        </div>
      </Section>

      {/* Sample Presets */}
      <Section title={lang === "ja" ? "サンプルデータ" : "Sample Data"} defaultOpen={false}>
        <div className="grid grid-cols-3 gap-1.5">
          <Button onClick={onOpenReplaceSamplePreview} className="w-full" active={recommendedSampleAction === "replace"}>
            {lang === "ja" ? "読込" : "Load"}
          </Button>
          <Button onClick={onOpenAppendSamplePreview} className="w-full" active={recommendedSampleAction === "append"}>
            {lang === "ja" ? "追加" : "Append"}
          </Button>
          <Button onClick={onDownloadSampleJson} className="w-full">
            {lang === "ja" ? "JSON出力" : "Export JSON"}
          </Button>
        </div>

        <div className="mt-1.5">
          <Select value={samplePresetId} onChange={(e) => onChangeSamplePresetId(e.target.value as (typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"])}>
            {SAMPLE_WORKSPACE_PRESETS.map((sample) => (
              <option key={sample.id} value={sample.id}>{sample.label[lang]}</option>
            ))}
          </Select>
        </div>

        {/* Sample cards */}
        <div className="mt-1.5 grid gap-1.5">
          {SAMPLE_WORKSPACE_PRESETS.map((sample) => {
            const active = sample.id === samplePresetId;
            const stats = samplePresetStats[sample.id];
            return (
              <button
                key={sample.id}
                onClick={() => onChangeSamplePresetId(sample.id)}
                className="w-full rounded-md border px-2 py-1.5 text-left transition-colors"
                style={{
                  borderColor: active ? "rgba(96, 165, 250, 0.45)" : "var(--tw-border)",
                  background: active ? "rgba(96, 165, 250, 0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[9px]" style={{ color: "var(--tw-text)" }}>{sample.label[lang]}</div>
                  <div className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                    {VIEW_LABELS[sample.suggestedView][lang]}
                  </div>
                </div>
                <div className="mt-0.5 text-[7px] leading-4" style={{ color: "var(--tw-text-muted)" }}>
                  {sample.description[lang]}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {[`T:${stats.topics}`, `N:${stats.nodes}`, `B:${stats.branches}`].map((item) => (
                    <span key={item} className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action preview */}
        {sampleActionPreview && (
          <div
            className="mt-1.5 rounded-md border px-2 py-2 text-[7px]"
            style={sampleActionPreview.mode === recommendedSampleAction
              ? { borderColor: "rgba(96, 165, 250, 0.45)", background: "rgba(96, 165, 250, 0.08)", color: "var(--tw-text-muted)" }
              : { borderColor: "rgba(245, 158, 11, 0.45)", background: "rgba(245, 158, 11, 0.08)", color: "var(--tw-text-muted)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[8px]" style={{ color: "var(--tw-text)" }}>
                {sampleActionPreview.mode === "replace"
                  ? (lang === "ja" ? "読込プレビュー" : "Load preview")
                  : (lang === "ja" ? "追加プレビュー" : "Append preview")}
              </div>
              <div>{selectedSamplePreset.label[lang]}</div>
            </div>
            <div className="mt-1">
              {sampleActionPreview.mode === "replace"
                ? (lang === "ja" ? `現在の state を置き換えます。` : `Replace the current state.`)
                : (lang === "ja" ? `現在の state を残したまま追加します。` : `Append without replacing.`)}
            </div>
            {sampleActionPreview.mode === "replace" && (
              <div className="mt-1 rounded-md border px-2 py-1.5" style={{ borderColor: "rgba(248, 113, 113, 0.35)", background: "rgba(248, 113, 113, 0.08)" }}>
                {lang === "ja"
                  ? `置換: topics ${currentWorkspaceStats.topics} / nodes ${currentWorkspaceStats.nodes}`
                  : `replacing: topics ${currentWorkspaceStats.topics} / nodes ${currentWorkspaceStats.nodes}`}
              </div>
            )}
            {sampleActionPreview.mode === "append" && (
              <div className="mt-1 rounded-md border px-2 py-1.5" style={{ borderColor: "rgba(96, 165, 250, 0.35)", background: "rgba(96, 165, 250, 0.08)" }}>
                {lang === "ja"
                  ? `追加後: topics ${currentWorkspaceStats.topics + selectedSampleStats.topics} / nodes ${currentWorkspaceStats.nodes + selectedSampleStats.nodes}`
                  : `after: topics ${currentWorkspaceStats.topics + selectedSampleStats.topics} / nodes ${currentWorkspaceStats.nodes + selectedSampleStats.nodes}`}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {selectedSamplePreset.quickViews.map((candidateView) => (
                <button
                  key={candidateView}
                  onClick={() => onChangeSamplePreviewTargetView(candidateView)}
                  className="rounded-full border px-1.5 py-0.5 text-[7px]"
                  style={sampleActionPreview.targetView === candidateView
                    ? { borderColor: "var(--tw-accent)", background: "var(--tw-accent)", color: "#fff" }
                    : { borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}
                >
                  {VIEW_LABELS[candidateView].icon} {VIEW_LABELS[candidateView][lang]}
                </button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <Button onClick={onConfirmSampleAction} className="w-full" active>{lang === "ja" ? "実行" : "Confirm"}</Button>
              <Button onClick={onDownloadSampleJson} className="w-full">{lang === "ja" ? "JSON出力" : "JSON"}</Button>
              <Button onClick={onClearSamplePreview} className="w-full">{lang === "ja" ? "閉じる" : "Cancel"}</Button>
            </div>
          </div>
        )}
      </Section>
    </Modal>
  );
}
