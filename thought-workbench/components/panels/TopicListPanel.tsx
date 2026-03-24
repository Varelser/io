import React, { useState } from "react";
import type { TopicItem } from "../../types";

function TopicTreeNode({ topic, topics, selectedTopicId, onSelectTopic, onTopicContextMenu, depth }: { topic: TopicItem; topics: TopicItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, preferredNodeId: string | null) => void; onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void; depth: number }) {
  const children = topics.filter((t) => t.parentTopicId === topic.id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const isSelected = topic.id === selectedTopicId;

  return (
    <div>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: `${depth * 10}px` }}>
        {hasChildren ? (
          <button onClick={() => setExpanded((v) => !v)} className="flex h-4 w-4 shrink-0 items-center justify-center text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2" className={`transition-transform duration-100 ${expanded ? "rotate-90" : ""}`}>
              <polyline points="2,1 6,4 2,7" />
            </svg>
          </button>
        ) : (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[6px]" style={{ color: "var(--tw-text-muted)" }}>·</span>
        )}
        <button
          className="flex-1 min-w-0 rounded-md border px-1.5 py-1.5 text-left"
          style={isSelected
            ? { borderColor: "var(--tw-accent)", background: "var(--tw-accent)", color: "#fff" }
            : { borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text)" }
          }
          onClick={() => onSelectTopic(topic.id, topic.nodes[0]?.id || null)}
          onContextMenu={(event) => onTopicContextMenu?.(event, topic.id)}
        >
          <div className="text-[7px] uppercase tracking-[0.1em] opacity-50">{topic.folder}</div>
          <div className="mt-0.5 text-[9px] truncate">{topic.title}</div>
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {/* Nesting line */}
          {children.map((child) => (
            <TopicTreeNode key={child.id} topic={child} topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onTopicContextMenu={onTopicContextMenu} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TopicListPanel({ topics, selectedTopicId, onSelectTopic, onTopicContextMenu }: { topics: TopicItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, preferredNodeId: string | null) => void; onTopicContextMenu?: (event: React.MouseEvent, topicId: string) => void }) {
  const rootTopics = topics.filter((t) => !t.parentTopicId || !topics.some((p) => p.id === t.parentTopicId));

  return (
    <div className="mt-2 space-y-0.5">
      {rootTopics.map((topic) => (
        <TopicTreeNode key={topic.id} topic={topic} topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} onTopicContextMenu={onTopicContextMenu} depth={0} />
      ))}
    </div>
  );
}
