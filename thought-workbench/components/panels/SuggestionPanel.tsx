import React, { useMemo } from "react";
import type { TopicItem } from "../../types";
import { detectSuggestions } from "../../utils/suggestion-engine";
import type { Suggestion, SuggestionKind } from "../../utils/suggestion-engine";

const KIND_STYLES: Record<SuggestionKind, { label: string; color: string }> = {
  "merge-candidate": { label: "統合候補", color: "text-red-400" },
  "similar-name":    { label: "類似名",   color: "text-yellow-400" },
  "similar-tags":    { label: "共通タグ", color: "text-purple-400" },
  "link-candidate":  { label: "関連候補", color: "text-blue-400" },
  "orphan":          { label: "孤立",     color: "text-orange-400" },
};

/** merge-candidate に有効なアクション */
const MERGE_KINDS: SuggestionKind[] = ["merge-candidate"];
/** リンク張りに有効なアクション */
const LINK_KINDS: SuggestionKind[] = ["similar-name", "similar-tags", "link-candidate"];

export function SuggestionPanel({
  topics,
  onNavigateNode,
  onMergeNodes,
  onLinkNodes,
  lang,
}: {
  topics: TopicItem[];
  onNavigateNode: (topicId: string, nodeId: string | null) => void;
  onMergeNodes?: (topicId: string, nodeIdA: string, nodeIdB: string) => void;
  onLinkNodes?: (topicIdA: string, nodeIdA: string, topicIdB: string, nodeIdB: string) => void;
  lang: "ja" | "en";
}) {
  const suggestions = useMemo(() => detectSuggestions(topics, 30), [topics]);

  if (suggestions.length === 0) {
    return (
      <div className="text-[8px] text-white/25 text-center py-2">
        {lang === "ja" ? "提案なし" : "No suggestions"}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="text-[7px] text-white/25 mb-1">
        {suggestions.length} {lang === "ja" ? "件の提案" : "suggestions"}
      </div>
      {suggestions.map((s: Suggestion, i: number) => {
        const style = KIND_STYLES[s.kind];
        const canMerge = MERGE_KINDS.includes(s.kind) && s.nodeIdB && s.topicIdB && onMergeNodes;
        const canLink  = LINK_KINDS.includes(s.kind)  && s.nodeIdB && s.topicIdB && onLinkNodes;

        return (
          <div
            key={i}
            className="rounded-md border border-white/5 bg-black/20 px-1.5 py-1 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className={`text-[7px] ${style.color}`}>{style.label}</span>
              <span className="text-[7px] text-white/20">{(s.score * 100).toFixed(0)}%</span>
            </div>
            <div className="text-[8px] text-white/50 mt-0.5 leading-tight">{s.message}</div>

            {/* ナビゲーション */}
            <div className="flex flex-wrap gap-1 mt-0.5">
              <button
                onClick={() => onNavigateNode(s.topicIdA, s.nodeIdA)}
                className="text-[7px] text-blue-400/60 hover:text-blue-300 transition-colors"
              >
                {lang === "ja" ? "A へ移動" : "Go A"}
              </button>
              {s.nodeIdB && s.topicIdB && (
                <button
                  onClick={() => onNavigateNode(s.topicIdB!, s.nodeIdB!)}
                  className="text-[7px] text-blue-400/60 hover:text-blue-300 transition-colors"
                >
                  {lang === "ja" ? "B へ移動" : "Go B"}
                </button>
              )}

              {/* 統合アクション（merge-candidate のみ） */}
              {canMerge && (
                <button
                  onClick={() => onMergeNodes!(s.topicIdA, s.nodeIdA, s.nodeIdB!)}
                  className="ml-auto text-[7px] rounded px-1 py-0.5 bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
                  title={lang === "ja" ? "2ノードを統合する" : "Merge these nodes"}
                >
                  {lang === "ja" ? "統合" : "Merge"}
                </button>
              )}

              {/* リンクアクション（similar-name / similar-tags / link-candidate） */}
              {canLink && (
                <button
                  onClick={() => onLinkNodes!(s.topicIdA, s.nodeIdA, s.topicIdB!, s.nodeIdB!)}
                  className="ml-auto text-[7px] rounded px-1 py-0.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title={lang === "ja" ? "エッジを張る" : "Link these nodes"}
                >
                  {lang === "ja" ? "リンク" : "Link"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
