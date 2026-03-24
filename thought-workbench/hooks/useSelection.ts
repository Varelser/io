import { useState, useEffect, useRef } from "react";
import type { AppState, TopicItem } from "../types";
import { getInitialSelectionState } from "../graph-ops/selection";

export function useSelection(state: AppState) {
  const initialSelectionRef = useRef<{ topicId: string | null; nodeId: string | null } | null>(null);
  if (!initialSelectionRef.current) {
    initialSelectionRef.current = getInitialSelectionState(state);
  }

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialSelectionRef.current.topicId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectionRef.current.nodeId);

  const topics = state.topics;

  useEffect(() => {
    if (!topics.length) return;
    if (!selectedTopicId || !topics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(topics[0].id);
      setSelectedNodeId(topics[0].nodes[0]?.id || null);
    }
  }, [topics, selectedTopicId]);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) || topics[0] || null;

  useEffect(() => {
    if (!selectedTopic) return;
    if (!selectedNodeId || !selectedTopic.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(selectedTopic.nodes[0]?.id || null);
    }
  }, [selectedTopic, selectedNodeId]);

  const selectedNode = selectedTopic?.nodes.find((node) => node.id === selectedNodeId) || null;

  const openTopicInSphere = (topicId: string, preferredNodeId: string | null, stateRef: React.MutableRefObject<AppState>, setView: (v: string) => void) => {
    const topic = stateRef.current.topics.find((item) => item.id === topicId);
    const nextNodeId = preferredNodeId && topic?.nodes.some((node) => node.id === preferredNodeId)
      ? preferredNodeId
      : topic?.nodes[0]?.id || null;
    setSelectedTopicId(topicId);
    setSelectedNodeId(nextNodeId);
    setView("sphere");
  };

  const focusNodeInSphere = (nodeId: string, setView: (v: string) => void) => {
    setSelectedNodeId(nodeId);
    setView("sphere");
  };

  return {
    selectedTopicId,
    setSelectedTopicId,
    selectedNodeId,
    setSelectedNodeId,
    selectedTopic,
    selectedNode,
    openTopicInSphere,
    focusNodeInSphere,
  };
}
