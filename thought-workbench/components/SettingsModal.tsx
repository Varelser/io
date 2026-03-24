import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { FieldLabel } from "./ui/FieldLabel";
import { Section } from "./ui/Section";
import { THEME_COLOR_DEFAULTS, type ThemeSettings } from "../hooks/useTheme";

function ThemeColorControl({
  label,
  value,
  fallback,
  onChange,
  onReset,
  resetLabel,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  onReset: () => void;
  resetLabel: string;
}) {
  const preview = value || fallback;
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-[44px_1fr_auto] gap-1.5">
        <input
          type="color"
          value={preview}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full rounded border p-0"
          style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)" }}
        />
        <input
          value={preview}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
          className="w-full rounded-md border px-2 py-1 text-[10px] outline-none"
          style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)" }}
        />
        <Button onClick={onReset}>{resetLabel}</Button>
      </div>
    </div>
  );
}

export type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  lang: "ja" | "en";
  onChangeLang: (lang: "ja" | "en") => void;
  themeSettings: ThemeSettings;
  onUpdateTheme: (patch: Partial<ThemeSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRepair: () => void;
  onRestore: () => void;
  repairMessage: string;
  buildStamp: string;
  offlineReady: boolean;
  needRefresh: boolean;
  onRefresh?: () => void;
};

export function SettingsModal({
  open,
  onClose,
  lang,
  onChangeLang,
  themeSettings,
  onUpdateTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRepair,
  onRestore,
  repairMessage,
  buildStamp,
  offlineReady,
  needRefresh,
  onRefresh,
}: SettingsModalProps) {
  const paletteDefaults = THEME_COLOR_DEFAULTS[themeSettings.mode];
  const resetLabel = lang === "ja" ? "既定" : "Reset";

  return (
    <Modal open={open} onClose={onClose} title={lang === "ja" ? "設定" : "Settings"} width={420}>
      {/* Language */}
      <div>
        <FieldLabel>{lang === "ja" ? "言語" : "Language"}</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          <Button active={lang === "ja"} onClick={() => onChangeLang("ja")} className="w-full">JA</Button>
          <Button active={lang === "en"} onClick={() => onChangeLang("en")} className="w-full">EN</Button>
        </div>
      </div>

      <div className="my-3 h-px" style={{ background: "var(--tw-border)" }} />

      {/* Appearance */}
      <Section title={lang === "ja" ? "外観" : "Appearance"} defaultOpen>
        <div>
          <FieldLabel>{lang === "ja" ? "テーマ" : "Theme"}</FieldLabel>
          <div className="grid grid-cols-3 gap-1">
            <Button active={themeSettings.mode === "dark"} onClick={() => onUpdateTheme({ mode: "dark" })} className="w-full">{lang === "ja" ? "ダーク" : "Dark"}</Button>
            <Button active={themeSettings.mode === "light"} onClick={() => onUpdateTheme({ mode: "light" })} className="w-full">{lang === "ja" ? "ライト" : "Light"}</Button>
            <Button active={themeSettings.mode === "midnight"} onClick={() => onUpdateTheme({ mode: "midnight" })} className="w-full">{lang === "ja" ? "ナイト" : "Night"}</Button>
          </div>
        </div>
        <div className="mt-2">
          <FieldLabel>{lang === "ja" ? `文字サイズ (${Math.round(themeSettings.fontSize * 100)}%)` : `Font Size (${Math.round(themeSettings.fontSize * 100)}%)`}</FieldLabel>
          <input type="range" min="0.8" max="1.4" step="0.05" value={themeSettings.fontSize} onChange={(e) => onUpdateTheme({ fontSize: Number(e.target.value) })} className="w-full accent-blue-400" />
        </div>
        <div className="mt-2">
          <FieldLabel>{lang === "ja" ? `キャンバス文字 (${Math.round(themeSettings.canvasTextScale * 100)}%)` : `Canvas Text (${Math.round(themeSettings.canvasTextScale * 100)}%)`}</FieldLabel>
          <input type="range" min="0.7" max="1.8" step="0.05" value={themeSettings.canvasTextScale} onChange={(e) => onUpdateTheme({ canvasTextScale: Number(e.target.value) })} className="w-full accent-blue-400" />
        </div>
        <div className="mt-2">
          <FieldLabel>{lang === "ja" ? `左パネル幅 (${themeSettings.leftPanelWidth}px)` : `Left Panel (${themeSettings.leftPanelWidth}px)`}</FieldLabel>
          <input type="range" min="120" max="300" step="4" value={themeSettings.leftPanelWidth} onChange={(e) => onUpdateTheme({ leftPanelWidth: Number(e.target.value) })} className="w-full accent-blue-400" />
        </div>
        <div className="mt-2">
          <FieldLabel>{lang === "ja" ? `右パネル幅 (${themeSettings.rightPanelWidth}px)` : `Right Panel (${themeSettings.rightPanelWidth}px)`}</FieldLabel>
          <input type="range" min="200" max="500" step="4" value={themeSettings.rightPanelWidth} onChange={(e) => onUpdateTheme({ rightPanelWidth: Number(e.target.value) })} className="w-full accent-blue-400" />
        </div>
      </Section>

      <div className="my-2 h-px" style={{ background: "var(--tw-border)" }} />

      {/* Custom Colors */}
      <Section title={lang === "ja" ? "カスタムカラー" : "Custom Colors"} defaultOpen={false}>
        <div className="grid gap-1.5">
          <ThemeColorControl label={lang === "ja" ? "文字色" : "Text"} value={themeSettings.textColor} fallback={paletteDefaults.textColor} onChange={(v) => onUpdateTheme({ textColor: v as ThemeSettings["textColor"] })} onReset={() => onUpdateTheme({ textColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "キャンバス文字" : "Canvas Text"} value={themeSettings.canvasTextColor} fallback={paletteDefaults.canvasTextColor} onChange={(v) => onUpdateTheme({ canvasTextColor: v as ThemeSettings["canvasTextColor"] })} onReset={() => onUpdateTheme({ canvasTextColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "キャンバス" : "Canvas"} value={themeSettings.canvasColor} fallback={paletteDefaults.canvasColor} onChange={(v) => onUpdateTheme({ canvasColor: v as ThemeSettings["canvasColor"] })} onReset={() => onUpdateTheme({ canvasColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "ボタン色" : "Button"} value={themeSettings.buttonColor} fallback={paletteDefaults.buttonColor} onChange={(v) => onUpdateTheme({ buttonColor: v as ThemeSettings["buttonColor"] })} onReset={() => onUpdateTheme({ buttonColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "ボタン文字" : "Button Text"} value={themeSettings.buttonTextColor} fallback={paletteDefaults.buttonTextColor} onChange={(v) => onUpdateTheme({ buttonTextColor: v as ThemeSettings["buttonTextColor"] })} onReset={() => onUpdateTheme({ buttonTextColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "スライダー" : "Slider"} value={themeSettings.sliderColor} fallback={paletteDefaults.sliderColor} onChange={(v) => onUpdateTheme({ sliderColor: v as ThemeSettings["sliderColor"] })} onReset={() => onUpdateTheme({ sliderColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "球体" : "Sphere"} value={themeSettings.sphereColor} fallback={paletteDefaults.sphereColor} onChange={(v) => onUpdateTheme({ sphereColor: v as ThemeSettings["sphereColor"] })} onReset={() => onUpdateTheme({ sphereColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "グリッド" : "Grid"} value={themeSettings.gridColor} fallback={paletteDefaults.gridColor} onChange={(v) => onUpdateTheme({ gridColor: v as ThemeSettings["gridColor"] })} onReset={() => onUpdateTheme({ gridColor: "" })} resetLabel={resetLabel} />
          <ThemeColorControl label={lang === "ja" ? "エッジ" : "Edge"} value={themeSettings.edgeColor} fallback={paletteDefaults.edgeColor} onChange={(v) => onUpdateTheme({ edgeColor: v as ThemeSettings["edgeColor"] })} onReset={() => onUpdateTheme({ edgeColor: "" })} resetLabel={resetLabel} />
        </div>
      </Section>

      <div className="my-2 h-px" style={{ background: "var(--tw-border)" }} />

      {/* Recovery */}
      <Section title={lang === "ja" ? "復旧" : "Recovery"} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5">
          <Button active={canUndo} onClick={onUndo} className="w-full">{lang === "ja" ? "元に戻す" : "Undo"}</Button>
          <Button active={canRedo} onClick={onRedo} className="w-full">{lang === "ja" ? "やり直す" : "Redo"}</Button>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Button onClick={onRepair} className="w-full">{lang === "ja" ? "修復" : "Repair"}</Button>
          <Button onClick={onRestore} className="w-full">{lang === "ja" ? "復元" : "Restore"}</Button>
        </div>
        <div className="mt-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>⌘/Ctrl+Z / ⇧+⌘/Ctrl+Z</div>
        {repairMessage ? <div className="mt-1 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>{repairMessage}</div> : null}
      </Section>

      <div className="my-3 h-px" style={{ background: "var(--tw-border)" }} />

      {/* Build info */}
      <div className="rounded-md border px-2 py-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
        <div className="flex items-center gap-2 text-[8px]" style={{ color: "var(--tw-text-muted)" }}>
          <span>{lang === "ja" ? "ビルド" : "Build"}: {buildStamp}</span>
          {offlineReady && (
            <span className="rounded-full border px-1.5 py-0.5" style={{ borderColor: "rgba(52, 211, 153, 0.35)", color: "#34d399" }}>
              {lang === "ja" ? "オフライン準備完了" : "offline ready"}
            </span>
          )}
          {needRefresh && (
            <button onClick={onRefresh} className="rounded-full border px-1.5 py-0.5" style={{ borderColor: "rgba(96, 165, 250, 0.35)", color: "#60a5fa" }}>
              {lang === "ja" ? "更新" : "Update"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
