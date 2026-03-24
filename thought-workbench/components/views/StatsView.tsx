import React, { useMemo } from "react";
import type { TopicItem, TopicLinkItem, JournalEntry } from "../../types";
import { computeLayerConnectionHeatmap, computeSphereDensityBands } from "../../graph-analytics/density";

type StatCardKey =
  | "spheres"
  | "total-nodes"
  | "total-edges"
  | "topic-links"
  | "tasks"
  | "journal-entries"
  | "avg-confidence"
  | "nested-spheres"
  | "shared-nodes"
  | "observer-tagged"
  | "confidence-logs";

type Lang = "ja" | "en";

type StatCard = { key: StatCardKey; value: string | number; sub?: string };

const TEXT = {
  header: { ja: "統計", en: "Statistics" },
  noData: { ja: "データなし", en: "No data" },
  cards: {
    spheres: { ja: "球体", en: "Spheres" },
    "total-nodes": { ja: "総ノード数", en: "Total Nodes" },
    "total-edges": { ja: "総エッジ数", en: "Total Edges" },
    "topic-links": { ja: "球体リンク", en: "Topic Links" },
    tasks: { ja: "タスク", en: "Tasks" },
    "journal-entries": { ja: "ジャーナル", en: "Journal Entries" },
    "avg-confidence": { ja: "平均確信度", en: "Avg Confidence" },
    "nested-spheres": { ja: "ネスト球体", en: "Nested Spheres" },
    "shared-nodes": { ja: "共有ノード", en: "Shared Nodes" },
    "observer-tagged": { ja: "観測者タグ", en: "Observer-tagged" },
    "confidence-logs": { ja: "確信度ログ", en: "Confidence Logs" },
  },
  charts: {
    nodeTypes: { ja: "ノードタイプ", en: "Node Types" },
    layers: { ja: "レイヤー", en: "Layers" },
    folders: { ja: "フォルダ", en: "Folders" },
    hypothesisStages: { ja: "仮説ステージ", en: "Hypothesis Stages" },
    seciPhases: { ja: "SECI フェーズ", en: "SECI Phases" },
    membershipStatus: { ja: "メンバーシップ", en: "Membership Status" },
    contradictionTypes: { ja: "矛盾タイプ", en: "Contradiction Types" },
    transformOps: { ja: "変換操作", en: "Transform Operations" },
    activeMethods: { ja: "有効メソッド", en: "Active Methods (by sphere)" },
    extensionCoverage: { ja: "拡張カバレッジ", en: "Extension Coverage (nodes)" },
    extensionFields: { ja: "拡張フィールド", en: "Extension Fields" },
  },
  heatmap: {
    layerConnections: { ja: "レイヤー間接続密度", en: "Layer Connection Density" },
    layerCaption: { ja: "エッジ数 / 可能接続数", en: "Edge count / possible connections" },
    sphereDensity: { ja: "球体密度ヒート", en: "Sphere Density Heat" },
    sphereCaption: { ja: "密度が高い球体ほど色を強く表示", en: "Densest spheres are highlighted more strongly" },
    density: { ja: "密度", en: "Density" },
    edges: { ja: "エッジ", en: "Edges" },
    nodes: { ja: "ノード", en: "Nodes" },
  },
  table: {
    title: { ja: "球体サイズ一覧", en: "Spheres by Size" },
    titleColumn: { ja: "タイトル", en: "Title" },
    nodesColumn: { ja: "ノード", en: "Nodes" },
    edgesColumn: { ja: "エッジ", en: "Edges" },
    densityColumn: { ja: "密度", en: "Density" },
  },
} as const;

function t(lang: Lang, entry: { ja: string; en: string }) {
  return entry[lang];
}

function computeStats(topics: TopicItem[], topicLinks: TopicLinkItem[], journals: JournalEntry[], lang: Lang) {
  const cards: StatCard[] = [];
  const totalNodes = topics.reduce((sum, t) => sum + t.nodes.length, 0);
  const totalEdges = topics.reduce((sum, t) => sum + t.edges.length, 0);
  const totalTasks = topics.reduce((sum, t) => sum + t.nodes.filter((n) => n.task).length, 0);
  const tasksByStatus = { todo: 0, doing: 0, done: 0, archived: 0 };
  topics.forEach((t) => t.nodes.forEach((n) => { if (n.task) tasksByStatus[n.task.status]++; }));

  cards.push({ key: "spheres", value: topics.length });
  cards.push({
    key: "total-nodes",
    value: totalNodes,
    sub: lang === "ja"
      ? `平均 ${topics.length ? (totalNodes / topics.length).toFixed(1) : 0} / 球体`
      : `avg ${topics.length ? (totalNodes / topics.length).toFixed(1) : 0}/sphere`,
  });
  cards.push({
    key: "total-edges",
    value: totalEdges,
    sub: lang === "ja"
      ? `平均 ${topics.length ? (totalEdges / topics.length).toFixed(1) : 0} / 球体`
      : `avg ${topics.length ? (totalEdges / topics.length).toFixed(1) : 0}/sphere`,
  });
  cards.push({ key: "topic-links", value: topicLinks.length });
  cards.push({
    key: "tasks",
    value: totalTasks,
    sub: lang === "ja"
      ? `${tasksByStatus.todo} 未着手 / ${tasksByStatus.doing} 進行中 / ${tasksByStatus.done} 完了`
      : `${tasksByStatus.todo} todo / ${tasksByStatus.doing} doing / ${tasksByStatus.done} done`,
  });
  cards.push({ key: "journal-entries", value: journals.length });

  // Type distribution
  const typeDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => typeDist.set(n.type, (typeDist.get(n.type) || 0) + 1)));

  // Layer distribution
  const layerDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => layerDist.set(n.layer, (layerDist.get(n.layer) || 0) + 1)));

  // Folder distribution
  const folderDist = new Map<string, number>();
  topics.forEach((t) => folderDist.set(t.folder, (folderDist.get(t.folder) || 0) + 1));

  // Avg confidence
  const confNodes = topics.flatMap((t) => t.nodes.filter((n) => n.confidence != null));
  const avgConf = confNodes.length ? confNodes.reduce((s, n) => s + (n.confidence || 0), 0) / confNodes.length : 0;
  if (confNodes.length) cards.push({
    key: "avg-confidence",
    value: (avgConf * 100).toFixed(1) + "%",
    sub: lang === "ja" ? `${confNodes.length} 件が評価済み` : `${confNodes.length} rated nodes`,
  });

  // Nested spheres
  const nested = topics.filter((t) => t.parentTopicId).length;
  if (nested) cards.push({ key: "nested-spheres", value: nested });

  // Shared nodes
  const sharedCount = topics.reduce((sum, t) => sum + t.nodes.filter((n) => n.sharedId).length, 0);
  if (sharedCount) cards.push({ key: "shared-nodes", value: sharedCount });

  // ── Theory-derived distributions ──

  // Hypothesis Stage
  const hypothesisDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => {
    if (n.hypothesisStage) hypothesisDist.set(n.hypothesisStage, (hypothesisDist.get(n.hypothesisStage) || 0) + 1);
  }));

  // Knowledge Phase (SECI)
  const seciDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => {
    if (n.knowledgePhase) seciDist.set(n.knowledgePhase, (seciDist.get(n.knowledgePhase) || 0) + 1);
  }));

  // Membership Status
  const membershipDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => {
    if (n.membershipStatus) membershipDist.set(n.membershipStatus, (membershipDist.get(n.membershipStatus) || 0) + 1);
  }));

  // Contradiction Type (edges)
  const contradictionDist = new Map<string, number>();
  topics.forEach((t) => t.edges.forEach((e) => {
    if (e.contradictionType) contradictionDist.set(e.contradictionType, (contradictionDist.get(e.contradictionType) || 0) + 1);
  }));

  // Transform Op (edges)
  const transformDist = new Map<string, number>();
  topics.forEach((t) => t.edges.forEach((e) => {
    if (e.transformOp) transformDist.set(e.transformOp, (transformDist.get(e.transformOp) || 0) + 1);
  }));

  // Observer usage
  const observerCount = topics.reduce((sum, t) => sum + t.nodes.filter((n) => n.observer?.viewpoint || n.observer?.role).length, 0);
  if (observerCount) cards.push({ key: "observer-tagged", value: observerCount });

  // Confidence log entries
  const logCount = topics.reduce((sum, t) => sum + t.nodes.reduce((s, n) => s + (n.confidenceLog?.length || 0), 0), 0);
  if (logCount) cards.push({ key: "confidence-logs", value: logCount });

  // Active methods usage
  const methodUsage = new Map<string, number>();
  topics.forEach((t) => (t.activeMethods || []).forEach((m) => methodUsage.set(m, (methodUsage.get(m) || 0) + 1)));

  // Extensions coverage: how many nodes have extensions filled for each active method
  const extensionCoverage = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => {
    if (n.extensions) {
      Object.keys(n.extensions).forEach((mid) => {
        const fields = Object.keys(n.extensions![mid] || {}).length;
        if (fields > 0) extensionCoverage.set(mid, (extensionCoverage.get(mid) || 0) + 1);
      });
    }
  }));

  // Extension fields distribution (across all methods)
  const extFieldDist = new Map<string, number>();
  topics.forEach((t) => t.nodes.forEach((n) => {
    if (n.extensions) {
      Object.entries(n.extensions).forEach(([mid, fields]) => {
        Object.keys(fields as Record<string, unknown>).forEach((key) => {
          const label = `${mid.split("-")[0]}.${key}`;
          extFieldDist.set(label, (extFieldDist.get(label) || 0) + 1);
        });
      });
    }
  }));

  return { cards, typeDist, layerDist, folderDist, hypothesisDist, seciDist, membershipDist, contradictionDist, transformDist, methodUsage, extensionCoverage, extFieldDist };
}

function BarChart({ data, title, color }: { data: Map<string, number>; title: string; color?: string }) {
  const entries = Array.from(data.entries()).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const barColor = color || "bg-blue-500/30";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 text-[9px] uppercase tracking-wider text-white/30">{title}</div>
      <div className="space-y-1">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-16 truncate text-right text-[8px] text-white/40">{key}</div>
            <div className="flex-1">
              <div
                className={`h-3 rounded-sm ${barColor}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <div className="w-6 text-[8px] text-white/30">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid({
  lang,
  labels,
  cells,
  title,
  caption,
}: {
  lang: Lang;
  labels: string[];
  cells: ReturnType<typeof computeLayerConnectionHeatmap>["cells"];
  title: string;
  caption: string;
}) {
  if (labels.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-1 text-[9px] uppercase tracking-wider text-white/30">{title}</div>
      <div className="mb-3 text-[8px] text-white/25">{caption}</div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `64px repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        <div />
        {labels.map((label) => (
          <div key={`column-${label}`} className="truncate text-center text-[8px] uppercase tracking-wider text-white/35">
            {label === "(none)" ? (lang === "ja" ? "未設定" : "Unset") : label}
          </div>
        ))}
        {cells.map((row, rowIndex) => (
          <React.Fragment key={`row-${labels[rowIndex]}`}>
            <div className="truncate pr-1 text-right text-[8px] uppercase tracking-wider text-white/35">
              {labels[rowIndex] === "(none)" ? (lang === "ja" ? "未設定" : "Unset") : labels[rowIndex]}
            </div>
            {row.map((cell) => (
              <div
                key={`${cell.row}-${cell.column}`}
                className="rounded-md border px-1.5 py-2 text-center"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: `rgba(245, 158, 11, ${0.06 + cell.intensity * 0.6})`,
                }}
                title={`${cell.row} / ${cell.column}: ${cell.edgeCount} / ${cell.possibleEdges} (${(cell.density * 100).toFixed(1)}%)`}
              >
                <div className="text-[9px] font-medium text-white/80">{(cell.density * 100).toFixed(0)}%</div>
                <div className="text-[7px] text-white/35">{cell.edgeCount} / {cell.possibleEdges}</div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SphereDensityHeat({
  lang,
  bands,
}: {
  lang: Lang;
  bands: ReturnType<typeof computeSphereDensityBands>;
}) {
  if (bands.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-1 text-[9px] uppercase tracking-wider text-white/30">{t(lang, TEXT.heatmap.sphereDensity)}</div>
      <div className="mb-3 text-[8px] text-white/25">{t(lang, TEXT.heatmap.sphereCaption)}</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {bands.slice(0, 12).map((band) => (
          <div
            key={band.id}
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: `linear-gradient(135deg, rgba(34,197,94,${0.08 + band.intensity * 0.28}), rgba(59,130,246,${0.06 + band.intensity * 0.38}))`,
            }}
          >
            <div className="truncate text-[10px] text-white/75">{band.title}</div>
            <div className="mt-1 text-[16px] font-light text-white/90">{(band.density * 100).toFixed(1)}%</div>
            <div className="mt-1 flex gap-2 text-[7px] text-white/35">
              <span>{t(lang, TEXT.heatmap.nodes)} {band.nodes}</span>
              <span>{t(lang, TEXT.heatmap.edges)} {band.edges}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsView({
  topics,
  topicLinks,
  journals,
  lang = "ja",
}: {
  topics: TopicItem[];
  topicLinks: TopicLinkItem[];
  journals: JournalEntry[];
  lang?: Lang;
}) {
  const stats = useMemo(
    () => computeStats(topics, topicLinks, journals, lang),
    [topics, topicLinks, journals, lang]
  );
  const layerHeatmap = useMemo(() => computeLayerConnectionHeatmap(topics), [topics]);
  const sphereDensityBands = useMemo(() => computeSphereDensityBands(topics), [topics]);

  // Per-sphere stats
  const sphereStats = useMemo(() => {
    return topics
      .map((t) => ({
        id: t.id,
        title: t.title,
        nodes: t.nodes.length,
        edges: t.edges.length,
        density: t.nodes.length > 1 ? (t.edges.length / (t.nodes.length * (t.nodes.length - 1) / 2)).toFixed(2) : "0",
      }))
      .sort((a, b) => b.nodes - a.nodes);
  }, [topics]);

  return (
    <div className="absolute inset-0 overflow-auto bg-[#020202] p-4">
      <div className="mb-4 text-[10px] uppercase tracking-wider text-white/30">{t(lang, TEXT.header)}</div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {stats.cards.map((card) => (
          <div key={card.key} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <div className="text-[18px] font-light text-white/80">{card.value}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/30">{t(lang, TEXT.cards[card.key])}</div>
            {card.sub && <div className="mt-0.5 text-[7px] text-white/20">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Core distributions */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <BarChart data={stats.typeDist} title={t(lang, TEXT.charts.nodeTypes)} />
        <BarChart data={stats.layerDist} title={t(lang, TEXT.charts.layers)} />
        <BarChart data={stats.folderDist} title={t(lang, TEXT.charts.folders)} />
      </div>

      {/* Theory-derived distributions */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <BarChart data={stats.hypothesisDist} title={t(lang, TEXT.charts.hypothesisStages)} color="bg-orange-500/30" />
        <BarChart data={stats.seciDist} title={t(lang, TEXT.charts.seciPhases)} color="bg-green-500/30" />
        <BarChart data={stats.membershipDist} title={t(lang, TEXT.charts.membershipStatus)} color="bg-purple-500/30" />
      </div>

      {/* Edge-level distributions */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <BarChart data={stats.contradictionDist} title={t(lang, TEXT.charts.contradictionTypes)} color="bg-red-500/30" />
        <BarChart data={stats.transformDist} title={t(lang, TEXT.charts.transformOps)} color="bg-teal-500/30" />
      </div>

      {/* Management Method / Extensions distributions */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <BarChart data={stats.methodUsage} title={t(lang, TEXT.charts.activeMethods)} color="bg-indigo-500/30" />
        <BarChart data={stats.extensionCoverage} title={t(lang, TEXT.charts.extensionCoverage)} color="bg-cyan-500/30" />
        <BarChart data={stats.extFieldDist} title={t(lang, TEXT.charts.extensionFields)} color="bg-amber-500/30" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <HeatmapGrid
          lang={lang}
          labels={layerHeatmap.layers}
          cells={layerHeatmap.cells}
          title={t(lang, TEXT.heatmap.layerConnections)}
          caption={t(lang, TEXT.heatmap.layerCaption)}
        />
        <SphereDensityHeat lang={lang} bands={sphereDensityBands} />
      </div>

      {/* Per-sphere table */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="mb-2 text-[9px] uppercase tracking-wider text-white/30">{t(lang, TEXT.table.title)}</div>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-white/10 text-left text-[8px] uppercase tracking-wider text-white/30">
              <th className="px-2 py-1">{t(lang, TEXT.table.titleColumn)}</th>
              <th className="px-2 py-1">{t(lang, TEXT.table.nodesColumn)}</th>
              <th className="px-2 py-1">{t(lang, TEXT.table.edgesColumn)}</th>
              <th className="px-2 py-1">{t(lang, TEXT.table.densityColumn)}</th>
            </tr>
          </thead>
          <tbody>
            {sphereStats.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="px-2 py-1 text-white/60 truncate" style={{ maxWidth: 200 }}>{s.title}</td>
                <td className="px-2 py-1 text-white/40">{s.nodes}</td>
                <td className="px-2 py-1 text-white/40">{s.edges}</td>
                <td className="px-2 py-1 text-white/40">{s.density}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
