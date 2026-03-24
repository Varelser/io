import type { AppState, TopicItem, EventKind } from "../types";
import { buildNewTopicItem, buildDuplicatedTopicItem, appendTopicItemsToState, removeSelectedTopicInState, patchTopicItem } from "../graph-ops/topic-crud";
import { buildParaFolderPath, collectTopicSubtreeIds } from "../utils/topic-organization";

type PushEvent = (kind: EventKind, opts?: { topicId?: string; targetId?: string; targetLabel?: string; detail?: Record<string, unknown> }) => void;

export function useTopicCrud({
  topics,
  selectedTopic,
  selectedTopicId,
  updateState,
  doUpdateSelectedTopic,
  openInSphere,
  setSelectedTopicId,
  setSelectedNodeId,
  pushEvent,
}: {
  topics: TopicItem[];
  selectedTopic: TopicItem | undefined;
  selectedTopicId: string | null;
  updateState: (updater: (draft: AppState) => AppState) => void;
  doUpdateSelectedTopic: (updater: (t: TopicItem) => TopicItem) => void;
  openInSphere: (tid: string, nid: string | null) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  pushEvent?: PushEvent;
}) {
  const addTopic = () => {
    const c = buildNewTopicItem(topics.length);
    updateState((p) => appendTopicItemsToState(p, [c.topic]));
    openInSphere(c.topicId, c.nodeId);
    pushEvent?.("topic:create", { topicId: c.topicId, targetLabel: c.topic.title });
  };

  const addChildTopic = () => {
    if (!selectedTopic) return;
    const c = buildNewTopicItem(topics.length);
    c.topic.parentTopicId = selectedTopic.id;
    c.topic.folder = selectedTopic.folder;
    c.topic.title = `${selectedTopic.title} / 子球体 ${topics.filter((t) => t.parentTopicId === selectedTopic.id).length + 1}`;
    updateState((p) => appendTopicItemsToState(p, [c.topic]));
    openInSphere(c.topicId, c.nodeId);
    pushEvent?.("topic:create", { topicId: c.topicId, targetLabel: c.topic.title });
  };

  const deleteSelectedTopic = () => {
    if (!selectedTopic) return;
    const label = selectedTopic.title;
    const tid = selectedTopic.id;
    let nti: string | null = null;
    let nni: string | null = null;
    updateState((p) => {
      const r = removeSelectedTopicInState(p, tid);
      p.topics = r.state.topics;
      p.topicLinks = r.state.topicLinks;
      nti = r.nextTopicId;
      nni = r.nextNodeId;
      return p;
    });
    setSelectedTopicId(nti);
    setSelectedNodeId(nni);
    pushEvent?.("topic:delete", { topicId: tid, targetLabel: label });
  };

  const duplicateSelectedTopic = () => {
    if (!selectedTopic) return;
    const d = buildDuplicatedTopicItem(selectedTopic);
    updateState((p) => appendTopicItemsToState(p, [d.topic]));
    openInSphere(d.topic.id, d.firstNodeId);
    pushEvent?.("topic:create", { topicId: d.topic.id, targetLabel: d.topic.title });
  };

  const updateSelectedTopic = (patch: Partial<TopicItem>) => {
    doUpdateSelectedTopic((t) => patchTopicItem(t, patch));
    if (patch.activeMethods) {
      pushEvent?.("method:toggle", { topicId: selectedTopic?.id, detail: { activeMethods: patch.activeMethods } });
    } else {
      pushEvent?.("topic:update", { topicId: selectedTopic?.id, targetLabel: selectedTopic?.title, detail: { fields: Object.keys(patch) } });
    }
  };

  const applyParaCategoryToSubtree = (category: string) => {
    if (!selectedTopic) return;
    const subtreeIds = collectTopicSubtreeIds(topics, selectedTopic.id);
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (!subtreeIds.has(topic.id)) return topic;
        const parent = topic.parentTopicId ? prev.topics.find((item) => item.id === topic.parentTopicId) : null;
        return patchTopicItem(topic, {
          paraCategory: category,
          folder: buildParaFolderPath(category, topic.title, parent?.folder),
        });
      }),
    }));
    pushEvent?.("topic:update", { topicId: selectedTopic.id, targetLabel: selectedTopic.title, detail: { paraCategory: category, subtree: true } });
  };

  return { addTopic, addChildTopic, deleteSelectedTopic, duplicateSelectedTopic, updateSelectedTopic, applyParaCategoryToSubtree };
}
