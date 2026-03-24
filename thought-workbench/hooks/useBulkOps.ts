import { useState } from "react";
import type { TopicItem, NodeItem } from "../types";
import { NODE_TYPES, TENSES } from "../constants/node-types";
import { normalizeNodeToSphere } from "../projection/sphere";
import { appendNodesToTopic, removeSelectedNodesInTopic, shiftNodePosition } from "../graph-ops/node-crud";
import { buildBulkConnectPairs, appendBulkConnectedEdgesToTopic, buildBulkDuplicatedNodes, clampBulkOffsetValue, clampNodeSizeValue, clampFrameScaleValue, clampEdgeWeightValue } from "../graph-ops/bulk-ops";

export function useBulkOps({
  selectedTopic,
  selectedTopicId,
  selectedNodeId,
  setSelectedNodeId,
  doUpdateSelectedTopic,
  mapSelectedMultiNodesState,
  multiNodeIds,
  setMultiNodeIds,
  setBulkMessage,
  edgeEditor,
}: {
  selectedTopic: TopicItem | undefined;
  selectedTopicId: string | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  doUpdateSelectedTopic: (updater: (t: TopicItem) => TopicItem) => void;
  mapSelectedMultiNodesState: (topicId: string | null, ids: Set<string>, mapper: (n: NodeItem) => NodeItem) => void;
  multiNodeIds: string[];
  setMultiNodeIds: (ids: string[]) => void;
  setBulkMessage: (msg: string) => void;
  edgeEditor: {
    newEdgeRelation: string;
    newEdgeMeaning: string;
    newEdgeWeight: string;
    setEdgeMessage: (msg: string) => void;
  };
}) {
  const [bulkGroupValue, setBulkGroupValue] = useState("");
  const [bulkLayerValue, setBulkLayerValue] = useState("");
  const [bulkTypeValue, setBulkTypeValue] = useState<string>(NODE_TYPES[0]);
  const [bulkTenseValue, setBulkTenseValue] = useState<string>(TENSES[1]);
  const [bulkNodeSizeValue, setBulkNodeSizeValue] = useState("0.6");
  const [bulkFrameScaleValue, setBulkFrameScaleValue] = useState("1");
  const [bulkOffsetX, setBulkOffsetX] = useState("0.2");
  const [bulkOffsetY, setBulkOffsetY] = useState("0");
  const [bulkOffsetZ, setBulkOffsetZ] = useState("0");
  const [bulkConnectMode, setBulkConnectMode] = useState<"chain" | "pairwise">("chain");
  const [bulkAddTagValue, setBulkAddTagValue] = useState("");
  const [bulkRemoveTagValue, setBulkRemoveTagValue] = useState("");

  const bulkSnapSelectedNodesToSphere = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, position: normalizeNodeToSphere(n.position) }));
    setBulkMessage(`${multiNodeIds.length} snapped ${new Date().toLocaleTimeString()}`);
  };

  const bulkDeleteSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const ids = new Set(multiNodeIds);
    let nsi: string | null = null;
    doUpdateSelectedTopic((t) => {
      const r = removeSelectedNodesInTopic(t, ids);
      nsi = r.nextSelectedNodeId;
      return r.topic;
    });
    setSelectedNodeId(nsi);
    setMultiNodeIds([]);
    setBulkMessage(`deleted ${ids.size} nodes ${new Date().toLocaleTimeString()}`);
  };

  const bulkDuplicateSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const ids = new Set(multiNodeIds);
    let created: string[] = [];
    doUpdateSelectedTopic((t) => {
      const r = buildBulkDuplicatedNodes(t, ids);
      created = r.createdIds;
      return appendNodesToTopic(t, r.duplicates);
    });
    setMultiNodeIds(created);
    setSelectedNodeId(created[0] || selectedNodeId);
    setBulkMessage(`duplicated ${created.length} nodes ${new Date().toLocaleTimeString()}`);
  };

  const bulkApplyGroupToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const v = bulkGroupValue.trim();
    if (!v) { setBulkMessage("group is empty"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, group: v }));
    setBulkMessage(`group applied to ${multiNodeIds.length} nodes`);
  };

  const bulkApplyLayerToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const v = bulkLayerValue.trim();
    if (!v) { setBulkMessage("layer is empty"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, layer: v }));
    setBulkMessage(`layer applied to ${multiNodeIds.length} nodes`);
  };

  const bulkApplyTypeToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, type: bulkTypeValue }));
    setBulkMessage(`type applied to ${multiNodeIds.length} nodes`);
  };

  const bulkApplyTenseToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, tense: bulkTenseValue }));
    setBulkMessage(`tense applied to ${multiNodeIds.length} nodes`);
  };

  const bulkApplyNodeSizeToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const s = clampNodeSizeValue(bulkNodeSizeValue);
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, size: s }));
    setBulkMessage(`size applied to ${multiNodeIds.length} nodes (${s})`);
  };

  const bulkApplyFrameScaleToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const f = clampFrameScaleValue(bulkFrameScaleValue);
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, frameScale: f }));
    setBulkMessage(`frame applied to ${multiNodeIds.length} nodes (${f})`);
  };

  const bulkOffsetSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const dx = clampBulkOffsetValue(bulkOffsetX);
    const dy = clampBulkOffsetValue(bulkOffsetY);
    const dz = clampBulkOffsetValue(bulkOffsetZ);
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => ({ ...n, position: shiftNodePosition(n.position, dx, dy, dz) }));
    setBulkMessage(`moved ${multiNodeIds.length} nodes (${dx}, ${dy}, ${dz})`);
  };

  const bulkAddTagToSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const tag = bulkAddTagValue.trim();
    if (!tag) { setBulkMessage("tag is empty"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => {
      const current = n.tags || [];
      return current.includes(tag) ? n : { ...n, tags: [...current, tag] };
    });
    setBulkMessage(`tag "${tag}" added to ${multiNodeIds.length} nodes`);
  };

  const bulkRemoveTagFromSelectedNodes = () => {
    if (!selectedTopic || !multiNodeIds.length) { setBulkMessage("no nodes selected"); return; }
    const tag = bulkRemoveTagValue.trim();
    if (!tag) { setBulkMessage("tag is empty"); return; }
    mapSelectedMultiNodesState(selectedTopicId, new Set(multiNodeIds), (n) => {
      const next = (n.tags || []).filter((t) => t !== tag);
      return { ...n, tags: next.length > 0 ? next : undefined };
    });
    setBulkMessage(`tag "${tag}" removed from ${multiNodeIds.length} nodes`);
  };

  const bulkConnectSelectedNodes = () => {
    if (!selectedTopic || multiNodeIds.length < 2) { setBulkMessage("need at least 2 selected nodes"); return; }
    const w = clampEdgeWeightValue(edgeEditor.newEdgeWeight);
    const pairs = buildBulkConnectPairs(multiNodeIds, bulkConnectMode);
    let cnt = 0;
    doUpdateSelectedTopic((t) => {
      const r = appendBulkConnectedEdgesToTopic(t, pairs, edgeEditor.newEdgeRelation, edgeEditor.newEdgeMeaning.trim() || `${bulkConnectMode} connect`, w);
      cnt = r.addedCount;
      return r.topic;
    });
    setBulkMessage(`bulk connected ${cnt} edges (${bulkConnectMode})`);
    edgeEditor.setEdgeMessage(`bulk connected ${cnt} edges ${new Date().toLocaleTimeString()}`);
  };

  return {
    bulkGroupValue, setBulkGroupValue,
    bulkLayerValue, setBulkLayerValue,
    bulkTypeValue, setBulkTypeValue,
    bulkTenseValue, setBulkTenseValue,
    bulkNodeSizeValue, setBulkNodeSizeValue,
    bulkFrameScaleValue, setBulkFrameScaleValue,
    bulkOffsetX, setBulkOffsetX,
    bulkOffsetY, setBulkOffsetY,
    bulkOffsetZ, setBulkOffsetZ,
    bulkConnectMode, setBulkConnectMode,
    bulkAddTagValue, setBulkAddTagValue,
    bulkRemoveTagValue, setBulkRemoveTagValue,
    bulkAddTagToSelectedNodes,
    bulkRemoveTagFromSelectedNodes,
    bulkSnapSelectedNodesToSphere,
    bulkDeleteSelectedNodes,
    bulkDuplicateSelectedNodes,
    bulkApplyGroupToSelectedNodes,
    bulkApplyLayerToSelectedNodes,
    bulkApplyTypeToSelectedNodes,
    bulkApplyTenseToSelectedNodes,
    bulkApplyNodeSizeToSelectedNodes,
    bulkApplyFrameScaleToSelectedNodes,
    bulkOffsetSelectedNodes,
    bulkConnectSelectedNodes,
  };
}
