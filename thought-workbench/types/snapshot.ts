/**
 * Snapshot — 点-in-time キャプチャ。
 *
 * 既存の ScenarioBranch.snapshotFrameId はこの Snapshot.id を参照する。
 * EventLogEntry は変更ログ（差分）、Snapshot は状態の断面（全体）。
 * HistoryFrame（Topic内undo）は軽量で揮発的。Snapshot は永続。
 *
 * scope:
 *   "topic"     — 特定トピックのノード/エッジのみ
 *   "workspace" — AppState 全体
 *   "selection" — NodeSelectionSet 単位
 *
 * triggeredBy:
 *   "manual"    — ユーザーが明示的に保存
 *   "branch"    — ScenarioBranch 作成時に自動取得
 *   "integrity" — Integrity check 前の自動保存
 *   "import"    — import 前の保存
 */
export type SnapshotScope = "topic" | "workspace" | "selection";
export type SnapshotTrigger = "manual" | "branch" | "integrity" | "import";

export type Snapshot = {
  id: string;
  label: string;
  scope: SnapshotScope;
  triggeredBy: SnapshotTrigger;
  /** scope="topic" の場合の対象TopicID */
  topicId?: string;
  /** scope="selection" の場合の対象NodeSelectionSetID */
  selectionSetId?: string;
  /** 参照元ScenarioBranchID */
  branchId?: string;
  /** 起点となったEventLogEntryID */
  anchorEventId?: string;
  /** 状態のハッシュ（高速差分検出用、省略可） */
  stateHash?: string;
  note?: string;
  createdAt: string;
};
