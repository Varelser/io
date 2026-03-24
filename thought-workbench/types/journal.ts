export type JournalEntry = {
  id: string;
  /** 日付 YYYY-MM-DD */
  date: string;
  /** エントリタイトル（任意） */
  title?: string;
  /** 本文（自由記述） */
  body: string;
  /** サマリー / 振り返り */
  summary?: string;
  /** 気分・状態 */
  mood?: string;
  /** エネルギーレベル（"high" / "medium" / "low" / 1-10 など自由入力） */
  energy?: string;
  /** 天候・環境コンテキスト */
  weather?: string;
  /** 場所・ロケーション */
  location?: string;
  /** 本日のフォーカス／主題 */
  focus?: string;
  /** 感謝記録 */
  gratitude?: string;
  /** 明日・次の行動への意図 */
  intentions?: string;
  /** 関連ノードID群 */
  linkedNodeIds?: string[];
  /** 関連トピック（球体）ID群 */
  linkedTopicIds?: string[];
  /** 自由タグ */
  tags?: string[];
  /** 作成日時 ISO */
  createdAt: string;
  /** 更新日時 ISO */
  updatedAt: string;
};
