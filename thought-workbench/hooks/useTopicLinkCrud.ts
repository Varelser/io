import type { AppState, TopicItem, TopicLinkItem, UnresolvedTopicLink } from "../types";
import { newId } from "../utils/id";
import { appendTopicLinkIfMissing, createTopicLinkItem, removeTopicLinkById, resolveUnresolvedTopicLinkInState } from "../graph-ops/topic-links-crud";

export function useTopicLinkCrud({
  selectedTopic,
  selectedUnresolvedTopicLinks,
  updateTopicLinksState,
  updateState,
  topicLinkEditor,
}: {
  selectedTopic: TopicItem | undefined;
  selectedUnresolvedTopicLinks: UnresolvedTopicLink[];
  updateTopicLinksState: (updater: (links: TopicLinkItem[]) => TopicLinkItem[]) => void;
  updateState: (updater: (draft: AppState) => AppState) => void;
  topicLinkEditor: {
    newTopicLinkTarget: string;
    newTopicLinkRelation: string;
    newTopicLinkMeaning: string;
    resetTopicLinkForm: () => void;
  };
}) {
  const addTopicLink = () => {
    if (!selectedTopic || !topicLinkEditor.newTopicLinkTarget || !topicLinkEditor.newTopicLinkMeaning.trim()) return;
    updateTopicLinksState((ls) => appendTopicLinkIfMissing(ls, createTopicLinkItem({
      id: newId("topic-link"),
      from: selectedTopic.id,
      to: topicLinkEditor.newTopicLinkTarget,
      relation: topicLinkEditor.newTopicLinkRelation,
      meaning: topicLinkEditor.newTopicLinkMeaning.trim(),
    })));
    topicLinkEditor.resetTopicLinkForm();
  };

  const deleteTopicLink = (id: string) => {
    updateTopicLinksState((ls) => removeTopicLinkById(ls, id));
  };

  const resolveUnresolvedTopicLink = (idx: number, tid: string) => {
    if (!selectedTopic || !tid) return;
    const ref = selectedUnresolvedTopicLinks[idx];
    if (!ref) return;
    updateState((p) => resolveUnresolvedTopicLinkInState(p, selectedTopic.id, ref, tid, idx));
  };

  const resolveAllUnresolvedTopicLinks = (topics: TopicItem[]) => {
    if (!selectedTopic || selectedUnresolvedTopicLinks.length === 0) return;
    const topicId = selectedTopic.id;
    // Process in reverse order so indices remain valid after each removal
    const pairs: { idx: number; ref: UnresolvedTopicLink; targetId: string }[] = [];
    selectedUnresolvedTopicLinks.forEach((ref, idx) => {
      const match = topics.find((t) => {
        if (t.id === topicId) return false;
        if (ref.targetId && t.id === ref.targetId) return true;
        if (ref.targetTitle && t.title.toLowerCase() === ref.targetTitle.toLowerCase()) return true;
        if (ref.targetFile && t.sourceFile && t.sourceFile.toLowerCase() === ref.targetFile.toLowerCase()) return true;
        return false;
      });
      if (match) pairs.push({ idx, ref, targetId: match.id });
    });
    if (pairs.length === 0) return;
    updateState((p) => {
      let draft = p;
      for (const { idx, ref, targetId } of [...pairs].reverse()) {
        draft = resolveUnresolvedTopicLinkInState(draft, topicId, ref, targetId, idx);
      }
      return draft;
    });
  };

  return { addTopicLink, deleteTopicLink, resolveUnresolvedTopicLink, resolveAllUnresolvedTopicLinks };
}
