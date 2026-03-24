// ── Theory-derived types ──

/** 二階のサイバネティクス: 観測者メタ情報 */
export type ObserverMeta = {
  /** 観測者の視点・立場 */
  viewpoint?: string;
  /** 観測時の役割 */
  role?: string;
  /** 再評価メモ（当時の解釈 vs 現在の解釈） */
  reEvaluation?: string;
};

/** アブダクション / ベイズ的更新: 仮説ライフサイクル段階 */
export const HYPOTHESIS_STAGES = ["seed", "hypothesis", "supported", "challenged", "established", "deprecated"] as const;
export type HypothesisStage = (typeof HYPOTHESIS_STAGES)[number];

/** SECIモデル: 知識創造フェーズ */
export const KNOWLEDGE_PHASES = ["experience", "articulation", "structuring", "practice"] as const;
export type KnowledgePhase = (typeof KNOWLEDGE_PHASES)[number];

/** 境界思考: 所属状態 */
export const MEMBERSHIP_STATUSES = ["core", "peripheral", "boundary", "outside", "transient"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** インテークレイヤー: 取り込み状態 */
export const INTAKE_STATUSES = ["inbox", "staging", "archive", "structured"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

/** ワークステータス: 処理状態 */
/**
 * 作業進行状態。
 * "published" は publicationState 層に移管済み。workStatus には含めない。
 * 旧データの "published" は state-model の WORK_ALIASES で "done" に正規化される。
 */
export const WORK_STATUSES = ["unprocessed", "active", "review", "onHold", "done", "frozen"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

/** エビデンス基盤: 根拠の種類 */
export const EVIDENCE_BASES = ["experience", "observation", "literature", "inference", "secondary", "unverified"] as const;
export type EvidenceBasis = (typeof EVIDENCE_BASES)[number];

/** バージョン状態 */
export const VERSION_STATES = ["working", "versioned", "archived", "snapshotted"] as const;
export type VersionState = (typeof VERSION_STATES)[number];

/** 資料状態: 資料の消化レベル */
export const MATERIAL_STATUSES = ["unread", "skimmed", "reading", "summarized", "cited"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const REVIEW_STATES = ["none", "queued", "inReview", "reviewed", "needsFollowUp"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const PUBLICATION_STATES = ["private", "internal", "publishReady", "published", "deprecated"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const URL_STATES = ["unverified", "verified", "broken", "duplicated", "archived"] as const;
export type UrlState = (typeof URL_STATES)[number];

/** ベイズ的更新: 確信度変更ログエントリ */
export type ConfidenceLogEntry = {
  date: string;
  value: number;
  reason: string;
};

// ── Task type ──

export type NodeTask = {
  status: "todo" | "doing" | "done" | "archived";
  deadline?: string;
  priority?: number;
};

// ── Node type ──

export type NodeItem = {
  id: string;
  label: string;
  type: string;
  tense: string;
  position: [number, number, number];
  note: string;
  size: number;
  frameScale?: number;
  group: string;
  layer: string;
  /** 重要度 / 中核度 / 掘り下げ度（0〜10, ユーザー定義可変） */
  depth?: number;
  /** 確信度（0.0〜1.0） */
  confidence?: number;
  /** ノード固有カラーオーバーライド（hex: "#rrggbb"） */
  color?: string;
  /** 自由タグ */
  tags?: string[];
  /** 統制語彙タームID群（シソーラス割り当て） */
  subjectTermIds?: string[];
  /** 複数球体間共有用ID（同じノードのコピーに同一値を振る） */
  sharedId?: string;
  /** 反対意見ノードのID群 */
  counterArgumentNodeIds?: string[];
  /** 関連URL群 */
  linkedUrls?: string[];
  /** タスク化プロパティ（nullish = タスクではない） */
  task?: NodeTask;
  /** 作成日時 ISO */
  createdAt?: string;
  /** 更新日時 ISO */
  updatedAt?: string;

  // ── Theory-derived properties ──

  /** 二階のサイバネティクス: 観測者情報 */
  observer?: ObserverMeta;
  /** アブダクション: 仮説ライフサイクル段階 */
  hypothesisStage?: HypothesisStage;
  /** ベイズ的更新: 確信度変更履歴 */
  confidenceLog?: ConfidenceLogEntry[];
  /** SECIモデル: 知識創造フェーズ */
  knowledgePhase?: KnowledgePhase;
  /** 境界思考: 所属状態 */
  membershipStatus?: MembershipStatus;

  // ── Intake / Workflow Layer ──

  /** インテークレイヤー: 取り込み状態 */
  intakeStatus?: IntakeStatus;
  /** ワークステータス: 処理状態（知識タイプとは独立） */
  workStatus?: WorkStatus;
  /** エビデンス基盤: 根拠の種類 */
  evidenceBasis?: EvidenceBasis;
  /** バージョン状態 */
  versionState?: VersionState;
  /** 資料状態: 資料の消化レベル */
  materialStatus?: MaterialStatus;
  /** レビュー状態 */
  reviewState?: ReviewState;
  /** 公開状態 */
  publicationState?: PublicationState;
  /** URL確認状態 */
  urlState?: UrlState;

  // ── Management Method Layer ──

  /** 管理法レイヤー拡張スロット: methodId → { key: value } */
  extensions?: Record<string, Record<string, unknown>>;
};


