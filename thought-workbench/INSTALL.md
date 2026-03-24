# Install

## 必要環境

- Node.js 20 以上
- npm

## 開発起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

初回確認は左パネル `Import` 内で sample を選び、件数プレビュー、実行前 preview、`start guide`、開始 view、replace 警告、append 後の合計件数と増加率、推奨操作とボタン強調を見て `Load Sample` / `Append` / `Export JSON` を使うと早いです。`Method Studio` sample を使うと Strata / Semantic / PARA / Must One の導線をまとめて確認できます。

## 検証

```bash
npm test
npx tsc --noEmit
npm run build
```

## 本番ビルド

```bash
npm run build
npm run preview
```

配布用に開発ファイルを除いた出力を作る場合:

```bash
npm run release:prepare
```

- 出力先: `dist/`
- 整理済み配布パッケージ: `release/thought-workbench-web/`
- PWA base: `/4dthinkingos/`
- manifest icon: `public/icon.svg`, `public/icon-maskable.svg`, `public/favicon.svg`
- PDF worker: build 時に `dist/assets/pdf.worker.min-*.mjs` が生成される
- 左パネル `Import / Export` から `Standalone HTML` snapshot を出力できる

## 配布時の注意

- GitHub Pages など `/4dthinkingos/` 配下で配る前提の設定です
- 別のパスで配る場合は [vite.config.ts](./vite.config.ts) の `base`、manifest の `start_url / scope` を合わせて変更してください
- ローカル永続化は `localStorage + IndexedDB` を使います。ブラウザのストレージ削除でデータは消えます

## GitHub Pages 手順

1. GitHub の `Settings > Pages` を開く
2. `Build and deployment` を `GitHub Actions` にする
3. `main` へ push する
4. [deploy.yml](./.github/workflows/deploy.yml) が成功することを確認する
5. 公開 URL が `/4dthinkingos/` と一致することを確認する

## 配布後チェック

- HTML / JS / CSS / manifest / icon に 404 が出ない
- PDF import 用 worker がロードされる
- manifest の screenshot / shortcut / icon 情報が build 後も残る
- 再読込しても画面が壊れない
- 保存したデータが localStorage / IndexedDB に残る
- PWA 更新後に古いキャッシュを掴み続けない
- `Standalone HTML` を開いて topic 一覧が見え、埋め込み JSON を再保存できる

## 備考

- このリポジトリには Claude / Codex 補助ファイルも含まれますが、アプリ起動には不要です
- `obsidian-plugin/` は Obsidian 側の独立 scaffold で、本体アプリの build / test には含めていません
- 本体の `JSON読込` は通常 snapshot に加えて Obsidian exchange JSON の patch 適用にも使えます
- 使い方の全体像は [README.md](./README.md) を参照してください
