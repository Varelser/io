import React, { useRef, useEffect } from "react";
import type { TopicTab } from "../hooks/useTopicTabs";
import type { TopicItem } from "../types";

export function TopicTabBar({
  tabs,
  activeTabId,
  topics,
  onActivate,
  onClose,
  lang,
}: {
  tabs: TopicTab[];
  activeTabId: string | null;
  topics: TopicItem[];
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  lang: "ja" | "en";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-tabid="${activeTabId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-end overflow-hidden"
      style={{
        height: 28,
        background: "var(--tw-bg-panel)",
        borderBottom: "1px solid var(--tw-border)",
        paddingLeft: 4,
      }}
    >
      <div
        ref={scrollRef}
        className="flex items-end gap-0.5 overflow-x-auto"
        style={{ scrollbarWidth: "none", flexShrink: 1, minWidth: 0 }}
      >
        {tabs.map((tab) => {
          const topic = topics.find((t) => t.id === tab.topicId);
          const label = topic?.title || (lang === "ja" ? "不明" : "Unknown");
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              data-tabid={tab.id}
              className="group flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-2.5"
              style={{
                height: isActive ? 26 : 23,
                cursor: "pointer",
                background: isActive ? "var(--tw-bg)" : "transparent",
                borderColor: isActive ? "var(--tw-border)" : "transparent",
                color: isActive ? "var(--tw-text)" : "var(--tw-text-muted)",
                marginBottom: isActive ? -1 : 0,
                transition: "all 0.1s ease",
                maxWidth: 160,
              }}
              onClick={() => onActivate(tab.id)}
            >
              <span
                className="truncate text-[9px] tracking-wide"
                style={{ maxWidth: 110 }}
                title={label}
              >
                {label}
              </span>
              <button
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--tw-text-muted)" }}
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                aria-label={lang === "ja" ? "タブを閉じる" : "Close tab"}
              >
                <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
                  <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
