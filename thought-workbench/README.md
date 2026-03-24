# 4D Thinking OS

4D Thinking OS は、3D / 2D 空間、時間軸、複数ペイン、比較、分岐 sandbox をまとめて扱うローカル保存型の PKM / thinking workbench です。  
ノートを貯めることより、**未整理の断片を置き、あとから再配置・比較・再解釈できること**を重視します。

## これは何か

- local-first SPA（Vite 6 + React 18 + TypeScript）
- 保存は `localStorage + IndexedDB`
- `Sphere / Canvas 2D / Workspace / Network / Timeline / Review / Task` など複数 view を搭載
- MultiPane（`single / vertical-2 / horizontal-2 / triple / quad`）で比較可能
- `ScenarioBranch` による sandbox topic、差分 review、sync / backport を搭載
- `Layout Preset`, `Bundle`, `Smart Folder`, `Selection Set`, `Integrity`, `Maintenance` を搭載

## 他と何が違うか

- ノート本文中心ではなく、**空間配置・時間比較・分岐比較** が中心
- 未整理状態を正式に扱う前提で設計している
- Topic / Node / Edge だけでなく、Workspace・Snapshot・Branch を同じ運用面で扱う
- 3D / 2D / Network / Timeline を同じ state から切り替えられる

## 安定度

| Area | Status | Notes |
| --- | --- | --- |
| Local workspace editing | stable | Topic / Node / Edge / Workspace / MultiPane |
| Import / export | stable | JSON, Markdown, CSV, Standalone HTML, Obsidian ZIP |
| Timeline / Snapshot / Branch sandbox | stable | compare, sync, backport を含む |
| Layout preset / workspace arrangement | stable | saved arrangement, compare preview, revert |
| Integrity / maintenance assist | beta | 運用は可能、rule 拡張余地あり |
| Obsidian round-trip sync | beta | import/export は安定、往復同期は conflict policy 進行中 |
| Material / URL first-class records | planned | まだ canonical model の段階 |
| AI-led automation | experimental | 補助主体、主制御にはしない方針 |

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

## 配布

- 本番出力: `dist/`
- 整理済み配布パッケージ: `release/thought-workbench-web/`
- GitHub Pages の既定公開パス: `/4dthinkingos/`
- 別パスで配る場合は [`vite.config.ts`](./vite.config.ts) の `base` と manifest の `start_url / scope` を合わせて変更
- Pages workflow: [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)

## ドキュメント

### 外向け

- 変更履歴: [`CHANGELOG.md`](./CHANGELOG.md)
- 進捗と実装履歴: [`ROADMAP.md`](./ROADMAP.md)
- インストール: [`INSTALL.md`](./INSTALL.md)
- 位置づけ: [`PRODUCT_POSITIONING.md`](./PRODUCT_POSITIONING.md)

### 正式仕様

- canonical data model: [`DATA_MODEL_SPEC.md`](./DATA_MODEL_SPEC.md)
- canonical state model: [`STATE_MODEL_SPEC.md`](./STATE_MODEL_SPEC.md)
- canonical relation model: [`RELATION_MODEL_SPEC.md`](./RELATION_MODEL_SPEC.md)
- integrity rules: [`INTEGRITY_RULES.md`](./INTEGRITY_RULES.md)
- migration policy: [`MIGRATION_POLICY.md`](./MIGRATION_POLICY.md)
- Obsidian sync policy: [`OBSIDIAN_SYNC_POLICY.md`](./OBSIDIAN_SYNC_POLICY.md)
- 現行実装仕様: [`CURRENT_PRODUCT_SPEC.md`](./CURRENT_PRODUCT_SPEC.md)

### 補助 / 内部向け

- Claude / Codex 補助: [`CLAUDE.md`](./CLAUDE.md)
- Obsidian plugin plan: [`OBSIDIAN_PLUGIN_PLAN.md`](./OBSIDIAN_PLUGIN_PLAN.md)
- 追加 UI 要件: [`4d_kms_ui_spec_additional_requirements_v1.md`](./4d_kms_ui_spec_additional_requirements_v1.md)
- 制作前補助仕様: [`4d_kms_制作前補助仕様_v1.md`](./4d_kms_%E5%88%B6%E4%BD%9C%E5%89%8D%E8%A3%9C%E5%8A%A9%E4%BB%95%E6%A7%98_v1.md)

## 現時点の大きな方針

次に優先するのは新しい view の追加ではなく、以下です。

1. canonical schema の固定
2. state enum の層別固定
3. relation vocabulary の固定
4. stable / beta / experimental / planned の明確化

## 主な制約

- 完全な 3D engine ではなく、軽量な SVG / 2D 投影ベース
- 大規模データでの性能最適化は継続中
- 共同編集 / サーバー同期は未実装
- Material / URL はまだ first-class model へ移行中
