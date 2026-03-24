import type { TopicItem, EdgeItem, EventKind } from "../types";
import { newId } from "../utils/id";
import { appendEdgesToTopic, updateEdgeByIdInTopic, removeEdgeByIdFromTopic, createEdgeItem, updateEdgeListInTopic } from "../graph-ops/edge-crud";
import { clampEdgeWeightValue } from "../graph-ops/bulk-ops";

type PushEvent = (kind: EventKind, opts?: { topicId?: string; targetId?: string; targetLabel?: string; detail?: Record<string, unknown> }) => void;

export function useEdgeCrud({
  selectedTopic,
  doUpdateSelectedTopic,
  edgeEditor,
  pushEvent,
}: {
  selectedTopic: TopicItem | undefined;
  doUpdateSelectedTopic: (updater: (t: TopicItem) => TopicItem) => void;
  edgeEditor: {
    newEdgeFrom: string;
    newEdgeTo: string;
    newEdgeRelation: string;
    newEdgeMeaning: string;
    newEdgeWeight: string;
    newEdgeContradictionType?: string;
    newEdgeTransformOp?: string;
    resetEdgeForm: () => void;
    setEdgeMessage: (msg: string) => void;
  };
  pushEvent?: PushEvent;
}) {
  const addNodeEdge = () => {
    if (!selectedTopic || !edgeEditor.newEdgeFrom || !edgeEditor.newEdgeTo || edgeEditor.newEdgeFrom === edgeEditor.newEdgeTo) return;
    const w = clampEdgeWeightValue(edgeEditor.newEdgeWeight);
    doUpdateSelectedTopic((t) => {
      if (t.edges.some((e) => e.from === edgeEditor.newEdgeFrom && e.to === edgeEditor.newEdgeTo && e.relation === edgeEditor.newEdgeRelation)) return t;
      return appendEdgesToTopic(t, [createEdgeItem({
        id: newId("edge"),
        from: edgeEditor.newEdgeFrom,
        to: edgeEditor.newEdgeTo,
        relation: edgeEditor.newEdgeRelation,
        meaning: edgeEditor.newEdgeMeaning.trim() || edgeEditor.newEdgeRelation,
        weight: w,
        visible: true,
        contradictionType: (edgeEditor.newEdgeContradictionType || undefined) as EdgeItem["contradictionType"],
        transformOp: (edgeEditor.newEdgeTransformOp || undefined) as EdgeItem["transformOp"],
      })]);
    });
    edgeEditor.resetEdgeForm();
    edgeEditor.setEdgeMessage(`edge added ${new Date().toLocaleTimeString()}`);
    pushEvent?.("edge:create", { topicId: selectedTopic?.id, targetLabel: edgeEditor.newEdgeRelation });
  };

  const toggleEdgeVisible = (eid: string) => {
    doUpdateSelectedTopic((t) => updateEdgeByIdInTopic(t, eid, (e) => ({ ...e, visible: e.visible === false ? true : false })));
  };

  const updateNodeEdgeWeight = (eid: string, w: number) => {
    doUpdateSelectedTopic((t) => updateEdgeByIdInTopic(t, eid, (e) => ({ ...e, weight: clampEdgeWeightValue(w) })));
    edgeEditor.setEdgeMessage(`weight ${clampEdgeWeightValue(w).toFixed(2)} ${new Date().toLocaleTimeString()}`);
  };

  const updateEdge = (eid: string, patch: Partial<EdgeItem>) => {
    doUpdateSelectedTopic((t) => updateEdgeByIdInTopic(t, eid, (e) => ({ ...e, ...patch })));
    edgeEditor.setEdgeMessage(`edge updated ${new Date().toLocaleTimeString()}`);
  };

  const deleteNodeEdge = (eid: string) => {
    doUpdateSelectedTopic((t) => removeEdgeByIdFromTopic(t, eid));
    edgeEditor.setEdgeMessage(`edge deleted ${new Date().toLocaleTimeString()}`);
    pushEvent?.("edge:delete", { topicId: selectedTopic?.id, targetId: eid });
  };

  const duplicateNodeEdge = (eid: string) => {
    if (!selectedTopic) return;
    const s = selectedTopic.edges.find((e) => e.id === eid);
    if (!s) return;
    doUpdateSelectedTopic((t) => appendEdgesToTopic(t, [createEdgeItem({ ...s, id: newId("edge"), meaning: s.meaning ? `${s.meaning} copy` : "edge copy", visible: s.visible !== false })]));
    edgeEditor.setEdgeMessage(`edge copied ${new Date().toLocaleTimeString()}`);
  };

  const reverseNodeEdge = (eid: string) => {
    if (!selectedTopic) return;
    const s = selectedTopic.edges.find((e) => e.id === eid);
    if (!s) return;
    doUpdateSelectedTopic((t) => appendEdgesToTopic(t, [createEdgeItem({ ...s, id: newId("edge"), from: s.to, to: s.from, meaning: s.meaning ? `${s.meaning} reversed` : "reversed edge", visible: s.visible !== false })]));
    edgeEditor.setEdgeMessage(`edge reversed ${new Date().toLocaleTimeString()}`);
  };

  const setAllSelectedTopicEdgesVisible = (v: boolean) => {
    if (!selectedTopic) return;
    doUpdateSelectedTopic((t) => updateEdgeListInTopic(t, (es) => es.map((e) => ({ ...e, visible: v }))));
    edgeEditor.setEdgeMessage(`${v ? "edges on" : "edges off"} ${new Date().toLocaleTimeString()}`);
  };

  return { addNodeEdge, toggleEdgeVisible, updateNodeEdgeWeight, updateEdge, deleteNodeEdge, duplicateNodeEdge, reverseNodeEdge, setAllSelectedTopicEdgesVisible };
}
