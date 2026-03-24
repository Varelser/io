import { useState, useCallback, useRef } from "react";
import type { SplitMode, PaneState } from "../components/MultiPaneLayout";

export type TopicTab = {
  id: string;
  topicId: string;
  splitMode: SplitMode;
  panes: PaneState[];
  selectedNodeId: string | null;
};

const STORAGE_KEY = "tw-topic-tabs";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadTabs(): { tabs: TopicTab[]; activeTabId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tabs: [], activeTabId: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tabs)) return { tabs: [], activeTabId: null };
    return { tabs: parsed.tabs, activeTabId: parsed.activeTabId ?? null };
  } catch {
    return { tabs: [], activeTabId: null };
  }
}

function saveTabs(tabs: TopicTab[], activeTabId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  } catch {}
}

export function useTopicTabs() {
  const initial = loadTabs();
  const [tabs, setTabsRaw] = useState<TopicTab[]>(initial.tabs);
  const [activeTabId, setActiveTabIdRaw] = useState<string | null>(initial.activeTabId);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const setTabs = useCallback((updater: (prev: TopicTab[]) => TopicTab[], nextActiveTabId?: string | null) => {
    setTabsRaw((prev) => {
      const next = updater(prev);
      const aid = nextActiveTabId !== undefined ? nextActiveTabId : activeTabIdRef.current;
      saveTabs(next, aid);
      return next;
    });
  }, []);

  const setActiveTabId = useCallback((id: string | null) => {
    setActiveTabIdRaw(id);
    saveTabs(tabsRef.current, id);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  /** Save current split/pane state into the active tab before switching */
  const snapshotActiveTab = useCallback((splitMode: SplitMode, panes: PaneState[], selectedNodeId: string | null) => {
    const aid = activeTabIdRef.current;
    if (!aid) return;
    setTabs((prev) =>
      prev.map((t) => t.id === aid ? { ...t, splitMode, panes, selectedNodeId } : t)
    );
  }, [setTabs]);

  /**
   * Open or switch to a topic tab.
   * Returns the restored snapshot (splitMode / panes / selectedNodeId) when switching to an
   * existing tab, or null when a new tab is created (caller should keep current split state).
   */
  const openTab = useCallback((
    topicId: string,
    nodeId: string | null,
    currentSplitMode: SplitMode,
    currentPanes: PaneState[],
    currentNodeId: string | null,
  ): TopicTab | null => {
    const existing = tabsRef.current.find((t) => t.topicId === topicId);
    if (existing) {
      // Save current state to outgoing tab before switching
      snapshotActiveTab(currentSplitMode, currentPanes, currentNodeId);
      setActiveTabId(existing.id);
      return existing;
    }
    // New tab
    const newTab: TopicTab = {
      id: generateId(),
      topicId,
      splitMode: currentSplitMode,
      panes: currentPanes,
      selectedNodeId: nodeId,
    };
    snapshotActiveTab(currentSplitMode, currentPanes, currentNodeId);
    setTabs((prev) => [...prev, newTab], newTab.id);
    setActiveTabIdRaw(newTab.id);
    return null;
  }, [setTabs, setActiveTabId, snapshotActiveTab]);

  const closeTab = useCallback((tabId: string) => {
    setTabsRaw((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      let nextActiveId = activeTabIdRef.current;
      if (nextActiveId === tabId) {
        nextActiveId = next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? null;
        setActiveTabIdRaw(nextActiveId);
      }
      saveTabs(next, nextActiveId);
      return next;
    });
  }, []);

  /** Update splitMode / panes / selectedNodeId on the currently active tab */
  const updateActiveTabState = useCallback((patch: Partial<Pick<TopicTab, "splitMode" | "panes" | "selectedNodeId">>) => {
    const aid = activeTabIdRef.current;
    if (!aid) return;
    setTabsRaw((prev) => {
      const next = prev.map((t) => t.id === aid ? { ...t, ...patch } : t);
      saveTabs(next, aid);
      return next;
    });
  }, []);

  return { tabs, activeTabId, activeTab, openTab, closeTab, updateActiveTabState, snapshotActiveTab, setActiveTabId };
}
