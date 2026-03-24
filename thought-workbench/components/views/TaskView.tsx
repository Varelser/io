import React, { useMemo } from "react";
import type { TopicItem, NodeItem } from "../../types";
import { collectMustOneZettelkastenFocus } from "../../utils/must-one-zettelkasten";
import { buildGtdTaskSummary } from "../../utils/gtd-task-view";

type TaskNode = { node: NodeItem; topic: TopicItem };

const STATUS_ORDER = { todo: 0, doing: 1, done: 2, archived: 3 };
const STATUS_COLORS: Record<string, string> = {
  todo: "border-yellow-500/30 bg-yellow-500/5",
  doing: "border-blue-400/30 bg-blue-400/5",
  done: "border-green-500/30 bg-green-500/5",
  archived: "border-white/10 bg-white/[0.02]",
};

export function TaskView({
  topics,
  onSelectTopic,
  lang = "ja",
}: {
  topics: TopicItem[];
  onSelectTopic: (topicId: string, nodeId: string | null) => void;
  lang?: "ja" | "en";
}) {
  const mustOneFocus = useMemo(() => collectMustOneZettelkastenFocus(topics), [topics]);
  const gtdSummary = useMemo(() => buildGtdTaskSummary(topics), [topics]);

  // Collect all task nodes across all topics
  const taskNodes: TaskNode[] = [];
  topics.forEach((topic) => {
    topic.nodes.forEach((node) => {
      if (node.task) taskNodes.push({ node, topic });
    });
  });

  // Sort: doing first, then todo, then done, then archived. Within same status, by priority desc then deadline asc
  taskNodes.sort((a, b) => {
    const sa = STATUS_ORDER[a.node.task!.status] ?? 9;
    const sb = STATUS_ORDER[b.node.task!.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const pa = a.node.task!.priority ?? 0;
    const pb = b.node.task!.priority ?? 0;
    if (pa !== pb) return pb - pa;
    const da = a.node.task!.deadline || "9999";
    const db = b.node.task!.deadline || "9999";
    return da.localeCompare(db);
  });

  // Group by status
  const grouped = new Map<string, TaskNode[]>();
  taskNodes.forEach((tn) => {
    const status = tn.node.task!.status;
    if (!grouped.has(status)) grouped.set(status, []);
    grouped.get(status)!.push(tn);
  });

  const statusLabels = {
    todo: lang === "ja" ? "未着手" : "To Do",
    doing: lang === "ja" ? "進行中" : "Doing",
    done: lang === "ja" ? "完了" : "Done",
    archived: lang === "ja" ? "保管" : "Archived",
  };

  const renderTaskChip = (item: {
    topicId: string;
    topicTitle: string;
    nodeId: string;
    label: string;
    priority: number;
    deadline?: string;
    staleDays: number;
  }) => (
    <button
      key={`${item.topicId}-${item.nodeId}`}
      onClick={() => onSelectTopic(item.topicId, item.nodeId)}
      className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[9px] text-white/84">{item.label}</span>
        <span className="shrink-0 text-[7px] text-white/36">
          {item.priority > 0 ? `P${item.priority}` : (lang === "ja" ? "通常" : "Normal")}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[7px] text-white/32">
        <span className="truncate">{item.topicTitle}</span>
        <span>
          {item.deadline
            ? (lang === "ja" ? `期限 ${item.deadline}` : `Due ${item.deadline}`)
            : (lang === "ja" ? `${item.staleDays}日停滞` : `${item.staleDays}d stale`)}
        </span>
      </div>
    </button>
  );

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-3">{lang === "ja" ? "タスクビュー" : "Task View"}</div>
      {(gtdSummary.gtdSignalsDetected || gtdSummary.nextActions.length > 0) && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              {lang === "ja" ? "GTD Focus" : "GTD Focus"}
            </div>
            <div className="mt-0.5 text-[8px] text-white/28">
              {lang === "ja"
                ? "next action 抽出と週次レビュー候補を 1 画面で確認"
                : "Review next actions and weekly review buckets in one place"}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-white/8 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-wider text-emerald-300">
                  {lang === "ja" ? "Next Actions" : "Next Actions"}
                </div>
                <div className="text-[8px] text-white/28">{gtdSummary.nextActions.length}</div>
              </div>
              <div className="mt-2 space-y-1.5">
                {gtdSummary.nextActions.length === 0 ? (
                  <div className="text-[8px] text-white/24">{lang === "ja" ? "今週動かす task は未抽出" : "No actionable tasks extracted yet"}</div>
                ) : (
                  gtdSummary.nextActions.map(renderTaskChip)
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-md border border-white/8 bg-white/[0.02] p-2">
                  <div className="text-[8px] uppercase tracking-wider text-amber-300">{lang === "ja" ? "Waiting" : "Waiting"}</div>
                  <div className="mt-1 text-[12px] text-white/84">{gtdSummary.waitingItems.length}</div>
                  <div className="mt-0.5 text-[7px] text-white/28">{lang === "ja" ? "保留 / 外部待ち" : "Held / external"}</div>
                </div>
                <div className="rounded-md border border-white/8 bg-white/[0.02] p-2">
                  <div className="text-[8px] uppercase tracking-wider text-sky-300">{lang === "ja" ? "Review" : "Review"}</div>
                  <div className="mt-1 text-[12px] text-white/84">{gtdSummary.reviewItems.length}</div>
                  <div className="mt-0.5 text-[7px] text-white/28">{lang === "ja" ? "週次確認キュー" : "Weekly check queue"}</div>
                </div>
                <div className="rounded-md border border-white/8 bg-white/[0.02] p-2">
                  <div className="text-[8px] uppercase tracking-wider text-rose-300">{lang === "ja" ? "Stale" : "Stale"}</div>
                  <div className="mt-1 text-[12px] text-white/84">{gtdSummary.staleTasks.length}</div>
                  <div className="mt-0.5 text-[7px] text-white/28">{lang === "ja" ? "7日以上停滞" : "7+ days stale"}</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] uppercase tracking-wider text-violet-300">
                  {lang === "ja" ? "Weekly Review" : "Weekly Review"}
                </div>
                <div className="text-[8px] text-white/28">{gtdSummary.weeklyReview.reduce((sum, bucket) => sum + bucket.count, 0)}</div>
              </div>
              <div className="mt-2 space-y-2">
                {gtdSummary.weeklyReview.map((bucket) => (
                  <div key={bucket.id} className="rounded-md border border-white/8 bg-white/[0.02] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[8px] uppercase tracking-wider text-white/64">
                        {lang === "ja" ? bucket.titleJa : bucket.titleEn}
                      </div>
                      <div className="text-[8px] text-white/26">{bucket.count}</div>
                    </div>
                    <div className="mt-1 text-[7px] text-white/30">
                      {lang === "ja" ? bucket.descriptionJa : bucket.descriptionEn}
                    </div>
                    {bucket.entries.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {bucket.entries.map(renderTaskChip)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {mustOneFocus.length > 0 && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/35">
                {lang === "ja" ? "Must One x Zettelkasten" : "Must One x Zettelkasten"}
              </div>
              <div className="mt-0.5 text-[8px] text-white/28">
                {lang === "ja"
                  ? "中心ノードを起点に、関連 note / backlink / orphan / 支援タスクを束で確認"
                  : "Review notes, backlinks, orphans, and support tasks around the current must-one node"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {mustOneFocus.map((focus) => {
              const grouped = {
                forward: focus.connections.filter((item) => item.kind === "forward-link"),
                back: focus.connections.filter((item) => item.kind === "backlink"),
                edge: focus.connections.filter((item) => item.kind === "edge-link"),
                orphan: focus.connections.filter((item) => item.kind === "orphan-candidate"),
                task: focus.connections.filter((item) => item.kind === "task-support"),
              };
              return (
                <div key={focus.topicId} className="rounded-lg border border-white/8 bg-black/20 p-3">
                  <button
                    onClick={() => onSelectTopic(focus.topicId, focus.mustOneNode.id)}
                    className="text-left"
                  >
                    <div className="text-[10px] text-white/82">{focus.topicTitle}</div>
                    <div className="mt-1 text-[14px] text-white/92">{focus.mustOneNode.label}</div>
                    <div className="mt-1 text-[8px] text-white/35">
                      {focus.zettelkastenCompatible
                        ? (lang === "ja" ? "Zettelkasten 運用シグナルあり" : "Zettelkasten signals detected")
                        : (lang === "ja" ? "Zettelkasten 専用構成ではないが連携対象" : "Not a strict zettelkasten layout, but still linked")}
                    </div>
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { key: "forward", label: lang === "ja" ? "Forward" : "Forward", items: grouped.forward, color: "text-emerald-300" },
                      { key: "back", label: lang === "ja" ? "Backlink" : "Backlink", items: grouped.back, color: "text-sky-300" },
                      { key: "edge", label: lang === "ja" ? "Edge" : "Edge", items: grouped.edge, color: "text-violet-300" },
                      { key: "orphan", label: lang === "ja" ? "Orphan候補" : "Orphan", items: grouped.orphan, color: "text-amber-300" },
                      { key: "task", label: lang === "ja" ? "支援Task" : "Support Tasks", items: grouped.task, color: "text-rose-300" },
                    ].map((section) => (
                      <div key={section.key} className="rounded-md border border-white/8 bg-white/[0.02] p-2">
                        <div className={`mb-1 text-[8px] uppercase tracking-wider ${section.color}`}>{section.label}</div>
                        {section.items.length === 0 ? (
                          <div className="text-[7px] text-white/22">{lang === "ja" ? "なし" : "none"}</div>
                        ) : (
                          <div className="space-y-1">
                            {section.items.slice(0, 4).map((item) => (
                              <button
                                key={`${section.key}-${item.nodeId}`}
                                onClick={() => onSelectTopic(focus.topicId, item.nodeId)}
                                className="block w-full truncate text-left text-[8px] text-white/58 hover:text-white/86"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {taskNodes.length === 0 ? (
        <div className="text-center mt-12">
          <div className="text-[14px] text-white/20">{lang === "ja" ? "まだタスクはありません" : "No tasks yet"}</div>
          <div className="mt-2 text-[9px] text-white/30">
            {lang === "ja"
              ? "インスペクタでノードを選び、「Make Task」を押すとタスクを作成できます"
              : "Select a node in the Inspector and click \"Make Task\" to create one"}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["todo", "doing", "done", "archived"] as const).map((status) => {
            const items = grouped.get(status) || [];
            return (
              <div key={status}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="text-[9px] uppercase tracking-wider text-white/40">{statusLabels[status]}</div>
                  <span className="text-[8px] text-white/20">{items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map(({ node, topic }) => (
                    <button
                      key={node.id}
                      onClick={() => onSelectTopic(topic.id, node.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-110 ${STATUS_COLORS[status] || "border-white/10 bg-white/[0.02]"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-white/85 truncate">{node.label}</span>
                        {node.task!.priority != null && node.task!.priority > 0 && (
                          <span className="shrink-0 text-[7px] text-white/40">P{node.task!.priority}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[8px] text-white/30 truncate">{topic.title}</div>
                      {node.task!.deadline && (
                        <div className="mt-0.5 text-[7px] text-white/35">⏱ {node.task!.deadline}</div>
                      )}
                      {node.tags && node.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {node.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="rounded-full border border-white/8 px-1 py-0 text-[6px] text-white/25">{tag}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
