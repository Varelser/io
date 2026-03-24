# Thought Workbench

3D / 2D 空間、時間軸、複数ペイン、思考プリセットを組み合わせて使うローカル保存型の思考ワークベンチです。ノードを配置して終わりではなく、レビュー、差分比較、未来分岐、sandbox、backport まで含めて扱えます。

## 現在地

- ローカル SPA（Vite 6 + React 18 + TypeScript）
- 保存は `localStorage + IndexedDB`
- 17 ビュー + MultiPane（`single / vertical-2 / horizontal-2 / triple / quad`）
- 未来分岐 `ScenarioBranch`、sandbox topic、差分レビュー、sync / backport、推奨操作まで実装済み
- PWA manifest / icon / scope / start_url 整備済み
- PDF import は CDN 依存ではなくローカル bundle worker を使用
- 画面上に build version / offline ready / update available を表示
- 初回確認用の複数 `Load Sample / Append / Export JSON` を搭載し、sample ごとの件数プレビュー、実行前 preview、追加される branch / bundle / layout 名、最初に見る操作案内、開始 view 切替、replace 時の current state 件数警告、append 後の合計件数と増加率、preview 内 JSON export、current state に応じた推奨操作とボタン強調を表示
- sample には `Story Branch`、`Research Review`、`Task Flow`、`Method Studio` を含み、配布確認時にプリセット横断の導線も触れる

## セットアップ

```bash
npm install
npm run dev
```

- 開発サーバー: `http://localhost:5173`
- テスト: `npm test`
- 型検査: `npx tsc --noEmit`
- 本番ビルド: `npm run build`
- 配布パッケージ生成: `npm run release:prepare`
- ビルド確認: `npm run preview`
- 初回確認は左パネル `Import` 内で sample を選び、件数プレビューと `start guide`、開始 view を見て `Load Sample` / `Append` / `Export JSON` を使うのが最短

## 配布

- 本番出力は `dist/`
- 配布用の整理済み出力は `release/thought-workbench-web/`
- PWA の `base / start_url / scope` は `/4dthinkingos/`
- アイコンは `public/icon.svg`、`public/icon-maskable.svg`、`public/favicon.svg`
- PDF worker は build 時に `dist/assets/pdf.worker.min-*.mjs` として出力される
- 左パネル `Import / Export` から単一ファイルの `Standalone HTML` snapshot を出力できる
- manifest には screenshot と shortcut も含まれる

GitHub Pages など `/4dthinkingos/` 配下で配る前提の設定です。別パスで配る場合は [vite.config.ts](/Users/s_seq/Downloads/thought-workbench/vite.config.ts) の `base` と manifest の `start_url / scope` を合わせて変更してください。

`npm run release:prepare` を使うと、`dist/` と配布文書だけをまとめた `release/thought-workbench-web/` を生成できます。

### GitHub Pages

このリポジトリには Pages 用 workflow が入っています。[deploy.yml](/Users/s_seq/Downloads/thought-workbench/.github/workflows/deploy.yml)

手順:
- GitHub の `Settings > Pages` で `Build and deployment` を `GitHub Actions` にする
- デフォルトブランチを `main` にして push する
- Actions の `Deploy static content to Pages` が成功することを確認する
- 配布先 URL が `/4dthinkingos/` と一致することを確認する

リポジトリ名や公開パスが `/4dthinkingos/` と違う場合は、先に [vite.config.ts](/Users/s_seq/Downloads/thought-workbench/vite.config.ts) の `base` と manifest の `start_url / scope` を変更してください。

### 配布チェック

- 初回表示で JS / CSS / icon / manifest が 404 にならない
- `dist/assets/pdf.worker.min-*.mjs` が配布物に含まれる
- PWA manifest の `start_url` と `scope` が公開パスと一致する
- manifest に screenshot / shortcut / icon が含まれ、`Standalone` install 情報が崩れない
- 再読込後も画面が崩れない
- ブラウザストレージを許可した状態で保存 / 復元が動く
- service worker 更新後に古い資産を掴み続けない
- `Standalone HTML` を開いて topic 一覧が見え、埋め込み JSON を再保存できる

## コア機能

### 表示 / 編集
- Sphere / Workspace / Network / Mindmap / Canvas2d
- Folder / Depth / Journal / Calendar / Intake / Stats / Task / Table / Review / Timeline / Diff / Maintenance
- ノード / エッジ / トピック CRUD
- 複数選択、一括操作、Split / Merge
- Workspace のパン / ズーム / Home / Fit / ミニマップ / 最近見た地点履歴
- Bookmark、Layout Preset、Smart Folder、Bundle、Conversion Queue、Event Log

### 時間 / 分岐
- Timeline Scrubber
- 履歴フレーム保存 / 適用 / 削除
- 比較アンカー `A / B`
- 未来分岐 `ScenarioBranch`
- 分岐ごとの仮説 / 次アクション / メモ / スナップショット
- 分岐の sandbox 実体化
- `source -> sandbox` sync、`sandbox -> source` backport
- 差分レビュー、衝突リスク表示、推奨操作、プレビュー確認

### 入出力
- JSON / Markdown / CSV
- PDF / DOCX / HTML / SVG import
- Standalone HTML snapshot export
- Obsidian / Logseq 互換 ZIP export
- `obsidian-plugin/` の独立 scaffold
- `JSON読込` から Obsidian exchange patch の適用

### 補助
- Suggestion engine
- Integrity / Maintenance
- PageRank
- 日本語 / 英語 UI 切替

## 実装済みプリセット / Seed

- Free
- Mandala
- Semantic
- Strata
- Zettelkasten
- PARA
- GTD
- Poincare
- Hebbian
- Dialectic
- Toulmin
- Causal
- KJ

各プリセットには `Guide / Seed` があり、基本構造を初期生成できます。主要プリセットの専用 UI は一通り揃っていて、差が残るのは主に拡張プリセット群です。

## 主な制約

- 完全な 3D エンジンではなく、軽量な SVG / 2D 投影ベース
- 大規模ノード数での最適化は継続中
- 共同編集 / ネットワーク同期は未実装
- 配布設定はかなり整ったが、配布先ごとの実運用確認は継続中

## 関連文書

- 変更履歴: [CHANGELOG.md](/Users/s_seq/Downloads/thought-workbench/CHANGELOG.md)
- 現在の進捗: [ROADMAP.md](/Users/s_seq/Downloads/thought-workbench/ROADMAP.md)
- 実装評価: [EVALUATION_AND_ROADMAP.md](/Users/s_seq/Downloads/thought-workbench/EVALUATION_AND_ROADMAP.md)
- Obsidian plugin plan: [OBSIDIAN_PLUGIN_PLAN.md](/Users/s_seq/Downloads/thought-workbench/OBSIDIAN_PLUGIN_PLAN.md)
- Codex / Claude 向け補助: [CLAUDE.md](/Users/s_seq/Downloads/thought-workbench/CLAUDE.md)
