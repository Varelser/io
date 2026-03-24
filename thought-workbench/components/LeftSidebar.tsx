import React from "react";
import { PRESETS, PRESET_GUIDES } from "../constants/presets";
import type { ViewType } from "../constants/views";
import type { UiText } from "../constants/ui-text";
import type { TopicItem } from "../types";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { FieldLabel } from "./ui/FieldLabel";
import { Section } from "./ui/Section";
import { SectionDivider } from "./ui/SectionDivider";
import { TopicListPanel } from "./panels/TopicListPanel";
import type { SplitMode } from "./MultiPaneLayout";
import { SplitModeSelector } from "./SplitModeSelector";
import { GroupedViewSelector } from "./GroupedViewSelector";

type LeftSidebarProps = {
  open: boolean;
  width: number;
  bottomInset?: number;
  panelZoom: React.CSSProperties;
  lang: "ja" | "en";
  ui: UiText;
  topics: TopicItem[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string, nodeId: string | null) => void;
  onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void;
  onAddTopic: () => void;
  onAddChildTopic: () => void;
  onAddNode: () => void;
  onDuplicateSelectedTopic: () => void;
  onDeleteSelectedTopic: () => void;
  view: ViewType;
  onChangeView: (view: ViewType) => void;
  recommendedViews: Set<ViewType>;
  splitMode: SplitMode;
  onChangeSplitMode: (mode: SplitMode) => void;
  preset: string;
  onChangePreset: (preset: string) => void;
  onApplyPreset: () => void;
  onGeneratePresetSeed: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
};

export function LeftSidebar({
  open,
  width,
  bottomInset = 0,
  panelZoom,
  lang,
  ui,
  topics,
  selectedTopicId,
  onSelectTopic,
  onTopicContextMenu,
  onAddTopic,
  onAddChildTopic,
  onAddNode,
  onDuplicateSelectedTopic,
  onDeleteSelectedTopic,
  view,
  onChangeView,
  recommendedViews,
  splitMode,
  onChangeSplitMode,
  preset,
  onChangePreset,
  onApplyPreset,
  onGeneratePresetSeed,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenImportExport,
}: LeftSidebarProps) {
  return (
    <aside
      className={`absolute top-0 bottom-0 z-10 overflow-auto rounded-r-[16px] border-r backdrop-blur-sm p-1.5 transition-transform duration-200 ${open ? "translate-x-0 left-0" : "-translate-x-full left-0"}`}
      style={{ width: `${width}px`, bottom: `${bottomInset}px`, background: "var(--tw-bg-panel)", borderColor: "var(--tw-border)", ...panelZoom }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 -mx-1.5 -mt-1.5 mb-2 border-b px-1.5 pt-1.5 pb-2 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--tw-bg-panel) 90%, transparent)", borderColor: "var(--tw-border)" }}
      >
        {/* Title row with utility icons */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[8px] uppercase tracking-[0.14em]" style={{ color: "var(--tw-text-muted)" }}>
              {lang === "ja" ? "ワークベンチ" : "Workbench"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--tw-text)" }}>
              Thought Map
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Undo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex h-6 w-6 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
              style={{
                borderColor: canUndo ? "var(--tw-border)" : "transparent",
                color: canUndo ? "var(--tw-text-dim)" : "var(--tw-text-muted)",
                opacity: canUndo ? 1 : 0.4,
              }}
              title={lang === "ja" ? "元に戻す (⌘Z)" : "Undo (⌘Z)"}
              aria-label={lang === "ja" ? "元に戻す" : "Undo"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h5a2 2 0 0 1 0 4H6" />
                <polyline points="5,3 3,5 5,7" />
              </svg>
            </button>
            {/* Redo */}
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex h-6 w-6 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tw-accent)]"
              style={{
                borderColor: canRedo ? "var(--tw-border)" : "transparent",
                color: canRedo ? "var(--tw-text-dim)" : "var(--tw-text-muted)",
                opacity: canRedo ? 1 : 0.4,
              }}
              title={lang === "ja" ? "やり直す (⇧⌘Z)" : "Redo (⇧⌘Z)"}
              aria-label={lang === "ja" ? "やり直す" : "Redo"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H4a2 2 0 0 0 0 4h2" />
                <polyline points="7,3 9,5 7,7" />
              </svg>
            </button>
            {/* Import/Export */}
            <button
              onClick={onOpenImportExport}
              className="flex h-6 w-6 items-center justify-center rounded-md border transition-colors"
              style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)" }}
              title={lang === "ja" ? "入出力" : "Import / Export"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4,2 4,6" />
                <polyline points="2,4 4,2 6,4" />
                <polyline points="8,10 8,6" />
                <polyline points="6,8 8,10 10,8" />
              </svg>
            </button>
            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="flex h-6 w-6 items-center justify-center rounded-md border transition-colors"
              style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)" }}
              title={lang === "ja" ? "設定" : "Settings"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="2" />
                <path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M9.5 2.5l-.7.7M3.2 8.8l-.7.7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-2 pt-0.5 grid grid-cols-3 gap-1">
          <Button onClick={onAddTopic} className="w-full">+ Topic</Button>
          <Button onClick={onAddChildTopic} className="w-full">{lang === "ja" ? "+ 子" : "+ Child"}</Button>
          <Button onClick={onAddNode} className="w-full">+ Node</Button>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <Button onClick={onDuplicateSelectedTopic} className="w-full">{lang === "ja" ? "複製" : "Copy"}</Button>
          <Button danger onClick={onDeleteSelectedTopic} className="w-full">{lang === "ja" ? "削除" : "Delete"}</Button>
        </div>
      </div>

      {/* Topics list */}
      <Section title={lang === "ja" ? "トピック" : "Topics"} defaultOpen>
        {topics.length ? (
          <TopicListPanel topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onTopicContextMenu={onTopicContextMenu} />
        ) : (
          <div className="rounded-md border px-2 py-2 text-[8px] leading-4" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
            {lang === "ja"
              ? "まだトピックがありません。+ Topic で開始するか、入出力ボタンからインポートできます。"
              : "No topics yet. Start with + Topic, or use the import button above."}
          </div>
        )}
      </Section>

      <Section title={lang === "ja" ? "レイアウト・表示" : "Layout & View"} defaultOpen>
        <GroupedViewSelector value={view} onChange={onChangeView} recommendedViews={recommendedViews} lang={lang} />

        <div className="mt-2">
          <FieldLabel>{lang === "ja" ? "画面分割" : "Split"}</FieldLabel>
          <SplitModeSelector splitMode={splitMode} onChangeSplitMode={onChangeSplitMode} lang={lang} />
        </div>

        <SectionDivider label={lang === "ja" ? "プリセット" : "Preset"} />
        <Select value={preset} onChange={(e) => onChangePreset(e.target.value)}>
          {PRESETS.map((candidatePreset) => (
            <option key={candidatePreset} value={candidatePreset}>{candidatePreset}</option>
          ))}
        </Select>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Button onClick={onApplyPreset} className="w-full">{ui.apply}</Button>
          <Button onClick={onGeneratePresetSeed} className="w-full">{ui.seed}</Button>
        </div>
        <div
          className="mt-1.5 rounded-md border px-2 py-1.5 text-[9px] leading-4"
          style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-muted)" }}
        >
          <div className="mb-1" style={{ color: "var(--tw-text)" }}>{ui.presetGuide}</div>
          {PRESET_GUIDES[preset]?.[lang] || PRESET_GUIDES.free[lang]}
        </div>
      </Section>
    </aside>
  );
}
