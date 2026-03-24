import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EventLogEntry, EventKind, HistoryFrame, ScenarioBranch } from "../types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineScrubberProps {
  events: EventLogEntry[];
  historyFrames: HistoryFrame[];
  branches?: ScenarioBranch[];
  onScrubToEvent?: (event: EventLogEntry) => void;
  onApplyFrame?: (frameId: string) => void;
  onCreateBranch?: (anchor: { eventId: string; ts: string; topicId?: string; targetLabel?: string }) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  dragOffsetY?: number;
  onStartDrag?: React.MouseEventHandler<HTMLButtonElement>;
  onResetPosition?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 100;
const BUCKET_COUNT = 120;
const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

const KIND_COLORS: Record<string, string> = {
  "node:create": "#4ade80",
  "edge:create": "#4ade80",
  "topic:create": "#4ade80",
  "node:update": "#60a5fa",
  "edge:update": "#60a5fa",
  "topic:update": "#60a5fa",
  "extensions:update": "#60a5fa",
  "node:delete": "#f87171",
  "edge:delete": "#f87171",
  "topic:delete": "#f87171",
  "journal:add": "#fbbf24",
  "method:toggle": "#c084fc",
  "snapshot:create": "#e2e8f0",
};

function getKindColor(kind: EventKind): string {
  return KIND_COLORS[kind] ?? "#94a3b8";
}

function getKindLabel(kind: EventKind): string {
  const map: Record<string, string> = {
    "node:create": "Node Created",
    "node:update": "Node Updated",
    "node:delete": "Node Deleted",
    "edge:create": "Edge Created",
    "edge:update": "Edge Updated",
    "edge:delete": "Edge Deleted",
    "topic:create": "Topic Created",
    "topic:update": "Topic Updated",
    "topic:delete": "Topic Deleted",
    "journal:add": "Journal Added",
    "method:toggle": "Method Toggled",
    "snapshot:create": "Snapshot Created",
    "extensions:update": "Extensions Updated",
  };
  return map[kind] ?? kind;
}

/* ------------------------------------------------------------------ */
/*  Utility: format elapsed time label                                 */
/* ------------------------------------------------------------------ */

function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  events,
  historyFrames,
  branches = [],
  onScrubToEvent,
  onApplyFrame,
  onCreateBranch,
  collapsed = false,
  onToggleCollapse,
  dragOffsetY = 0,
  onStartDrag,
  onResetPosition,
}) => {
  /* ---- Refs ---- */
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  /* ---- State ---- */
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState<EventLogEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [hoveredFrame, setHoveredFrame] = useState<HistoryFrame | null>(null);
  const [frameTooltipPos, setFrameTooltipPos] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [compareAIndex, setCompareAIndex] = useState<number | null>(null);
  const [compareBIndex, setCompareBIndex] = useState<number | null>(null);

  const speed = PLAYBACK_SPEEDS[speedIndex];

  /* ---- Derived: sorted events ---- */
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
  }, [events]);
  const currentEvent = currentIndex >= 0 && currentIndex < sortedEvents.length ? sortedEvents[currentIndex] : null;

  /* ---- Derived: time range ---- */
  const { minTs, maxTs, rangeMs } = useMemo(() => {
    if (sortedEvents.length === 0) {
      const now = Date.now();
      return { minTs: now - 3600_000, maxTs: now, rangeMs: 3600_000 };
    }
    const min = new Date(sortedEvents[0].ts).getTime();
    const max = new Date(sortedEvents[sortedEvents.length - 1].ts).getTime();
    const padding = Math.max((max - min) * 0.05, 60_000);
    return {
      minTs: min - padding,
      maxTs: max + padding,
      rangeMs: max - min + padding * 2,
    };
  }, [sortedEvents]);

  /* ---- Derived: visible range (zoom + pan) ---- */
  const { visibleMin, visibleMax, visibleRange } = useMemo(() => {
    const viewSpan = rangeMs / zoomLevel;
    const center = (minTs + maxTs) / 2 + panOffset;
    const vMin = center - viewSpan / 2;
    const vMax = center + viewSpan / 2;
    return { visibleMin: vMin, visibleMax: vMax, visibleRange: vMax - vMin };
  }, [minTs, maxTs, rangeMs, zoomLevel, panOffset]);

  /* ---- Derived: density buckets ---- */
  const densityBuckets = useMemo(() => {
    const buckets = new Array(BUCKET_COUNT).fill(0) as number[];
    const bucketWidth = visibleRange / BUCKET_COUNT;
    if (bucketWidth <= 0) return buckets;

    for (const ev of sortedEvents) {
      const ts = new Date(ev.ts).getTime();
      const idx = Math.floor((ts - visibleMin) / bucketWidth);
      if (idx >= 0 && idx < BUCKET_COUNT) {
        buckets[idx]++;
      }
    }
    return buckets;
  }, [sortedEvents, visibleMin, visibleRange]);

  const maxDensity = useMemo(
    () => Math.max(1, ...densityBuckets),
    [densityBuckets]
  );

  /* ---- Derived: time labels ---- */
  const timeLabels = useMemo(() => {
    const labels: { x: number; text: string }[] = [];
    const labelCount = Math.max(4, Math.min(12, Math.floor(zoomLevel * 6)));
    for (let i = 0; i <= labelCount; i++) {
      const fraction = i / labelCount;
      const ts = visibleMin + fraction * visibleRange;
      labels.push({
        x: fraction * 100,
        text: formatTimeLabel(ts),
      });
    }
    return labels;
  }, [visibleMin, visibleRange, zoomLevel]);

  /* ---- Position helpers ---- */
  const tsToPercent = useCallback(
    (ts: number): number => {
      if (visibleRange <= 0) return 50;
      return ((ts - visibleMin) / visibleRange) * 100;
    },
    [visibleMin, visibleRange]
  );

  const percentToTs = useCallback(
    (pct: number): number => {
      return visibleMin + (pct / 100) * visibleRange;
    },
    [visibleMin, visibleRange]
  );

  const clientXToPercent = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  /* ---- Find nearest event to a timestamp ---- */
  const findNearestEvent = useCallback(
    (ts: number): number => {
      if (sortedEvents.length === 0) return -1;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < sortedEvents.length; i++) {
        const dist = Math.abs(new Date(sortedEvents[i].ts).getTime() - ts);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    },
    [sortedEvents]
  );

  /* ---- Scrub handler ---- */
  const handleScrub = useCallback(
    (clientX: number) => {
      const pct = clientXToPercent(clientX);
      const ts = percentToTs(pct);
      const idx = findNearestEvent(ts);
      if (idx >= 0) {
        setCurrentIndex(idx);
        onScrubToEvent?.(sortedEvents[idx]);
      }
    },
    [clientXToPercent, percentToTs, findNearestEvent, sortedEvents, onScrubToEvent]
  );

  /* ---- Mouse / drag ---- */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      handleScrub(e.clientX);
    },
    [handleScrub]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleScrub(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleScrub]);

  /* ---- Zoom (mouse wheel) ---- */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        // Pan
        const delta = (e.deltaY / 500) * visibleRange;
        setPanOffset((prev) => prev + delta);
      } else {
        // Zoom
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoomLevel((prev) => Math.max(0.1, Math.min(50, prev * factor)));
      }
    },
    [visibleRange]
  );

  /* ---- Playback ---- */
  useEffect(() => {
    if (!isPlaying || sortedEvents.length === 0) return;

    const intervalMs = 800 / speed;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= sortedEvents.length) {
          setIsPlaying(false);
          return prev;
        }
        onScrubToEvent?.(sortedEvents[next]);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, sortedEvents, onScrubToEvent]);

  /* ---- Toggle play/pause ---- */
  const togglePlay = useCallback(() => {
    if (!isPlaying && currentIndex >= sortedEvents.length - 1) {
      setCurrentIndex(-1);
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, currentIndex, sortedEvents.length]);

  /* ---- Cycle speed ---- */
  const cycleSpeed = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % PLAYBACK_SPEEDS.length);
  }, []);

  /* ---- Current playhead position ---- */
  const playheadPercent = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= sortedEvents.length) return -1;
    const ts = new Date(sortedEvents[currentIndex].ts).getTime();
    return tsToPercent(ts);
  }, [currentIndex, sortedEvents, tsToPercent]);
  const compareDeltaLabel = useMemo(() => {
    if (compareAIndex === null || compareBIndex === null) return "";
    const eventA = sortedEvents[compareAIndex];
    const eventB = sortedEvents[compareBIndex];
    if (!eventA || !eventB) return "";
    const deltaMs = Math.abs(new Date(eventB.ts).getTime() - new Date(eventA.ts).getTime());
    const minutes = Math.round(deltaMs / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = (deltaMs / 3600000).toFixed(1);
    if (deltaMs < 86400000) return `${hours}h`;
    const days = (deltaMs / 86400000).toFixed(1);
    return `${days}d`;
  }, [compareAIndex, compareBIndex, sortedEvents]);

  /* ---- Layout vars ---- */
  const barHeight = collapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;

  /* ---- Render ---- */
  return (
    <div
      style={{
        position: "fixed",
        bottom: `${Math.max(0, -dragOffsetY)}px`,
        left: 0,
        right: 0,
        height: barHeight,
        background: "var(--tw-bg-panel, #1e1e2e)",
        borderTop: "1px solid var(--tw-border, #333)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        transition: "height 0.2s ease",
        userSelect: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ---- Top row: controls ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 28,
          minHeight: 28,
          padding: "0 8px",
          gap: 6,
          borderBottom: collapsed
            ? "none"
            : "1px solid var(--tw-border, #333)",
        }}
      >
        {/* Collapse toggle */}
        <button
          onMouseDown={onStartDrag}
          onDoubleClick={onResetPosition}
          title="Drag timeline / double click to reset"
          style={{
            background: "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: "var(--tw-text-dim, #888)",
            cursor: "grab",
            fontSize: 10,
            padding: "1px 6px",
            lineHeight: 1.4,
          }}
        >
          ⋮⋮
        </button>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand timeline" : "Collapse timeline"}
          style={{
            background: "none",
            border: "none",
            color: "var(--tw-text-dim, #888)",
            cursor: "pointer",
            fontSize: 14,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          {collapsed ? "\u25B2" : "\u25BC"}
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={sortedEvents.length === 0}
          title={isPlaying ? "Pause" : "Play"}
          style={{
            background: "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: "var(--tw-text, #ccc)",
            cursor: sortedEvents.length === 0 ? "not-allowed" : "pointer",
            fontSize: 12,
            padding: "1px 8px",
            lineHeight: 1.4,
            opacity: sortedEvents.length === 0 ? 0.4 : 1,
          }}
        >
          {isPlaying ? "\u275A\u275A" : "\u25B6"}
        </button>

        {/* Speed control */}
        <button
          onClick={cycleSpeed}
          title="Playback speed"
          style={{
            background: "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: "var(--tw-text-dim, #888)",
            cursor: "pointer",
            fontSize: 11,
            padding: "1px 6px",
            lineHeight: 1.4,
            minWidth: 36,
            textAlign: "center",
          }}
        >
          {speed}x
        </button>

        <button
          onClick={() => currentIndex >= 0 && setCompareAIndex(currentIndex)}
          disabled={currentIndex < 0}
          title="Set compare anchor A"
          style={{
            background: compareAIndex !== null ? "rgba(245, 158, 11, 0.12)" : "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: compareAIndex !== null ? "var(--tw-accent, #f59e0b)" : "var(--tw-text-dim, #888)",
            cursor: currentIndex < 0 ? "not-allowed" : "pointer",
            fontSize: 10,
            padding: "1px 6px",
            lineHeight: 1.4,
            opacity: currentIndex < 0 ? 0.4 : 1,
          }}
        >
          A
        </button>

        <button
          onClick={() => currentIndex >= 0 && setCompareBIndex(currentIndex)}
          disabled={currentIndex < 0}
          title="Set compare anchor B"
          style={{
            background: compareBIndex !== null ? "rgba(96, 165, 250, 0.12)" : "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: compareBIndex !== null ? "#60a5fa" : "var(--tw-text-dim, #888)",
            cursor: currentIndex < 0 ? "not-allowed" : "pointer",
            fontSize: 10,
            padding: "1px 6px",
            lineHeight: 1.4,
            opacity: currentIndex < 0 ? 0.4 : 1,
          }}
        >
          B
        </button>

        <button
          onClick={() => currentEvent && onCreateBranch?.({ eventId: currentEvent.id, ts: currentEvent.ts, topicId: currentEvent.topicId, targetLabel: currentEvent.targetLabel })}
          disabled={!currentEvent || !onCreateBranch}
          title="Create future branch anchor"
          style={{
            background: "none",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 4,
            color: "var(--tw-text-dim, #888)",
            cursor: !currentEvent || !onCreateBranch ? "not-allowed" : "pointer",
            fontSize: 10,
            padding: "1px 6px",
            lineHeight: 1.4,
            opacity: !currentEvent || !onCreateBranch ? 0.4 : 1,
          }}
        >
          Branch
        </button>

        {(compareAIndex !== null || compareBIndex !== null) && (
          <button
            onClick={() => {
              setCompareAIndex(null);
              setCompareBIndex(null);
            }}
            title="Clear compare anchors"
            style={{
              background: "none",
              border: "1px solid var(--tw-border, #444)",
              borderRadius: 4,
              color: "var(--tw-text-dim, #888)",
              cursor: "pointer",
              fontSize: 10,
              padding: "1px 6px",
              lineHeight: 1.4,
            }}
          >
            ×
          </button>
        )}

        {/* Current event info */}
        <div
          style={{
            flex: 1,
            fontSize: 11,
            color: "var(--tw-text-muted, #666)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            paddingLeft: 8,
          }}
        >
          {currentIndex >= 0 && currentIndex < sortedEvents.length
            ? (() => {
                const ev = sortedEvents[currentIndex];
                const time = new Date(ev.ts).toLocaleTimeString();
                const label = ev.targetLabel ?? ev.targetId ?? "";
                return `${time} — ${getKindLabel(ev.kind)}${label ? `: ${label}` : ""}`;
              })()
            : `${sortedEvents.length} events`}
        </div>

        {/* Event count / zoom info */}
        <div
          style={{
            fontSize: 10,
            color: "var(--tw-text-muted, #666)",
            whiteSpace: "nowrap",
          }}
        >
          {[compareDeltaLabel ? `A-B ${compareDeltaLabel}` : "", zoomLevel !== 1 ? `${zoomLevel.toFixed(1)}x zoom` : ""].filter(Boolean).join(" / ")}
        </div>
      </div>

      {/* ---- Track area ---- */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          flex: 1,
          position: "relative",
          cursor: "crosshair",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Density heatmap background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          {densityBuckets.map((count, i) => {
            const intensity = count / maxDensity;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${intensity * 100}%`,
                  background: `rgba(100, 160, 255, ${0.08 + intensity * 0.25})`,
                  transition: "height 0.15s ease",
                }}
              />
            );
          })}
        </div>

        {/* Time labels */}
        {!collapsed &&
          timeLabels.map((label, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                bottom: 2,
                left: `${label.x}%`,
                transform: "translateX(-50%)",
                fontSize: 9,
                color: "var(--tw-text-muted, #555)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {label.text}
            </div>
          ))}

        {/* Snapshot markers (triangles) */}
        {historyFrames.map((frame) => {
          const ts = new Date(frame.createdAt).getTime();
          const pct = tsToPercent(ts);
          if (pct < -2 || pct > 102) return null;
          return (
            <div
              key={frame.id}
              onMouseEnter={(e) => {
                setHoveredFrame(frame);
                setFrameTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredFrame(null)}
              onClick={(e) => {
                e.stopPropagation();
                onApplyFrame?.(frame.id);
              }}
              style={{
                position: "absolute",
                top: 0,
                left: `${pct}%`,
                transform: "translateX(-50%)",
                cursor: "pointer",
                zIndex: 5,
              }}
              title={`Snapshot: ${frame.label}`}
            >
              {/* Triangle pointing down */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "8px solid #e2e8f0",
                }}
              />
            </div>
          );
        })}

        {branches.map((branch) => {
          const ts = new Date(branch.anchorTs).getTime();
          const pct = tsToPercent(ts);
          if (pct < -2 || pct > 102) return null;
          const branchColor = branch.status === "active" ? "#4ade80" : branch.status === "archived" ? "#94a3b8" : "#f59e0b";
          return (
            <button
              key={branch.id}
              onClick={(e) => {
                e.stopPropagation();
                const idx = sortedEvents.findIndex((ev) => ev.id === branch.anchorEventId);
                if (idx >= 0) {
                  setCurrentIndex(idx);
                  onScrubToEvent?.(sortedEvents[idx]);
                }
              }}
              style={{
                position: "absolute",
                top: 10,
                left: `${pct}%`,
                transform: "translateX(-50%)",
                border: `1px solid ${branchColor}`,
                borderRadius: 999,
                background: "rgba(0,0,0,0.7)",
                color: branchColor,
                fontSize: 8,
                padding: "0 5px",
                height: 16,
                lineHeight: "14px",
                cursor: "pointer",
                zIndex: 6,
                maxWidth: 96,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
              title={`${branch.label} / ${new Date(branch.anchorTs).toLocaleString()}`}
            >
              {branch.label}
            </button>
          );
        })}

        {/* Event dots */}
        {sortedEvents.map((ev, i) => {
          const ts = new Date(ev.ts).getTime();
          const pct = tsToPercent(ts);
          if (pct < -1 || pct > 101) return null;
          const isActive = i === currentIndex;
          const color = getKindColor(ev.kind);
          const dotSize = isActive ? 8 : 5;

          return (
            <div
              key={ev.id}
              onMouseEnter={(e) => {
                setHoveredEvent(ev);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
                onScrubToEvent?.(ev);
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: `${pct}%`,
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                background: color,
                border: isActive ? "2px solid #fff" : "none",
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: isActive ? 10 : 3,
                boxShadow: isActive
                  ? `0 0 6px ${color}`
                  : `0 0 2px ${color}50`,
                transition: "width 0.1s, height 0.1s",
                pointerEvents: "auto",
              }}
            />
          );
        })}

        {/* Playhead line */}
        {playheadPercent >= 0 && playheadPercent <= 100 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${playheadPercent}%`,
              width: 2,
              background: "var(--tw-accent, #f59e0b)",
              zIndex: 8,
              pointerEvents: "none",
              boxShadow: "0 0 6px var(--tw-accent, #f59e0b)",
            }}
          >
            {/* Playhead handle */}
            <div
              style={{
                position: "absolute",
                top: -2,
                left: "50%",
                transform: "translateX(-50%)",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--tw-accent, #f59e0b)",
                border: "2px solid var(--tw-bg-panel, #1e1e2e)",
              }}
            />
          </div>
        )}

        {compareAIndex !== null && sortedEvents[compareAIndex] && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${tsToPercent(new Date(sortedEvents[compareAIndex].ts).getTime())}%`,
              width: 1,
              background: "rgba(245, 158, 11, 0.9)",
              zIndex: 7,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", top: 2, left: -5, fontSize: 9, color: "var(--tw-accent, #f59e0b)" }}>A</div>
          </div>
        )}

        {compareBIndex !== null && sortedEvents[compareBIndex] && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${tsToPercent(new Date(sortedEvents[compareBIndex].ts).getTime())}%`,
              width: 1,
              background: "rgba(96, 165, 250, 0.95)",
              zIndex: 7,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", top: 2, left: -5, fontSize: 9, color: "#60a5fa" }}>B</div>
          </div>
        )}
      </div>

      {/* ---- Tooltip: event ---- */}
      {hoveredEvent && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 60,
            background: "var(--tw-bg-panel, #1e1e2e)",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--tw-text, #ccc)",
            zIndex: 1100,
            pointerEvents: "none",
            maxWidth: 280,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: getKindColor(hoveredEvent.kind),
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <strong style={{ color: "var(--tw-text, #eee)" }}>
              {getKindLabel(hoveredEvent.kind)}
            </strong>
          </div>
          <div style={{ color: "var(--tw-text-dim, #999)", marginBottom: 2 }}>
            {new Date(hoveredEvent.ts).toLocaleString()}
          </div>
          {hoveredEvent.targetLabel && (
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {hoveredEvent.targetLabel}
            </div>
          )}
          {hoveredEvent.detail && (
            <div
              style={{
                marginTop: 3,
                fontSize: 10,
                color: "var(--tw-text-muted, #666)",
                maxHeight: 60,
                overflow: "hidden",
              }}
            >
              {Object.entries(hoveredEvent.detail)
                .slice(0, 3)
                .map(([key, val]) => (
                  <div key={key}>
                    {key}: {String(val)}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Tooltip: snapshot frame ---- */}
      {hoveredFrame && (
        <div
          style={{
            position: "fixed",
            left: frameTooltipPos.x + 12,
            top: frameTooltipPos.y - 48,
            background: "var(--tw-bg-panel, #1e1e2e)",
            border: "1px solid var(--tw-border, #444)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--tw-text, #ccc)",
            zIndex: 1100,
            pointerEvents: "none",
            maxWidth: 240,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ marginBottom: 2 }}>
            <strong style={{ color: "#e2e8f0" }}>
              Snapshot: {hoveredFrame.label}
            </strong>
          </div>
          <div style={{ color: "var(--tw-text-dim, #999)" }}>
            {new Date(hoveredFrame.createdAt).toLocaleString()}
          </div>
          <div style={{ color: "var(--tw-text-muted, #666)", marginTop: 2 }}>
            {hoveredFrame.nodes.length} nodes
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineScrubber;
