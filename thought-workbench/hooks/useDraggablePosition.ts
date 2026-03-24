import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type Position = { x: number; y: number };

function loadPosition(storageKey: string, fallback: Position): Position {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      x: typeof parsed?.x === "number" ? parsed.x : fallback.x,
      y: typeof parsed?.y === "number" ? parsed.y : fallback.y,
    };
  } catch {
    return fallback;
  }
}

export function useDraggablePosition(
  storageKey: string,
  fallback: Position = { x: 0, y: 0 },
  axis: "both" | "x" | "y" = "both",
) {
  const [position, setPosition] = useState<Position>(() => loadPosition(storageKey, fallback));
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  }, [storageKey, position]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      setPosition({
        x: axis === "y" ? dragRef.current.baseX : dragRef.current.baseX + dx,
        y: axis === "x" ? dragRef.current.baseY : dragRef.current.baseY + dy,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      if (typeof document !== "undefined") document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [axis]);

  const startDrag = useCallback((event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: position.x,
      baseY: position.y,
    };
    if (typeof document !== "undefined") document.body.style.userSelect = "none";
  }, [position.x, position.y]);

  const resetPosition = useCallback(() => {
    setPosition(fallback);
  }, [fallback]);

  return { position, startDrag, resetPosition };
}
