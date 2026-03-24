# Thought Workbench Bridge

Obsidian 向けの独立プラグインです。現時点では Thought Workbench 本体との完全双方向同期ではなく、Obsidian 側での capture と JSON snapshot import を扱う段階です。

## 現在できること

- `Create Thought Workbench capture note`
  - 設定した folder に capture note を作成
- `Create Thought Workbench integration guide note`
  - vault 内に運用メモを生成
- `Import latest Thought Workbench JSON snapshot`
  - 設定した source folder 内の最新 JSON を読み、topic / node ノートへ展開
- `Export Thought Workbench exchange from imported notes`
  - imported note を走査して exchange JSON を出力
- Settings で capture folder / import source / import target / title prefix / tags を変更
  - exchange output folder と最後の import / export も確認可能

出力した exchange JSON は Thought Workbench 本体の `JSON読込` に貼り付けて patch として適用できます。

## 使い方

1. `obsidian-plugin/` で依存を入れる
2. `npm run build`
3. 生成された `main.js` と `manifest.json`、`versions.json` を Obsidian vault の `.obsidian/plugins/thought-workbench-bridge/` に置く
4. Obsidian の Community plugins から有効化する

## 次段階

- upsert / conflict 方針の明確化
- Thought Workbench 本体側で exchange JSON を直接適用
- ZIP export との往復整合

## 位置づけ

本フォルダは本体アプリとは別ラインです。root の `npm test` / `npm run build` には組み込まず、独立検証する前提です。
