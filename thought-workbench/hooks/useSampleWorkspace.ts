import { useCallback, useMemo, useState } from "react";
import { createPersistEnvelope } from "../storage/envelope";
import {
  createAppendableSampleAppState,
  createSampleAppState,
  describeSampleAppState,
  SAMPLE_WORKSPACE_PRESETS,
  type SampleWorkspaceStats,
} from "../utils/sample-state";
import type { AppState } from "../types";
import type { ViewType } from "../constants/views";

export type SampleActionPreview = {
  mode: "replace" | "append";
  targetView: ViewType;
  titleSuffix?: string;
  workspaceOffset?: { x: number; y: number };
  topicTitles: string[];
  branchLabels: string[];
  bundleTitles: string[];
  layoutLabels: string[];
  focusTopicId?: string | null;
};

function getRecommendedSampleAction(stats: SampleWorkspaceStats): "replace" | "append" {
  const isNearEmpty = stats.topics <= 1
    && stats.nodes <= 3
    && stats.branches === 0
    && stats.bundles === 0
    && stats.bookmarks <= 1
    && stats.journals === 0;
  return isNearEmpty ? "replace" : "append";
}

export function useSampleWorkspace({
  state,
  topics,
  samplePresetId,
  lang,
  resetUndoRedoStacks,
  applyResolvedSelectionState,
  setSelectedTopicId,
  setSelectedNodeId,
  updateState,
  setView,
  showToast,
}: {
  state: AppState;
  topics: AppState["topics"];
  samplePresetId: (typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"];
  lang: "ja" | "en";
  resetUndoRedoStacks: () => void;
  applyResolvedSelectionState: (nextState: AppState, topicId: string | null, nodeId: string | null, setSelectedTopicId: (id: string | null) => void, setSelectedNodeId: (id: string | null) => void) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateState: (updater: (draft: AppState) => AppState) => void;
  setView: (view: ViewType) => void;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
}) {
  const [sampleActionPreview, setSampleActionPreview] = useState<SampleActionPreview | null>(null);

  const selectedSamplePreset = useMemo(
    () => SAMPLE_WORKSPACE_PRESETS.find((item) => item.id === samplePresetId) || SAMPLE_WORKSPACE_PRESETS[0],
    [samplePresetId]
  );

  const samplePresetStats = useMemo(() => (
    SAMPLE_WORKSPACE_PRESETS.reduce((acc, sample) => {
      acc[sample.id] = describeSampleAppState(sample.id);
      return acc;
    }, {} as Record<(typeof SAMPLE_WORKSPACE_PRESETS)[number]["id"], SampleWorkspaceStats>)
  ), []);

  const selectedSampleStats = samplePresetStats[selectedSamplePreset.id];

  const currentWorkspaceStats = useMemo(() => ({
    topics: state.topics.length,
    nodes: state.topics.reduce((sum, topic) => sum + topic.nodes.length, 0),
    edges: state.topics.reduce((sum, topic) => sum + topic.edges.length, 0),
    branches: (state.scenarioBranches || []).length,
    bundles: (state.bundles || []).length,
    bookmarks: (state.bookmarks || []).length,
    journals: (state.journals || []).length,
    layouts: (state.layoutPresets || []).length,
  }), [state]);

  const recommendedSampleAction = useMemo(
    () => getRecommendedSampleAction(currentWorkspaceStats),
    [currentWorkspaceStats]
  );

  const openReplaceSamplePreview = useCallback(() => {
    const sample = createSampleAppState(samplePresetId);
    setSampleActionPreview({
      mode: "replace",
      targetView: selectedSamplePreset.quickStart[lang].firstView,
      topicTitles: sample.topics.map((topic) => topic.title),
      branchLabels: (sample.scenarioBranches || []).map((branch) => branch.label),
      bundleTitles: (sample.bundles || []).map((bundle) => bundle.title),
      layoutLabels: (sample.layoutPresets || []).map((preset) => preset.label),
      focusTopicId: sample.topics[0]?.id || null,
    });
  }, [samplePresetId, selectedSamplePreset, lang]);

  const openAppendSamplePreview = useCallback(() => {
    const maxWorkspaceX = topics.reduce((max, topic) => Math.max(max, topic.workspace.x + topic.workspace.size * 0.5), 0);
    const titleSuffix = `[${selectedSamplePreset.label[lang]}]`;
    const workspaceOffset = { x: maxWorkspaceX + 16, y: (topics.length % 3) * 6 };
    const sample = createAppendableSampleAppState(samplePresetId, { titleSuffix, workspaceOffset });
    setSampleActionPreview({
      mode: "append",
      targetView: selectedSamplePreset.quickStart[lang].firstView,
      titleSuffix,
      workspaceOffset,
      topicTitles: sample.topics.map((topic) => topic.title),
      branchLabels: (sample.scenarioBranches || []).map((branch) => branch.label),
      bundleTitles: (sample.bundles || []).map((bundle) => bundle.title),
      layoutLabels: (sample.layoutPresets || []).map((preset) => preset.label),
      focusTopicId: sample.topics[0]?.id || null,
    });
  }, [topics, samplePresetId, selectedSamplePreset, lang]);

  const confirmSampleAction = useCallback(() => {
    if (!sampleActionPreview) return;
    const sample = sampleActionPreview.mode === "replace"
      ? createSampleAppState(samplePresetId)
      : createAppendableSampleAppState(samplePresetId, {
          titleSuffix: sampleActionPreview.titleSuffix,
          workspaceOffset: sampleActionPreview.workspaceOffset,
        });

    if (sampleActionPreview.mode === "replace") {
      resetUndoRedoStacks();
      applyResolvedSelectionState(sample, sample.topics[0]?.id || null, sample.topics[0]?.nodes[0]?.id || null, setSelectedTopicId, setSelectedNodeId);
    } else {
      updateState((prev) => ({
        ...prev,
        topics: [...prev.topics, ...sample.topics],
        topicLinks: [...prev.topicLinks, ...sample.topicLinks],
        journals: [...(prev.journals || []), ...sample.journals],
        eventLog: [...(prev.eventLog || []), ...(sample.eventLog || [])],
        bookmarks: [...(prev.bookmarks || []), ...(sample.bookmarks || [])],
        layoutPresets: [...(prev.layoutPresets || []), ...(sample.layoutPresets || [])],
        smartFolders: [...(prev.smartFolders || []), ...(sample.smartFolders || [])],
        conversionQueue: [...(prev.conversionQueue || []), ...(sample.conversionQueue || [])],
        bundles: [...(prev.bundles || []), ...(sample.bundles || [])],
        scenarioBranches: [...(prev.scenarioBranches || []), ...(sample.scenarioBranches || [])],
      }));
      setSelectedTopicId(sample.topics[0]?.id || null);
      setSelectedNodeId(sample.topics[0]?.nodes[0]?.id || null);
    }

    setView(sampleActionPreview.targetView || selectedSamplePreset.suggestedView);
    showToast(
      sampleActionPreview.mode === "replace"
        ? (lang === "ja" ? "サンプルデータを読み込みました" : "Sample data loaded")
        : (lang === "ja" ? "サンプルデータを追加しました" : "Sample data appended"),
      "success"
    );
    setSampleActionPreview(null);
  }, [sampleActionPreview, samplePresetId, resetUndoRedoStacks, applyResolvedSelectionState, setSelectedTopicId, setSelectedNodeId, updateState, setView, selectedSamplePreset, showToast, lang]);

  const downloadSampleJson = useCallback(() => {
    const sample = createSampleAppState(samplePresetId);
    const envelope = createPersistEnvelope(sample);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `thought-workbench-sample-${samplePresetId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(lang === "ja" ? "サンプルJSONを出力しました" : "Sample JSON exported", "success");
  }, [showToast, lang, samplePresetId]);

  const clearSampleActionPreview = useCallback(() => {
    setSampleActionPreview(null);
  }, []);

  const changeSamplePreviewTargetView = useCallback((targetView: ViewType) => {
    setSampleActionPreview((prev) => prev ? { ...prev, targetView } : prev);
  }, []);

  return {
    sampleActionPreview,
    selectedSamplePreset,
    samplePresetStats,
    selectedSampleStats,
    currentWorkspaceStats,
    recommendedSampleAction,
    openReplaceSamplePreview,
    openAppendSamplePreview,
    confirmSampleAction,
    downloadSampleJson,
    clearSampleActionPreview,
    changeSamplePreviewTargetView,
  };
}
