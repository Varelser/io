import { useState, useCallback, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "midnight";
export type ThemeColorSetting = "" | `#${string}`;

export type ThemeSettings = {
  mode: ThemeMode;
  fontSize: number;       // 基準フォントサイズ倍率 (0.8 ~ 1.4)
  leftPanelWidth: number; // px (120 ~ 300)
  rightPanelWidth: number; // px (200 ~ 500)
  textColor: ThemeColorSetting;
  canvasTextColor: ThemeColorSetting;
  canvasTextScale: number;
  canvasColor: ThemeColorSetting;
  buttonColor: ThemeColorSetting;
  buttonTextColor: ThemeColorSetting;
  sliderColor: ThemeColorSetting;
  sphereColor: ThemeColorSetting;
  gridColor: ThemeColorSetting;
  edgeColor: ThemeColorSetting;
};

const STORAGE_KEY = "tw-theme-settings";

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: "dark",
  fontSize: 1.0,
  leftPanelWidth: 168,
  rightPanelWidth: 286,
  textColor: "",
  canvasTextColor: "",
  canvasTextScale: 1,
  canvasColor: "",
  buttonColor: "",
  buttonTextColor: "",
  sliderColor: "",
  sphereColor: "",
  gridColor: "",
  edgeColor: "",
};

const THEMES: Record<ThemeMode, Record<string, string>> = {
  dark: {
    "--tw-bg": "#050810",
    "--tw-bg-panel": "rgba(6,8,16,0.88)",
    "--tw-bg-card": "rgba(255,255,255,0.025)",
    "--tw-bg-input": "rgba(0,2,8,0.55)",
    "--tw-border": "rgba(180,190,255,0.11)",
    "--tw-text": "rgba(228,232,255,0.92)",
    "--tw-text-dim": "rgba(178,186,228,0.62)",
    "--tw-text-muted": "rgba(128,138,188,0.42)",
    "--tw-canvas-text": "rgba(228,232,255,0.92)",
    "--tw-canvas-text-dim": "rgba(178,186,228,0.62)",
    "--tw-canvas-text-scale": "1",
    "--tw-accent": "#818cf8",
    "--tw-danger": "#f87171",
    "--tw-button-bg": "#0a0c1a",
    "--tw-button-text": "#c4c9ee",
    "--tw-slider": "#818cf8",
    "--tw-sphere": "#c8ccee",
    "--tw-grid": "#8890b8",
    "--tw-edge": "#a8b4d8",
    "--tw-sphere-glow-strong": "rgba(212,212,216,0.12)",
    "--tw-sphere-glow-soft": "rgba(212,212,216,0.04)",
    "--tw-sphere-pulse-color": "rgba(129,140,248,0.55)",
    "--tw-sphere-node-glow": "rgba(212,212,216,0.22)",
    "--tw-sphere-edge-selected": "rgba(129,140,248,0.7)",
    "--tw-canvas-dot": "rgba(161,161,170,0.18)",
  },
  light: {
    "--tw-bg": "#f5f5f5",
    "--tw-bg-panel": "rgba(255,255,255,0.90)",
    "--tw-bg-card": "rgba(0,0,0,0.03)",
    "--tw-bg-input": "rgba(255,255,255,0.80)",
    "--tw-border": "rgba(0,0,0,0.12)",
    "--tw-text": "rgba(0,0,0,0.88)",
    "--tw-text-dim": "rgba(0,0,0,0.55)",
    "--tw-text-muted": "rgba(0,0,0,0.30)",
    "--tw-canvas-text": "rgba(0,0,0,0.88)",
    "--tw-canvas-text-dim": "rgba(0,0,0,0.55)",
    "--tw-canvas-text-scale": "1",
    "--tw-accent": "#2563eb",
    "--tw-danger": "#dc2626",
    "--tw-button-bg": "#ffffff",
    "--tw-button-text": "#374151",
    "--tw-slider": "#2563eb",
    "--tw-sphere": "#334155",
    "--tw-grid": "#64748b",
    "--tw-edge": "#475569",
    "--tw-canvas-dot": "rgba(0,0,0,0.12)",
  },
  midnight: {
    "--tw-bg": "#020b08",
    "--tw-bg-panel": "rgba(2,12,10,0.90)",
    "--tw-bg-card": "rgba(52,211,153,0.02)",
    "--tw-bg-input": "rgba(0,8,5,0.60)",
    "--tw-border": "rgba(52,211,153,0.14)",
    "--tw-text": "rgba(196,255,236,0.90)",
    "--tw-text-dim": "rgba(148,210,190,0.60)",
    "--tw-text-muted": "rgba(96,160,140,0.42)",
    "--tw-canvas-text": "rgba(196,255,236,0.90)",
    "--tw-canvas-text-dim": "rgba(148,210,190,0.60)",
    "--tw-canvas-text-scale": "1",
    "--tw-accent": "#34d399",
    "--tw-danger": "#f87171",
    "--tw-button-bg": "#051410",
    "--tw-button-text": "#a8f0d8",
    "--tw-slider": "#34d399",
    "--tw-sphere": "#6ee7c0",
    "--tw-grid": "#34d399",
    "--tw-edge": "#5eead4",
    "--tw-sphere-pulse-color": "rgba(52,211,153,0.55)",
    "--tw-sphere-node-glow": "rgba(110,231,192,0.22)",
    "--tw-sphere-edge-selected": "rgba(52,211,153,0.7)",
    "--tw-canvas-dot": "rgba(52,211,153,0.14)",
  },
};

export const THEME_COLOR_DEFAULTS: Record<ThemeMode, {
  textColor: `#${string}`;
  canvasTextColor: `#${string}`;
  canvasColor: `#${string}`;
  buttonColor: `#${string}`;
  buttonTextColor: `#${string}`;
  sliderColor: `#${string}`;
  sphereColor: `#${string}`;
  gridColor: `#${string}`;
  edgeColor: `#${string}`;
}> = {
  dark: {
    textColor: "#e4e8ff",
    canvasTextColor: "#e4e8ff",
    canvasColor: "#050810",
    buttonColor: "#0a0c1a",
    buttonTextColor: "#c4c9ee",
    sliderColor: "#818cf8",
    sphereColor: "#c8ccee",
    gridColor: "#8890b8",
    edgeColor: "#a8b4d8",
  },
  light: {
    textColor: "#171717",
    canvasTextColor: "#171717",
    canvasColor: "#f5f5f5",
    buttonColor: "#ffffff",
    buttonTextColor: "#374151",
    sliderColor: "#2563eb",
    sphereColor: "#334155",
    gridColor: "#64748b",
    edgeColor: "#475569",
  },
  midnight: {
    textColor: "#c4ffec",
    canvasTextColor: "#c4ffec",
    canvasColor: "#020b08",
    buttonColor: "#051410",
    buttonTextColor: "#a8f0d8",
    sliderColor: "#34d399",
    sphereColor: "#6ee7c0",
    gridColor: "#34d399",
    edgeColor: "#5eead4",
  },
};

function isHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRgb(value: `#${string}`) {
  const normalized = value.slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function withAlpha(value: `#${string}`, alpha: number) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r},${g},${b},${alpha})`;
}

function sanitizeColorInput(value: unknown): ThemeColorSetting {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return isHexColor(normalized) ? normalized : "";
}

function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      mode: ["dark", "light", "midnight"].includes(parsed.mode) ? parsed.mode : "dark",
      fontSize: typeof parsed.fontSize === "number" ? Math.max(0.8, Math.min(1.4, parsed.fontSize)) : 1.0,
      leftPanelWidth: typeof parsed.leftPanelWidth === "number" ? Math.max(120, Math.min(300, parsed.leftPanelWidth)) : 168,
      rightPanelWidth: typeof parsed.rightPanelWidth === "number" ? Math.max(200, Math.min(500, parsed.rightPanelWidth)) : 286,
      textColor: isHexColor(parsed.textColor) ? parsed.textColor : "",
      canvasTextColor: isHexColor(parsed.canvasTextColor) ? parsed.canvasTextColor : "",
      canvasTextScale: typeof parsed.canvasTextScale === "number" ? Math.max(0.7, Math.min(1.8, parsed.canvasTextScale)) : 1,
      canvasColor: isHexColor(parsed.canvasColor) ? parsed.canvasColor : "",
      buttonColor: isHexColor(parsed.buttonColor) ? parsed.buttonColor : "",
      buttonTextColor: isHexColor(parsed.buttonTextColor) ? parsed.buttonTextColor : "",
      sliderColor: isHexColor(parsed.sliderColor) ? parsed.sliderColor : "",
      sphereColor: isHexColor(parsed.sphereColor) ? parsed.sphereColor : "",
      gridColor: isHexColor(parsed.gridColor) ? parsed.gridColor : "",
      edgeColor: isHexColor(parsed.edgeColor) ? parsed.edgeColor : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useTheme() {
  const [settings, setSettingsRaw] = useState<ThemeSettings>(loadSettings);

  const setSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettingsRaw((prev) => {
      const next = {
        ...prev,
        ...patch,
        textColor: patch.textColor !== undefined ? sanitizeColorInput(patch.textColor) : prev.textColor,
        canvasTextColor: patch.canvasTextColor !== undefined ? sanitizeColorInput(patch.canvasTextColor) : prev.canvasTextColor,
        canvasTextScale: patch.canvasTextScale !== undefined ? Math.max(0.7, Math.min(1.8, patch.canvasTextScale)) : prev.canvasTextScale,
        canvasColor: patch.canvasColor !== undefined ? sanitizeColorInput(patch.canvasColor) : prev.canvasColor,
        buttonColor: patch.buttonColor !== undefined ? sanitizeColorInput(patch.buttonColor) : prev.buttonColor,
        buttonTextColor: patch.buttonTextColor !== undefined ? sanitizeColorInput(patch.buttonTextColor) : prev.buttonTextColor,
        sliderColor: patch.sliderColor !== undefined ? sanitizeColorInput(patch.sliderColor) : prev.sliderColor,
        sphereColor: patch.sphereColor !== undefined ? sanitizeColorInput(patch.sphereColor) : prev.sphereColor,
        gridColor: patch.gridColor !== undefined ? sanitizeColorInput(patch.gridColor) : prev.gridColor,
        edgeColor: patch.edgeColor !== undefined ? sanitizeColorInput(patch.edgeColor) : prev.edgeColor,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const themeVars: Record<string, string> = {
    ...THEMES[settings.mode],
    ...(settings.textColor ? {
      "--tw-text": settings.textColor,
      "--tw-text-dim": withAlpha(settings.textColor, 0.64),
      "--tw-text-muted": withAlpha(settings.textColor, 0.38),
    } : {}),
    ...(settings.canvasTextColor ? {
      "--tw-canvas-text": settings.canvasTextColor,
      "--tw-canvas-text-dim": withAlpha(settings.canvasTextColor, 0.62),
    } : {}),
    "--tw-canvas-text-scale": String(settings.canvasTextScale),
    ...(settings.canvasColor ? {
      "--tw-bg": settings.canvasColor,
    } : {}),
    ...(settings.buttonColor ? {
      "--tw-button-bg": settings.buttonColor,
    } : {}),
    ...(settings.buttonTextColor ? {
      "--tw-button-text": settings.buttonTextColor,
    } : {}),
    ...(settings.sliderColor ? {
      "--tw-slider": settings.sliderColor,
    } : {}),
    ...(settings.sphereColor ? {
      "--tw-sphere": settings.sphereColor,
      "--tw-sphere-fill": withAlpha(settings.sphereColor, 0.08),
      "--tw-sphere-stroke": withAlpha(settings.sphereColor, 0.32),
      "--tw-sphere-glow-strong": withAlpha(settings.sphereColor, 0.12),
      "--tw-sphere-glow-soft": withAlpha(settings.sphereColor, 0.04),
      "--tw-sphere-axis": withAlpha(settings.sphereColor, 0.14),
      "--tw-sphere-label-stroke": withAlpha(settings.sphereColor, 0.24),
      "--tw-sphere-node-ring": withAlpha(settings.sphereColor, 0.52),
      "--tw-sphere-pulse-color": withAlpha(settings.sphereColor, 0.55),
      "--tw-sphere-node-glow": withAlpha(settings.sphereColor, 0.22),
      "--tw-sphere-edge-selected": withAlpha(settings.sphereColor, 0.7),
    } : {}),
    ...(settings.gridColor ? {
      "--tw-grid": settings.gridColor,
      "--tw-grid-stroke": withAlpha(settings.gridColor, 0.26),
      "--tw-grid-muted": withAlpha(settings.gridColor, 0.12),
      "--tw-canvas-grid": withAlpha(settings.gridColor, 0.1),
    } : {}),
    ...(settings.edgeColor ? {
      "--tw-edge": settings.edgeColor,
      "--tw-edge-stroke": withAlpha(settings.edgeColor, 0.24),
      "--tw-edge-muted": withAlpha(settings.edgeColor, 0.18),
    } : {}),
  };

  /** ルートdiv に注入するインラインstyle（キャンバスに影響しないよう zoom は含めない） */
  const rootStyle: React.CSSProperties & Record<string, string> = {
    ...themeVars,
    "--tw-font-scale": String(settings.fontSize),
    "--tw-left-w": `${settings.leftPanelWidth}px`,
    "--tw-right-w": `${settings.rightPanelWidth}px`,
    background: themeVars["--tw-bg"] || THEMES[settings.mode]["--tw-bg"],
    color: themeVars["--tw-text"] || THEMES[settings.mode]["--tw-text"],
  };

  /** サイドパネル専用のstyle。zoom でテキストのみスケーリング */
  const panelZoom: React.CSSProperties = {
    zoom: settings.fontSize,
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const vars = {
      ...themeVars,
      "--tw-font-scale": String(settings.fontSize),
      "--tw-left-w": `${settings.leftPanelWidth}px`,
      "--tw-right-w": `${settings.rightPanelWidth}px`,
    };

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.dataset.theme = settings.mode;
    root.dataset.themeCanvasCustom = settings.canvasColor ? "true" : "false";
    root.dataset.themeTextCustom = settings.textColor ? "true" : "false";
    root.dataset.themeButtonCustom = settings.buttonColor || settings.buttonTextColor ? "true" : "false";
    root.style.colorScheme = settings.mode === "light" ? "light" : "dark";
    body.style.background = themeVars["--tw-bg"] || THEMES[settings.mode]["--tw-bg"];
    body.style.color = themeVars["--tw-text"] || THEMES[settings.mode]["--tw-text"];
  }, [settings]);

  return { settings, setSettings, rootStyle, panelZoom };
}
