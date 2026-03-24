import React, { useState } from "react";
import type { TopicItem } from "../../types";

function FolderTreeNode({ topic, topics, selectedTopicId, onSelectTopic, depth }: { topic: TopicItem; topics: TopicItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, nodeId: string | null) => void; depth: number }) {
  const children = topics.filter((t) => t.parentTopicId === topic.id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const isSelected = topic.id === selectedTopicId;
  const nodeCount = topic.nodes.length;
  const edgeCount = topic.edges.length;

  return (
    <div>
      <div
        className="flex items-center gap-1 group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button onClick={() => setExpanded((v) => !v)} className="flex h-5 w-5 shrink-0 items-center justify-center text-white/40 hover:text-white/70">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" className={`transition-transform duration-100 ${expanded ? "rotate-90" : ""}`}>
              <polyline points="3,1 7,5 3,9" />
            </svg>
          </button>
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[8px] text-white/15">○</span>
        )}
        {/* Nesting line */}
        {depth > 0 && (
          <svg className="absolute" style={{ left: `${depth * 20 + 4}px`, top: 0 }} width="8" height="100%" overflow="visible">
            <line x1="4" y1="0" x2="4" y2="100%" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </svg>
        )}
        {/* Topic button */}
        <button
          onClick={() => onSelectTopic(topic.id, topic.nodes[0]?.id || null)}
          className={`flex-1 min-w-0 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-white/60 bg-white/10" : "border-white/6 bg-white/[0.02] hover:bg-white/[0.04]"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {topic.domain && <span className="text-[7px] rounded px-1 py-0.5 bg-white/8 text-white/50 tracking-wider truncate max-w-[80px]">{topic.domain}</span>}
                <span className="text-[8px] uppercase tracking-wider text-white/25 truncate">{topic.folder}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-white/90 truncate">{topic.title}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[8px] text-white/25">{nodeCount}n / {edgeCount}e</div>
              {hasChildren && <div className="text-[7px] text-white/20">{children.length} children</div>}
            </div>
          </div>
          {topic.description && <div className="mt-1 text-[8px] text-white/30 truncate">{topic.description}</div>}
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="relative mt-0.5 space-y-0.5">
          {children.map((child) => (
            <FolderTreeNode key={child.id} topic={child} topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderView({ topics, selectedTopicId, onSelectTopic }: { topics: TopicItem[]; selectedTopicId: string | null; onSelectTopic: (topicId: string, nodeId: string | null) => void }) {
  const rootTopics = topics.filter((t) => !t.parentTopicId || !topics.some((p) => p.id === t.parentTopicId));

  // Group roots by folder
  const folderMap = new Map<string, TopicItem[]>();
  rootTopics.forEach((t) => {
    const folder = t.folder || "uncategorized";
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder)!.push(t);
  });

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Folder / Hierarchy View</div>
      <div className="space-y-4">
        {[...folderMap.entries()].map(([folder, folderTopics]) => (
          <div key={folder}>
            <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1.5 pl-3 border-l-2 border-white/10">{folder}</div>
            <div className="space-y-0.5">
              {folderTopics.map((topic) => (
                <FolderTreeNode key={topic.id} topic={topic} topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic} depth={0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
