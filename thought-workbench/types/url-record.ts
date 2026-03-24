import type { UrlState } from "./node";

/**
 * 独立したURLオブジェクト。
 * NodeItem.linkedUrls / urlState はノード側の付随情報だが、
 * URLRecord はURL自体をファーストクラスで管理し、検証・追跡・重複検出に使う。
 */
export type URLRecord = {
  id: string;
  url: string;
  label?: string;
  status: UrlState;
  /** このURLを参照しているNodeのID群 */
  linkedNodeIds?: string[];
  /** 最終確認日時 ISO */
  lastCheckedAt?: string;
  /** リダイレクト先URL（broken/archived時） */
  resolvedUrl?: string;
  note?: string;
  createdAt: string;
};
