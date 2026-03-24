import React from "react";
import type { UiText } from "../constants/ui-text";
import type { Material, NodeItem, Snapshot, SnapshotScope, TopicItem, URLRecord, VocabTerm } from "../types";
import { Section } from "./ui/Section";
import { SectionDivider } from "./ui/SectionDivider";
import { PanelErrorBoundary } from "./ui/PanelErrorBoundary";
import { TopicPanel } from "./panels/TopicPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { SearchFilterPanel } from "./panels/SearchFilterPanel";
import { BulkOpsPanel } from "./panels/BulkOpsPanel";
import { BulkConnectPanel } from "./panels/BulkConnectPanel";
import { NodePanel } from "./panels/NodePanel";
import { NodeOutlinerPanel } from "./panels/NodeOutlinerPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { NodeNetworkPanel } from "./panels/NodeNetworkPanel";
import { TopicLinksPanel } from "./panels/TopicLinksPanel";
import { MarkdownJsonPanel } from "./panels/MarkdownJsonPanel";
import { PageRankPanel } from "./panels/PageRankPanel";
import { MethodSelectorPanel } from "./panels/MethodSelectorPanel";

function lazyNamedPanel(loader: () => Promise<Record<string, unknown>>, exportName: string) {
  return React.lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as React.ComponentType<any> };
  });
}

function DeferredPanel({ children, lang }: { children: React.ReactNode; lang: "ja" | "en" }) {
  return (
    <React.Suspense
      fallback={
        <div className="pt-1 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "読込中..." : "Loading..."}
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

const BookmarkPanel = lazyNamedPanel(() => import("./panels/BookmarkPanel"), "BookmarkPanel");
const QueryPanel = lazyNamedPanel(() => import("./panels/QueryPanel"), "QueryPanel");
const LayoutPresetPanel = lazyNamedPanel(() => import("./panels/LayoutPresetPanel"), "LayoutPresetPanel");
const SmartFolderPanel = lazyNamedPanel(() => import("./panels/SmartFolderPanel"), "SmartFolderPanel");
const IntegrityPanel = lazyNamedPanel(() => import("./panels/IntegrityPanel"), "IntegrityPanel");
const ConversionQueuePanel = lazyNamedPanel(() => import("./panels/ConversionQueuePanel"), "ConversionQueuePanel");
const BundlePanel = lazyNamedPanel(() => import("./panels/BundlePanel"), "BundlePanel");
const SuggestionPanel = lazyNamedPanel(() => import("./panels/SuggestionPanel"), "SuggestionPanel");
const EventLogPanel = lazyNamedPanel(() => import("./panels/EventLogPanel"), "EventLogPanel");
const ScenarioBranchPanel = lazyNamedPanel(() => import("./panels/ScenarioBranchPanel"), "ScenarioBranchPanel");
const VocabularyPanel = lazyNamedPanel(() => import("./panels/VocabularyPanel"), "VocabularyPanel");
const MaterialPanel = lazyNamedPanel(() => import("./panels/MaterialPanel"), "MaterialPanel");
const URLRecordPanel = lazyNamedPanel(() => import("./panels/URLRecordPanel"), "URLRecordPanel");
const SnapshotPanel = lazyNamedPanel(() => import("./panels/SnapshotPanel"), "SnapshotPanel");
const ReviewQueuePanel = lazyNamedPanel(() => import("./panels/ReviewQueuePanel"), "ReviewQueuePanel");
const JournalPanel = lazyNamedPanel(() => import("./panels/JournalPanel"), "JournalPanel");
const RecoveryPanel = lazyNamedPanel(() => import("./panels/RecoveryPanel"), "RecoveryPanel");

function InspectorTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-2 py-1 text-[8px] uppercase tracking-[0.14em] transition-colors"
      style={active
        ? { borderColor: "var(--tw-accent)", background: "color-mix(in srgb, var(--tw-accent) 18%, transparent)", color: "var(--tw-text)" }
        : { borderColor: "var(--tw-border)", background: "transparent", color: "var(--tw-text-muted)" }}
    >
      {label}
    </button>
  );
}

type RightInspectorProps = {
  open: boolean;
  width: number;
  bottomInset?: number;
  panelZoom: React.CSSProperties;
  lang: "ja" | "en";
  editLocked?: boolean;
  editLockLabel?: string;
  onToggleEditLock?: () => void;
  selectedTopic: TopicItem | null;
  selectedNode: NodeItem | null;
  ui: UiText;
  topicPanelProps: React.ComponentProps<typeof TopicPanel>;
  methodSelectorProps: React.ComponentProps<typeof MethodSelectorPanel>;
  nodePanelProps: React.ComponentProps<typeof NodePanel> | null;
  nodeOutlinerPanelProps: React.ComponentProps<typeof NodeOutlinerPanel> | null;
  searchPanelProps: React.ComponentProps<typeof SearchPanel>;
  searchFilterPanelProps: React.ComponentProps<typeof SearchFilterPanel>;
  bulkOpsPanelProps: React.ComponentProps<typeof BulkOpsPanel>;
  bulkConnectPanelProps: React.ComponentProps<typeof BulkConnectPanel>;
  historyPanelProps: React.ComponentProps<typeof HistoryPanel>;
  nodeNetworkPanelProps: React.ComponentProps<typeof NodeNetworkPanel>;
  topicLinksPanelProps: React.ComponentProps<typeof TopicLinksPanel>;
  markdownJsonPanelProps: React.ComponentProps<typeof MarkdownJsonPanel>;
  pageRankPanelProps: React.ComponentProps<typeof PageRankPanel>;
  queryPanelProps: React.ComponentProps<typeof QueryPanel>;
  bookmarkPanelProps: React.ComponentProps<typeof BookmarkPanel>;
  layoutPresetPanelProps: React.ComponentProps<typeof LayoutPresetPanel>;
  smartFolderPanelProps: React.ComponentProps<typeof SmartFolderPanel>;
  integrityPanelProps: React.ComponentProps<typeof IntegrityPanel>;
  suggestionPanelProps: React.ComponentProps<typeof SuggestionPanel>;
  bundlePanelProps: React.ComponentProps<typeof BundlePanel>;
  conversionQueuePanelProps: React.ComponentProps<typeof ConversionQueuePanel>;
  eventLogPanelProps: React.ComponentProps<typeof EventLogPanel>;
  scenarioBranchPanelProps: React.ComponentProps<typeof ScenarioBranchPanel>;
  vocabularyPanelProps: { vocabulary: VocabTerm[]; lang: "ja" | "en"; onUpdate: (vocab: VocabTerm[]) => void };
  reviewQueuePanelProps?: { topics: TopicItem[]; lang: "ja" | "en"; onNavigateNode?: (topicId: string, nodeId: string | null) => void; onUpdateNode?: (topicId: string, nodeId: string, patch: Record<string, unknown>) => void };
  materialPanelProps?: { materials: Material[]; topics?: { id: string; title: string }[]; lang: "ja" | "en"; onUpdate: (materials: Material[]) => void };
  urlRecordPanelProps?: { urlRecords: URLRecord[]; lang: "ja" | "en"; onUpdate: (records: URLRecord[]) => void };
  snapshotPanelProps?: { snapshots: Snapshot[]; lang: "ja" | "en"; onCapture: (label: string, scope: SnapshotScope) => void; onDelete: (id: string) => void };
  journalPanelProps?: React.ComponentProps<typeof JournalPanel>;
  recoveryPanelProps?: React.ComponentProps<typeof RecoveryPanel>;
  requestedTab?: "edit" | "analyze" | "workspace";
};

export function RightInspector({
  open,
  width,
  bottomInset = 0,
  panelZoom,
  lang,
  editLocked,
  editLockLabel,
  onToggleEditLock,
  selectedTopic,
  selectedNode,
  ui,
  topicPanelProps,
  methodSelectorProps,
  nodePanelProps,
  nodeOutlinerPanelProps,
  searchPanelProps,
  searchFilterPanelProps,
  bulkOpsPanelProps,
  bulkConnectPanelProps,
  historyPanelProps,
  nodeNetworkPanelProps,
  topicLinksPanelProps,
  markdownJsonPanelProps,
  pageRankPanelProps,
  queryPanelProps,
  bookmarkPanelProps,
  layoutPresetPanelProps,
  smartFolderPanelProps,
  integrityPanelProps,
  suggestionPanelProps,
  bundlePanelProps,
  conversionQueuePanelProps,
  eventLogPanelProps,
  scenarioBranchPanelProps,
  vocabularyPanelProps,
  reviewQueuePanelProps,
  materialPanelProps,
  urlRecordPanelProps,
  snapshotPanelProps,
  journalPanelProps,
  recoveryPanelProps,
  requestedTab,
}: RightInspectorProps) {
  const [inspectorTab, setInspectorTab] = React.useState<"edit" | "analyze" | "workspace">("edit");
  React.useEffect(() => {
    if (requestedTab) setInspectorTab(requestedTab);
  }, [requestedTab]);
  return (
    <aside
      className={`absolute top-0 bottom-0 z-10 overflow-auto rounded-l-[16px] border-l backdrop-blur-sm p-2 transition-transform duration-200 ${open ? "translate-x-0 right-0" : "translate-x-full right-0"}`}
      style={{ width: `${width}px`, bottom: `${bottomInset}px`, background: "var(--tw-bg-panel)", borderColor: "var(--tw-border)", ...panelZoom }}
    >
      <div
        className="sticky top-0 z-20 -mx-2 -mt-2 mb-2 border-b px-2 pt-2 pb-2 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--tw-bg-panel) 90%, transparent)", borderColor: "var(--tw-border)" }}
      >
        <div className="text-[8px] uppercase tracking-[0.14em]" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "インスペクタ" : "Inspector"}
        </div>
        <div className="mt-2 flex items-center gap-1">
          <InspectorTabButton active={inspectorTab === "edit"} label={lang === "ja" ? "Edit" : "Edit"} onClick={() => setInspectorTab("edit")} />
          <InspectorTabButton active={inspectorTab === "analyze"} label={lang === "ja" ? "Analyze" : "Analyze"} onClick={() => setInspectorTab("analyze")} />
          <InspectorTabButton active={inspectorTab === "workspace"} label={lang === "ja" ? "Library" : "Library"} onClick={() => setInspectorTab("workspace")} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={onToggleEditLock}
            className="rounded-full border px-2 py-1 text-[8px] uppercase tracking-[0.14em] transition-colors"
            style={editLocked
              ? { borderColor: "var(--tw-accent)", background: "color-mix(in srgb, var(--tw-accent) 18%, transparent)", color: "var(--tw-text)" }
              : { borderColor: "var(--tw-border)", background: "transparent", color: "var(--tw-text-muted)" }}
            title={lang === "ja" ? "Edit タブのプロパティを固定/解除" : "Lock or unlock Edit tab properties"}
            aria-label={lang === "ja" ? "Edit タブのプロパティを固定/解除" : "Lock or unlock Edit tab properties"}
            aria-pressed={!!editLocked}
          >
            {editLocked ? (lang === "ja" ? "Lock On" : "Lock On") : (lang === "ja" ? "Lock Off" : "Lock Off")}
          </button>
          {editLocked && editLockLabel ? (
            <div className="min-w-0 rounded-full border px-2 py-1 text-[8px]" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
              {editLockLabel}
            </div>
          ) : null}
        </div>
      </div>
      {selectedTopic ? (
        <>
          {inspectorTab === "edit" ? (
            <>
              <PanelErrorBoundary label="Topic">
                <TopicPanel {...topicPanelProps} />
              </PanelErrorBoundary>
              {nodeOutlinerPanelProps ? (
                <Section title={lang === "ja" ? "Outliner" : "Outliner"} defaultOpen>
                  <PanelErrorBoundary label="Outliner">
                    <NodeOutlinerPanel {...nodeOutlinerPanelProps} />
                  </PanelErrorBoundary>
                </Section>
              ) : null}
              <PanelErrorBoundary label="Method">
                <MethodSelectorPanel {...methodSelectorProps} />
              </PanelErrorBoundary>
              {selectedNode && nodePanelProps ? (
                <PanelErrorBoundary label="Node">
                  <NodePanel {...nodePanelProps} />
                </PanelErrorBoundary>
              ) : null}
            </>
          ) : null}
          {inspectorTab === "analyze" ? (
            <>
              <SectionDivider label={lang === "ja" ? "検索・クエリ" : "Search & Query"} />
              <Section title={lang === "ja" ? "検索" : "Search"} defaultOpen>
                <PanelErrorBoundary label="Search">
                  <SearchPanel {...searchPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "フィルタ" : "Filter"} defaultOpen>
                <PanelErrorBoundary label="Filter">
                  <SearchFilterPanel {...searchFilterPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "クエリ検索" : "Query Search"} defaultOpen={false}>
                <PanelErrorBoundary label="Query">
                  <DeferredPanel lang={lang}>
                    <QueryPanel {...queryPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "一括操作" : "Batch Actions"} />
              <Section title={lang === "ja" ? "一括操作" : "Bulk Operations"} defaultOpen={false}>
                <PanelErrorBoundary label="BulkOps">
                  <BulkOpsPanel {...bulkOpsPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "一括接続" : "Bulk Connect"} defaultOpen={false}>
                <PanelErrorBoundary label="BulkConnect">
                  <BulkConnectPanel {...bulkConnectPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "分析" : "Analysis"} />
              <Section title={ui.history}>
                <PanelErrorBoundary label="History">
                  <HistoryPanel {...historyPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "ノード関係" : "Node Network"}>
                <PanelErrorBoundary label="NodeNetwork">
                  <NodeNetworkPanel {...nodeNetworkPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={ui.topicLinks}>
                <PanelErrorBoundary label="TopicLinks">
                  <TopicLinksPanel {...topicLinksPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <Section title={ui.pageRank}>
                <PanelErrorBoundary label="PageRank">
                  <PageRankPanel {...pageRankPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "診断" : "Diagnostics"} />
              {reviewQueuePanelProps ? (
                <>
                  <SectionDivider label={lang === "ja" ? "レビューキュー" : "Review Queue"} />
                  <PanelErrorBoundary label="ReviewQueue">
                    <DeferredPanel lang={lang}>
                      <ReviewQueuePanel {...reviewQueuePanelProps} />
                    </DeferredPanel>
                  </PanelErrorBoundary>
                </>
              ) : null}
              <Section title={lang === "ja" ? "整合性" : "Integrity"} defaultOpen={false}>
                <PanelErrorBoundary label="Integrity">
                  <DeferredPanel lang={lang}>
                    <IntegrityPanel {...integrityPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "自動提案" : "Suggestions"} defaultOpen={false}>
                <PanelErrorBoundary label="Suggestions">
                  <DeferredPanel lang={lang}>
                    <SuggestionPanel {...suggestionPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
            </>
          ) : null}
          {inspectorTab === "workspace" ? (
            <>
              <SectionDivider label={lang === "ja" ? "エクスポート" : "Export"} />
              <Section title={ui.markdownJson}>
                <PanelErrorBoundary label="Markdown/JSON">
                  <MarkdownJsonPanel {...markdownJsonPanelProps} />
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "統制語彙" : "Vocabulary"} />
              <Section title={lang === "ja" ? "語彙・シソーラス" : "Thesaurus"} defaultOpen={false}>
                <PanelErrorBoundary label="Vocabulary">
                  <DeferredPanel lang={lang}>
                    <VocabularyPanel {...vocabularyPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "コレクション" : "Collections"} />
              <Section title={lang === "ja" ? "ブックマーク" : "Bookmarks"} defaultOpen={false}>
                <PanelErrorBoundary label="Bookmarks">
                  <DeferredPanel lang={lang}>
                    <BookmarkPanel {...bookmarkPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "スマートフォルダ" : "Smart Folders"} defaultOpen={false}>
                <PanelErrorBoundary label="SmartFolders">
                  <DeferredPanel lang={lang}>
                    <SmartFolderPanel {...smartFolderPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "レイアウト" : "Layout Presets"} defaultOpen={false}>
                <PanelErrorBoundary label="LayoutPresets">
                  <DeferredPanel lang={lang}>
                    <LayoutPresetPanel {...layoutPresetPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "資料" : "Materials"} />
              {materialPanelProps && (
                <Section title={lang === "ja" ? "資料" : "Materials"} defaultOpen={false}>
                  <PanelErrorBoundary label="Materials">
                    <DeferredPanel lang={lang}>
                      <MaterialPanel {...materialPanelProps} />
                    </DeferredPanel>
                  </PanelErrorBoundary>
                </Section>
              )}
              {urlRecordPanelProps && (
                <Section title={lang === "ja" ? "URL記録" : "URL Records"} defaultOpen={false}>
                  <PanelErrorBoundary label="URLRecords">
                    <DeferredPanel lang={lang}>
                      <URLRecordPanel {...urlRecordPanelProps} />
                    </DeferredPanel>
                  </PanelErrorBoundary>
                </Section>
              )}
              {journalPanelProps && (
                <>
                  <SectionDivider label={lang === "ja" ? "ジャーナル" : "Journal"} />
                  <Section title={lang === "ja" ? "ジャーナル" : "Journal"} defaultOpen={false}>
                    <PanelErrorBoundary label="Journal">
                      <DeferredPanel lang={lang}>
                        <JournalPanel {...journalPanelProps} />
                      </DeferredPanel>
                    </PanelErrorBoundary>
                  </Section>
                </>
              )}
              <SectionDivider label={lang === "ja" ? "バンドル" : "Bundles"} />
              <Section title={lang === "ja" ? "バンドル" : "Bundles"} defaultOpen={false}>
                <PanelErrorBoundary label="Bundles">
                  <DeferredPanel lang={lang}>
                    <BundlePanel {...bundlePanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <SectionDivider label={lang === "ja" ? "システム" : "System"} />
              <Section title={lang === "ja" ? "変換キュー" : "Conversion Queue"} defaultOpen={false}>
                <PanelErrorBoundary label="ConversionQueue">
                  <DeferredPanel lang={lang}>
                    <ConversionQueuePanel {...conversionQueuePanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "イベントログ" : "Event Log"} defaultOpen={false}>
                <PanelErrorBoundary label="EventLog">
                  <DeferredPanel lang={lang}>
                    <EventLogPanel {...eventLogPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              <Section title={lang === "ja" ? "未来分岐" : "Future Branches"} defaultOpen={false}>
                <PanelErrorBoundary label="ScenarioBranch">
                  <DeferredPanel lang={lang}>
                    <ScenarioBranchPanel {...scenarioBranchPanelProps} />
                  </DeferredPanel>
                </PanelErrorBoundary>
              </Section>
              {snapshotPanelProps && (
                <Section title={lang === "ja" ? "スナップショット" : "Snapshots"} defaultOpen={false}>
                  <PanelErrorBoundary label="Snapshots">
                    <DeferredPanel lang={lang}>
                      <SnapshotPanel {...snapshotPanelProps} />
                    </DeferredPanel>
                  </PanelErrorBoundary>
                </Section>
              )}
              {recoveryPanelProps && (
                <Section title={lang === "ja" ? "リカバリ" : "Recovery"} defaultOpen={false}>
                  <PanelErrorBoundary label="Recovery">
                    <DeferredPanel lang={lang}>
                      <RecoveryPanel {...recoveryPanelProps} />
                    </DeferredPanel>
                  </PanelErrorBoundary>
                </Section>
              )}
            </>
          ) : null}
        </>
      ) : (
        <div className="mt-2 rounded-md border px-2 py-2 text-[8px] leading-4" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-muted)" }}>
          {lang === "ja"
            ? "トピックを選ぶと Edit / Analyze / Library に内容が表示されます。初回は左の Map タブで Topic を作成するか、Workspace タブからインポートできます。"
            : "Select a topic to open Edit, Analyze, and Library panels. Start by creating a topic from the Map tab, or import from the Workspace tab."}
        </div>
      )}
    </aside>
  );
}
