import { useState, useCallback } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void } | null;

export type UseConfirmReturn = {
  confirmState: ConfirmState;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

export function useConfirm(): UseConfirmReturn {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  // resolve は ConfirmDialog 側から呼ばれる想定。
  // 解決後に state をクリアするため、下記の wrapper を expose する。
  const wrappedState = confirmState
    ? {
        ...confirmState,
        resolve: (ok: boolean) => {
          setConfirmState(null);
          confirmState.resolve(ok);
        },
      }
    : null;

  return { confirmState: wrappedState, confirm };
}
