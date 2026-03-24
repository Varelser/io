import { useState, useCallback } from "react";

export type ContextMenuState = {
  x: number;
  y: number;
  topicId?: string;
  nodeId?: string;
} | null;

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>(null);
  const openMenu = useCallback((x: number, y: number, target?: { topicId?: string; nodeId?: string }) => {
    setMenu({ x, y, topicId: target?.topicId, nodeId: target?.nodeId });
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  return { menu, openMenu, closeMenu };
}
