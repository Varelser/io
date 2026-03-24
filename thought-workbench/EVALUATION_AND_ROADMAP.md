# Thought Workbench — ソフトウェア評価・課題・ロードマップ

> **作成日**: 2026-03-18
> **対象バージョン**: ローカル開発版（LocalStorage + IndexedDB 併用、Vite 6 + React 18 + TypeScript 5.7）
> **総ソース行数**: 約 13,200 行（142ファイル、node_modules/dist除外）
> **目的**: 本文書は、このプロジェクトを初めて読む AI エージェントまたは開発者が、現状の全体像・設計思想・技術的負債・未実装事項を短時間で把握できることを目的とする。

---

## 1. プロジェクト概要

**4D Knowledge Management System（思考ワークベンチ）** は、思考・知識・生活に関するノードを 3D 球体上に配置し、理論的フレームワーク（SECI モデル、二階のサイバネティクス、アブダクション、境界思考、トゥールミン論証 等）に基づいて管理する React SPA である。

**核心的な設計思想:**
- Three.js を使わず純粋な SVG + 数学的投影で 3D を実現
- 「後から整理」を許容する Intake Layer（Inbox → Staging → Placed）
- 知識状態（hypothesisStage）と作業状態（workStatus）の明確な分離
- 提案型自動化（勝手に確定せず、提案 → 承認パターン）
- 1つのノードが複数球体に所属可能（sharedId による多重所属）

---

## 2. アーキテクチャ評価

### 2.1 レイヤー構成

```
UI 層          components/ (views 17種 + panels 20種 + ui 11種 + sphere/workspace)
フック層       hooks/ (18種: 状態管理・CRUD・テーマ・ジェスチャー)
オペレーション層  graph-ops/ (11種: ノード/エッジ/球体CRUD・フィルタ・履歴・プリセット)
データ層       types/ (9種) + normalize/ (7種) + storage/ (5種)
支援層         utils/ (8種) + constants/ (11種) + markdown/ (6種) + projection/ (4種) + pagerank/ (2種)
```

**評価:**
責務分離は概ね適切。`graph-ops/` に純粋関数として CRUD ロジックを集約し、`hooks/` がそれを React ライフサイクルに接続する設計は、テスタビリティと再利用性の観点で優れている。

### 2.2 強み

| 項目 | 詳細 |
|------|------|
| **理論駆動の型設計** | `NodeItem` に `ObserverMeta`, `HypothesisStage`, `KnowledgePhase`, `MembershipStatus` 等を直接型定義。理論 → 実装の対応が追跡可能 |
| **正規化パイプライン** | `normalizeState()` → `normalizeTopicItem()` → `normalizeNodeItem()` の 3 段チェーンで、壊れたデータも安全にロード。後方互換性の維持に極めて有効 |
| **17 ビュー + マルチペイン** | Sphere / Workspace / Network / Mindmap / Canvas2d / Folder / Depth / Journal / Calendar / Intake / Stats / Task / Table / Review / Timeline / Diff / Maintenance の 17 ビュー + マルチペイン分割（Single / Vertical-2 / Horizontal-2 / Triple / Quad） |
| **管理法レイヤー** | 13 個のビルトイン管理法 × `PropertyDef` 動的 UI × `extensions` スロットで、ノードに任意のメタデータを後付け可能 |
| **Undo/Redo** | 60 フレームの履歴スタックを `useAppState` 内に保持。全操作が取り消し可能 |
| **Markdown 双方向変換** | Sphere データ ↔ Markdown の往復変換。外部文書からのインポートと知識のエクスポートを同時にサポート |
| **外部フォーマット対応** | PDF（pdfjs-dist, ローカル worker bundle）、DOCX（mammoth）、HTML、SVG、CSV のインポート/エクスポート |
| **依存関係の最小化** | 本番依存はわずか 5 パッケージ（react, react-dom, jszip, mammoth, pdfjs-dist） |
| **CSS テーマシステム** | CSS 変数（`--tw-bg`, `--tw-accent` 等）による dark / light / midnight の 3 テーマ |

### 2.3 弱み・技術的負債

| 項目 | 深刻度 | 詳細 |
|------|--------|------|
| **App.tsx の肥大化** | 高 | 474 行に 18 個のフック呼び出し、20+ の CRUD コールバック、16 セクションの右パネル UI が集中。単一コンポーネントの責務が過大 |
| **テスト実行の安定性不足** | 中 | `.test.ts` は存在するが、継続的な実行確認と回帰運用が文書化されていない。環境依存の失敗時に検証が止まりやすい |
| **永続化戦略の整理不足** | 中 | `localStorage` に加え IndexedDB 併用が入っているが、保存戦略・容量時挙動・復旧優先順位の文書化が不足している |
| **型安全性の穴** | 中 | `normalize/state.ts` 内で `(input as any).journals` 等のキャストが多用。`AppState` の型定義と実ランタイムデータの乖離を吸収するためだが、新フィールド追加時のメンテナンスコストが高い |
| **パフォーマンス未最適化** | 中 | `useMemo` は適切に使用されているが、球体ノード数が 100+ になった場合の SVG レンダリングコスト未検証。`React.memo` や仮想化が未適用 |
| **アクセシビリティ未対応** | 低 | ARIA 属性、キーボードナビゲーション（Tab 順序）、スクリーンリーダー対応がほぼ未実装 |
| **i18n の簡易実装** | 低 | `UI_TEXT[lang]` による手動辞書。翻訳漏れの検出機構がない |

---

## 3. 実装済み機能インベントリ

### 3.1 ビュー（17 + マルチペイン）

| # | ビュー | ファイル | 状態 |
|---|--------|----------|------|
| 1 | Sphere（3D球体） | `components/sphere/SphereView.tsx` | 完全実装 |
| 2 | Workspace（2Dキャンバス） | `components/workspace/WorkspaceView.tsx` | 完全実装 |
| 3 | Network（グラフ） | `components/views/NetworkView.tsx` | 完全実装 |
| 4 | Mindmap | `components/views/MindmapView.tsx` | 完全実装 |
| 5 | Canvas2d | `components/views/Canvas2dView.tsx` | 完全実装 |
| 6 | Folder（階層ツリー） | `components/views/FolderView.tsx` | 完全実装 |
| 7 | Depth（深度レイヤー） | `components/views/DepthView.tsx` | 完全実装 |
| 8 | Journal（日記） | `components/views/JournalView.tsx` | 完全実装 |
| 9 | Calendar | `components/views/CalendarView.tsx` | 完全実装 |
| 10 | Intake（流入受け皿） | `components/views/IntakeView.tsx` | 完全実装 |
| 11 | Stats（統計） | `components/views/StatsView.tsx` | 完全実装 |
| 12 | Task（GTD） | `components/views/TaskView.tsx` | 完全実装 |
| 13 | Table | `components/views/TableView.tsx` | 完全実装 |
| 14 | Review（再浮上） | `components/views/ReviewView.tsx` | 完全実装 |
| 15 | Timeline（4Dスクラバー） | `components/views/TimelineView.tsx` | 完全実装 |
| 16 | Diff（差分比較） | `components/views/DiffView.tsx` | 完全実装 |
| 17 | Maintenance（保守） | `components/views/MaintenanceView.tsx` | 完全実装 |

### 3.2 右パネル機能（20 種）

| # | パネル | 機能 |
|---|--------|------|
| 1 | TopicPanel | 球体メタ編集（名前・スタイル・mustOneNode） |
| 2 | MethodSelectorPanel | 管理法トグル（13 種） |
| 3 | NodePanel | ノード属性編集（型・緊張・確信度・仮説段階・作業状態・根拠種別・版状態） |
| 4 | SearchFilterPanel | 検索・レイヤー/グループフィルタ・一括操作 |
| 5 | HistoryPanel | スナップショット・フレーム管理 |
| 6 | NodeNetworkPanel | エッジ編集（矛盾タイプ・変換演算・重み） |
| 7 | TopicLinksPanel | 球体間リンク管理 |
| 8 | MarkdownJsonPanel | Markdown/JSON エクスポート・インポート |
| 9 | PageRankPanel | ページランク順位表示 |
| 10 | QueryPanel | 11 フィルタのクロストピック検索 |
| 11 | BookmarkPanel | キャンバスブックマーク管理 |
| 12 | LayoutPresetPanel | レイアウトプリセット保存・適用 |
| 13 | SmartFolderPanel | 10 ビルトイン + カスタムスマートフォルダ |
| 14 | IntegrityPanel | 整合性検出（重複名・孤立・破損参照・空・URL重複・類似名） |
| 15 | ConversionQueuePanel | 変換キュー管理（ノード → タスク/仮説/定義等） |
| 16 | EventLogPanel | イベントログ表示（13種イベント、最大500件） |
| 17 | ExtensionsEditor | 管理法拡張スロット編集 |
| 18 | UrlPanel | URL 管理 |
| 19 | RecoveryPanel | 復旧・修復 UI |
| 20 | TopicListPanel | トピック一覧 |

### 3.3 データモデル

**NodeItem 主要フィールド（32+ フィールド）:**
```
基本: id, label, type, tense, position[3], note, size, frameScale, group, layer
メタ: depth, confidence, tags, sharedId, counterArgumentNodeIds, linkedUrls, task
時間: createdAt, updatedAt
理論: observer, hypothesisStage, confidenceLog, knowledgePhase, membershipStatus
ワークフロー: intakeStatus, workStatus, evidenceBasis, versionState
拡張: extensions (Record<string, Record<string, unknown>>)
```

**AppState 構造:**
```
topics: TopicItem[]
topicLinks: TopicLinkItem[]
journals: JournalEntry[]
managementMethods?: ManagementMethod[]
eventLog?: EventLogEntry[]
bookmarks?: CanvasBookmark[]
layoutPresets?: LayoutPreset[]
smartFolders?: SmartFolder[]
conversionQueue?: ConversionItem[]
bundles?: BundleItem[]
```

---

## 4. 追加要件仕様との差分（再分類）

以下は `4d_kms_ui_spec_additional_requirements_v1.md` に記載された要件を、現行コードベースに合わせて再分類したものである。

### 4.1 実装済み

| # | 要件 | 仕様書章 | 現状 | 実装指針 |
|---|------|----------|------|----------|
| 1 | **Bundle / Dossier / Case** | §6 | `BundleItem` 型、state、CRUD、Panel UI まで実装済み | 専用ビュー化や FolderView 連携は追加余地あり |
| 2 | **自動提案エンジン** | §15 | 類似名 / 共通タグ / orphan / merge 候補を検出済み | TF-IDF 等の高度化は今後 |
| 3 | **保守ダッシュボード** | §19 | MaintenanceView と IntegrityPanel で実装済み | 1 画面集約の粒度調整は余地あり |
| 4 | **ソート可能テーブル** | §14 | カラムヘッダクリックによるソート実装済み | 複合ソートや型別ソートは追加余地あり |
| 5 | **ノード分割・統合 UI** | §8 | Context Menu とロジック実装済み | 専用ダイアログは未実装 |
| 6 | **資料ノード処理状態** | §10 | `materialStatus` と MaintenanceView 側検出あり | 専用UIの強化余地あり |
| 7 | **IndexedDB バックエンド** | - | `storage/indexeddb.ts` と起動時 / 保存時の併用あり | アダプタ統合の整理は追加余地あり |
| 8 | **エクスポート: Obsidian / Logseq 互換** | - | Vault 構造の ZIP export を実装済み | 完全互換検証は別途必要 |

### 4.2 部分実装 / 要拡張

| # | 要件 | 仕様書章 | 現状 | 実装指針 |
|---|------|----------|------|----------|
| 9 | **一時テーブル / 仕分け机 UI** | §7 | IntakeView はあるが Kanban 的な仕分け机 UI ではない | inbox → staging → placed の視覚操作を追加 |
| 10 | **名前付きキャンバス領域** | §13 | WorkspaceView の位置管理はあるが領域概念なし | `canvasRegions` 等の導入を検討 |
| 11 | **命名補助 UI** | §16 | `constants/naming-templates.ts` はあるが、ノード作成導線に強く接続されていない | type 連動の提案 UI を追加 |
| 12 | **PWA / オフライン配布品質** | - | PWA icon / scope / start_url / build chunk 分割 / PDF worker ローカル化までは整備済み。配布先ごとの実運用確認は継続 | README / 配布先検証 / キャッシュ更新確認を詰める |

### 4.3 未実装

| # | 要件 | 仕様書章 | 現状 | 実装指針 |
|---|------|----------|------|----------|
| 13 | **コラボレーション / 同期** | - | 完全にローカル | CRDT（Yjs 等）の導入が必要。アーキテクチャ変更が大きい |

---

## 5. 技術的課題と改善提案

### 5.1 App.tsx の分割（最重要）

**現状:** 474 行、18 フック、20+ コールバック、16 右パネルセクションが 1 ファイルに集中。

**提案:**
```
App.tsx（50行: レイアウトシェルのみ）
├── providers/AppStateProvider.tsx（状態管理コンテキスト）
├── layouts/LeftSidebar.tsx（左パネル）
├── layouts/RightInspector.tsx（右パネル 16 セクション）
├── layouts/CenterViewport.tsx（中央ビュー + ミニマップ）
└── layouts/BottomBar.tsx（タイムラインスクラバー）
```

React Context で `state`, `updateState`, 各 CRUD フックを提供し、子コンポーネントが `useContext` で取得する設計に移行すべきである。

### 5.2 テスト導入

**優先テスト対象（純粋関数、テスト容易性が高い）:**

| ファイル | テスト内容 |
|----------|-----------|
| `normalize/state.ts` | 壊れた入力 → 正常な AppState に修復されること |
| `normalize/node.ts` | 欠損フィールドがデフォルト値で補完されること |
| `graph-ops/node-crud.ts` | ノード追加・削除・更新の不変性テスト |
| `graph-ops/filter.ts` | 検索クエリ・フィルタの正確性 |
| `utils/wikilink.ts` | `[[link]]` パースの境界値テスト |
| `pagerank/compute.ts` | 既知グラフでの PageRank 値検証 |
| `markdown/parser.ts` | Markdown → ノード/エッジ変換の正確性 |

**推奨ツール:** Vitest（Vite ネイティブ、設定不要）

### 5.3 パフォーマンス

| 項目 | 閾値 | 対策 |
|------|------|------|
| ノード数 50+ の SVG 描画 | フレームドロップ発生の可能性 | `React.memo` で個別ノードの不要再描画を防止。ビューポート外ノードのカリング |
| 全トピック横断検索（QueryPanel） | トピック数 20+ で遅延 | Web Worker でバックグラウンド検索 or デバウンス強化 |
| localStorage 書き込み | 5MB 超で失敗 | IndexedDB への移行 or 差分保存 |
| 右パネル 16 セクションの同時マウント | 初回レンダリングコスト | `lazy` + `Suspense` で未開封セクションの遅延ロード |

### 5.4 データ永続化の強化

**現状の問題:**
- `localStorage` は同期 API であり、大量データの書き込みでメインスレッドをブロック
- 容量上限（通常 5-10MB）を超えると `QuotaExceededError` が発生するが、現在エラーハンドリングが不十分
- ブラウザのプライベートモードではセッション終了時にデータ消失

**段階的改善案:**
1. **即時:** `try-catch` で `QuotaExceededError` を捕捉し、ユーザーにファイルエクスポートを促すトースト通知
2. **短期:** IndexedDB アダプタの追加（`storage/indexeddb.ts`）。既存の `storage/persist.ts` のインターフェースを維持
3. **中期:** ファイルシステムアクセス API（`showSaveFilePicker`）による直接ファイル保存オプション

---

## 6. ファイル構成マップ（AI 向けクイックリファレンス）

```
thought-workbench/
├── App.tsx                          # メインオーケストレーター（474行）
├── index.tsx                        # エントリーポイント
│
├── types/                           # 型定義（全9ファイル）
│   ├── node.ts                      # NodeItem + 理論型（IntakeStatus, WorkStatus等）
│   ├── topic.ts                     # TopicItem, TopicLinkItem
│   ├── edge.ts                      # EdgeItem, ContradictionType
│   ├── app-state.ts                 # AppState, CanvasBookmark, SmartFolder, ConversionItem
│   ├── journal.ts                   # JournalEntry
│   ├── history.ts                   # HistoryFrame
│   ├── event-log.ts                 # EventLogEntry（13種イベント）
│   ├── management-method.ts         # ManagementMethod, PropertyDef
│   └── index.ts                     # re-export
│
├── hooks/                           # カスタムフック（全18ファイル）
│   ├── useAppState.ts               # グローバル状態 + Undo/Redo（60フレーム）
│   ├── useSelection.ts              # トピック/ノード選択
│   ├── useNodeCrud.ts               # ノードCRUD
│   ├── useEdgeCrud.ts               # エッジCRUD
│   ├── useTopicCrud.ts              # 球体CRUD
│   ├── useBulkOps.ts                # 一括操作
│   ├── useJournal.ts                # 日記管理
│   ├── useTheme.ts                  # テーマ・フォントサイズ・パネル幅
│   ├── useEventLog.ts               # イベントログ自動記録
│   ├── useKeyboard.ts               # ショートカット（Ctrl+Z/Y, Esc, Space, F）
│   └── ...                          # 他8ファイル
│
├── components/
│   ├── MainViewport.tsx             # ビュールーティング（16ビュー分岐）
│   ├── MultiPaneLayout.tsx          # マルチペイン（Single/Vertical/Horizontal/Triple）
│   ├── TimelineScrubber.tsx         # 4Dタイムラインスクラバー
│   ├── Minimap.tsx                  # ミニマップオーバーレイ
│   ├── ErrorBoundary.tsx            # エラーバウンダリー
│   │
│   ├── sphere/SphereView.tsx        # 3D球体（SVG投影、ドラッグ回転、Alt複製、Shift連結）
│   ├── workspace/WorkspaceView.tsx  # 2D無限キャンバス
│   │
│   ├── views/                       # ビューコンポーネント（14ファイル）
│   │   ├── NetworkView.tsx          # 力学グラフ
│   │   ├── IntakeView.tsx           # 流入受け皿（Inbox/Staging/Archive/Placed）
│   │   ├── ReviewView.tsx           # 再浮上候補
│   │   ├── CalendarView.tsx         # 月間カレンダー
│   │   ├── TimelineView.tsx         # 4Dタイムライン
│   │   ├── DiffView.tsx             # 差分比較
│   │   └── ...                      # 他8ファイル
│   │
│   ├── panels/                      # 右パネルコンポーネント（20ファイル）
│   │   ├── NodePanel.tsx            # ノード属性編集（理論フィールド含む）
│   │   ├── QueryPanel.tsx           # 11フィルタ横断検索
│   │   ├── SmartFolderPanel.tsx     # スマートフォルダ（10ビルトイン）
│   │   ├── IntegrityPanel.tsx       # 整合性検出（6カテゴリ）
│   │   ├── ConversionQueuePanel.tsx # 変換キュー
│   │   └── ...                      # 他15ファイル
│   │
│   └── ui/                          # 汎用UI（11ファイル: Button, Select, Input, Section, Toast, ContextMenu等）
│
├── graph-ops/                       # グラフ操作・純粋関数（11ファイル）
├── normalize/                       # 状態正規化パイプライン（7ファイル）
├── constants/                       # 定数・ビルトイン管理法（11ファイル）
├── utils/                           # ユーティリティ（8ファイル: id生成, wikilink, query-engine等）
├── storage/                         # LocalStorage永続化（5ファイル）
├── projection/                      # 3D投影計算（4ファイル）
├── markdown/                        # Markdown双方向変換（6ファイル）
├── pagerank/                        # PageRank計算（2ファイル）
└── import/                          # ファイルインポート・CSV出力（2ファイル）
```

---

## 7. AI エージェント向け作業ガイドライン

### 7.1 開発環境

```bash
cd /Users/s_seq/Downloads/thought-workbench
npm run dev          # Vite dev server (port 5173)
npx tsc --noEmit     # 型チェック（ビルドなし）
```

### 7.2 新機能追加時の手順

1. **型定義**: `types/` に型を追加し、`types/index.ts` で re-export
2. **正規化**: `normalize/` に検証ロジックを追加（壊れたデータの安全なフォールバック）
3. **操作ロジック**: `graph-ops/` に純粋関数として CRUD を実装
4. **フック**: `hooks/` に React フックとしてラップ
5. **UI**: `components/panels/` or `components/views/` にコンポーネントを作成
6. **統合**: `App.tsx` にインポート・接続（※ 将来的には Context 経由に移行予定）
7. **ビュー追加時**: `constants/views.ts` の `VIEW_TYPES` と `VIEW_LABELS` に追加 → `MainViewport.tsx` にルーティング追加

### 7.3 変更時の注意点

- `normalizeState()` は **必ず** 新フィールドのフォールバックを含めること。既存ユーザーの LocalStorage データが壊れる
- `NodeItem` にフィールドを追加する場合、`normalize/node.ts` の `normalizeNodeItem()` にも対応するバリデーションを追加すること
- `App.tsx` を修正する場合、474 行の中で **正確な位置** を特定してから編集すること。フックの呼び出し順序に依存関係がある
- SphereView.tsx の変数宣言順序には **Temporal Dead Zone (TDZ)** の制約がある。`useMemo` / `useCallback` の宣言順序を変更する場合は依存グラフを確認すること

### 7.4 既知の制約

- **テストなし**: 変更後は `npx tsc --noEmit` + ブラウザでの手動確認が唯一の検証手段
- **localStorage 容量**: 大量のトピック/ノードを扱うとデータ損失リスクあり
- **SVG パフォーマンス**: ノード 100+ で描画が重くなる可能性（未検証）
- **Intel Mac 限定**: ビルド手順は x86_64 アーキテクチャ前提。arm64 (Apple Silicon) の手順を提示しないこと

---

## 8. 実装優先度マトリクス（推奨ロードマップ）

### Phase 1: 品質基盤（工数: 小）
- [x] Vitest 導入 + normalize/ と graph-ops/ のユニットテスト
- [x] localStorage QuotaExceededError のハンドリング
- [x] TableView のカラムソート実装

### Phase 2: App.tsx 分割（工数: 中）
- [x] React Context による状態配信
- [x] 左パネル / 右パネル / 中央ビューの独立コンポーネント化
- [ ] 右パネルセクションの遅延ロード

### Phase 3: 未実装機能（工数: 中〜大）
- [x] Bundle / Dossier 機能（型定義 → UI → CRUD）
- [x] ノード分割・統合 UI
- [x] 自動提案エンジン（類似ノード検出）
- [x] 保守ダッシュボード

### Phase 4: インフラ強化（工数: 大）
- [ ] IndexedDB バックエンド
- [ ] Web Worker による検索・計算のオフロード
- [ ] PWA 化（Service Worker + オフライン対応）
- [x] Obsidian / Logseq 互換エクスポート

---

## 9. 理論的背景（参照用）

本システムの設計根拠となる理論体系:

| 理論 | 適用箇所 | 対応フィールド/機能 |
|------|----------|---------------------|
| **二階のサイバネティクス** | 観測者メタ情報 | `observer: ObserverMeta` |
| **アブダクション / ベイズ更新** | 仮説ライフサイクル | `hypothesisStage`, `confidenceLog` |
| **SECI モデル** | 知識創造フェーズ | `knowledgePhase` |
| **境界思考** | 所属状態管理 | `membershipStatus` |
| **トゥールミン論証** | 論証構造 | `Argument Structure` 管理法 |
| **GTD (Getting Things Done)** | タスク管理 | `task: NodeTask`, TaskView |
| **図書館情報学** | 分類・メタデータ | `Library Classification` 管理法 |

---

*本文書は thought-workbench プロジェクトの 2026-03-18 時点でのスナップショットである。コードベースの変更に伴い、定期的な更新を推奨する。*
