import type { TopicItem, WorkspaceViewport } from "../types";

export function buildWorkspaceLayoutSnapshot(topics: TopicItem[], viewport: WorkspaceViewport) {
  return {
    viewport,
    topics: topics.map((topic) => ({
      topicId: topic.id,
      x: topic.workspace.x,
      y: topic.workspace.y,
      size: topic.workspace.size,
    })),
  };
}

export function applyWorkspaceLayoutSnapshot(
  topics: TopicItem[],
  snapshot: { topics: { topicId: string; x: number; y: number; size: number }[] } | undefined,
) {
  if (!snapshot) return topics;
  const nextById = new Map(snapshot.topics.map((topic) => [topic.topicId, topic]));
  return topics.map((topic) => {
    const next = nextById.get(topic.id);
    if (!next) return topic;
    return {
      ...topic,
      workspace: {
        ...topic.workspace,
        x: next.x,
        y: next.y,
        size: next.size,
      },
    };
  });
}
