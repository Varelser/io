export const IMPLEMENTATION_PLAN = [
  {
    id: "spatial",
    label: "空間基盤",
    items: [
      { label: "3D球体ビュー", done: true },
      { label: "俯瞰マップ", done: true },
      { label: "ドラッグ回転", done: true },
      { label: "ズーム", done: true },
      { label: "球体表示設定", done: true },
      { label: "ノード直接配置固定", done: true },
    ],
  },
  {
    id: "pkm",
    label: "PKM / 入出力",
    items: [
      { label: "Markdown import", done: true },
      { label: "Markdown export", done: true },
      { label: "全topic zip出力", done: true },
      { label: "JSON import / export", done: true },
      { label: "cross-topic link復元", done: true },
      { label: "未解決link手動解決", done: true },
    ],
  },
  {
    id: "thinking",
    label: "思考支援",
    items: [
      { label: "プリセット適用", done: true },
      { label: "PageRank可視化", done: true },
      { label: "Must One", done: true },
      { label: "検索 / jump", done: true },
      { label: "layer / group filter", done: true },
      { label: "履歴再生", done: true },
    ],
  },
  {
    id: "restoration",
    label: "復元ロードマップ",
    items: [
      { label: "preset guide", done: true },
      { label: "seed生成", done: true },
      { label: "日本語 / 英語切替", done: true },
      { label: "history保存round-trip", done: true },
      { label: "topic link round-trip", done: true },
      { label: "UI微調整群", done: false },
    ],
  },
];

export function summarizeImplementationProgress() {
  const groups = IMPLEMENTATION_PLAN.map((group) => {
    const total = group.items.length;
    const done = group.items.filter((item) => item.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { ...group, total, done, percent };
  });
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const done = groups.reduce((sum, group) => sum + group.done, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { groups, total, done, percent };
}
