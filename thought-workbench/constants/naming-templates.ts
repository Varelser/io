/**
 * ノードの type に応じた命名テンプレート
 * ノード作成時に参照し、適切な名前づけを補助する
 */
export const NAMING_TEMPLATES: Record<string, { ja: string; en: string; examples: string[] }> = {
  "主張": {
    ja: "「〜である」「〜すべき」の形式で命名",
    en: "Name as 'X is Y' or 'X should Y'",
    examples: ["知識は体系化すべき", "創造性は制約から生まれる"],
  },
  "仮説": {
    ja: "「もし〜なら〜」の条件形式で命名",
    en: "Name as 'If X then Y'",
    examples: ["整理を遅延すれば創造性が上がる", "分類が早すぎると視野が狭まる"],
  },
  "問い": {
    ja: "「〜か？」の疑問形で命名",
    en: "Name as a question ending with '?'",
    examples: ["なぜ分類は後回しが良いか？", "知識の単位はどこで区切るべきか？"],
  },
  "定義": {
    ja: "「〜とは〜」の形式で命名",
    en: "Name as 'X is defined as Y'",
    examples: ["ノードとは知識の最小単位", "球体とは文脈空間"],
  },
  "観察": {
    ja: "「〜が見られた」「〜を確認」の事実記述形式",
    en: "Name as observed fact",
    examples: ["整理後にアイデアが減少", "3日放置でレビュー効果増"],
  },
  "反証": {
    ja: "「〜に対する反論」の形式",
    en: "Name as 'Counter to X'",
    examples: ["体系化重視への反論", "早期分類の利点"],
  },
  "断片": {
    ja: "自由形式（後から整理前提）",
    en: "Free form (to be organized later)",
    examples: ["メモ: ふと思いついたこと", "要整理: 昨日の会話から"],
  },
  "証拠": {
    ja: "「[出典] 〜」の形式",
    en: "Name with source prefix",
    examples: ["[論文X] 確信度と精度の相関", "[実験] A/Bテスト結果"],
  },
  "タスク": {
    ja: "「〜する」の動詞形で命名",
    en: "Name as action verb phrase",
    examples: ["論文Xを精読する", "データモデルを整理する"],
  },
  "資料": {
    ja: "「[形式] タイトル」の形式",
    en: "Name as '[format] title'",
    examples: ["[PDF] 知識管理入門", "[URL] ブログ記事"],
  },
};

/**
 * 与えられた type に対応するテンプレートを返す。
 * 一致しない場合は undefined。
 */
export function getNamingTemplate(type: string): { ja: string; en: string; examples: string[] } | undefined {
  return NAMING_TEMPLATES[type];
}
