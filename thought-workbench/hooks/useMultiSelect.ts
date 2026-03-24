import { useState, useEffect, useMemo } from "react";
import type { TopicItem } from "../types";

export function useMultiSelect(selectedTopic: TopicItem | null) {
  const [multiNodeIds, setMultiNodeIds] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");

  useEffect(() => {
    if (!selectedTopic) return;
    const validIds = new Set(selectedTopic.nodes.map((node) => node.id));
    setMultiNodeIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [selectedTopic]);

  const multiNodeIdSet = useMemo(() => new Set(multiNodeIds), [multiNodeIds]);

  const toggleMultiNode = (nodeId: string) => {
    setMultiNodeIds((prev) => prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]);
  };

  const clearMultiSelection = () => {
    setMultiNodeIds([]);
    setBulkMessage("selection cleared");
  };

  const selectFilteredNodes = (filteredNodeIds: string[]) => {
    setMultiNodeIds(filteredNodeIds);
    setBulkMessage(`${filteredNodeIds.length} selected`);
  };

  return {
    multiNodeIds,
    setMultiNodeIds,
    multiNodeIdSet,
    bulkMessage,
    setBulkMessage,
    toggleMultiNode,
    clearMultiSelection,
    selectFilteredNodes,
  };
}
