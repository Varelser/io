# Obsidian Plugin Plan

## 目的

Thought Workbench の `Obsidian ZIP export` を片方向出力で終わらせず、Obsidian vault での capture と再取り込みまでつなぐ。

## 現在地

- 本体アプリ側:
  - Obsidian / Logseq 互換 ZIP export 済み
  - Standalone HTML snapshot export 済み
- プラグイン側:
  - `obsidian-plugin/` に独立スケルトン追加
  - capture note 作成
  - integration guide note 作成
  - plugin setting tab 追加
  - 最新 JSON snapshot の importer 追加
  - topic / node ノートの vault 展開
  - import report の出力
  - imported note から exchange JSON の export
  - 本体側 `JSON読込` で exchange patch 適用

## ステータス表記

- import: stable
- export: stable
- round-trip sync: beta
- conflict resolution policy: experimental / fixed pending

## 次に必要な実装

1. 再同期時の upsert / conflict 方針固定
2. ZIP export との往復整合
3. plugin bundle の独立配布手順固定

## 分離方針

- 本体アプリとは別 package として維持する
- root build に plugin 依存を混ぜない
- 将来的に別 repository または別 branch に切り出しやすい構成にする
