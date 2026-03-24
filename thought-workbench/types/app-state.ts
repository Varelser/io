import type { TopicItem, TopicLinkItem } from "./topic";
import type { JournalEntry } from "./journal";
import type { ManagementMethod } from "./management-method";
import type { EventLogEntry } from "./event-log";
import type { BundleItem } from "./bundle";
import type { Material } from "./material";
import type { URLRecord } from "./url-record";
import type { Snapshot } from "./snapshot";

export type WorkspaceViewport = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScenarioBranch = {
  id: string;
  label: string;
  topicId?: string;
  materializedTopicId?: string;
  nodeIdMap?: { sourceId: string; sandboxId: string }[];
  anchorEventId?: string;
  anchorTs: string;
  anchorLabel?: string;
  status: "draft" | "active" | "archived";
  note?: string;
  hypothesis?: string;
  nextAction?: string;
  syncPolicy?: "manual" | "prefer-source" | "prefer-sandbox";
  /** AppState.snapshots 内の Snapshot.id への参照 */
  snapshotFrameId?: string;
  snapshotLabel?: string;
  lastSourceSyncAt?: string;
  lastBackportAt?: string;
  createdAt: string;
};

export type NodeSelectionSet = {
  id: string;
  label: string;
  topicId: string;
  nodeIds: string[];
  color?: string;
  createdAt: string;
};

export type CanvasBookmark = {
  id: string;
  label: string;
  topicId: string;
  nodeId?: string;
  viewType: string;
  workspaceViewport?: WorkspaceViewport;
  createdAt: string;
};

export type LayoutPresetPurpose = "edit" | "overview" | "analyze" | "organize";

export type LayoutPreset = {
  id: string;
  label: string;
  splitMode: string;
  panes: { view: string; syncMode?: "global" | "isolated" }[];
  workspaceSnapshot?: {
    viewport: WorkspaceViewport;
    topics: { topicId: string; x: number; y: number; size: number }[];
  };
  workspaceArrangement?: {
    mode: string;
    groupBy?: string;
    topicCount?: number;
  };
  purpose?: LayoutPresetPurpose;
  pinned?: boolean;
  lastUsedAt?: string;
};

export type VocabTerm = {
  id: string;
  /** 優先ラベル（標目） */
  label: string;
  /** 異形語・同義語 */
  altLabels?: string[];
  /** 上位語ID */
  broader?: string[];
  /** 関連語ID */
  related?: string[];
  /** 使用範囲注記 */
  scopeNote?: string;
  /** 分類番号（NDC等） */
  classNumber?: string;
};

export type SmartFolder = {
  id: string;
  label: string;
  builtin?: boolean;
  filter: {
    intakeStatus?: string;
    workStatus?: string;
    versionState?: string;
    reviewState?: string;
    publicationState?: string;
    urlState?: string;
    type?: string;
    hasEdges?: boolean;
    hasExtensions?: boolean;
    staleDays?: number;
    lowConfidence?: number;
    evidenceBasis?: string;
    textMatch?: string;
    /** 統制語彙タームID（下位語も含む階層マッチ） */
    subjectTermId?: string;
    /** trueの場合、subjectTermIdの上位語（broader）も含めてマッチ */
    usesBroaderMatch?: boolean;
    /** タグ一致（部分一致） */
    tags?: string;
    /** 仮説ステージ */
    hypothesisStage?: string;
    /** 知識フェーズ */
    knowledgePhase?: string;
    /** メンバーシップ状態 */
    membershipStatus?: string;
    /** 作成日 以降 ISO date string e.g. "2024-01-01" */
    createdAfter?: string;
    /** 作成日 以前 */
    createdBefore?: string;
    /** 更新日 以降 */
    updatedAfter?: string;
    /** 更新日 以前 */
    updatedBefore?: string;
    /** トピック分野フィルタ（部分一致） */
    topicDomain?: string;
  };
};

export type ConversionItem = {
  id: string;
  sourceTopicId: string;
  sourceNodeId: string;
  sourceLabel: string;
  targetType: string; // "task" | "hypothesis" | "definition" | "work-idea" | "material" | "split" | "merge"
  status: "pending" | "review" | "ready" | "hold" | "done" | "cancelled";
  note?: string;
  createdAt: string;
};

/** 自動変換トリガールール — ノードが条件に合致したときにキューへ自動追加 */
export type ConversionRule = {
  id: string;
  label: string;
  /** 条件: 全て AND 結合。未指定フィールドはワイルドカード */
  conditions: {
    intakeStatus?: string;
    workStatus?: string;
    nodeType?: string;
    hypothesisStage?: string;
    knowledgePhase?: string;
  };
  /** 合致したノードのキュー追加先タイプ */
  targetType: string;
  /** ルール有効/無効 */
  enabled: boolean;
  createdAt: string;
};

export type AppState = {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  journals: JournalEntry[];
  managementMethods?: ManagementMethod[];
  /** ユーザー定義管理法（BUILTIN_METHODS に追加されるカスタムメソッド） */
  userMethods?: ManagementMethod[];
  /** 自動イベントログ（最新が先頭） */
  eventLog?: EventLogEntry[];
  bookmarks?: CanvasBookmark[];
  layoutPresets?: LayoutPreset[];
  smartFolders?: SmartFolder[];
  conversionQueue?: ConversionItem[];
  /** 自動変換トリガールール */
  conversionRules?: ConversionRule[];
  /** Bundle: 横断的作業束 */
  bundles?: BundleItem[];
  scenarioBranches?: ScenarioBranch[];
  nodeSelectionSets?: NodeSelectionSet[];
  /** 統制語彙（シソーラス） */
  vocabulary?: VocabTerm[];
  /**
   * 独立した資料オブジェクト群。
   * NodeItem.materialStatus との二重管理を避けるため、
   * Material は "資料そのもの" を管理し、NodeItem 側は消化状態を持つ。
   */
  materials?: Material[];
  /**
   * 独立したURLオブジェクト群。
   * NodeItem.linkedUrls / urlState は後方互換のまま。
   * URLRecord は検証・重複検出・追跡のためのファーストクラス表現。
   */
  urlRecords?: URLRecord[];
  /**
   * 点-in-time スナップショット。
   * ScenarioBranch.snapshotFrameId はこの Snapshot.id を参照する。
   * EventLog（差分ログ）とは独立した状態断面として保持する。
   */
  snapshots?: Snapshot[];
  /** 現在アクティブな Bundle の ID。Workspace Memory として保持。 */
  currentBundleId?: string;
  /** 現在アクティブなビューコンテキスト。Workspace Memory として保持。 */
  currentViewContext?: { viewType: "smartFolder" | "layoutPreset" | "bookmark"; id: string };
};

export type PersistEnvelope = {
  version: number;
  savedAt: string;
  state: AppState;
};

export type ImportResult = {
  ok: boolean;
  topic?: TopicItem;
  source: string;
  message: string;
};
