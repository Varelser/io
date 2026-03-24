/**
 * AppContext — グローバル状態を React Context で提供し、App.tsx のプロップドリリングを軽減する。
 *
 * 使い方:
 *   - <AppProvider> で全体をラップ
 *   - useAppContext() でどこからでも state / dispatch にアクセス
 *
 * 設計方針:
 *   - App.tsx の既存構造を壊さない。Provider は App.tsx 外部で薄く包む。
 *   - state / updateState / showToast / lang など高頻度アクセスの値のみ Context に入れる。
 *   - CRUD フック類は引き続き App.tsx 内で管理し、必要に応じて拡張する。
 */

import React, { createContext, useContext, type ReactNode } from "react";
import type { AppState } from "../types";

export type Lang = "ja" | "en";

export type AppContextValue = {
  /** 現在のアプリ状態 */
  state: AppState;
  /** 状態更新関数 */
  updateState: (updater: (draft: AppState) => AppState) => void;
  /** トースト通知 */
  showToast: (message: string, kind?: "info" | "success" | "warning" | "error") => void;
  /** 現在の言語設定 */
  lang: Lang;
  /** 言語切り替え */
  setLang: (lang: Lang) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * AppContext プロバイダー。
 * App.tsx の return の最外周でラップして使う。
 */
export function AppProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppContextValue;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * AppContext の値を取得するフック。
 * AppProvider の外側で呼ばれると例外を投げる。
 */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within <AppProvider>");
  }
  return ctx;
}
