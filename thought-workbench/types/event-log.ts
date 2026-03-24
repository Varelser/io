/** イベント種別 */
export const EVENT_KINDS = [
  "node:create",
  "node:update",
  "node:delete",
  "edge:create",
  "edge:update",
  "edge:delete",
  "topic:create",
  "topic:update",
  "topic:delete",
  "journal:add",
  "method:toggle",
  "snapshot:create",
  "extensions:update",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** 単一イベント */
export type EventLogEntry = {
  id: string;
  /** イベント発生日時 ISO */
  ts: string;
  kind: EventKind;
  /** 対象のトピックID */
  topicId?: string;
  /** 対象のノード/エッジ/ジャーナルID */
  targetId?: string;
  /** 対象のラベル（表示用） */
  targetLabel?: string;
  /** 変更内容の概要 (フィールド名 → 値) */
  detail?: Record<string, unknown>;
};
