import React from "react";
import type { NodeItem } from "../../types";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";

export type SearchPanelProps = {
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  searchResults: NodeItem[];
  onFocusNode: (nodeId: string) => void;
  lang?: "ja" | "en";
};

export function SearchPanel({
  searchQuery,
  onChangeSearchQuery,
  searchResults,
  onFocusNode,
  lang = "ja",
}: SearchPanelProps) {
  const isJa = lang === "ja";
  return (
    <div>
      <div className="mt-1.5">
        <FieldLabel>{isJa ? "検索" : "Search"}</FieldLabel>
        <Input
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder={isJa ? "ノード名 / ノート" : "node label / note"}
        />
      </div>
      <div className="mt-1 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
        {isJa ? "例: work:active intake:structured version:working review:inReview" : "e.g. work:active intake:structured version:working review:inReview"}
      </div>
      {searchResults.length > 0 && searchQuery.trim() ? (
        <div className="mt-1.5 space-y-1">
          {searchResults.map((node) => (
            <button
              key={`search-${node.id}`}
              className="flex w-full items-center justify-between rounded-md border px-2 py-1 text-[8px]"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-dim)" }}
              onClick={() => onFocusNode(node.id)}
            >
              <span className="truncate">{node.label}</span>
              <span>{isJa ? "検索" : "search"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
