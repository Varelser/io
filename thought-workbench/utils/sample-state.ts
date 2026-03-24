import type { AppState, TopicItem, NodeItem, EdgeItem, HistoryFrame } from "../types";
import type { ViewType } from "../constants/views";
import { normalizeSourceFilename } from "./slug";
import { newId } from "./id";

export type SampleWorkspacePreset = {
  id: "story-branch" | "research-review" | "task-flow" | "method-studio";
  label: { ja: string; en: string };
  description: { ja: string; en: string };
  suggestedView: "workspace" | "review" | "task";
  quickViews: ViewType[];
  quickStart: {
    ja: { firstView: ViewType; firstAction: string };
    en: { firstView: ViewType; firstAction: string };
  };
  focus: { ja: string[]; en: string[] };
  summary: {
    ja: { topics: number; notes: string };
    en: { topics: number; notes: string };
  };
};

export type SampleWorkspaceStats = {
  topics: number;
  nodes: number;
  edges: number;
  branches: number;
  bundles: number;
  bookmarks: number;
  journals: number;
  layouts: number;
};

type SampleAppendOptions = {
  titleSuffix?: string;
  workspaceOffset?: { x: number; y: number };
};

export const SAMPLE_WORKSPACE_PRESETS: SampleWorkspacePreset[] = [
  {
    id: "story-branch",
    label: { ja: "作品分岐サンプル", en: "Story Branch Sample" },
    description: { ja: "未来分岐、sandbox、diff/backport を触るための見本。", en: "A sample focused on future branches, sandbox, and backport." },
    suggestedView: "workspace",
    quickViews: ["workspace", "diff", "timeline", "review"],
    quickStart: {
      ja: { firstView: "workspace", firstAction: "分岐 panel を開いて sandbox と差分一覧を見る" },
      en: { firstView: "workspace", firstAction: "Open the branch panel and inspect sandbox plus diff list" },
    },
    focus: { ja: ["Branch", "Sandbox", "Diff"], en: ["Branch", "Sandbox", "Diff"] },
    summary: {
      ja: { topics: 3, notes: "branch / sandbox / review 導線あり" },
      en: { topics: 3, notes: "Includes branch, sandbox, and review flows" },
    },
  },
  {
    id: "research-review",
    label: { ja: "研究レビューサンプル", en: "Research Review Sample" },
    description: { ja: "仮説、資料、Review / Maintenance を確認するための見本。", en: "A sample for hypothesis, sources, and review flows." },
    suggestedView: "review",
    quickViews: ["review", "maintenance", "table", "workspace"],
    quickStart: {
      ja: { firstView: "review", firstAction: "Review view で gap と hypothesis を見てから Maintenance を開く" },
      en: { firstView: "review", firstAction: "Start in review, inspect gaps and hypotheses, then open maintenance" },
    },
    focus: { ja: ["Review", "Hypothesis", "Maintenance"], en: ["Review", "Hypothesis", "Maintenance"] },
    summary: {
      ja: { topics: 2, notes: "Review / Maintenance / Smart Folder 向け" },
      en: { topics: 2, notes: "Built for review, maintenance, and smart folders" },
    },
  },
  {
    id: "task-flow",
    label: { ja: "実行管理サンプル", en: "Task Flow Sample" },
    description: { ja: "GTD / queue / bundle / task view を見るための見本。", en: "A sample centered on GTD, queue, bundle, and task flow." },
    suggestedView: "task",
    quickViews: ["task", "intake", "table", "stats"],
    quickStart: {
      ja: { firstView: "task", firstAction: "Task view で next action を見てから queue と bundle を確認する" },
      en: { firstView: "task", firstAction: "Start in task view, then inspect queue and bundle" },
    },
    focus: { ja: ["Task", "Queue", "Bundle"], en: ["Task", "Queue", "Bundle"] },
    summary: {
      ja: { topics: 2, notes: "Task View / Queue / Bundle を確認しやすい" },
      en: { topics: 2, notes: "Good for task view, queue, and bundle" },
    },
  },
  {
    id: "method-studio",
    label: { ja: "方法論スタジオ", en: "Method Studio" },
    description: {
      ja: "Strata / Semantic / PARA / Must One をまとめて確認するための配布向けサンプル。",
      en: "A distribution-ready sample for Strata, Semantic, PARA, and Must One flows.",
    },
    suggestedView: "workspace",
    quickViews: ["workspace", "stats", "maintenance", "table"],
    quickStart: {
      ja: { firstView: "workspace", firstAction: "Topic panel を開いて Strata と PARA、続けて Stats で密度を見る" },
      en: { firstView: "workspace", firstAction: "Open the topic panel for Strata and PARA, then inspect density in Stats" },
    },
    focus: { ja: ["Strata", "Semantic", "PARA", "Must One"], en: ["Strata", "Semantic", "PARA", "Must One"] },
    summary: {
      ja: { topics: 3, notes: "layer 色、semantic 階層、subtree、Must One 履歴をまとめて確認" },
      en: { topics: 3, notes: "Covers layer colors, semantic hierarchy, subtree moves, and Must One history" },
    },
  },
];

function makeNode(patch: Partial<NodeItem> & Pick<NodeItem, "id" | "label" | "type" | "tense" | "position" | "note" | "size" | "group" | "layer">): NodeItem {
  const now = "2026-03-21T08:00:00.000Z";
  return {
    frameScale: 1,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function makeFrame(id: string, label: string, nodes: HistoryFrame["nodes"]): HistoryFrame {
  return {
    id,
    label,
    createdAt: "2026-03-20T10:00:00.000Z",
    nodes,
  };
}

function makeTopic(patch: Partial<TopicItem> & Pick<TopicItem, "id" | "title" | "folder" | "description" | "nodes" | "edges">): TopicItem {
  return {
    axisPreset: { x: "視点 ↔ 具体", y: "過去 ↔ 未来", z: "素材 ↔ 構造" },
    workspace: { x: 0, y: 0, size: 112 },
    style: {
      sphereOpacity: 0.18,
      edgeOpacity: 0.55,
      gridOpacity: 0.18,
      nodeScale: 1,
      labelScale: 1,
      perspective: 0.12,
      showLabels: true,
      centerOffsetX: 0,
      centerOffsetY: 0,
    },
    history: [],
    paraCategory: "Projects",
    mustOneNodeId: null,
    sourceFile: `${patch.title}.md`,
    unresolvedTopicLinks: [],
    ...patch,
  };
}

function createStoryBranchSampleState(): AppState {
  const storyNodes: NodeItem[] = [
    makeNode({ id: "story-core", label: "作品核", type: "主張", tense: "現在", position: [0, 0, 0], note: "世界観・テーマ・感情の中心。", size: 0.82, group: "core", layer: "theme", tags: ["作品", "核"], confidence: 0.8 }),
    makeNode({ id: "story-theme", label: "テーマ: 記憶と再編集", type: "概念", tense: "現在", position: [0.9, 0.55, 0.12], note: "編集行為そのものを主題化する。", size: 0.58, group: "concept", layer: "theme", tags: ["theme", "memory"] }),
    makeNode({ id: "story-conflict", label: "対立: 保存か変質か", type: "問い", tense: "未来", position: [-0.82, 0.4, -0.1], note: "残したいものは固定すべきか、更新すべきか。", size: 0.6, group: "conflict", layer: "argument", tags: ["conflict"] }),
    makeNode({ id: "story-audience", label: "観客体験", type: "観察", tense: "未来", position: [0.2, -0.85, 0.25], note: "再読・再鑑賞で意味が変わる設計。", size: 0.54, group: "experience", layer: "review", tags: ["audience"] }),
    makeNode({ id: "story-production", label: "制作導線", type: "タスク", tense: "現在", position: [-0.35, -0.74, 0.34], note: "資料整理 -> 構成決定 -> 試作。", size: 0.5, group: "plan", layer: "task", tags: ["production"], task: { status: "doing", priority: 2 } }),
  ];
  const storyEdges: EdgeItem[] = [
    { id: "edge-story-theme", from: "story-core", to: "story-theme", relation: "supports", meaning: "主題", weight: 1, visible: true },
    { id: "edge-story-conflict", from: "story-core", to: "story-conflict", relation: "questions", meaning: "対立", weight: 1, visible: true },
    { id: "edge-story-audience", from: "story-theme", to: "story-audience", relation: "shapes", meaning: "体験設計", weight: 0.8, visible: true },
    { id: "edge-story-production", from: "story-conflict", to: "story-production", relation: "drives", meaning: "制作判断", weight: 0.7, visible: true },
  ];
  const storyFrame = makeFrame("story-frame-1", "Future branch base", storyNodes.map((node) => ({
    id: node.id,
    position: node.position,
    size: node.size,
    frameScale: node.frameScale ?? 1,
  })));
  const sandboxNodes: NodeItem[] = [
    makeNode({ ...storyNodes[0], id: "story-core-sb", position: [0.18, 0.04, 0], note: "作品核を観客参加型に寄せる。" }),
    makeNode({ ...storyNodes[1], id: "story-theme-sb", label: "テーマ: 記憶の編集権", position: [1.06, 0.66, 0.18], note: "誰が編集権を持つかを主題に追加。", tags: ["theme", "memory", "authority"] }),
    makeNode({ ...storyNodes[2], id: "story-conflict-sb", position: [-0.9, 0.46, -0.06], size: 0.66 }),
    makeNode({ ...storyNodes[3], id: "story-audience-sb", position: [0.32, -0.92, 0.3], note: "観客に再編集の選択を渡す。", group: "experience-lab" }),
    makeNode({ ...storyNodes[4], id: "story-production-sb", position: [-0.28, -0.86, 0.38], note: "試作 -> 比較上映 -> 反映。", layer: "sandbox-task", task: { status: "todo", priority: 1 } }),
  ];

  const storyTopic = makeTopic({
    id: "topic-story",
    title: "作品構想 / Story Engine",
    folder: "Projects/Story",
    description: "作品の核、主題、制作導線をまとめたサンプルトピック。",
    workspace: { x: 18, y: 16, size: 118 },
    nodes: storyNodes,
    edges: storyEdges,
    history: [storyFrame],
    mustOneNodeId: "story-core",
    canvasRegions: [
      { id: "region-story-a", label: "Theme", bounds: { x: -12, y: -4, w: 24, h: 16 }, color: "#38bdf8" },
      { id: "region-story-b", label: "Production", bounds: { x: -10, y: 10, w: 20, h: 14 }, color: "#f59e0b" },
    ],
  });
  const sandboxTopic = makeTopic({
    id: "topic-story-branch-a",
    title: "作品構想 / Story Engine :: 分岐A",
    folder: "Projects/Story/Branches",
    description: "未来分岐 A の sandbox。",
    workspace: { x: 46, y: 16, size: 118 },
    nodes: sandboxNodes,
    edges: [
      { id: "edge-story-theme-sb", from: "story-core-sb", to: "story-theme-sb", relation: "supports", meaning: "主題", weight: 1, visible: true },
      { id: "edge-story-conflict-sb", from: "story-core-sb", to: "story-conflict-sb", relation: "questions", meaning: "対立", weight: 1, visible: true },
      { id: "edge-story-audience-sb", from: "story-theme-sb", to: "story-audience-sb", relation: "shapes", meaning: "体験設計", weight: 0.8, visible: true },
      { id: "edge-story-production-sb", from: "story-conflict-sb", to: "story-production-sb", relation: "drives", meaning: "制作判断", weight: 0.7, visible: true },
    ],
    parentTopicId: "topic-story",
  });
  const researchTopic = makeTopic({
    id: "topic-research",
    title: "研究ノート / Knowledge Garden",
    folder: "Resources/Research",
    description: "参考資料と仮説を束ねるサンプルトピック。",
    workspace: { x: 24, y: 44, size: 112 },
    nodes: [
      makeNode({ id: "research-core", label: "研究庭 / Garden", type: "主張", tense: "現在", position: [0, 0, 0], note: "参考資料と問いの整理。", size: 0.78, group: "core", layer: "research", tags: ["research"] }),
      makeNode({ id: "research-source", label: "資料ノード", type: "資料", tense: "過去", position: [0.86, 0.34, 0.16], note: "論文・展示・会話メモ。", size: 0.52, group: "source", layer: "material", materialStatus: "reading", tags: ["source"] }),
      makeNode({ id: "research-hypothesis", label: "仮説", type: "仮説", tense: "未来", position: [-0.74, 0.52, 0.08], note: "体験は再編集可能性で深まる。", size: 0.58, group: "hypothesis", layer: "analysis", hypothesisStage: "supported", confidence: 0.66 }),
      makeNode({ id: "research-review", label: "レビュー論点", type: "問い", tense: "未来", position: [0.12, -0.84, 0.2], note: "どこで誤読が起こるか。", size: 0.5, group: "review", layer: "review", tags: ["review"] }),
    ],
    edges: [
      { id: "edge-research-1", from: "research-core", to: "research-source", relation: "collects", meaning: "資料束", weight: 1, visible: true },
      { id: "edge-research-2", from: "research-source", to: "research-hypothesis", relation: "supports", meaning: "根拠", weight: 0.8, visible: true },
      { id: "edge-research-3", from: "research-hypothesis", to: "research-review", relation: "needs-review", meaning: "再検証", weight: 0.7, visible: true },
    ],
    mustOneNodeId: "research-hypothesis",
  });

  return {
    topics: [storyTopic, sandboxTopic, researchTopic],
    topicLinks: [{ id: "topic-link-1", from: "topic-story", to: "topic-research", relation: "references", meaning: "制作根拠" }],
    journals: [{
      id: "journal-1",
      date: "2026-03-21",
      body: "未来分岐 A は観客参加型に寄せる方向で検証する。",
      linkedNodeIds: ["story-theme", "story-theme-sb"],
      linkedTopicIds: ["topic-story"],
      mood: "focused",
      tags: ["branch", "story"],
      createdAt: "2026-03-21T08:30:00.000Z",
      updatedAt: "2026-03-21T08:30:00.000Z",
    }],
    eventLog: [
      { id: "event-1", ts: "2026-03-21T08:12:00.000Z", kind: "topic:create", topicId: "topic-story", targetId: "topic-story", targetLabel: "作品構想 / Story Engine" },
      { id: "event-2", ts: "2026-03-21T08:20:00.000Z", kind: "snapshot:create", topicId: "topic-story", targetId: "story-frame-1", targetLabel: "Future branch base" },
      { id: "event-3", ts: "2026-03-21T08:25:00.000Z", kind: "topic:create", topicId: "topic-story-branch-a", targetId: "topic-story-branch-a", targetLabel: "作品構想 / Story Engine :: 分岐A" },
      { id: "event-4", ts: "2026-03-21T08:28:00.000Z", kind: "node:update", topicId: "topic-story-branch-a", targetId: "story-theme-sb", targetLabel: "テーマ: 記憶の編集権" },
    ],
    bookmarks: [{
      id: "bookmark-1",
      label: "Story workspace",
      topicId: "topic-story",
      nodeId: "story-core",
      viewType: "workspace",
      workspaceViewport: { x: 0, y: 0, w: 100, h: 100 },
      createdAt: "2026-03-21T08:40:00.000Z",
    }],
    layoutPresets: [{
      id: "layout-sample-1",
      label: "Sample Compare",
      splitMode: "quad",
      panes: [
        { view: "sphere", syncMode: "global" },
        { view: "workspace", syncMode: "global" },
        { view: "timeline", syncMode: "isolated" },
        { view: "diff", syncMode: "isolated" },
      ],
    }],
    smartFolders: [{ id: "smart-1", label: "Review Needed", filter: { lowConfidence: 0.7, workStatus: "review" } }],
    conversionQueue: [{
      id: "cq-1",
      sourceTopicId: "topic-story",
      sourceNodeId: "story-production",
      sourceLabel: "制作導線",
      targetType: "task",
      status: "review",
      note: "制作導線を具体 task に落とす。",
      createdAt: "2026-03-21T08:32:00.000Z",
    }],
    bundles: [{
      id: "bundle-1",
      title: "Story Research Bundle",
      bundleType: "project",
      description: "作品構想と研究ノートを束ねた見本 bundle。",
      memberNodeIds: ["story-core", "research-hypothesis"],
      memberTopicIds: ["topic-story", "topic-research"],
      status: "active",
      tags: ["sample", "bundle"],
      reviewAt: "2026-03-28T00:00:00.000Z",
      createdAt: "2026-03-21T08:34:00.000Z",
      updatedAt: "2026-03-21T08:34:00.000Z",
    }],
    scenarioBranches: [{
      id: "branch-1",
      label: "観客参加型に寄せる",
      topicId: "topic-story",
      materializedTopicId: "topic-story-branch-a",
      nodeIdMap: [
        { sourceId: "story-core", sandboxId: "story-core-sb" },
        { sourceId: "story-theme", sandboxId: "story-theme-sb" },
        { sourceId: "story-conflict", sandboxId: "story-conflict-sb" },
        { sourceId: "story-audience", sandboxId: "story-audience-sb" },
        { sourceId: "story-production", sandboxId: "story-production-sb" },
      ],
      anchorEventId: "event-2",
      anchorTs: "2026-03-21T08:20:00.000Z",
      anchorLabel: "Future branch base",
      status: "active",
      note: "観客が編集権を持つ場合の分岐。",
      hypothesis: "観客に編集権を渡すと、再読体験が厚くなる。",
      nextAction: "sandbox 差分を比較して attr から戻す。",
      syncPolicy: "prefer-sandbox",
      snapshotFrameId: "story-frame-1",
      snapshotLabel: "Future branch base",
      lastSourceSyncAt: "2026-03-21T08:26:00.000Z",
      lastBackportAt: "2026-03-21T08:29:00.000Z",
      createdAt: "2026-03-21T08:21:00.000Z",
    }],
  };
}

function createResearchReviewSampleState(): AppState {
  const researchTopic = makeTopic({
    id: "topic-review-lab",
    title: "Review Lab / Research",
    folder: "Resources/Review",
    description: "レビュー、仮説、保守観点を確認するための見本。",
    workspace: { x: 16, y: 20, size: 112 },
    nodes: [
      makeNode({ id: "lab-q", label: "問い", type: "問い", tense: "現在", position: [0, 0, 0], note: "何が再解釈を起こすか。", size: 0.72, group: "core", layer: "question", tags: ["question"] }),
      makeNode({ id: "lab-src", label: "資料A", type: "資料", tense: "過去", position: [0.9, 0.22, 0.08], note: "論文メモ。", size: 0.5, group: "source", layer: "material", materialStatus: "skimmed", tags: ["paper"] }),
      makeNode({ id: "lab-hyp", label: "仮説A", type: "仮説", tense: "未来", position: [-0.76, 0.44, 0.12], note: "複数視点が再読性を上げる。", size: 0.58, group: "hypothesis", layer: "analysis", hypothesisStage: "hypothesis", confidence: 0.54, tags: ["hypothesis"] }),
      makeNode({ id: "lab-gap", label: "根拠不足", type: "観察", tense: "現在", position: [0.22, -0.82, 0.18], note: "具体例が不足。", size: 0.48, group: "review", layer: "maintenance", evidenceBasis: "unverified", tags: ["gap"] }),
      makeNode({ id: "lab-next", label: "次レビュー", type: "タスク", tense: "未来", position: [-0.3, -0.72, 0.24], note: "実例を3件追加。", size: 0.48, group: "plan", layer: "task", task: { status: "todo", priority: 1 }, workStatus: "review" }),
    ],
    edges: [
      { id: "lab-edge-1", from: "lab-q", to: "lab-src", relation: "collects", meaning: "資料", weight: 1, visible: true },
      { id: "lab-edge-2", from: "lab-src", to: "lab-hyp", relation: "suggests", meaning: "示唆", weight: 0.8, visible: true },
      { id: "lab-edge-3", from: "lab-hyp", to: "lab-gap", relation: "lacks", meaning: "弱点", weight: 0.7, visible: true },
      { id: "lab-edge-4", from: "lab-gap", to: "lab-next", relation: "drives", meaning: "次アクション", weight: 0.9, visible: true },
    ],
    mustOneNodeId: "lab-hyp",
  });
  const sourceTopic = makeTopic({
    id: "topic-reference-bank",
    title: "Reference Bank",
    folder: "Resources/Sources",
    description: "参照候補の置き場。",
    workspace: { x: 42, y: 22, size: 108 },
    nodes: [
      makeNode({ id: "ref-a", label: "展示メモ", type: "資料", tense: "過去", position: [0, 0, 0], note: "展示観察ログ。", size: 0.56, group: "source", layer: "material" }),
      makeNode({ id: "ref-b", label: "対話メモ", type: "資料", tense: "過去", position: [0.62, -0.4, 0.1], note: "観客インタビュー。", size: 0.48, group: "source", layer: "material" }),
    ],
    edges: [],
  });
  return {
    topics: [researchTopic, sourceTopic],
    topicLinks: [{ id: "review-link-1", from: "topic-review-lab", to: "topic-reference-bank", relation: "reads", meaning: "参照元" }],
    journals: [{
      id: "journal-review-1",
      date: "2026-03-21",
      body: "Review View で gap を拾い、Maintenance で stale source を点検する。",
      linkedTopicIds: ["topic-review-lab"],
      tags: ["review", "maintenance"],
      createdAt: "2026-03-21T09:10:00.000Z",
      updatedAt: "2026-03-21T09:10:00.000Z",
    }],
    bookmarks: [{
      id: "bookmark-review-1",
      label: "Review workspace",
      topicId: "topic-review-lab",
      nodeId: "lab-hyp",
      viewType: "review",
      createdAt: "2026-03-21T09:12:00.000Z",
    }],
    layoutPresets: [{
      id: "layout-review-1",
      label: "Research Review",
      splitMode: "triple",
      panes: [
        { view: "review", syncMode: "global" },
        { view: "maintenance", syncMode: "global" },
        { view: "table", syncMode: "isolated" },
      ],
    }],
    smartFolders: [{ id: "smart-review-1", label: "Low Confidence", filter: { lowConfidence: 0.6 } }],
    eventLog: [
      { id: "review-event-1", ts: "2026-03-21T09:02:00.000Z", kind: "topic:create", topicId: "topic-review-lab", targetId: "topic-review-lab", targetLabel: "Review Lab / Research" },
      { id: "review-event-2", ts: "2026-03-21T09:08:00.000Z", kind: "node:update", topicId: "topic-review-lab", targetId: "lab-gap", targetLabel: "根拠不足" },
    ],
    scenarioBranches: [],
  };
}

function createTaskFlowSampleState(): AppState {
  const taskTopic = makeTopic({
    id: "topic-task-flow",
    title: "Task Flow / GTD Desk",
    folder: "Projects/Execution",
    description: "GTD、queue、bundle をまとめた見本。",
    workspace: { x: 18, y: 18, size: 112 },
    nodes: [
      makeNode({ id: "task-inbox", label: "Inbox capture", type: "タスク", tense: "現在", position: [0, 0, 0], note: "素材の一次回収。", size: 0.56, group: "gtd", layer: "inbox", task: { status: "todo", priority: 2 }, intakeStatus: "inbox", workStatus: "unprocessed" }),
      makeNode({ id: "task-next", label: "Next action", type: "タスク", tense: "未来", position: [0.78, 0.2, 0.12], note: "次の一手を明確化。", size: 0.52, group: "gtd", layer: "next", task: { status: "doing", priority: 1 }, workStatus: "active" }),
      makeNode({ id: "task-waiting", label: "Waiting", type: "タスク", tense: "未来", position: [-0.74, 0.24, 0.08], note: "外部待ち。", size: 0.48, group: "gtd", layer: "waiting", task: { status: "todo", priority: 2 }, workStatus: "onHold" }),
      makeNode({ id: "task-review", label: "Weekly review", type: "タスク", tense: "未来", position: [0.2, -0.82, 0.18], note: "Queue と bundle を見直す。", size: 0.54, group: "review", layer: "review", task: { status: "todo", priority: 1 }, workStatus: "review" }),
      makeNode({ id: "task-done", label: "Published output", type: "成果", tense: "過去", position: [-0.3, -0.72, 0.22], note: "完了した成果物。", size: 0.48, group: "done", layer: "done", workStatus: "done", publicationState: "published" }),
    ],
    edges: [
      { id: "task-edge-1", from: "task-inbox", to: "task-next", relation: "flows-to", meaning: "整理", weight: 1, visible: true },
      { id: "task-edge-2", from: "task-next", to: "task-review", relation: "reviewed-by", meaning: "週次確認", weight: 0.8, visible: true },
      { id: "task-edge-3", from: "task-review", to: "task-done", relation: "publishes", meaning: "完了", weight: 0.7, visible: true },
    ],
    mustOneNodeId: "task-next",
  });
  const supportTopic = makeTopic({
    id: "topic-task-resources",
    title: "Execution Resources",
    folder: "Resources/Execution",
    description: "タスク遂行の参考資料。",
    workspace: { x: 44, y: 18, size: 108 },
    nodes: [
      makeNode({ id: "res-checklist", label: "Checklist", type: "資料", tense: "現在", position: [0, 0, 0], note: "毎回使う確認項目。", size: 0.5, group: "support", layer: "resource" }),
      makeNode({ id: "res-template", label: "Template", type: "資料", tense: "現在", position: [0.7, -0.38, 0.1], note: "定型文のひな型。", size: 0.46, group: "support", layer: "resource" }),
    ],
    edges: [],
  });
  return {
    topics: [taskTopic, supportTopic],
    topicLinks: [{ id: "task-link-1", from: "topic-task-flow", to: "topic-task-resources", relation: "uses", meaning: "参照" }],
    journals: [{
      id: "journal-task-1",
      date: "2026-03-21",
      body: "Task View と Conversion Queue を一緒に見るサンプル。",
      linkedTopicIds: ["topic-task-flow"],
      tags: ["task", "gtd"],
      createdAt: "2026-03-21T09:20:00.000Z",
      updatedAt: "2026-03-21T09:20:00.000Z",
    }],
    eventLog: [
      { id: "task-event-1", ts: "2026-03-21T09:21:00.000Z", kind: "topic:create", topicId: "topic-task-flow", targetId: "topic-task-flow", targetLabel: "Task Flow / GTD Desk" },
      { id: "task-event-2", ts: "2026-03-21T09:22:00.000Z", kind: "node:update", topicId: "topic-task-flow", targetId: "task-next", targetLabel: "Next action" },
    ],
    bookmarks: [{
      id: "bookmark-task-1",
      label: "Task desk",
      topicId: "topic-task-flow",
      nodeId: "task-next",
      viewType: "task",
      createdAt: "2026-03-21T09:24:00.000Z",
    }],
    layoutPresets: [{
      id: "layout-task-1",
      label: "Execution Desk",
      splitMode: "quad",
      panes: [
        { view: "task", syncMode: "global" },
        { view: "table", syncMode: "global" },
        { view: "intake", syncMode: "isolated" },
        { view: "stats", syncMode: "isolated" },
      ],
    }],
    smartFolders: [{ id: "smart-task-1", label: "Review Queue", filter: { workStatus: "review" } }],
    conversionQueue: [{
      id: "cq-task-1",
      sourceTopicId: "topic-task-flow",
      sourceNodeId: "task-inbox",
      sourceLabel: "Inbox capture",
      targetType: "task",
      status: "pending",
      note: "Inbox から next action 化。",
      createdAt: "2026-03-21T09:23:00.000Z",
    }],
    bundles: [{
      id: "bundle-task-1",
      title: "Weekly Ops Bundle",
      bundleType: "project",
      description: "週次運用の task と resource を束ねる。",
      memberNodeIds: ["task-next", "res-checklist"],
      memberTopicIds: ["topic-task-flow", "topic-task-resources"],
      status: "active",
      tags: ["ops", "sample"],
      createdAt: "2026-03-21T09:24:00.000Z",
      updatedAt: "2026-03-21T09:24:00.000Z",
    }],
    scenarioBranches: [],
  };
}

function createMethodStudioSampleState(): AppState {
  const stackTopic = makeTopic({
    id: "topic-method-studio",
    title: "Method Studio / Knowledge Stack",
    folder: "Resources/Method Studio",
    description: "Strata、Semantic、Must One をまとめて確認する中核トピック。",
    workspace: { x: 20, y: 18, size: 120 },
    paraCategory: "Resources",
    activeMethods: ["decision-layer", "provenance", "task-gtd"],
    mustOneNodeId: "stack-decision",
    mustOneDate: "2026-03-20",
    mustOneHistory: [
      { date: "2026-03-18", nodeId: "stack-pattern", label: "Pattern map" },
      { date: "2026-03-20", nodeId: "stack-decision", label: "Decision gate" },
    ],
    layerStyles: {
      signal: { visible: true, color: "#38bdf8" },
      pattern: { visible: true, color: "#a78bfa" },
      model: { visible: true, color: "#f59e0b" },
      decision: { visible: true, color: "#34d399" },
      backlog: { visible: false, color: "#fb7185" },
    },
    canvasRegions: [
      { id: "region-stack-1", label: "Signal", bounds: { x: -14, y: -10, w: 24, h: 16 }, color: "rgba(56,189,248,0.42)" },
      { id: "region-stack-2", label: "Decision", bounds: { x: -6, y: 8, w: 22, h: 14 }, color: "rgba(52,211,153,0.34)" },
    ],
    nodes: [
      makeNode({ id: "stack-signal", label: "Signal log", type: "観察", tense: "過去", position: [-0.82, 0.48, 0.08], note: "現場ログと観測メモ。", size: 0.5, group: "input", layer: "signal", createdAt: "2026-03-12T09:00:00.000Z", updatedAt: "2026-03-12T09:00:00.000Z" }),
      makeNode({ id: "stack-pattern", label: "Pattern map", type: "概念", tense: "現在", position: [-0.1, 0.16, 0], note: "複数 signal から recurring pattern を抽出。", size: 0.68, group: "analysis", layer: "pattern", createdAt: "2026-03-14T09:00:00.000Z", updatedAt: "2026-03-18T09:00:00.000Z" }),
      makeNode({ id: "stack-model", label: "Operating model", type: "主張", tense: "現在", position: [0.82, 0.34, 0.12], note: "意思決定と実装の中間モデル。", size: 0.72, group: "model", layer: "model", createdAt: "2026-03-15T09:00:00.000Z", updatedAt: "2026-03-19T09:00:00.000Z" }),
      makeNode({ id: "stack-decision", label: "Decision gate", type: "タスク", tense: "未来", position: [0.28, -0.66, 0.18], note: "今週に戻す差分と保留項目を選ぶ。", size: 0.62, group: "decision", layer: "decision", task: { status: "doing", priority: 1 }, createdAt: "2026-03-17T09:00:00.000Z", updatedAt: "2026-03-20T09:00:00.000Z" }),
      makeNode({ id: "stack-backlog", label: "Deferred branch", type: "仮説", tense: "未来", position: [-0.48, -0.7, 0.24], note: "今は hidden layer に置く候補。", size: 0.46, group: "parking", layer: "backlog", hypothesisStage: "seed", confidence: 0.38, createdAt: "2026-03-16T09:00:00.000Z", updatedAt: "2026-03-16T09:00:00.000Z" }),
    ],
    edges: [
      { id: "method-edge-1", from: "stack-signal", to: "stack-pattern", relation: "supports", meaning: "signal -> pattern", weight: 1, visible: true },
      { id: "method-edge-2", from: "stack-pattern", to: "stack-model", relation: "organizes", meaning: "pattern -> model", weight: 0.9, visible: true },
      { id: "method-edge-3", from: "stack-model", to: "stack-decision", relation: "guides", meaning: "model -> decision", weight: 0.88, visible: true },
      { id: "method-edge-4", from: "stack-pattern", to: "stack-backlog", relation: "spawns", meaning: "deferred branch", weight: 0.52, visible: true },
    ],
  });

  const projectTopic = makeTopic({
    id: "topic-method-project",
    title: "Project Orbit / Delivery Loop",
    folder: "Projects/Method Rollout",
    description: "PARA subtree と Must One の接続を見るための project 側トピック。",
    workspace: { x: 48, y: 18, size: 112 },
    paraCategory: "Projects",
    parentTopicId: "topic-method-studio",
    mustOneNodeId: "orbit-next",
    mustOneDate: "2026-03-21",
    mustOneHistory: [{ date: "2026-03-21", nodeId: "orbit-next", label: "Next rollout" }],
    nodes: [
      makeNode({ id: "orbit-scope", label: "Scope frame", type: "主張", tense: "現在", position: [0, 0, 0], note: "どこまで今週扱うか。", size: 0.6, group: "project", layer: "scope" }),
      makeNode({ id: "orbit-next", label: "Next rollout", type: "タスク", tense: "未来", position: [0.74, 0.18, 0.16], note: "配布サンプルを docs と揃える。", size: 0.56, group: "project", layer: "execution", task: { status: "todo", priority: 1 }, workStatus: "review" }),
      makeNode({ id: "orbit-risk", label: "Adoption risk", type: "問い", tense: "未来", position: [-0.7, 0.32, 0.08], note: "最初に見る sample が偏らないか。", size: 0.5, group: "review", layer: "review", confidence: 0.52 }),
      makeNode({ id: "orbit-review", label: "Weekly sync", type: "タスク", tense: "未来", position: [0.18, -0.78, 0.18], note: "sample / docs / build の同期確認。", size: 0.48, group: "review", layer: "cadence", task: { status: "todo", priority: 2 } }),
    ],
    edges: [
      { id: "orbit-edge-1", from: "orbit-scope", to: "orbit-next", relation: "prioritizes", meaning: "scope -> next", weight: 0.9, visible: true },
      { id: "orbit-edge-2", from: "orbit-next", to: "orbit-review", relation: "feeds", meaning: "rollout -> review", weight: 0.7, visible: true },
      { id: "orbit-edge-3", from: "orbit-risk", to: "orbit-next", relation: "questions", meaning: "risk check", weight: 0.68, visible: true },
    ],
  });

  const archiveTopic = makeTopic({
    id: "topic-method-archive",
    title: "Semantic Shelf / Archive Glossary",
    folder: "Archives/Method Glossary",
    description: "Semantic hierarchy と参照語彙を確認するための glossary。",
    workspace: { x: 34, y: 44, size: 108 },
    paraCategory: "Archives",
    nodes: [
      makeNode({ id: "shelf-root", label: "Glossary root", type: "概念", tense: "現在", position: [0, 0, 0], note: "方法論の用語棚。", size: 0.56, group: "glossary", layer: "index" }),
      makeNode({ id: "shelf-abstract", label: "Abstract relation", type: "概念", tense: "現在", position: [-0.72, 0.3, 0.1], note: "抽象側の relation 語彙。", size: 0.48, group: "glossary", layer: "abstract" }),
      makeNode({ id: "shelf-concrete", label: "Concrete example", type: "資料", tense: "過去", position: [0.74, 0.34, 0.12], note: "具体例と導入例。", size: 0.5, group: "glossary", layer: "concrete" }),
      makeNode({ id: "shelf-bridge", label: "Bridge note", type: "主張", tense: "現在", position: [0.12, -0.76, 0.2], note: "抽象語と project task をつなぐ。", size: 0.54, group: "bridge", layer: "bridge" }),
    ],
    edges: [
      { id: "shelf-edge-1", from: "shelf-root", to: "shelf-abstract", relation: "contains", meaning: "glossary", weight: 1, visible: true },
      { id: "shelf-edge-2", from: "shelf-root", to: "shelf-concrete", relation: "contains", meaning: "example", weight: 1, visible: true },
      { id: "shelf-edge-3", from: "shelf-abstract", to: "shelf-bridge", relation: "translates", meaning: "abstract -> bridge", weight: 0.8, visible: true },
      { id: "shelf-edge-4", from: "shelf-concrete", to: "shelf-bridge", relation: "grounds", meaning: "concrete -> bridge", weight: 0.74, visible: true },
    ],
  });

  return {
    topics: [stackTopic, projectTopic, archiveTopic],
    topicLinks: [
      { id: "method-link-1", from: "topic-method-studio", to: "topic-method-project", relation: "feeds", meaning: "decision -> rollout" },
      { id: "method-link-2", from: "topic-method-studio", to: "topic-method-archive", relation: "indexes", meaning: "semantic reference" },
    ],
    journals: [{
      id: "journal-method-1",
      date: "2026-03-21",
      body: "Method Studio sample を基準に、Strata / Semantic / PARA の導線を同時確認する。",
      linkedTopicIds: ["topic-method-studio", "topic-method-project"],
      linkedNodeIds: ["stack-decision", "orbit-next"],
      tags: ["sample", "method", "distribution"],
      createdAt: "2026-03-21T10:10:00.000Z",
      updatedAt: "2026-03-21T10:10:00.000Z",
    }],
    eventLog: [
      { id: "method-event-1", ts: "2026-03-21T10:02:00.000Z", kind: "topic:create", topicId: "topic-method-studio", targetId: "topic-method-studio", targetLabel: "Method Studio / Knowledge Stack" },
      { id: "method-event-2", ts: "2026-03-21T10:08:00.000Z", kind: "node:update", topicId: "topic-method-studio", targetId: "stack-decision", targetLabel: "Decision gate" },
    ],
    bookmarks: [{
      id: "bookmark-method-1",
      label: "Method overview",
      topicId: "topic-method-studio",
      nodeId: "stack-model",
      viewType: "workspace",
      workspaceViewport: { x: 8, y: 6, w: 84, h: 72 },
      createdAt: "2026-03-21T10:12:00.000Z",
    }],
    layoutPresets: [{
      id: "layout-method-1",
      label: "Method Studio Review",
      splitMode: "quad",
      panes: [
        { view: "workspace", syncMode: "global" },
        { view: "stats", syncMode: "global" },
        { view: "maintenance", syncMode: "isolated" },
        { view: "table", syncMode: "isolated" },
      ],
    }],
    smartFolders: [{ id: "smart-method-1", label: "Method risks", filter: { lowConfidence: 0.55, workStatus: "review" } }],
    conversionQueue: [{
      id: "cq-method-1",
      sourceTopicId: "topic-method-studio",
      sourceNodeId: "stack-backlog",
      sourceLabel: "Deferred branch",
      targetType: "hypothesis",
      status: "review",
      note: "hidden layer 候補を review queue へ送る見本。",
      createdAt: "2026-03-21T10:11:00.000Z",
    }],
    bundles: [{
      id: "bundle-method-1",
      title: "Method Rollout Bundle",
      bundleType: "project",
      description: "配布・導入・用語整理をまたぐ束。",
      memberNodeIds: ["stack-decision", "orbit-next", "shelf-bridge"],
      memberTopicIds: ["topic-method-studio", "topic-method-project", "topic-method-archive"],
      status: "active",
      tags: ["sample", "rollout"],
      createdAt: "2026-03-21T10:09:00.000Z",
      updatedAt: "2026-03-21T10:09:00.000Z",
    }],
    scenarioBranches: [],
  };
}

export function createSampleAppState(sampleId: SampleWorkspacePreset["id"] = "story-branch"): AppState {
  switch (sampleId) {
    case "method-studio":
      return createMethodStudioSampleState();
    case "research-review":
      return createResearchReviewSampleState();
    case "task-flow":
      return createTaskFlowSampleState();
    case "story-branch":
    default:
      return createStoryBranchSampleState();
  }
}

export function describeSampleAppState(sampleId: SampleWorkspacePreset["id"] = "story-branch"): SampleWorkspaceStats {
  const sample = createSampleAppState(sampleId);
  return {
    topics: sample.topics.length,
    nodes: sample.topics.reduce((sum, topic) => sum + topic.nodes.length, 0),
    edges: sample.topics.reduce((sum, topic) => sum + topic.edges.length, 0),
    branches: (sample.scenarioBranches || []).length,
    bundles: (sample.bundles || []).length,
    bookmarks: (sample.bookmarks || []).length,
    journals: (sample.journals || []).length,
    layouts: (sample.layoutPresets || []).length,
  };
}

export function createAppendableSampleAppState(
  sampleId: SampleWorkspacePreset["id"] = "story-branch",
  options: SampleAppendOptions = {}
): AppState {
  const sample = createSampleAppState(sampleId);
  const titleSuffix = options.titleSuffix?.trim() || "";
  const workspaceOffset = options.workspaceOffset || { x: 0, y: 0 };

  const topicIdMap = new Map<string, string>();
  const nodeIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  const frameIdMap = new Map<string, string>();
  const eventIdMap = new Map<string, string>();
  const bookmarkIdMap = new Map<string, string>();
  const bundleIdMap = new Map<string, string>();
  const branchIdMap = new Map<string, string>();
  const queueIdMap = new Map<string, string>();
  const journalIdMap = new Map<string, string>();
  const layoutIdMap = new Map<string, string>();
  const smartFolderIdMap = new Map<string, string>();

  const appendSuffix = (value: string) => titleSuffix ? `${value} ${titleSuffix}` : value;
  const remapKnownId = (id?: string) => {
    if (!id) return id;
    return topicIdMap.get(id)
      || nodeIdMap.get(id)
      || edgeIdMap.get(id)
      || frameIdMap.get(id)
      || eventIdMap.get(id)
      || bookmarkIdMap.get(id)
      || bundleIdMap.get(id)
      || branchIdMap.get(id)
      || queueIdMap.get(id)
      || journalIdMap.get(id)
      || layoutIdMap.get(id)
      || smartFolderIdMap.get(id)
      || id;
  };

  sample.topics.forEach((topic) => {
    topicIdMap.set(topic.id, newId("topic"));
    topic.nodes.forEach((node) => nodeIdMap.set(node.id, newId("node")));
    topic.edges.forEach((edge) => edgeIdMap.set(edge.id, newId("edge")));
    topic.history.forEach((frame) => frameIdMap.set(frame.id, newId("frame")));
  });
  (sample.eventLog || []).forEach((event) => eventIdMap.set(event.id, newId("event")));
  (sample.bookmarks || []).forEach((bookmark) => bookmarkIdMap.set(bookmark.id, newId("bm")));
  (sample.bundles || []).forEach((bundle) => bundleIdMap.set(bundle.id, newId("bundle")));
  (sample.scenarioBranches || []).forEach((branch) => branchIdMap.set(branch.id, newId("branch")));
  (sample.conversionQueue || []).forEach((item) => queueIdMap.set(item.id, newId("cq")));
  sample.journals.forEach((journal) => journalIdMap.set(journal.id, newId("journal")));
  (sample.layoutPresets || []).forEach((preset) => layoutIdMap.set(preset.id, newId("lp")));
  (sample.smartFolders || []).forEach((folder) => smartFolderIdMap.set(folder.id, newId("smart")));

  const importedTopics = sample.topics.map((topic) => ({
    ...topic,
    id: topicIdMap.get(topic.id) || newId("topic"),
    title: appendSuffix(topic.title),
    sourceFile: normalizeSourceFilename(appendSuffix(topic.title)),
    workspace: {
      x: topic.workspace.x + workspaceOffset.x,
      y: topic.workspace.y + workspaceOffset.y,
      size: topic.workspace.size,
    },
    mustOneNodeId: topic.mustOneNodeId ? (nodeIdMap.get(topic.mustOneNodeId) || null) : null,
    mustOneHistory: (topic.mustOneHistory || []).map((entry) => ({
      ...entry,
      nodeId: nodeIdMap.get(entry.nodeId) || entry.nodeId,
    })),
    parentTopicId: topic.parentTopicId ? (topicIdMap.get(topic.parentTopicId) || topic.parentTopicId) : topic.parentTopicId,
    outsideNodeIds: (topic.outsideNodeIds || []).map((id) => nodeIdMap.get(id) || id),
    unresolvedTopicLinks: (topic.unresolvedTopicLinks || []).map((link) => ({
      ...link,
      id: link.id ? newId("topic-link") : link.id,
      targetId: link.targetId ? (topicIdMap.get(link.targetId) || link.targetId) : link.targetId,
    })),
    canvasRegions: (topic.canvasRegions || []).map((region) => ({ ...region, id: newId("region") })),
    layerStyles: topic.layerStyles ? { ...topic.layerStyles } : topic.layerStyles,
    history: topic.history.map((frame) => ({
      ...frame,
      id: frameIdMap.get(frame.id) || newId("frame"),
      label: appendSuffix(frame.label),
      nodes: frame.nodes.map((node) => ({ ...node, id: nodeIdMap.get(node.id) || node.id })),
    })),
    nodes: topic.nodes.map((node) => ({
      ...node,
      id: nodeIdMap.get(node.id) || newId("node"),
      counterArgumentNodeIds: (node.counterArgumentNodeIds || []).map((id) => nodeIdMap.get(id) || id),
    })),
    edges: topic.edges.map((edge) => ({
      ...edge,
      id: edgeIdMap.get(edge.id) || newId("edge"),
      from: nodeIdMap.get(edge.from) || edge.from,
      to: nodeIdMap.get(edge.to) || edge.to,
    })),
  }));

  return {
    topics: importedTopics,
    topicLinks: sample.topicLinks.map((link) => ({
      ...link,
      id: newId("tl"),
      from: topicIdMap.get(link.from) || link.from,
      to: topicIdMap.get(link.to) || link.to,
    })),
    journals: sample.journals.map((journal) => ({
      ...journal,
      id: journalIdMap.get(journal.id) || newId("journal"),
      linkedNodeIds: (journal.linkedNodeIds || []).map((id) => nodeIdMap.get(id) || id),
      linkedTopicIds: (journal.linkedTopicIds || []).map((id) => topicIdMap.get(id) || id),
    })),
    eventLog: (sample.eventLog || []).map((event) => ({
      ...event,
      id: eventIdMap.get(event.id) || newId("event"),
      topicId: event.topicId ? (topicIdMap.get(event.topicId) || event.topicId) : event.topicId,
      targetId: remapKnownId(event.targetId),
    })),
    bookmarks: (sample.bookmarks || []).map((bookmark) => ({
      ...bookmark,
      id: bookmarkIdMap.get(bookmark.id) || newId("bm"),
      label: appendSuffix(bookmark.label),
      topicId: topicIdMap.get(bookmark.topicId) || bookmark.topicId,
      nodeId: bookmark.nodeId ? (nodeIdMap.get(bookmark.nodeId) || bookmark.nodeId) : bookmark.nodeId,
    })),
    layoutPresets: (sample.layoutPresets || []).map((preset) => ({
      ...preset,
      id: layoutIdMap.get(preset.id) || newId("lp"),
      label: appendSuffix(preset.label),
    })),
    smartFolders: (sample.smartFolders || []).map((folder) => ({
      ...folder,
      id: smartFolderIdMap.get(folder.id) || newId("smart"),
      label: appendSuffix(folder.label),
    })),
    conversionQueue: (sample.conversionQueue || []).map((item) => ({
      ...item,
      id: queueIdMap.get(item.id) || newId("cq"),
      sourceTopicId: topicIdMap.get(item.sourceTopicId) || item.sourceTopicId,
      sourceNodeId: nodeIdMap.get(item.sourceNodeId) || item.sourceNodeId,
    })),
    bundles: (sample.bundles || []).map((bundle) => ({
      ...bundle,
      id: bundleIdMap.get(bundle.id) || newId("bundle"),
      title: appendSuffix(bundle.title),
      memberNodeIds: bundle.memberNodeIds.map((id) => nodeIdMap.get(id) || id),
      memberTopicIds: bundle.memberTopicIds.map((id) => topicIdMap.get(id) || id),
    })),
    scenarioBranches: (sample.scenarioBranches || []).map((branch) => ({
      ...branch,
      id: branchIdMap.get(branch.id) || newId("branch"),
      label: appendSuffix(branch.label),
      topicId: branch.topicId ? (topicIdMap.get(branch.topicId) || branch.topicId) : branch.topicId,
      materializedTopicId: branch.materializedTopicId ? (topicIdMap.get(branch.materializedTopicId) || branch.materializedTopicId) : branch.materializedTopicId,
      nodeIdMap: (branch.nodeIdMap || []).map((item) => ({
        sourceId: nodeIdMap.get(item.sourceId) || item.sourceId,
        sandboxId: nodeIdMap.get(item.sandboxId) || item.sandboxId,
      })),
      anchorEventId: branch.anchorEventId ? (eventIdMap.get(branch.anchorEventId) || branch.anchorEventId) : branch.anchorEventId,
      snapshotFrameId: branch.snapshotFrameId ? (frameIdMap.get(branch.snapshotFrameId) || branch.snapshotFrameId) : branch.snapshotFrameId,
    })),
  };
}
