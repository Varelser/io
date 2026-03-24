import React, { useMemo, useState, useRef, useCallback } from "react";
import type { TopicItem, NodeItem } from "../../types";
import { buildTimelinePoints, computeTimelineComparison, type TimelineAxis, type TimelineDeltaEntry, type TimelineWindow } from "../../graph-analytics/timeline";
import { executeQuery } from "../../utils/query-engine";

type TimelineNode = {
  node: NodeItem;
  topicId: string;
  topicTitle: string;
  ts: number; // epoch ms
  dateStr: string;
};

type TimelineGroup = "none" | "type" | "layer" | "depth" | "topic";

const GROUP_LABELS: Record<TimelineGroup, { ja: string; en: string }> = {
  none: { ja: "なし", en: "None" },
  type: { ja: "タイプ", en: "Type" },
  layer: { ja: "レイヤー", en: "Layer" },
  depth: { ja: "深度", en: "Depth" },
  topic: { ja: "球体", en: "Sphere" },
};

const TYPE_COLORS: Record<string, string> = {
  opinion: "#3b82f6", fact: "#22c55e", question: "#f59e0b", idea: "#a855f7",
  emotion: "#ec4899", action: "#06b6d4", reference: "#64748b", meta: "#6366f1",
};

function getColor(node: NodeItem): string {
  return TYPE_COLORS[node.type] || "#94a3b8";
}

function groupItems(items: TimelineNode[], groupBy: TimelineGroup): Map<string, TimelineNode[]> {
  const map = new Map<string, TimelineNode[]>();
  for (const item of items) {
    let key: string;
    switch (groupBy) {
      case "type": key = item.node.type; break;
      case "layer": key = item.node.layer || "(none)"; break;
      case "depth": key = `d${item.node.depth ?? 0}`; break;
      case "topic": key = item.topicTitle; break;
      default: key = "all"; break;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

const WINDOW_DAY_OPTIONS = [3, 7, 14, 30, 90] as const;

function formatRangeLabel(startTs: number, endTs: number, lang: "ja" | "en") {
  const locale = lang === "ja" ? "ja-JP" : "en-US";
  return `${new Date(startTs).toLocaleDateString(locale)} - ${new Date(endTs).toLocaleDateString(locale)}`;
}

function formatAnchorLabel(ts: number, lang: "ja" | "en") {
  const locale = lang === "ja" ? "ja-JP" : "en-US";
  return new Date(ts).toLocaleDateString(locale);
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function WindowBand({
  window,
  xPos,
  color,
  label,
}: {
  window: TimelineWindow;
  xPos: (ts: number) => number;
  color: string;
  label: string;
}) {
  const left = Math.max(0, Math.min(100, xPos(window.startTs)));
  const right = Math.max(0, Math.min(100, xPos(window.endTs)));
  const width = Math.max(right - left, 0.8);
  return (
    <div
      className="absolute top-5 bottom-0 rounded-md border"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: `${color}18`,
        borderColor: `${color}44`,
      }}
    >
      <div className="absolute left-1 top-1 rounded px-1 py-0.5 text-[7px] font-medium" style={{ color, background: "rgba(0,0,0,0.32)" }}>
        {label}
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  rangeLabel,
  summary,
  accent,
  lang,
}: {
  title: string;
  rangeLabel: string;
  summary: ReturnType<typeof computeTimelineComparison>["summaryA"];
  accent: string;
  lang: "ja" | "en";
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: `${accent}44`, background: `${accent}10` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium" style={{ color: accent }}>{title}</div>
        <div className="text-[8px] text-white/35">{rangeLabel}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-white/8 bg-black/15 p-2">
          <div className="text-[14px] text-white/85">{summary.nodeCount}</div>
          <div className="text-[8px] text-white/35">{lang === "ja" ? "ノード" : "Nodes"}</div>
        </div>
        <div className="rounded-md border border-white/8 bg-black/15 p-2">
          <div className="text-[14px] text-white/85">{summary.topicCount}</div>
          <div className="text-[8px] text-white/35">{lang === "ja" ? "球体" : "Spheres"}</div>
        </div>
        <div className="rounded-md border border-white/8 bg-black/15 p-2">
          <div className="text-[14px] text-white/85">{summary.typeCount}</div>
          <div className="text-[8px] text-white/35">{lang === "ja" ? "タイプ" : "Types"}</div>
        </div>
        <div className="rounded-md border border-white/8 bg-black/15 p-2">
          <div className="text-[14px] text-white/85">{summary.avgPerDay.toFixed(1)}</div>
          <div className="text-[8px] text-white/35">{lang === "ja" ? "件 / 日" : "per day"}</div>
        </div>
      </div>
    </div>
  );
}

function DeltaPanel({
  title,
  entries,
  lang,
}: {
  title: string;
  entries: TimelineDeltaEntry[];
  lang: "ja" | "en";
}) {
  const visibleEntries = entries.filter((entry) => entry.countA > 0 || entry.countB > 0).slice(0, 6);
  if (visibleEntries.length === 0) return null;
  const max = Math.max(...visibleEntries.map((entry) => Math.abs(entry.delta)), 1);

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <div className="mb-3 text-[9px] uppercase tracking-wider text-white/30">{title}</div>
      <div className="space-y-2">
        {visibleEntries.map((entry) => {
          const width = `${(Math.abs(entry.delta) / max) * 50}%`;
          const isPositive = entry.delta >= 0;
          return (
            <div key={entry.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[8px]">
                <div className="truncate text-white/60">{entry.key}</div>
                <div className="shrink-0 text-white/35">
                  A {entry.countA} / B {entry.countB} / {lang === "ja" ? "差分" : "Delta"} {formatDelta(entry.delta)}
                </div>
              </div>
              <div className="relative h-3 rounded bg-white/[0.04]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                <div
                  className="absolute inset-y-0 rounded"
                  style={isPositive
                    ? { left: "50%", width, background: "rgba(96, 165, 250, 0.55)" }
                    : { left: `calc(50% - ${width})`, width, background: "rgba(245, 158, 11, 0.55)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineView({
  topics,
  lang,
  onSelectNode,
}: {
  topics: TopicItem[];
  lang?: "ja" | "en";
  onSelectNode?: (topicId: string, nodeId: string) => void;
}) {
  const l = lang || "ja";
  const [axis, setAxis] = useState<TimelineAxis>("created");
  const [groupBy, setGroupBy] = useState<TimelineGroup>("none");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState(25);
  const [compareB, setCompareB] = useState(75);
  const [compareWindowDays, setCompareWindowDays] = useState<number>(14);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => buildTimelinePoints(topics, axis), [topics, axis]);
  const grouped = useMemo(() => groupItems(allItems, groupBy), [allItems, groupBy]);

  // Time range
  const minTs = allItems.length > 0 ? allItems[0].ts : Date.now();
  const maxTs = allItems.length > 0 ? allItems[allItems.length - 1].ts : Date.now();
  const range = Math.max(maxTs - minTs, 86400000); // min 1 day

  // Date ticks
  const ticks = useMemo(() => {
    const result: { ts: number; label: string }[] = [];
    if (allItems.length === 0) return result;
    const dayMs = 86400000;
    const startDay = Math.floor(minTs / dayMs) * dayMs;
    const endDay = Math.ceil(maxTs / dayMs) * dayMs;
    const totalDays = (endDay - startDay) / dayMs;
    const step = totalDays <= 14 ? 1 : totalDays <= 60 ? 7 : 30;
    for (let t = startDay; t <= endDay; t += step * dayMs) {
      const d = new Date(t);
      result.push({
        ts: t,
        label: step >= 30
          ? `${d.getFullYear()}/${d.getMonth() + 1}`
          : `${d.getMonth() + 1}/${d.getDate()}`,
      });
    }
    return result;
  }, [minTs, maxTs, allItems.length]);

  const xPos = useCallback((ts: number) => {
    return ((ts - minTs) / range) * 100;
  }, [minTs, range]);

  const groups = Array.from(grouped.entries());
  const anchorATs = minTs + (range * compareA) / 100;
  const anchorBTs = minTs + (range * compareB) / 100;
  const comparison = useMemo(
    () => computeTimelineComparison(allItems, anchorATs, anchorBTs, compareWindowDays * 86400000),
    [allItems, anchorATs, anchorBTs, compareWindowDays]
  );

  return (
    <div className="p-4 h-full overflow-auto" style={{ background: "var(--tw-bg)", color: "var(--tw-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="text-[13px] font-medium">{l === "ja" ? "タイムライン" : "Timeline"}</div>
        <div className="text-[9px]" style={{ color: "var(--tw-text-dim)" }}>
          {allItems.length} {l === "ja" ? "ノード" : "nodes"}
        </div>

        {/* Axis toggle */}
        <div className="flex gap-1 ml-auto">
          {(["created", "updated"] as TimelineAxis[]).map((a) => (
            <button
              key={a}
              onClick={() => setAxis(a)}
              className="rounded-full px-2 py-0.5 text-[8px] border"
              style={{
                borderColor: axis === a ? "var(--tw-accent)" : "var(--tw-border)",
                background: axis === a ? "var(--tw-accent)" : "transparent",
                color: axis === a ? "#fff" : "var(--tw-text-dim)",
              }}
            >
              {a === "created" ? (l === "ja" ? "作成日" : "Created") : (l === "ja" ? "更新日" : "Updated")}
            </button>
          ))}
        </div>

        {/* Group by */}
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as TimelineGroup)}
          className="rounded border px-1.5 py-0.5 text-[8px]"
          style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
        >
          {(Object.keys(GROUP_LABELS) as TimelineGroup[]).map((g) => (
            <option key={g} value={g}>{GROUP_LABELS[g][l]}</option>
          ))}
        </select>

        <select
          value={compareWindowDays}
          onChange={(e) => setCompareWindowDays(Number(e.target.value))}
          className="rounded border px-1.5 py-0.5 text-[8px]"
          style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
        >
          {WINDOW_DAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {l === "ja" ? `比較窓 ${days}日` : `${days}d window`}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-amber-300">
              {l === "ja" ? "比較アンカー A" : "Compare Anchor A"}
            </span>
            <span className="text-[8px] text-white/35">{formatAnchorLabel(anchorATs, l)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={compareA}
            onChange={(e) => setCompareA(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </label>
        <label className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-blue-300">
              {l === "ja" ? "比較アンカー B" : "Compare Anchor B"}
            </span>
            <span className="text-[8px] text-white/35">{formatAnchorLabel(anchorBTs, l)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={compareB}
            onChange={(e) => setCompareB(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
        </label>
      </div>

      {/* Timeline area */}
      <div ref={containerRef} className="relative" style={{ minHeight: groups.length * 48 + 40 }}>
        {/* Date ticks */}
        <div className="relative h-5 mb-1" style={{ borderBottom: "1px solid var(--tw-border)" }}>
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute text-[7px]"
              style={{
                left: `${xPos(tick.ts)}%`,
                color: "var(--tw-text-muted)",
                transform: "translateX(-50%)",
              }}
            >
              {tick.label}
            </div>
          ))}
        </div>

        {/* Vertical grid lines */}
        {ticks.map((tick, i) => (
          <div
            key={`g${i}`}
            className="absolute top-5 bottom-0"
            style={{
              left: `${xPos(tick.ts)}%`,
              width: 1,
              background: "var(--tw-border)",
              opacity: 0.3,
            }}
          />
        ))}

        <WindowBand window={comparison.windowA} xPos={xPos} color="#f59e0b" label={l === "ja" ? "A 窓" : "A Window"} />
        <WindowBand window={comparison.windowB} xPos={xPos} color="#60a5fa" label={l === "ja" ? "B 窓" : "B Window"} />

        {/* Lanes */}
        {groups.map(([groupKey, items], laneIdx) => (
          <div key={groupKey} className="relative" style={{ height: 44, marginTop: 4 }}>
            {/* Lane label */}
            {groupBy !== "none" && (
              <div
                className="absolute left-0 top-0 text-[7px] z-10 px-1 rounded"
                style={{ color: "var(--tw-text-muted)", background: "var(--tw-bg-panel)" }}
              >
                {groupKey}
              </div>
            )}

            {/* Lane background */}
            <div
              className="absolute inset-x-0 top-2 bottom-0 rounded"
              style={{ background: laneIdx % 2 === 0 ? "var(--tw-bg-card)" : "transparent" }}
            />

            {/* Nodes */}
            {items.map((item) => {
              const x = xPos(item.ts);
              const isHovered = hoveredId === item.node.id;
              const inA = comparison.windowA.nodeIds.has(item.node.id);
              const inB = comparison.windowB.nodeIds.has(item.node.id);
              const accent = inA && inB ? "#f472b6" : inA ? "#f59e0b" : inB ? "#60a5fa" : null;
              return (
                <div
                  key={item.node.id}
                  className="absolute cursor-pointer transition-transform"
                  style={{
                    left: `${x}%`,
                    top: 8,
                    transform: `translateX(-50%) ${isHovered ? "scale(1.6)" : "scale(1)"}`,
                    zIndex: isHovered ? 20 : 1,
                  }}
                  onMouseEnter={() => setHoveredId(item.node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectNode?.(item.topicId, item.node.id)}
                >
                  {/* Dot */}
                  <div
                    className="rounded-full"
                    style={{
                      width: isHovered || accent ? 10 : 8,
                      height: isHovered || accent ? 10 : 8,
                      background: getColor(item.node),
                      opacity: isHovered || accent ? 1 : 0.7,
                      boxShadow: accent
                        ? `0 0 0 2px ${accent}, 0 0 8px ${accent}`
                        : isHovered
                          ? `0 0 6px ${getColor(item.node)}`
                          : "none",
                    }}
                  />

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[7px] pointer-events-none"
                      style={{ background: "var(--tw-bg-panel)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
                    >
                      <div className="font-medium">{item.node.label}</div>
                      <div style={{ color: "var(--tw-text-muted)" }}>
                        {item.topicTitle} / {item.node.type} / {item.dateStr}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ComparisonCard
          title={l === "ja" ? "比較期間 A" : "Window A"}
          rangeLabel={formatRangeLabel(comparison.windowA.startTs, comparison.windowA.endTs, l)}
          summary={comparison.summaryA}
          accent="#f59e0b"
          lang={l}
        />
        <ComparisonCard
          title={l === "ja" ? "比較期間 B" : "Window B"}
          rangeLabel={formatRangeLabel(comparison.windowB.startTs, comparison.windowB.endTs, l)}
          summary={comparison.summaryB}
          accent="#60a5fa"
          lang={l}
        />
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-medium text-white/75">{l === "ja" ? "変化サマリー" : "Change Summary"}</div>
          <div className="space-y-2 text-[9px] text-white/55">
            <div>{l === "ja" ? "ノード差分" : "Node delta"}: <span className="text-white/85">{formatDelta(comparison.summaryB.nodeCount - comparison.summaryA.nodeCount)}</span></div>
            <div>{l === "ja" ? "球体差分" : "Sphere delta"}: <span className="text-white/85">{formatDelta(comparison.summaryB.topicCount - comparison.summaryA.topicCount)}</span></div>
            <div>{l === "ja" ? "タイプ差分" : "Type delta"}: <span className="text-white/85">{formatDelta(comparison.summaryB.typeCount - comparison.summaryA.typeCount)}</span></div>
            <div>{l === "ja" ? "日次ペース差分" : "Per-day delta"}: <span className="text-white/85">{formatDelta(Number((comparison.summaryB.avgPerDay - comparison.summaryA.avgPerDay).toFixed(1)))}</span></div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <DeltaPanel title={l === "ja" ? "タイプ変化" : "Type Shifts"} entries={comparison.typeDeltas} lang={l} />
        <DeltaPanel title={l === "ja" ? "レイヤー変化" : "Layer Shifts"} entries={comparison.layerDeltas} lang={l} />
        <DeltaPanel title={l === "ja" ? "球体変化" : "Sphere Shifts"} entries={comparison.topicDeltas} lang={l} />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>{type}</span>
          </div>
        ))}
      </div>

      {/* ── 時点クエリ (Timeline-aware Query) ── */}
      <TimelineQuerySection topics={topics} lang={l} onSelectNode={onSelectNode} />
    </div>
  );
}

function TimelineQuerySection({
  topics,
  lang,
  onSelectNode,
}: {
  topics: TopicItem[];
  lang: "ja" | "en";
  onSelectNode?: (topicId: string, nodeId: string) => void;
}) {
  const l = lang;
  const [open, setOpen] = useState(false);
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<ReturnType<typeof executeQuery>>([]);
  const [ran, setRan] = useState(false);

  const handleRun = () => {
    if (!queryText.trim()) return;
    const asOfTs = asOf ? `${asOf}T23:59:59.999Z` : undefined;
    const r = executeQuery(queryText, topics, asOfTs);
    setResults(r);
    setRan(true);
  };

  return (
    <div className="mt-4 rounded-lg border" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-medium"
        style={{ color: "var(--tw-text)" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{l === "ja" ? "時点クエリ (過去時点での検索)" : "Timeline Query (search at a point in time)"}</span>
        <span style={{ color: "var(--tw-text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
            {l === "ja"
              ? "指定日時点で存在したノードに限定してクエリを実行します。"
              : "Evaluates the query against nodes that existed at the specified date."}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-[7px] mb-0.5" style={{ color: "var(--tw-text-muted)" }}>{l === "ja" ? "時点 (asOf)" : "As of date"}</div>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="w-full rounded border px-1.5 py-1 text-[9px]"
                style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
              />
            </div>
            <div className="flex-[2]">
              <div className="text-[7px] mb-0.5" style={{ color: "var(--tw-text-muted)" }}>{l === "ja" ? "クエリ" : "Query"}</div>
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
                placeholder={l === "ja" ? "type:hypothesis work:active ..." : "type:hypothesis work:active ..."}
                className="w-full rounded border px-1.5 py-1 text-[9px]"
                style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRun}
                className="rounded border px-2 py-1 text-[8px]"
                style={{ background: "var(--tw-accent)", borderColor: "var(--tw-accent)", color: "#fff" }}
              >
                {l === "ja" ? "実行" : "Run"}
              </button>
            </div>
          </div>

          {ran && (
            <div>
              <div className="text-[7px] mb-1" style={{ color: "var(--tw-text-muted)" }}>
                {l === "ja" ? `${results.length}件 (${asOf}時点)` : `${results.length} result(s) as of ${asOf}`}
              </div>
              {results.length === 0 ? (
                <div className="text-[8px] py-2 text-center" style={{ color: "var(--tw-text-muted)" }}>
                  {l === "ja" ? "該当なし" : "No matches"}
                </div>
              ) : (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {results.slice(0, 100).map((r) => (
                    <div
                      key={`${r.topicId}:${r.node.id}`}
                      className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer"
                      style={{ background: "var(--tw-bg-input)" }}
                      onClick={() => onSelectNode?.(r.topicId, r.node.id)}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: TYPE_COLORS[r.node.type] || "#94a3b8" }}
                      />
                      <span className="flex-1 truncate text-[8px]" style={{ color: "var(--tw-text)" }}>{r.node.label}</span>
                      <span className="text-[7px] shrink-0" style={{ color: "var(--tw-text-muted)" }}>{r.topicTitle}</span>
                      {r.node.createdAt && (
                        <span className="text-[7px] shrink-0" style={{ color: "var(--tw-text-muted)" }}>
                          {new Date(r.node.createdAt).toLocaleDateString(l === "ja" ? "ja-JP" : "en-US")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
