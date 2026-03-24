import type { TopicItem, NodeItem, EventKind } from "../types";
import { newId } from "../utils/id";
import { appendNodesToTopic, updateNodeByIdInTopic, buildNewNodeItem, createDuplicatedNodeItem, removeSelectedNodesInTopic } from "../graph-ops/node-crud";
import { patchTopicItem } from "../graph-ops/topic-crud";
import { appendMustOneHistory } from "../utils/topic-organization";

type PushEvent = (kind: EventKind, opts?: { topicId?: string; targetId?: string; targetLabel?: string; detail?: Record<string, unknown> }) => void;

export function useNodeCrud({
  selectedTopic,
  selectedNode,
  doUpdateSelectedTopic,
  setSelectedNodeId,
  pushEvent,
}: {
  selectedTopic: TopicItem | undefined;
  selectedNode: NodeItem | null;
  doUpdateSelectedTopic: (updater: (t: TopicItem) => TopicItem) => void;
  setSelectedNodeId: (id: string | null) => void;
  pushEvent?: PushEvent;
}) {
  const addNode = () => {
    if (!selectedTopic) return;
    const nid = newId("node");
    doUpdateSelectedTopic((t) => appendNodesToTopic(t, [buildNewNodeItem(t.nodes.length, nid)]));
    setSelectedNodeId(nid);
    pushEvent?.("node:create", { topicId: selectedTopic.id, targetId: nid });
  };

  const deleteSelectedNode = () => {
    if (!selectedTopic || !selectedNode) return;
    const label = selectedNode.label;
    const nid = selectedNode.id;
    let nsi: string | null = null;
    doUpdateSelectedTopic((t) => {
      const r = removeSelectedNodesInTopic(t, new Set([nid]));
      nsi = r.nextSelectedNodeId;
      return r.topic;
    });
    setSelectedNodeId(nsi);
    pushEvent?.("node:delete", { topicId: selectedTopic.id, targetId: nid, targetLabel: label });
  };

  const duplicateSelectedNode = () => {
    if (!selectedTopic || !selectedNode) return;
    const did = newId("node");
    doUpdateSelectedTopic((t) => appendNodesToTopic(t, [createDuplicatedNodeItem(selectedNode, { id: did, labelSuffix: " copy", dx: 0.35, dy: 0.2, dz: 0.15 })]));
    setSelectedNodeId(did);
    pushEvent?.("node:create", { topicId: selectedTopic.id, targetId: did, targetLabel: selectedNode.label + " copy" });
  };

  const updateSelectedNode = (patch: Partial<NodeItem>) => {
    if (!selectedTopic || !selectedNode) return;
    doUpdateSelectedTopic((t) => updateNodeByIdInTopic(t, selectedNode.id, (n) => ({ ...n, ...patch })));
    // extensions 更新は専用イベント
    const kind: EventKind = patch.extensions ? "extensions:update" : "node:update";
    const changedKeys = Object.keys(patch).filter((k) => k !== "position"); // position変更は頻繁すぎるのでスキップ
    if (changedKeys.length > 0) {
      pushEvent?.(kind, { topicId: selectedTopic.id, targetId: selectedNode.id, targetLabel: selectedNode.label, detail: { fields: changedKeys } });
    }
  };

  const toggleMustOne = () => {
    if (!selectedTopic || !selectedNode) return;
    const today = new Date().toISOString().slice(0, 10);
    doUpdateSelectedTopic((t) => {
      const nextMustOneId = t.mustOneNodeId === selectedNode.id ? null : selectedNode.id;
      return patchTopicItem(t, {
        mustOneNodeId: nextMustOneId,
        mustOneDate: nextMustOneId ? today : null,
        mustOneHistory: nextMustOneId
          ? appendMustOneHistory(t.mustOneHistory, selectedNode.id, selectedNode.label, today)
          : t.mustOneHistory,
      });
    });
  };

  return { addNode, deleteSelectedNode, duplicateSelectedNode, updateSelectedNode, toggleMustOne };
}
