import { useCallback, useMemo } from "react";
import type { AppState, ScenarioBranch, TopicItem } from "../types";
import { buildHistorySnapshotFrame, appendHistoryFrameToTopic, applyHistoryFrameToTopic } from "../graph-ops/history-ops";
import { updateTopicListById, buildDuplicatedTopicItem, appendTopicItemsToState } from "../graph-ops/topic-crud";
import { normalizeSourceFilename } from "../utils/slug";
import { newId } from "../utils/id";

export type ScenarioBranchMode = "all" | "position" | "size" | "content";

export type ScenarioBranchDiff = {
  sourceNodeId: string;
  label: string;
  changedPosition: boolean;
  changedSize: boolean;
  positionDelta?: [number, number, number];
  sizeDelta?: number;
  frameScaleDelta?: number;
  labelChanged?: boolean;
  nextLabel?: string;
  typeChanged?: boolean;
  nextType?: string;
  noteChanged?: boolean;
  groupChanged?: boolean;
  nextGroup?: string;
  layerChanged?: boolean;
  nextLayer?: string;
  tenseChanged?: boolean;
  nextTense?: string;
  tagsChanged?: boolean;
  nextTags?: string[];
};

export type ScenarioBranchReview = {
  score: number;
  changedNodeCount: number;
  positionCount: number;
  sizeCount: number;
  contentCount: number;
  warnings: string[];
  status: "ready" | "needs-review" | "thin";
};

export type ScenarioBranchConflict = {
  risk: "none" | "low" | "medium" | "high";
  conflictCount: number;
  summary: string[];
  nodes: {
    sourceNodeId: string;
    label: string;
    risk: "low" | "medium" | "high";
    reasons: string[];
  }[];
};

function hasPositionDiff(a: [number, number, number], b: [number, number, number]) {
  return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2];
}

function normalizeTags(tags?: string[]) {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))].sort();
}

function hasTagsDiff(a?: string[], b?: string[]) {
  const left = normalizeTags(a);
  const right = normalizeTags(b);
  return left.length !== right.length || left.some((tag, index) => tag !== right[index]);
}

function bumpRiskLevel(level: "none" | "low" | "medium" | "high") {
  if (level === "none") return "low";
  if (level === "low") return "medium";
  if (level === "medium") return "high";
  return "high";
}

function buildNodeMapItems(sourceTopic: TopicItem, sandboxTopic: TopicItem, branch: ScenarioBranch) {
  const fallbackMap = sourceTopic.nodes.map((node, index) => ({
    sourceId: node.id,
    sandboxId: sandboxTopic.nodes[index]?.id || "",
  })).filter((item) => !!item.sandboxId);
  return branch.nodeIdMap && branch.nodeIdMap.length > 0 ? branch.nodeIdMap : fallbackMap;
}

export function useScenarioBranches({
  state,
  topics,
  lang,
  updateState,
  openInSphere,
  showToast,
}: {
  state: AppState;
  topics: TopicItem[];
  lang: "ja" | "en";
  updateState: (updater: (prev: AppState) => AppState) => void;
  openInSphere: (topicId: string, nodeId: string | null) => void;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
}) {
  const branchDiffs = useMemo(() => {
    const entries: Record<string, ScenarioBranchDiff[]> = {};
    for (const branch of state.scenarioBranches || []) {
      if (!branch.topicId || !branch.materializedTopicId) continue;
      const sourceTopic = topics.find((topic) => topic.id === branch.topicId);
      const sandboxTopic = topics.find((topic) => topic.id === branch.materializedTopicId);
      if (!sourceTopic || !sandboxTopic) continue;
      const sourceNodeById = new Map(sourceTopic.nodes.map((node) => [node.id, node]));
      const sandboxNodeById = new Map(sandboxTopic.nodes.map((node) => [node.id, node]));
      entries[branch.id] = buildNodeMapItems(sourceTopic, sandboxTopic, branch).flatMap((item) => {
        const sourceNode = sourceNodeById.get(item.sourceId);
        const sandboxNode = sandboxNodeById.get(item.sandboxId);
        if (!sourceNode || !sandboxNode) return [];
        const changedPosition = hasPositionDiff(sourceNode.position, sandboxNode.position);
        const changedSize = sourceNode.size !== sandboxNode.size || (sourceNode.frameScale ?? 1) !== (sandboxNode.frameScale ?? 1);
        const labelChanged = sourceNode.label !== sandboxNode.label;
        const typeChanged = sourceNode.type !== sandboxNode.type;
        const noteChanged = sourceNode.note !== sandboxNode.note;
        const groupChanged = sourceNode.group !== sandboxNode.group;
        const layerChanged = sourceNode.layer !== sandboxNode.layer;
        const tenseChanged = sourceNode.tense !== sandboxNode.tense;
        const tagsChanged = hasTagsDiff(sourceNode.tags, sandboxNode.tags);
        if (!changedPosition && !changedSize && !labelChanged && !typeChanged && !noteChanged && !groupChanged && !layerChanged && !tenseChanged && !tagsChanged) return [];
        return [{
          sourceNodeId: sourceNode.id,
          label: sourceNode.label,
          changedPosition,
          changedSize,
          positionDelta: changedPosition ? [
            sandboxNode.position[0] - sourceNode.position[0],
            sandboxNode.position[1] - sourceNode.position[1],
            sandboxNode.position[2] - sourceNode.position[2],
          ] : undefined,
          sizeDelta: changedSize ? sandboxNode.size - sourceNode.size : undefined,
          frameScaleDelta: changedSize ? (sandboxNode.frameScale ?? 1) - (sourceNode.frameScale ?? 1) : undefined,
          labelChanged,
          nextLabel: labelChanged ? sandboxNode.label : undefined,
          typeChanged,
          nextType: typeChanged ? sandboxNode.type : undefined,
          noteChanged,
          groupChanged,
          nextGroup: groupChanged ? sandboxNode.group : undefined,
          layerChanged,
          nextLayer: layerChanged ? sandboxNode.layer : undefined,
          tenseChanged,
          nextTense: tenseChanged ? sandboxNode.tense : undefined,
          tagsChanged,
          nextTags: tagsChanged ? normalizeTags(sandboxNode.tags) : undefined,
        }];
      });
    }
    return entries;
  }, [state.scenarioBranches, topics]);

  const branchReviews = useMemo(() => {
    const entries: Record<string, ScenarioBranchReview> = {};
    for (const branch of state.scenarioBranches || []) {
      const diffs = branchDiffs[branch.id] || [];
      const positionCount = diffs.filter((diff) => diff.changedPosition).length;
      const sizeCount = diffs.filter((diff) => diff.changedSize).length;
      const contentCount = diffs.filter((diff) => diff.labelChanged || diff.typeChanged || diff.noteChanged || diff.groupChanged || diff.layerChanged || diff.tenseChanged || diff.tagsChanged).length;
      const warnings: string[] = [];
      if (!branch.hypothesis?.trim()) warnings.push(lang === "ja" ? "仮説未記入" : "Missing hypothesis");
      if (!branch.nextAction?.trim()) warnings.push(lang === "ja" ? "次アクション未記入" : "Missing next action");
      if (!branch.snapshotFrameId) warnings.push(lang === "ja" ? "スナップショット未保存" : "No snapshot");
      if (!branch.materializedTopicId) warnings.push(lang === "ja" ? "sandbox 未生成" : "No sandbox");
      if (diffs.length === 0) warnings.push(lang === "ja" ? "差分なし" : "No diffs");
      let score = 0;
      if (branch.hypothesis?.trim()) score += 20;
      if (branch.nextAction?.trim()) score += 20;
      if (branch.snapshotFrameId) score += 20;
      if (branch.materializedTopicId) score += 20;
      if (diffs.length > 0) score += 20;
      entries[branch.id] = {
        score,
        changedNodeCount: diffs.length,
        positionCount,
        sizeCount,
        contentCount,
        warnings,
        status: score >= 80 ? "ready" : score >= 50 ? "needs-review" : "thin",
      };
    }
    return entries;
  }, [state.scenarioBranches, branchDiffs, lang]);

  const branchConflicts = useMemo(() => {
    const entries: Record<string, ScenarioBranchConflict> = {};
    for (const branch of state.scenarioBranches || []) {
      const diffs = branchDiffs[branch.id] || [];
      const hasRoundTripHistory = !!branch.lastSourceSyncAt && !!branch.lastBackportAt;
      const lastSourceSync = branch.lastSourceSyncAt ? new Date(branch.lastSourceSyncAt).getTime() : 0;
      const lastBackport = branch.lastBackportAt ? new Date(branch.lastBackportAt).getTime() : 0;
      const newerSide = lastSourceSync > lastBackport
        ? (lang === "ja" ? "source 側の同期が新しい" : "Source sync is newer")
        : lastBackport > lastSourceSync
          ? (lang === "ja" ? "sandbox 側の backport が新しい" : "Sandbox backport is newer")
          : "";
      const nodes = diffs.map((diff) => {
        const contentChangeCount = [
          diff.labelChanged,
          diff.typeChanged,
          diff.noteChanged,
          diff.groupChanged,
          diff.layerChanged,
          diff.tenseChanged,
          diff.tagsChanged,
        ].filter(Boolean).length;
        const hasSpatialChange = diff.changedPosition || diff.changedSize;
        const hasContentChange = contentChangeCount > 0;
        const reasons: string[] = [];
        let risk: "low" | "medium" | "high" = "low";
        if (diff.changedPosition && diff.changedSize) reasons.push(lang === "ja" ? "位置とサイズが同時変更" : "Position and size both changed");
        if (hasSpatialChange && hasContentChange) reasons.push(lang === "ja" ? "空間差分と属性差分が混在" : "Spatial and content diffs mixed");
        if (contentChangeCount >= 3) reasons.push(lang === "ja" ? "属性差分が多い" : "Many attribute diffs");
        if (hasRoundTripHistory) reasons.push(lang === "ja" ? "往復同期後も差分が残存" : "Diff remains after round-trip sync");
        if (hasSpatialChange && hasContentChange) risk = "medium";
        if ((diff.changedPosition && diff.changedSize && hasContentChange) || contentChangeCount >= 3) risk = "high";
        if (hasRoundTripHistory) risk = bumpRiskLevel(risk) as "low" | "medium" | "high";
        return { sourceNodeId: diff.sourceNodeId, label: diff.label, risk, reasons };
      }).filter((item) => item.reasons.length > 0);
      entries[branch.id] = {
        risk: nodes.some((item) => item.risk === "high")
          ? "high"
          : nodes.some((item) => item.risk === "medium")
            ? "medium"
            : nodes.some((item) => item.risk === "low")
              ? "low"
              : "none",
        conflictCount: nodes.length,
        summary: [
          hasRoundTripHistory && diffs.length > 0 ? (lang === "ja" ? "往復同期後も差分が残っています" : "Diffs remain after round-trip sync") : "",
          newerSide,
        ].filter(Boolean),
        nodes,
      };
    }
    return entries;
  }, [state.scenarioBranches, branchDiffs, lang]);

  const createScenarioBranch = useCallback((anchor: { eventId: string; ts: string; topicId?: string; targetLabel?: string }) => {
    const branchCount = (state.scenarioBranches || []).length + 1;
    const branch: ScenarioBranch = {
      id: newId("branch"),
      label: lang === "ja" ? `分岐 ${branchCount}` : `Scenario ${branchCount}`,
      topicId: anchor.topicId,
      anchorEventId: anchor.eventId,
      anchorTs: anchor.ts,
      anchorLabel: anchor.targetLabel,
      status: "draft",
      syncPolicy: "manual",
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({ ...prev, scenarioBranches: [branch, ...(prev.scenarioBranches || [])] }));
    showToast(lang === "ja" ? "分岐を追加" : "Branch added", "success");
  }, [state.scenarioBranches, updateState, showToast, lang]);

  const deleteScenarioBranch = useCallback((id: string) => {
    updateState((prev) => ({ ...prev, scenarioBranches: (prev.scenarioBranches || []).filter((branch) => branch.id !== id) }));
  }, [updateState]);

  const updateScenarioBranchStatus = useCallback((id: string, status: ScenarioBranch["status"]) => {
    updateState((prev) => ({ ...prev, scenarioBranches: (prev.scenarioBranches || []).map((branch) => branch.id === id ? { ...branch, status } : branch) }));
  }, [updateState]);

  const updateScenarioBranch = useCallback((id: string, patch: Partial<ScenarioBranch>) => {
    updateState((prev) => ({ ...prev, scenarioBranches: (prev.scenarioBranches || []).map((branch) => branch.id === id ? { ...branch, ...patch } : branch) }));
  }, [updateState]);

  const captureScenarioBranchSnapshot = useCallback((branchId: string) => {
    updateState((prev) => {
      const branch = (prev.scenarioBranches || []).find((item) => item.id === branchId);
      if (!branch?.topicId) return prev;
      const topic = prev.topics.find((item) => item.id === branch.topicId);
      if (!topic) return prev;
      const frame = buildHistorySnapshotFrame(topic);
      return {
        ...prev,
        topics: updateTopicListById(prev.topics, branch.topicId, (item) => appendHistoryFrameToTopic(item, frame, 24)),
        scenarioBranches: (prev.scenarioBranches || []).map((item) => item.id === branchId ? { ...item, snapshotFrameId: frame.id, snapshotLabel: frame.label } : item),
      };
    });
    showToast(lang === "ja" ? "分岐スナップショット保存" : "Branch snapshot saved", "success");
  }, [updateState, showToast, lang]);

  const materializeScenarioBranch = useCallback((branchId: string) => {
    const existing = (state.scenarioBranches || []).find((item) => item.id === branchId);
    if (!existing) return;
    if (existing.materializedTopicId) {
      const topic = state.topics.find((item) => item.id === existing.materializedTopicId);
      if (topic) {
        openInSphere(topic.id, topic.nodes[0]?.id || null);
        showToast(existing.label, "info");
        return;
      }
    }

    let nextTopicId: string | null = null;
    let nextNodeId: string | null = null;
    updateState((prev) => {
      const branch = (prev.scenarioBranches || []).find((item) => item.id === branchId);
      if (!branch?.topicId) return prev;
      const sourceTopic = prev.topics.find((item) => item.id === branch.topicId);
      if (!sourceTopic) return prev;
      const sourceFrame = branch.snapshotFrameId ? sourceTopic.history.find((item) => item.id === branch.snapshotFrameId) : null;
      const scenarioBase = sourceFrame ? applyHistoryFrameToTopic(sourceTopic, sourceFrame) : sourceTopic;
      const duplicated = buildDuplicatedTopicItem({
        ...scenarioBase,
        title: `${scenarioBase.title} :: ${branch.label}`,
        folder: `${scenarioBase.folder}/Branches`,
        description: `${scenarioBase.description}\n\n[Branch] ${branch.label}`,
        sourceFile: normalizeSourceFilename(`${scenarioBase.title} ${branch.label}`),
        parentTopicId: sourceTopic.id,
      });
      nextTopicId = duplicated.topic.id;
      nextNodeId = duplicated.firstNodeId;
      const nextState = appendTopicItemsToState(prev, [duplicated.topic]);
      return {
        ...nextState,
        scenarioBranches: (nextState.scenarioBranches || []).map((item) => item.id === branchId ? {
          ...item,
          materializedTopicId: duplicated.topic.id,
          nodeIdMap: duplicated.nodeIdMap,
          lastSourceSyncAt: new Date().toISOString(),
          status: item.status === "archived" ? "archived" : "active",
        } : item),
      };
    });
    if (nextTopicId) {
      openInSphere(nextTopicId, nextNodeId);
      showToast(lang === "ja" ? "Sandbox を作成" : "Sandbox created", "success");
    }
  }, [state.scenarioBranches, state.topics, updateState, openInSphere, showToast, lang]);

  const syncScenarioBranchFromSource = useCallback((branchId: string, mode: ScenarioBranchMode, options?: { openTarget?: boolean; toast?: boolean }) => {
    let nextTopicId: string | null = null;
    let nextNodeId: string | null = null;
    let didSync = false;
    const openTarget = options?.openTarget ?? true;
    const showResultToast = options?.toast ?? true;
    updateState((prev) => {
      const branch = (prev.scenarioBranches || []).find((item) => item.id === branchId);
      if (!branch?.topicId || !branch.materializedTopicId) return prev;
      const sourceTopic = prev.topics.find((item) => item.id === branch.topicId);
      const sandboxTopic = prev.topics.find((item) => item.id === branch.materializedTopicId);
      if (!sourceTopic || !sandboxTopic) return prev;

      const mapItems = buildNodeMapItems(sourceTopic, sandboxTopic, branch);
      const sourceNodeById = new Map(sourceTopic.nodes.map((node) => [node.id, node]));
      const sandboxNodeById = new Map(sandboxTopic.nodes.map((node) => [node.id, node]));
      const shouldApplySpatial = mode === "all" || mode === "position" || mode === "size";
      const shouldApplyContent = mode === "all" || mode === "content";
      const frame = {
        id: newId("frame"),
        label: `${branch.label} sync:${mode}`,
        createdAt: new Date().toISOString(),
        nodes: shouldApplySpatial ? mapItems.flatMap((item) => {
          const sourceNode = sourceNodeById.get(item.sourceId);
          const sandboxNode = sandboxNodeById.get(item.sandboxId);
          if (!sourceNode || !sandboxNode) return [];
          return [{
            id: item.sandboxId,
            position: mode === "size" ? sandboxNode.position : sourceNode.position,
            size: mode === "position" ? sandboxNode.size : sourceNode.size,
            frameScale: mode === "position" ? (sandboxNode.frameScale ?? 1) : (sourceNode.frameScale ?? 1),
          }];
        }) : [],
      };

      if (!shouldApplyContent && frame.nodes.length === 0) return prev;
      didSync = true;
      nextTopicId = sandboxTopic.id;
      nextNodeId = sandboxTopic.nodes[0]?.id || null;
      const selectedSandboxIds = new Set(mapItems.map((item) => item.sandboxId));
      const nextTopics = updateTopicListById(prev.topics, sandboxTopic.id, (topic) => {
        const spatialApplied = shouldApplySpatial && frame.nodes.length > 0
          ? applyHistoryFrameToTopic(appendHistoryFrameToTopic(topic, frame, 24), frame)
          : topic;
        if (!shouldApplyContent) return spatialApplied;
        return {
          ...spatialApplied,
          nodes: spatialApplied.nodes.map((node) => {
            if (!selectedSandboxIds.has(node.id)) return node;
            const mapItem = mapItems.find((item) => item.sandboxId === node.id);
            const sourceNode = mapItem ? sourceNodeById.get(mapItem.sourceId) : null;
            if (!sourceNode) return node;
            return {
              ...node,
              label: sourceNode.label,
              type: sourceNode.type,
              note: sourceNode.note,
              group: sourceNode.group,
              layer: sourceNode.layer,
              tense: sourceNode.tense,
              tags: sourceNode.tags ? [...sourceNode.tags] : undefined,
            };
          }),
        };
      });
      return {
        ...prev,
        topics: nextTopics,
        scenarioBranches: (prev.scenarioBranches || []).map((item) => item.id === branchId ? {
          ...item,
          lastSourceSyncAt: new Date().toISOString(),
          status: item.status === "archived" ? "archived" : "active",
        } : item),
      };
    });
    if (didSync && nextTopicId && openTarget) openInSphere(nextTopicId, nextNodeId);
    if (didSync && showResultToast) {
      showToast(
        mode === "position"
          ? (lang === "ja" ? "位置を sandbox へ同期" : "Position synced to sandbox")
          : mode === "size"
            ? (lang === "ja" ? "サイズを sandbox へ同期" : "Size synced to sandbox")
            : mode === "content"
              ? (lang === "ja" ? "内容を sandbox へ同期" : "Content synced to sandbox")
              : (lang === "ja" ? "source を sandbox へ同期" : "Source synced to sandbox"),
        "success"
      );
    }
  }, [updateState, openInSphere, showToast, lang]);

  const backportScenarioBranch = useCallback((branchId: string, mode: ScenarioBranchMode, selectedSourceNodeIds?: string[], options?: { openTarget?: boolean; toast?: boolean }) => {
    let nextTopicId: string | null = null;
    let nextNodeId: string | null = null;
    let didBackport = false;
    const openTarget = options?.openTarget ?? true;
    const showResultToast = options?.toast ?? true;
    updateState((prev) => {
      const branch = (prev.scenarioBranches || []).find((item) => item.id === branchId);
      if (!branch?.topicId || !branch.materializedTopicId) return prev;
      const sourceTopic = prev.topics.find((item) => item.id === branch.topicId);
      const sandboxTopic = prev.topics.find((item) => item.id === branch.materializedTopicId);
      if (!sourceTopic || !sandboxTopic) return prev;

      const baseMapItems = buildNodeMapItems(sourceTopic, sandboxTopic, branch);
      const mapItems = selectedSourceNodeIds && selectedSourceNodeIds.length > 0
        ? baseMapItems.filter((item) => selectedSourceNodeIds.includes(item.sourceId))
        : baseMapItems;
      const sourceNodeById = new Map(sourceTopic.nodes.map((node) => [node.id, node]));
      const sandboxNodeById = new Map(sandboxTopic.nodes.map((node) => [node.id, node]));
      const shouldApplySpatial = mode === "all" || mode === "position" || mode === "size";
      const shouldApplyContent = mode === "all" || mode === "content";
      const frame = {
        id: newId("frame"),
        label: `${branch.label} merge:${mode}`,
        createdAt: new Date().toISOString(),
        nodes: shouldApplySpatial ? mapItems.flatMap((item) => {
          const sourceNode = sourceNodeById.get(item.sourceId);
          const sandboxNode = sandboxNodeById.get(item.sandboxId);
          if (!sourceNode || !sandboxNode) return [];
          return [{
            id: item.sourceId,
            position: mode === "size" ? sourceNode.position : sandboxNode.position,
            size: mode === "position" ? sourceNode.size : sandboxNode.size,
            frameScale: mode === "position" ? (sourceNode.frameScale ?? 1) : (sandboxNode.frameScale ?? 1),
          }];
        }) : [],
      };

      if (!shouldApplyContent && frame.nodes.length === 0) return prev;
      didBackport = true;
      nextTopicId = sourceTopic.id;
      nextNodeId = sourceTopic.nodes[0]?.id || null;
      const nextTopics = updateTopicListById(prev.topics, sourceTopic.id, (topic) => {
        const spatialApplied = shouldApplySpatial && frame.nodes.length > 0
          ? applyHistoryFrameToTopic(appendHistoryFrameToTopic(topic, frame, 24), frame)
          : topic;
        if (!shouldApplyContent) return spatialApplied;
        const selectedIds = new Set(mapItems.map((item) => item.sourceId));
        return {
          ...spatialApplied,
          nodes: spatialApplied.nodes.map((node) => {
            if (!selectedIds.has(node.id)) return node;
            const mapItem = mapItems.find((item) => item.sourceId === node.id);
            const sandboxNode = mapItem ? sandboxNodeById.get(mapItem.sandboxId) : null;
            if (!sandboxNode) return node;
            return {
              ...node,
              label: sandboxNode.label,
              type: sandboxNode.type,
              note: sandboxNode.note,
              group: sandboxNode.group,
              layer: sandboxNode.layer,
              tense: sandboxNode.tense,
              tags: sandboxNode.tags ? [...sandboxNode.tags] : undefined,
            };
          }),
        };
      });
      return {
        ...prev,
        topics: nextTopics,
        scenarioBranches: (prev.scenarioBranches || []).map((item) => item.id === branchId ? {
          ...item,
          snapshotFrameId: shouldApplySpatial && frame.nodes.length > 0 ? frame.id : item.snapshotFrameId,
          snapshotLabel: shouldApplySpatial && frame.nodes.length > 0 ? frame.label : item.snapshotLabel,
          lastBackportAt: new Date().toISOString(),
          status: item.status === "archived" ? "archived" : "active",
        } : item),
      };
    });
    if (didBackport && nextTopicId && openTarget) openInSphere(nextTopicId, nextNodeId);
    if (didBackport && showResultToast) {
      showToast(
        mode === "position"
          ? (lang === "ja" ? "位置だけ再取り込み" : "Position backported")
          : mode === "size"
            ? (lang === "ja" ? "サイズだけ再取り込み" : "Size backported")
            : mode === "content"
              ? (lang === "ja" ? "内容だけ再取り込み" : "Content backported")
              : (lang === "ja" ? "Sandbox を再取り込み" : "Sandbox backported"),
        "success"
      );
    }
  }, [updateState, openInSphere, showToast, lang]);

  const backportScenarioBranchNode = useCallback((branchId: string, sourceNodeId: string, mode: ScenarioBranchMode) => {
    backportScenarioBranch(branchId, mode, [sourceNodeId]);
  }, [backportScenarioBranch]);

  const applyScenarioBranchSyncPolicy = useCallback((branch: ScenarioBranch) => {
    const policy = branch.syncPolicy || "manual";
    const hasDiffs = (branchDiffs[branch.id] || []).length > 0;
    if (!branch.materializedTopicId || !hasDiffs || policy === "manual") return false;
    if (policy === "prefer-source") {
      syncScenarioBranchFromSource(branch.id, "all", { openTarget: false, toast: false });
      return true;
    }
    if (policy === "prefer-sandbox") {
      backportScenarioBranch(branch.id, "all", undefined, { openTarget: false, toast: false });
      return true;
    }
    return false;
  }, [branchDiffs, syncScenarioBranchFromSource, backportScenarioBranch]);

  const navigateScenarioBranch = useCallback((branch: ScenarioBranch) => {
    const policyApplied = applyScenarioBranchSyncPolicy(branch);
    const anchorEvent = (state.eventLog || []).find((event) => event.id === branch.anchorEventId);
    if (branch.materializedTopicId) {
      const topic = state.topics.find((item) => item.id === branch.materializedTopicId);
      if (topic) {
        openInSphere(topic.id, topic.nodes[0]?.id || null);
        showToast(policyApplied ? `${branch.label} (${lang === "ja" ? "同期ポリシー適用" : "Policy applied"})` : branch.label, "info");
        return;
      }
    }
    if (branch.topicId && branch.snapshotFrameId) {
      const branchTopicId = branch.topicId;
      const snapshotFrameId = branch.snapshotFrameId;
      updateState((prev) => ({
        ...prev,
        topics: updateTopicListById(prev.topics, branchTopicId, (topic) => {
          const frame = topic.history.find((item) => item.id === snapshotFrameId);
          return frame ? applyHistoryFrameToTopic(topic, frame) : topic;
        }),
      }));
    }
    if (branch.topicId) openInSphere(branch.topicId, anchorEvent?.targetId || null);
    showToast(policyApplied ? `${branch.label} (${lang === "ja" ? "同期ポリシー適用" : "Policy applied"})` : branch.label, "info");
  }, [state.eventLog, state.topics, updateState, openInSphere, showToast, applyScenarioBranchSyncPolicy, lang]);

  return {
    branchDiffs,
    branchReviews,
    branchConflicts,
    createScenarioBranch,
    deleteScenarioBranch,
    updateScenarioBranchStatus,
    updateScenarioBranch,
    captureScenarioBranchSnapshot,
    materializeScenarioBranch,
    syncScenarioBranchFromSource,
    backportScenarioBranch,
    backportScenarioBranchNode,
    navigateScenarioBranch,
  };
}
