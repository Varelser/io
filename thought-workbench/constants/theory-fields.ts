import type { HypothesisStage, KnowledgePhase, MembershipStatus, ContradictionType, TransformOp } from "../types";

type LabelMap<T extends string> = Record<T, { ja: string; en: string }>;

export const HYPOTHESIS_STAGE_LABELS: LabelMap<HypothesisStage> = {
  seed: { ja: "種子", en: "Seed" },
  hypothesis: { ja: "仮説", en: "Hypothesis" },
  supported: { ja: "支持済", en: "Supported" },
  challenged: { ja: "反証あり", en: "Challenged" },
  established: { ja: "確立", en: "Established" },
  deprecated: { ja: "非推奨", en: "Deprecated" },
};

export const KNOWLEDGE_PHASE_LABELS: LabelMap<KnowledgePhase> = {
  experience: { ja: "体験", en: "Experience" },
  articulation: { ja: "言語化", en: "Articulation" },
  structuring: { ja: "構造化", en: "Structuring" },
  practice: { ja: "実践", en: "Practice" },
};

export const MEMBERSHIP_STATUS_LABELS: LabelMap<MembershipStatus> = {
  core: { ja: "中核", en: "Core" },
  peripheral: { ja: "周辺", en: "Peripheral" },
  boundary: { ja: "境界", en: "Boundary" },
  outside: { ja: "外側", en: "Outside" },
  transient: { ja: "一時的", en: "Transient" },
};

export const CONTRADICTION_TYPE_LABELS: LabelMap<ContradictionType> = {
  direct: { ja: "真正面の対立", en: "Direct" },
  conditional: { ja: "条件付き対立", en: "Conditional" },
  contextual: { ja: "文脈差", en: "Contextual" },
  temporal: { ja: "時間差", en: "Temporal" },
  definitional: { ja: "定義ズレ", en: "Definitional" },
  unresolved: { ja: "未統合", en: "Unresolved" },
};

export const TRANSFORM_OP_LABELS: LabelMap<TransformOp> = {
  integrate: { ja: "統合", en: "Integrate" },
  split: { ja: "分割", en: "Split" },
  abstract: { ja: "抽象化", en: "Abstract" },
  concretize: { ja: "具体化", en: "Concretize" },
  invert: { ja: "反転", en: "Invert" },
  oppose: { ja: "対立化", en: "Oppose" },
  metaphorize: { ja: "比喩化", en: "Metaphorize" },
  taskify: { ja: "タスク化", en: "Taskify" },
  create: { ja: "作品化", en: "Create" },
  question: { ja: "質問化", en: "Question" },
};
