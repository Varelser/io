import type { ManagementMethod } from "../types";

export const BUILTIN_METHODS: ManagementMethod[] = [
  // ── Standard ──
  {
    id: "standard-core",
    name: { ja: "標準コア", en: "Standard Core" },
    description: { ja: "基本的なラベル・タグ・ノート・階層管理", en: "Basic label, tag, note, and hierarchy management" },
    category: "standard",
    properties: [
      { key: "label", label: { ja: "ラベル", en: "Label" }, type: "string", required: true },
      { key: "tags", label: { ja: "タグ", en: "Tags" }, type: "tags" },
      { key: "note", label: { ja: "ノート", en: "Note" }, type: "string" },
      { key: "folder", label: { ja: "フォルダ", en: "Folder" }, type: "string" },
    ],
    preferredRelations: ["参照", "因果", "類似"],
    builtin: true,
  },

  // ── Research / Theory ──
  {
    id: "cybernetics-observer",
    name: { ja: "観測者管理", en: "Observer Management" },
    description: { ja: "二階のサイバネティクス: 視点・役割・再評価の管理", en: "Second-order Cybernetics: viewpoint, role, and re-evaluation" },
    category: "research",
    properties: [
      { key: "observer.viewpoint", label: { ja: "視点", en: "Viewpoint" }, type: "string", placeholder: "観測者の立場" },
      { key: "observer.role", label: { ja: "役割", en: "Role" }, type: "string", placeholder: "観測時の役割" },
      { key: "observer.reEvaluation", label: { ja: "再評価", en: "Re-evaluation" }, type: "textarea", placeholder: "当時 vs 現在" },
    ],
    displayRules: { colorBy: "observer.role" },
    builtin: true,
  },
  {
    id: "abduction-hypothesis",
    name: { ja: "仮説管理", en: "Hypothesis Management" },
    description: { ja: "アブダクション + ベイズ的更新: 仮説ステージと確信度履歴", en: "Abduction + Bayesian: hypothesis lifecycle and confidence tracking" },
    category: "research",
    properties: [
      { key: "hypothesisStage", label: { ja: "仮説段階", en: "Hypothesis Stage" }, type: "select", options: ["seed", "hypothesis", "supported", "challenged", "established", "deprecated"] },
      { key: "confidence", label: { ja: "確信度", en: "Confidence" }, type: "range", min: 0, max: 1, step: 0.05 },
      { key: "evidenceLevel", label: { ja: "証拠レベル", en: "Evidence Level" }, type: "select", options: ["anecdotal", "observational", "experimental", "systematic", "meta-analysis"] },
    ],
    displayRules: { colorBy: "hypothesisStage", defaultSortKey: "confidence" },
    builtin: true,
  },
  {
    id: "seci-knowledge",
    name: { ja: "知識創造 (SECI)", en: "Knowledge Creation (SECI)" },
    description: { ja: "SECIモデル: 体験→言語化→構造化→実践の循環管理", en: "SECI model: experience → articulation → structuring → practice cycle" },
    category: "pkm",
    properties: [
      { key: "knowledgePhase", label: { ja: "知識フェーズ", en: "Knowledge Phase" }, type: "select", options: ["experience", "articulation", "structuring", "practice"] },
    ],
    displayRules: { colorBy: "knowledgePhase" },
    builtin: true,
  },
  {
    id: "boundary-membership",
    name: { ja: "境界・所属管理", en: "Boundary & Membership" },
    description: { ja: "境界思考: 中核/周辺/境界/外側/一時的の所属管理", en: "Boundary thinking: core/peripheral/boundary/outside/transient membership" },
    category: "research",
    properties: [
      { key: "membershipStatus", label: { ja: "所属状態", en: "Membership" }, type: "select", options: ["core", "peripheral", "boundary", "outside", "transient"] },
    ],
    displayRules: { colorBy: "membershipStatus" },
    builtin: true,
  },

  // ── Decision ──
  {
    id: "decision-layer",
    name: { ja: "意思決定管理", en: "Decision Management" },
    description: { ja: "決定・保留・却下の管理と理由・代替案の記録", en: "Decision tracking with reasons, alternatives, and reversibility" },
    category: "research",
    properties: [
      { key: "decisionStatus", label: { ja: "決定状態", en: "Decision Status" }, type: "select", options: ["pending", "decided", "adopted", "rejected", "deferred"] },
      { key: "decisionReason", label: { ja: "決定理由", en: "Reason" }, type: "textarea", placeholder: "なぜこの決定に至ったか" },
      { key: "alternatives", label: { ja: "代替案", en: "Alternatives" }, type: "textarea", placeholder: "他に検討した選択肢" },
      { key: "reviewCondition", label: { ja: "再検討条件", en: "Review Condition" }, type: "string", placeholder: "どうなったら再検討するか" },
      { key: "reversibility", label: { ja: "可逆性", en: "Reversibility" }, type: "select", options: ["reversible", "partially", "irreversible"] },
      { key: "impactScope", label: { ja: "影響範囲", en: "Impact Scope" }, type: "string" },
    ],
    displayRules: { colorBy: "decisionStatus" },
    builtin: true,
  },

  // ── Narrative ──
  {
    id: "narrative-layer",
    name: { ja: "物語・叙述管理", en: "Narrative Management" },
    description: { ja: "物語構造の中での役割・立場・時系列の管理", en: "Narrative structure: roles, turning points, and story arcs" },
    category: "research",
    properties: [
      { key: "narrativeRole", label: { ja: "物語的役割", en: "Narrative Role" }, type: "select", options: ["origin", "background", "turning_point", "conflict", "choice", "result", "aftermath", "branch"] },
      { key: "narrator", label: { ja: "語り手", en: "Narrator" }, type: "string" },
      { key: "viewpointDiff", label: { ja: "視点差", en: "Viewpoint Difference" }, type: "textarea", placeholder: "他の視点からはどう見えるか" },
    ],
    displayRules: { colorBy: "narrativeRole", recommendedViews: ["mindmap", "depth"] },
    builtin: true,
  },

  // ── Argument Structure ──
  {
    id: "argument-structure",
    name: { ja: "論証構造管理", en: "Argument Structure" },
    description: { ja: "トゥールミンモデル的: 前提・定義・例外・条件・文脈の管理", en: "Toulmin-style: premise, definition, exception, condition, context" },
    category: "research",
    properties: [
      { key: "premise", label: { ja: "前提", en: "Premise" }, type: "textarea", placeholder: "この主張が成り立つ前提" },
      { key: "definition", label: { ja: "定義", en: "Definition" }, type: "textarea", placeholder: "使用している定義" },
      { key: "exception", label: { ja: "例外", en: "Exception" }, type: "textarea", placeholder: "この主張が成り立たないケース" },
      { key: "condition", label: { ja: "条件", en: "Condition" }, type: "string", placeholder: "成立条件" },
      { key: "context", label: { ja: "文脈", en: "Context" }, type: "string", placeholder: "この意見が有効な文脈" },
    ],
    preferredRelations: ["根拠", "反対意見", "前提"],
    builtin: true,
  },

  // ── Provenance / Review ──
  {
    id: "provenance",
    name: { ja: "出典・由来・レビュー", en: "Provenance & Review" },
    description: { ja: "原資料・改変履歴・再検証日の管理", en: "Source tracking, version history, and review scheduling" },
    category: "library",
    properties: [
      { key: "origin", label: { ja: "原資料", en: "Origin" }, type: "string", placeholder: "元になった資料や体験" },
      { key: "version", label: { ja: "版", en: "Version" }, type: "string" },
      { key: "reviewDate", label: { ja: "再検証日", en: "Review Date" }, type: "date" },
      { key: "sourceTrust", label: { ja: "出典信頼性", en: "Source Trust" }, type: "select", options: ["high", "medium", "low", "unknown"] },
      { key: "derivationNote", label: { ja: "改変メモ", en: "Derivation Note" }, type: "textarea", placeholder: "原資料からどう変わったか" },
    ],
    displayRules: { defaultSortKey: "reviewDate" },
    builtin: true,
  },

  // ── Somatic / State Tracking ──
  {
    id: "somatic-tracking",
    name: { ja: "身体・状態観測", en: "Somatic & State Tracking" },
    description: { ja: "感情・身体・集中度・安定度の状態観測", en: "Emotional, physical, concentration, and stability tracking" },
    category: "assessment",
    properties: [
      { key: "emotionalState", label: { ja: "感情状態", en: "Emotional State" }, type: "string", placeholder: "今の感情" },
      { key: "bodyState", label: { ja: "身体状態", en: "Body State" }, type: "string", placeholder: "身体の状態" },
      { key: "concentration", label: { ja: "集中度", en: "Concentration" }, type: "range", min: 0, max: 10, step: 1 },
      { key: "anxiety", label: { ja: "不安度", en: "Anxiety" }, type: "range", min: 0, max: 10, step: 1 },
      { key: "stability", label: { ja: "安定度", en: "Stability" }, type: "range", min: 0, max: 10, step: 1 },
    ],
    builtin: true,
  },

  // ── Task ──
  {
    id: "task-gtd",
    name: { ja: "タスク管理 (GTD)", en: "Task Management (GTD)" },
    description: { ja: "GTDベースのタスクステータス・期限・優先度管理", en: "GTD-based task status, deadline, and priority management" },
    category: "task",
    properties: [
      { key: "task.status", label: { ja: "ステータス", en: "Status" }, type: "select", options: ["todo", "doing", "done", "archived"] },
      { key: "task.deadline", label: { ja: "期限", en: "Deadline" }, type: "date" },
      { key: "task.priority", label: { ja: "優先度", en: "Priority" }, type: "range", min: 0, max: 10, step: 1 },
    ],
    displayRules: { defaultSortKey: "task.priority", recommendedViews: ["task"] },
    builtin: true,
  },

  // ── Library ──
  {
    id: "library-classification",
    name: { ja: "図書館分類", en: "Library Classification" },
    description: { ja: "分類コード・件名標目・書誌情報による整理", en: "Classification code, subject headings, and bibliographic management" },
    category: "library",
    properties: [
      { key: "classificationCode", label: { ja: "分類コード", en: "Classification Code" }, type: "string" },
      { key: "subjectHeading", label: { ja: "件名", en: "Subject Heading" }, type: "string" },
      { key: "author", label: { ja: "著者", en: "Author" }, type: "string" },
      { key: "sourceYear", label: { ja: "年", en: "Year" }, type: "string" },
      { key: "mediaType", label: { ja: "媒体", en: "Media Type" }, type: "select", options: ["text", "audio", "video", "image", "web", "mixed"] },
    ],
    displayRules: { defaultSortKey: "classificationCode", recommendedViews: ["table", "folder"] },
    searchRules: { searchableFields: ["classificationCode", "subjectHeading", "author"] },
    builtin: true,
  },

  // ── Assessment ──
  {
    id: "person-assessment",
    name: { ja: "人物・ケース理解", en: "Person & Case Assessment" },
    description: { ja: "背景・役割・強み・課題・支援資源の包括的理解", en: "Background, role, strengths, challenges, and support resources" },
    category: "assessment",
    properties: [
      { key: "background", label: { ja: "背景", en: "Background" }, type: "textarea" },
      { key: "socialRole", label: { ja: "社会的役割", en: "Social Role" }, type: "string" },
      { key: "strengths", label: { ja: "強み", en: "Strengths" }, type: "textarea" },
      { key: "challenges", label: { ja: "課題", en: "Challenges" }, type: "textarea" },
      { key: "supportResources", label: { ja: "支援資源", en: "Support Resources" }, type: "textarea" },
      { key: "riskLevel", label: { ja: "リスク", en: "Risk Level" }, type: "select", options: ["low", "moderate", "high", "critical"] },
    ],
    displayRules: { colorBy: "riskLevel" },
    builtin: true,
  },
];
