import { useCallback } from "react";
import { STORAGE_BACKUP_KEY } from "../constants/defaults";
import { safeReadStorage } from "../storage/read-write";
import { parsePersistEnvelope } from "../storage/envelope";
import { normalizeState } from "../normalize/state";
import { generateObsidianVault } from "../import/obsidian-export";
import { downloadCsv, exportEdgesCsv, exportNodesCsv } from "../import/csv";
import { downloadTextFile } from "../utils/download";
import { buildStandaloneWorkspaceHtml } from "../utils/standalone-html";
import type { AppState, TopicItem } from "../types";

export function useWorkspaceIO({
  topics,
  stateRef,
  selectedTopicId,
  selectedNodeId,
  resetUndoRedoStacks,
  applyResolvedSelectionState,
  setSelectedTopicId,
  setSelectedNodeId,
  setRepairMessage,
  showToast,
  lang,
}: {
  topics: TopicItem[];
  stateRef: React.MutableRefObject<AppState>;
  selectedTopicId: string | null;
  selectedNodeId: string | null;
  resetUndoRedoStacks: () => void;
  applyResolvedSelectionState: (nextState: AppState, topicId: string | null, nodeId: string | null, setSelectedTopicId: (id: string | null) => void, setSelectedNodeId: (id: string | null) => void) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setRepairMessage: (message: string) => void;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
  lang: "ja" | "en";
}) {
  const restoreFromBackupNow = useCallback(() => {
    const backup = parsePersistEnvelope(safeReadStorage(STORAGE_BACKUP_KEY));
    if (!backup) {
      setRepairMessage("backup not found");
      return;
    }
    const restored = normalizeState(backup.state);
    resetUndoRedoStacks();
    applyResolvedSelectionState(restored, selectedTopicId, selectedNodeId, setSelectedTopicId, setSelectedNodeId);
    setRepairMessage(`restored ${new Date().toLocaleTimeString()}`);
  }, [resetUndoRedoStacks, applyResolvedSelectionState, selectedTopicId, selectedNodeId, setSelectedTopicId, setSelectedNodeId, setRepairMessage]);

  const exportNodesCsvFile = useCallback(() => {
    downloadCsv(exportNodesCsv(topics), "nodes.csv");
  }, [topics]);

  const exportEdgesCsvFile = useCallback(() => {
    downloadCsv(exportEdgesCsv(topics), "edges.csv");
  }, [topics]);

  const exportObsidianZip = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const files = generateObsidianVault(stateRef.current);
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "thought-workbench-vault.zip";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(lang === "ja" ? "Obsidian Vault をエクスポートしました" : "Obsidian vault exported", "success");
  }, [stateRef, showToast, lang]);

  const exportStandaloneHtml = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const filename = `thought-workbench-snapshot-${generatedAt.slice(0, 19).replace(/[:T]/g, "-")}.html`;
    const html = buildStandaloneWorkspaceHtml(stateRef.current, {
      lang,
      title: "Thought Workbench Snapshot",
      generatedAt,
    });
    downloadTextFile(filename, html, "text/html;charset=utf-8");
    showToast(lang === "ja" ? "単体 HTML をエクスポートしました" : "Standalone HTML exported", "success");
  }, [stateRef, lang, showToast]);

  return {
    restoreFromBackupNow,
    exportNodesCsvFile,
    exportEdgesCsvFile,
    exportObsidianZip,
    exportStandaloneHtml,
  };
}
