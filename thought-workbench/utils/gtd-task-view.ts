import type { NodeItem, TopicItem } from "../types";
import { matchesWorkStatus } from "./state-model";

export type GtdTaskEntry = {
  topicId: string;
  topicTitle: string;
  nodeId: string;
  label: string;
  status: NonNullable<NodeItem["task"]>["status"];
  priority: number;
  deadline?: string;
  group: string;
  layer: string;
  workStatus?: NodeItem["workStatus"];
  staleDays: number;
};

export type GtdWeeklyReviewBucket = {
  id: "capture" | "next" | "waiting" | "review" | "wins";
  titleJa: string;
  titleEn: string;
  descriptionJa: string;
  descriptionEn: string;
  count: number;
  entries: GtdTaskEntry[];
};

export type GtdTaskSummary = {
  nextActions: GtdTaskEntry[];
  waitingItems: GtdTaskEntry[];
  reviewItems: GtdTaskEntry[];
  inboxItems: GtdTaskEntry[];
  staleTasks: GtdTaskEntry[];
  weeklyReview: GtdWeeklyReviewBucket[];
  gtdSignalsDetected: boolean;
};

function daysSince(iso?: string) {
  if (!iso) return 999;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 999;
  return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
}

function taskSort(left: GtdTaskEntry, right: GtdTaskEntry) {
  if (left.priority !== right.priority) return right.priority - left.priority;
  const ld = left.deadline || "9999-99-99";
  const rd = right.deadline || "9999-99-99";
  if (ld !== rd) return ld.localeCompare(rd);
  if (left.staleDays !== right.staleDays) return right.staleDays - left.staleDays;
  return left.label.localeCompare(right.label);
}

function collectTaskEntries(topics: TopicItem[]) {
  const entries: GtdTaskEntry[] = [];
  for (const topic of topics) {
    for (const node of topic.nodes) {
      if (!node.task) continue;
      entries.push({
        topicId: topic.id,
        topicTitle: topic.title,
        nodeId: node.id,
        label: node.label,
        status: node.task.status,
        priority: node.task.priority ?? 0,
        deadline: node.task.deadline,
        group: node.group,
        layer: node.layer,
        workStatus: node.workStatus,
        staleDays: daysSince(node.updatedAt || node.createdAt),
      });
    }
  }
  return entries;
}

function includesGtdSignals(topics: TopicItem[]) {
  return topics.some((topic) =>
    (topic.activeMethods || []).includes("task-gtd")
    || topic.nodes.some((node) =>
      node.layer === "gtd"
      || ["inbox", "next", "waiting", "someday", "review"].includes(node.group)
      || ["inbox", "next", "waiting", "review"].includes(node.layer)
    )
  );
}

export function buildGtdTaskSummary(topics: TopicItem[]): GtdTaskSummary {
  const entries = collectTaskEntries(topics);
  const actionable = entries.filter((entry) => entry.status !== "archived" && entry.status !== "done");
  const nextActions = actionable
    .filter((entry) =>
      entry.status === "doing"
      || entry.group === "next"
      || entry.layer === "next"
      || (entry.status === "todo" && entry.group !== "waiting" && entry.layer !== "waiting" && !matchesWorkStatus(entry.workStatus, "onHold"))
    )
    .sort(taskSort)
    .slice(0, 8);

  const waitingItems = actionable
    .filter((entry) => entry.group === "waiting" || entry.layer === "waiting" || matchesWorkStatus(entry.workStatus, "onHold"))
    .sort(taskSort);

  const reviewItems = entries
    .filter((entry) => entry.group === "review" || entry.layer === "review" || matchesWorkStatus(entry.workStatus, "review"))
    .sort(taskSort);

  const inboxItems = entries
    .filter((entry) => entry.group === "inbox" || entry.layer === "inbox" || matchesWorkStatus(entry.workStatus, "unprocessed"))
    .sort(taskSort);

  const staleTasks = actionable
    .filter((entry) => entry.staleDays >= 7)
    .sort(taskSort)
    .slice(0, 8);

  const wins = entries
    .filter((entry) => entry.status === "done")
    .sort(taskSort)
    .slice(0, 6);

  const weeklyReview: GtdWeeklyReviewBucket[] = [
    {
      id: "capture",
      titleJa: "Capture を空にする",
      titleEn: "Clear Capture",
      descriptionJa: "inbox / 未処理を next・waiting・reference に振り分ける。",
      descriptionEn: "Move inbox and unprocessed items into next, waiting, or reference.",
      count: inboxItems.length,
      entries: inboxItems.slice(0, 5),
    },
    {
      id: "next",
      titleJa: "Next Action を明確化",
      titleEn: "Clarify Next Actions",
      descriptionJa: "今週動かすタスクを絞り、優先順を確定する。",
      descriptionEn: "Limit active tasks for this week and lock the order.",
      count: nextActions.length,
      entries: nextActions.slice(0, 5),
    },
    {
      id: "waiting",
      titleJa: "Waiting の追跡",
      titleEn: "Review Waiting",
      descriptionJa: "外部待ち・保留中の follow-up を確認する。",
      descriptionEn: "Check follow-up timing for waiting and held items.",
      count: waitingItems.length,
      entries: waitingItems.slice(0, 5),
    },
    {
      id: "review",
      titleJa: "週次レビュー候補",
      titleEn: "Weekly Review Queue",
      descriptionJa: "review レイヤーと長期停滞タスクを見直す。",
      descriptionEn: "Review review-layer items and stale tasks.",
      count: reviewItems.length + staleTasks.length,
      entries: [...reviewItems, ...staleTasks].sort(taskSort).slice(0, 5),
    },
    {
      id: "wins",
      titleJa: "完了を閉じる",
      titleEn: "Close Wins",
      descriptionJa: "done を振り返り、成果や学びを別ノートへ残す。",
      descriptionEn: "Reflect on done items and capture outcomes in notes.",
      count: wins.length,
      entries: wins,
    },
  ];

  return {
    nextActions,
    waitingItems,
    reviewItems,
    inboxItems,
    staleTasks,
    weeklyReview,
    gtdSignalsDetected: includesGtdSignals(topics),
  };
}
