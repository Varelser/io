import React, { useMemo } from "react";
import type { TopicItem } from "../../types";
import { buildLabelIndex, parseTextWithWikilinks } from "../../utils/wikilink";

/**
 * テキスト中の [[ノード名]] をクリック可能なリンクとしてレンダリングする。
 * 解決済み=青リンク、未解決=灰色下線
 */
export function WikilinkText({
  text,
  topics,
  onNavigate,
  className,
  style,
}: {
  text: string;
  topics: TopicItem[];
  onNavigate?: (topicId: string, nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const index = useMemo(() => buildLabelIndex(topics), [topics]);
  const segments = useMemo(() => parseTextWithWikilinks(text, index), [text, index]);

  if (segments.length === 0) return null;

  return (
    <span className={className} style={style}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        const m = seg.match;
        if (m.resolved && m.topicId && m.nodeId) {
          return (
            <span
              key={i}
              className="cursor-pointer underline decoration-dotted"
              style={{ color: "var(--tw-accent)" }}
              title={`→ ${m.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.(m.topicId!, m.nodeId!);
              }}
            >
              {m.label}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="underline decoration-dotted"
            style={{ color: "var(--tw-text-muted)" }}
            title={`未解決: ${m.label}`}
          >
            {m.label}
          </span>
        );
      })}
    </span>
  );
}
