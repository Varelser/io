import React, { useState } from "react";
import type { BundleItem, TopicItem } from "../../types";
import { BUNDLE_TYPES, BUNDLE_STATUSES } from "../../types/bundle";

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  "on-hold": "text-yellow-400",
  completed: "text-blue-400",
  archived: "text-white/30",
  frozen: "text-cyan-400",
};

const STATUS_ICONS: Record<string, string> = {
  active: "\u25CF",
  "on-hold": "\u25A0",
  completed: "\u2713",
  archived: "\u2014",
  frozen: "\u2744",
};

export function BundlePanel({
  bundles,
  topics,
  selectedTopicId,
  selectedNodeId,
  onCreateBundle,
  onDeleteBundle,
  onUpdateBundle,
  onAddCurrentNodeToBundle,
  onAddCurrentTopicToBundle,
  onRemoveNodeFromBundle,
  onRemoveTopicFromBundle,
  onNavigateNode,
  currentBundleId,
  onSetCurrentBundle,
  lang,
}: {
  bundles: BundleItem[];
  topics: TopicItem[];
  selectedTopicId: string | null;
  selectedNodeId: string | null;
  onCreateBundle: (title: string, bundleType: BundleItem["bundleType"]) => void;
  onDeleteBundle: (id: string) => void;
  onUpdateBundle: (id: string, patch: Partial<BundleItem>) => void;
  onAddCurrentNodeToBundle: (bundleId: string) => void;
  onAddCurrentTopicToBundle: (bundleId: string) => void;
  onRemoveNodeFromBundle: (bundleId: string, nodeId: string) => void;
  onRemoveTopicFromBundle?: (bundleId: string, topicId: string) => void;
  onNavigateNode: (topicId: string, nodeId: string | null) => void;
  currentBundleId?: string;
  onSetCurrentBundle?: (id: string | undefined) => void;
  lang: "ja" | "en";
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<BundleItem["bundleType"]>("custom");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreateBundle(newTitle.trim(), newType);
    setNewTitle("");
  };

  const resolveNodeLabel = (nodeId: string): { label: string; topicId: string } | null => {
    for (const t of topics) {
      const n = t.nodes.find((n) => n.id === nodeId);
      if (n) return { label: n.label, topicId: t.id };
    }
    return null;
  };

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <input
          className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/80"
          placeholder={lang === "ja" ? "Bundle 名" : "Bundle name"}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <select
          className="rounded-md border border-white/10 bg-black/40 px-1 py-1 text-[8px] text-white/60"
          value={newType}
          onChange={(e) => setNewType(e.target.value as BundleItem["bundleType"])}
        >
          {BUNDLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={handleCreate} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white/60 hover:bg-white/10">+</button>
      </div>

      {bundles.length === 0 && (
        <div className="text-[8px] text-white/25 text-center py-2">
          {lang === "ja" ? "Bundle なし" : "No bundles"}
        </div>
      )}

      {bundles.map((bundle) => {
        const isExpanded = expandedId === bundle.id;
        const isActive = currentBundleId === bundle.id;
        return (
          <div key={bundle.id} className={`mb-1.5 rounded-md border bg-black/20 ${isActive ? "border-amber-500/40" : "border-white/8"}`}>
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-white/[0.03]"
              onClick={() => setExpandedId(isExpanded ? null : bundle.id)}
            >
              <span className="text-[8px] text-white/30">{isExpanded ? "▾" : "▸"}</span>
              {isActive && <span className="text-[7px] text-amber-400" title={lang === "ja" ? "アクティブ" : "Active"}>★</span>}
              <span className="text-[9px] text-white/80 flex-1 truncate">{bundle.title}</span>
              <span className="text-[7px] text-white/30">{bundle.bundleType}</span>
              <span className={`text-[7px] ${STATUS_COLORS[bundle.status] || "text-white/40"}`} title={bundle.status}>{STATUS_ICONS[bundle.status] || "\u25CB"} {bundle.status}</span>
              <span className="text-[7px] text-white/25">{bundle.memberNodeIds.length}n</span>
            </div>

            {isExpanded && (
              <div className="px-2 pb-2 border-t border-white/5">
                <div className="mt-1.5 flex gap-1">
                  <select
                    className="flex-1 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-[8px] text-white/60"
                    value={bundle.status}
                    onChange={(e) => onUpdateBundle(bundle.id, { status: e.target.value as BundleItem["status"] })}
                  >
                    {BUNDLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {onSetCurrentBundle && (
                    <button
                      onClick={() => onSetCurrentBundle(isActive ? undefined : bundle.id)}
                      className={`rounded border px-1.5 py-0.5 text-[8px] ${isActive ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"}`}
                    >
                      {isActive ? (lang === "ja" ? "解除" : "unset") : (lang === "ja" ? "★ 設定" : "★ set")}
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteBundle(bundle.id)}
                    className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[8px] text-red-400 hover:bg-red-500/20"
                  >
                    {lang === "ja" ? "削除" : "del"}
                  </button>
                </div>

                <textarea
                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-1.5 py-1 text-[8px] text-white/60"
                  rows={2}
                  placeholder={lang === "ja" ? "説明" : "Description"}
                  value={bundle.description}
                  onChange={(e) => onUpdateBundle(bundle.id, { description: e.target.value })}
                />

                <div className="mt-1">
                  <div className="text-[7px] text-white/30 mb-0.5">{lang === "ja" ? "タグ" : "Tags"}</div>
                  <input
                    className="w-full rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[8px] text-white/60"
                    placeholder="tag1, tag2"
                    value={(bundle.tags || []).join(", ")}
                    onChange={(e) => onUpdateBundle(bundle.id, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>

                <div className="mt-1">
                  <div className="text-[7px] text-white/30 mb-0.5">{lang === "ja" ? "レビュー予定日" : "Review At"}</div>
                  <input
                    type="datetime-local"
                    className="w-full rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[8px] text-white/60"
                    value={bundle.reviewAt ? bundle.reviewAt.slice(0, 16) : ""}
                    onChange={(e) => onUpdateBundle(bundle.id, { reviewAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>

                <div className="mt-1.5 flex gap-1">
                  {selectedNodeId && (
                    <button
                      onClick={() => onAddCurrentNodeToBundle(bundle.id)}
                      className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] text-white/50 hover:bg-white/10"
                    >
                      + {lang === "ja" ? "選択ノード" : "Node"}
                    </button>
                  )}
                  {selectedTopicId && (
                    <button
                      onClick={() => onAddCurrentTopicToBundle(bundle.id)}
                      className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] text-white/50 hover:bg-white/10"
                    >
                      + {lang === "ja" ? "選択球体" : "Topic"}
                    </button>
                  )}
                </div>

                {bundle.memberNodeIds.length > 0 && (
                  <div className="mt-1.5">
                    <div className="text-[7px] text-white/30 mb-0.5">{lang === "ja" ? "メンバーノード" : "Member Nodes"}</div>
                    {bundle.memberNodeIds.map((nid) => {
                      const resolved = resolveNodeLabel(nid);
                      return (
                        <div key={nid} className="flex items-center gap-1 py-0.5">
                          <button
                            onClick={() => resolved && onNavigateNode(resolved.topicId, nid)}
                            className="text-[8px] text-blue-400/70 hover:text-blue-300 truncate flex-1 text-left"
                          >
                            {resolved?.label || nid}
                          </button>
                          <button
                            onClick={() => onRemoveNodeFromBundle(bundle.id, nid)}
                            className="text-[7px] text-red-400/50 hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {bundle.memberTopicIds.length > 0 && (
                  <div className="mt-1">
                    <div className="text-[7px] text-white/30 mb-0.5">{lang === "ja" ? "メンバー球体" : "Member Topics"}</div>
                    {bundle.memberTopicIds.map((tid) => {
                      const topic = topics.find((t) => t.id === tid);
                      return (
                        <div key={tid} className="flex items-center gap-1 py-0.5">
                          <button
                            onClick={() => onNavigateNode(tid, null)}
                            className="text-[8px] text-purple-400/70 hover:text-purple-300 truncate flex-1 text-left"
                          >
                            {topic?.title || tid}
                          </button>
                          {onRemoveTopicFromBundle && (
                            <button
                              onClick={() => onRemoveTopicFromBundle(bundle.id, tid)}
                              className="text-[7px] text-red-400/50 hover:text-red-400"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
