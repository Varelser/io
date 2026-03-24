import { useState, useCallback, useRef } from "react";

export type ToastItem = {
  id: number;
  message: string;
  kind?: "info" | "success" | "warning" | "error";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, kind: ToastItem["kind"] = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-4), { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, showToast };
}
