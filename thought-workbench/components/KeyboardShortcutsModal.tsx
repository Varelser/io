import React from "react";
import { Modal } from "./ui/Modal";

type ShortcutEntry = {
  key: string;
  label: { ja: string; en: string };
};

type ShortcutGroup = {
  title: { ja: string; en: string };
  shortcuts: ShortcutEntry[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: { ja: "ナビゲーション", en: "Navigation" },
    shortcuts: [
      { key: "Esc", label: { ja: "選択解除 / モーダルを閉じる", en: "Deselect / close modal" } },
      { key: "F", label: { ja: "選択ノードにフォーカス", en: "Focus selected node" } },
      { key: "Space", label: { ja: "タイムライン再生 / 一時停止", en: "Timeline play / pause" } },
    ],
  },
  {
    title: { ja: "コマンド", en: "Command" },
    shortcuts: [
      { key: "\u2318K", label: { ja: "コマンドパレットを開く", en: "Open command palette" } },
      { key: "?", label: { ja: "ショートカット一覧（この画面）", en: "Show shortcuts (this screen)" } },
    ],
  },
  {
    title: { ja: "編集", en: "Edit" },
    shortcuts: [
      { key: "\u2318Z", label: { ja: "元に戻す", en: "Undo" } },
      { key: "\u21E7\u2318Z", label: { ja: "やり直す", en: "Redo" } },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onClose,
  lang = "ja",
}: {
  open: boolean;
  onClose: () => void;
  lang?: "ja" | "en";
}) {
  return (
    <Modal open={open} onClose={onClose} title={lang === "ja" ? "Keyboard Shortcuts" : "Keyboard Shortcuts"} width={400}>
      <div className="space-y-4">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title.en}>
            <div
              className="mb-1.5 text-[8px] uppercase tracking-[0.14em]"
              style={{ color: "var(--tw-text-muted)" }}
            >
              {group.title[lang]}
            </div>
            <div className="space-y-1">
              {group.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                  style={{ background: "var(--tw-bg-card)" }}
                >
                  <span className="text-[9px]" style={{ color: "var(--tw-text)" }}>
                    {shortcut.label[lang]}
                  </span>
                  <kbd
                    className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-mono"
                    style={{
                      borderColor: "var(--tw-border)",
                      background: "var(--tw-bg-panel)",
                      color: "var(--tw-text-dim)",
                    }}
                  >
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
