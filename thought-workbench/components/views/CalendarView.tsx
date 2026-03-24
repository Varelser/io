import React, { useMemo, useState } from "react";
import type { JournalEntry, TopicItem } from "../../types";

type CalendarViewProps = {
  journals: JournalEntry[];
  topics: TopicItem[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  onSelectTopic: (tid: string, nid: string | null) => void;
  lang?: "ja" | "en";
};

const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function parseDateStr(s: string): { year: number; month: number; day: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function CalendarView({ journals, topics, selectedDate, onChangeDate, onSelectTopic, lang }: CalendarViewProps) {
  const l = lang || "ja";
  const dayLabels = l === "ja" ? DAY_LABELS_JA : DAY_LABELS_EN;

  const sel = parseDateStr(selectedDate);
  const [viewYear, setViewYear] = useState(sel.year);
  const [viewMonth, setViewMonth] = useState(sel.month);

  const todayStr = useMemo(() => {
    const now = new Date();
    return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Build lookup maps for the current month
  const journalByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const j of journals) {
      const existing = map.get(j.date);
      if (existing) existing.push(j);
      else map.set(j.date, [j]);
    }
    return map;
  }, [journals]);

  const nodesCreatedByDate = useMemo(() => {
    const map = new Map<string, { topicId: string; nodeId: string; label: string; topicTitle: string }[]>();
    for (const t of topics) {
      for (const n of t.nodes) {
        if (n.createdAt) {
          const d = n.createdAt.substring(0, 10);
          const entry = { topicId: t.id, nodeId: n.id, label: n.label, topicTitle: t.title };
          const existing = map.get(d);
          if (existing) existing.push(entry);
          else map.set(d, [entry]);
        }
      }
    }
    return map;
  }, [topics]);

  const nodesUpdatedByDate = useMemo(() => {
    const map = new Map<string, { topicId: string; nodeId: string; label: string; topicTitle: string }[]>();
    for (const t of topics) {
      for (const n of t.nodes) {
        if (n.updatedAt) {
          const d = n.updatedAt.substring(0, 10);
          // Skip if same as creation date
          if (n.createdAt && n.createdAt.substring(0, 10) === d) continue;
          const entry = { topicId: t.id, nodeId: n.id, label: n.label, topicTitle: t.title };
          const existing = map.get(d);
          if (existing) existing.push(entry);
          else map.set(d, [entry]);
        }
      }
    }
    return map;
  }, [topics]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const monthLabel = l === "ja"
    ? `${viewYear}年 ${viewMonth + 1}月`
    : `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][viewMonth]} ${viewYear}`;

  // Summary for selected date
  const selectedJournals = journalByDate.get(selectedDate) || [];
  const selectedCreated = nodesCreatedByDate.get(selectedDate) || [];
  const selectedUpdated = nodesUpdatedByDate.get(selectedDate) || [];

  return (
    <div className="absolute inset-0 overflow-auto p-4" style={{ background: "var(--tw-bg)" }}>
      <div className="mx-auto max-w-[560px]">
        <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--tw-text-muted)" }}>
          {l === "ja" ? "カレンダー" : "Calendar"}
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goPrev}
            className="px-2 py-1 rounded text-[11px] border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--tw-border)", color: "var(--tw-text)", background: "var(--tw-bg-card)" }}
          >
            {"<"}
          </button>
          <div className="text-[13px] font-medium" style={{ color: "var(--tw-text)" }}>{monthLabel}</div>
          <button
            onClick={goNext}
            className="px-2 py-1 rounded text-[11px] border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--tw-border)", color: "var(--tw-text)", background: "var(--tw-bg-card)" }}
          >
            {">"}
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-px mb-px">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-center text-[9px] py-1" style={{ color: "var(--tw-text-muted)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border" style={{ borderColor: "var(--tw-border)" }}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="min-h-[52px]" style={{ background: "var(--tw-bg)" }} />;
            }
            const dateStr = toDateStr(viewYear, viewMonth, day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasJournal = journalByDate.has(dateStr);
            const hasCreated = nodesCreatedByDate.has(dateStr);
            const hasUpdated = nodesUpdatedByDate.has(dateStr);

            return (
              <button
                key={idx}
                onClick={() => onChangeDate(dateStr)}
                className="min-h-[52px] p-1 text-left transition-colors relative"
                style={{
                  background: isSelected ? "var(--tw-accent)" : "var(--tw-bg-card)",
                  borderWidth: isToday && !isSelected ? "1px" : "0px",
                  borderStyle: "solid",
                  borderColor: isToday ? "var(--tw-accent)" : "transparent",
                }}
              >
                <div
                  className="text-[10px] font-medium"
                  style={{ color: isSelected ? "#fff" : "var(--tw-text)" }}
                >
                  {day}
                </div>
                <div className="flex gap-0.5 mt-0.5">
                  {hasJournal && (
                    <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#4ade80" }} />
                  )}
                  {hasCreated && (
                    <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#60a5fa" }} />
                  )}
                  {hasUpdated && (
                    <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#fb923c" }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-2 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#4ade80" }} />
            {l === "ja" ? "ジャーナル" : "Journal"}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#60a5fa" }} />
            {l === "ja" ? "ノード作成" : "Created"}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "#fb923c" }} />
            {l === "ja" ? "ノード更新" : "Updated"}
          </span>
        </div>

        {/* Summary panel */}
        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
          <div className="text-[11px] font-medium mb-2" style={{ color: "var(--tw-text)" }}>
            {selectedDate}
          </div>

          {selectedJournals.length === 0 && selectedCreated.length === 0 && selectedUpdated.length === 0 && (
            <div className="text-[9px]" style={{ color: "var(--tw-text-muted)" }}>
              {l === "ja" ? "この日のデータはありません" : "No data for this day"}
            </div>
          )}

          {/* Journal entries */}
          {selectedJournals.length > 0 && (
            <div className="mb-2">
              <div className="text-[8px] uppercase tracking-wider mb-1" style={{ color: "var(--tw-text-muted)" }}>
                {l === "ja" ? "ジャーナル" : "Journal"}
              </div>
              {selectedJournals.map((j) => (
                <div
                  key={j.id}
                  className="rounded border px-2 py-1 mb-0.5 text-[9px] truncate"
                  style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)" }}
                >
                  {j.body.substring(0, 100) || `(${l === "ja" ? "空" : "empty"})`}
                  {j.mood && <span className="ml-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>({j.mood})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Nodes created */}
          {selectedCreated.length > 0 && (
            <div className="mb-2">
              <div className="text-[8px] uppercase tracking-wider mb-1" style={{ color: "var(--tw-text-muted)" }}>
                {l === "ja" ? "作成されたノード" : "Nodes Created"}
              </div>
              {selectedCreated.map((n, i) => (
                <button
                  key={`${n.nodeId}-${i}`}
                  onClick={() => onSelectTopic(n.topicId, n.nodeId)}
                  className="block w-full text-left rounded border px-2 py-0.5 mb-0.5 text-[9px] truncate transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--tw-border)", color: "#60a5fa" }}
                >
                  {n.label}
                  <span className="ml-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>({n.topicTitle})</span>
                </button>
              ))}
            </div>
          )}

          {/* Nodes updated */}
          {selectedUpdated.length > 0 && (
            <div>
              <div className="text-[8px] uppercase tracking-wider mb-1" style={{ color: "var(--tw-text-muted)" }}>
                {l === "ja" ? "更新されたノード" : "Nodes Updated"}
              </div>
              {selectedUpdated.map((n, i) => (
                <button
                  key={`${n.nodeId}-${i}`}
                  onClick={() => onSelectTopic(n.topicId, n.nodeId)}
                  className="block w-full text-left rounded border px-2 py-0.5 mb-0.5 text-[9px] truncate transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--tw-border)", color: "#fb923c" }}
                >
                  {n.label}
                  <span className="ml-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>({n.topicTitle})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
