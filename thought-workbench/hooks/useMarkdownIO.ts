import { useState, useRef } from "react";
import type { AppState, TopicItem, ImportResult } from "../types";
import { deepClone } from "../utils/clone";
import { downloadTextFile, downloadBlobFile } from "../utils/download";
import { normalizeState } from "../normalize/state";
import { resolveSelectionIds } from "../graph-ops/selection";
import { parseMarkdownTopic } from "../markdown/parser";
import { serializeTopicToMarkdown } from "../markdown/serializer";
import { getTopicMarkdownFilename, buildAllTopicsMarkdownBundle } from "../markdown/bundle";
import { normalizeSingleTopicForImport, describeImportDelta, buildImportReport, mergeImportedTopicsIntoState } from "../markdown/import-helpers";
import { convertFileToMarkdown, detectFileFormat } from "../import/file-converters";
import { applyObsidianExchange, isObsidianExchange } from "../import/obsidian-exchange";

export function useMarkdownIO() {
  const [ioText, setIoText] = useState("");
  const [mdImportMode, setMdImportMode] = useState("links");
  const [importReport, setImportReport] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportMarkdownFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
    updateState: (updater: (draft: AppState) => AppState) => void,
    stateRef: React.MutableRefObject<AppState>,
    selectedTopicId: string | null,
    selectedNodeId: string | null,
    openTopicInSphere: (topicId: string, preferredNodeId: string | null) => void,
    setView: (v: string) => void,
    setRepairMessage: (msg: string) => void,
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const results: ImportResult[] = await Promise.all(files.map(async (file) => {
        try {
          const markdownText = await convertFileToMarkdown(file);
          const raw = parseMarkdownTopic(markdownText, file.name, mdImportMode);
          const format = detectFileFormat(file.name);
          const normalized = normalizeSingleTopicForImport(raw);
          const delta = describeImportDelta(raw, normalized);
          return { ok: true, topic: normalized, source: file.name, message: format !== "markdown" ? `[${format}→md] ${delta}` : delta };
        } catch (error) {
          return { ok: false, source: file.name, message: error instanceof Error ? error.message : "parse failed" };
        }
      }));

      const imported = results.filter((item) => item.ok && item.topic).map((item) => item.topic as TopicItem);
      if (imported.length) {
        let nextStateSnapshot: AppState | null = null;
        updateState((prev) => {
          nextStateSnapshot = deepClone(mergeImportedTopicsIntoState(prev, imported));
          return prev;
        });
        const resolved = resolveSelectionIds(nextStateSnapshot || stateRef.current, selectedTopicId, selectedNodeId);
        if (resolved.topicId) openTopicInSphere(resolved.topicId, resolved.nodeId);
        else setView("sphere");
      }
      setRepairMessage(`imported ${new Date().toLocaleTimeString()}`);
      setImportReport(buildImportReport("file", results));
    } finally {
      event.target.value = "";
    }
  };

  const handleExportJson = (stateRef: React.MutableRefObject<AppState>) => {
    setIoText(JSON.stringify(stateRef.current, null, 2));
  };

  const handleImportJson = (
    updateState: (updater: (draft: AppState) => AppState) => void,
    stateRef: React.MutableRefObject<AppState>,
    resetUndoRedoStacks: () => void,
    applyResolvedSelectionState: (nextState: AppState, topicId: string | null, nodeId: string | null) => void,
    selectedTopicId: string | null,
    selectedNodeId: string | null,
    setView: (v: string) => void,
    setRepairMessage: (msg: string) => void,
  ) => {
    try {
      const raw = JSON.parse(ioText);
      if (isObsidianExchange(raw)) {
        let nextStateSnapshot: AppState | null = null;
        let reportMessage = "";
        updateState((prev) => {
          const applied = applyObsidianExchange(prev, raw);
          nextStateSnapshot = applied.state;
          reportMessage = `exchange: ${applied.touchedTopics} topics / ${applied.touchedNodes} nodes`;
          if (applied.missingTopicIds.length || applied.missingNodeIds.length || applied.conflictNodeIds.length) {
            const missing = [
              applied.missingTopicIds.length ? `missing topics=${applied.missingTopicIds.length}` : "",
              applied.missingNodeIds.length ? `missing nodes=${applied.missingNodeIds.length}` : "",
              applied.conflictNodeIds.length ? `conflicts=${applied.conflictNodeIds.length}` : "",
            ].filter(Boolean).join(", ");
            reportMessage += ` (${missing})`;
          }
          return applied.state;
        });
        setRepairMessage(`exchange imported ${new Date().toLocaleTimeString()}`);
        setImportReport(reportMessage);
        const resolved = resolveSelectionIds(nextStateSnapshot || stateRef.current, selectedTopicId, selectedNodeId);
        applyResolvedSelectionState(nextStateSnapshot || stateRef.current, resolved.topicId, resolved.nodeId);
        setView("sphere");
        return;
      }
      const parsed = normalizeState(raw);
      resetUndoRedoStacks();
      applyResolvedSelectionState(parsed, selectedTopicId, selectedNodeId);
      setView("sphere");
      setRepairMessage(`json imported ${new Date().toLocaleTimeString()}`);
      setImportReport(`json: ${parsed.topics.length} topics / ${parsed.topicLinks.length} links`);
    } catch (error) {
      setImportReport(`json failed: ${error instanceof Error ? error.message : "parse failed"}`);
    }
  };

  const handleExportMarkdown = (selectedTopic: TopicItem | null, stateRef: React.MutableRefObject<AppState>) => {
    if (selectedTopic) setIoText(serializeTopicToMarkdown(selectedTopic, stateRef.current.topicLinks, stateRef.current.topics));
  };

  const handleDownloadMarkdown = (selectedTopic: TopicItem | null, stateRef: React.MutableRefObject<AppState>) => {
    if (!selectedTopic) return;
    const markdown = serializeTopicToMarkdown(selectedTopic, stateRef.current.topicLinks, stateRef.current.topics);
    downloadTextFile(getTopicMarkdownFilename(selectedTopic), markdown, "text/markdown;charset=utf-8");
  };

  const handleExportAllMarkdown = (stateRef: React.MutableRefObject<AppState>) => {
    setIoText(buildAllTopicsMarkdownBundle(stateRef.current));
  };

  const handleDownloadAllMarkdown = async (stateRef: React.MutableRefObject<AppState>) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    stateRef.current.topics.forEach((topic) => {
      zip.file(getTopicMarkdownFilename(topic), serializeTopicToMarkdown(topic, stateRef.current.topicLinks, stateRef.current.topics));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlobFile("thought-workbench-markdown.zip", blob);
  };

  return {
    ioText, setIoText,
    mdImportMode, setMdImportMode,
    importReport, setImportReport,
    fileInputRef,
    handleImportMarkdownFiles,
    handleExportJson,
    handleImportJson,
    handleExportMarkdown,
    handleDownloadMarkdown,
    handleExportAllMarkdown,
    handleDownloadAllMarkdown,
  };
}
