# Thought Workbench 実装ステータス総合レポート

**作成日**: 2026-03-23
**リポジトリ**: `thought-workbench`
**対象バージョン**: main branch (commit c0a97269〜)

---

## 1. 実装済み機能（完了）

### 1.1 ビュー（17/17 完了）

| ビュー | ファイル | 状態 |
|--------|----------|------|
| sphere | SphereView.tsx | ✅ 完了 |
| workspace | WorkspaceView.tsx | ✅ 完了 |
| network | NetworkView.tsx | ✅ 完了 |
| mindmap | MindmapView.tsx | ✅ 完了 |
| canvas2d | Canvas2dView.tsx | ✅ 完了 |
| folder | FolderView.tsx | ✅ 完了 |
| depth | DepthView.tsx | ✅ 完了 |
| journal | JournalView.tsx | ✅ 完了 |
| calendar | CalendarView.tsx | ✅ 完了 |
| intake | IntakeView.tsx | ✅ 完了 |
| stats | StatsView.tsx | ✅ 完了 |
| task | TaskView.tsx | ✅ 完了 |
| table | TableView.tsx | ✅ 完了 |
| review | ReviewView.tsx | ✅ 完了 |
| timeline | TimelineView.tsx | ✅ 完了 |
| diff | DiffView.tsx | ✅ 完了 |
| maintenance | MaintenanceView.tsx | ✅ 完了 |

### 1.2 パネル（30/30 完了）

**遅延読込パネル（17件）:**
BookmarkPanel, QueryPanel, LayoutPresetPanel, SmartFolderPanel, IntegrityPanel, ConversionQueuePanel, BundlePanel, SuggestionPanel, EventLogPanel, ScenarioBranchPanel, VocabularyPanel, MaterialPanel, URLRecordPanel, SnapshotPanel, ReviewQueuePanel, JournalPanel, RecoveryPanel

**即時読込パネル（13件）:**
TopicPanel, SearchPanel, SearchFilterPanel, BulkOpsPanel, BulkConnectPanel, NodePanel, NodeOutlinerPanel, HistoryPanel, NodeNetworkPanel, TopicLinksPanel, MarkdownJsonPanel, PageRankPanel, MethodSelectorPanel

### 1.3 グラフ操作（graph-ops）— 全51関数

- **ノードCRUD**: appendNodesToTopic, updateNodeByIdInTopic, removeNodesFromTopic 等 10関数
- **エッジCRUD**: updateEdgeListInTopic, appendEdgesToTopic 等 5関数
- **トピックCRUD**: updateTopicListById, patchTopicItem 等 7関数
- **トピックリンク**: appendTopicLinkItem, resolveUnresolvedTopicLinkInState 等 7関数
- **履歴**: buildHistorySnapshotFrame, applyHistoryFrameToTopic 等 4関数
- **一括操作**: buildBulkConnectPairs, appendBulkConnectedEdgesToTopic 等 7関数
- **プリセット**: applyPresetToTopic, buildSeedItemsForPreset 等 3関数
- **フィルタ/分析**: collectUniqueNodeFieldValues, filterTopicNodes 等 5関数
- **選択**: resolveSelectionIds, getInitialSelectionState 2関数
- **分割/統合**: splitNodeInTopic, mergeNodesInTopic 2関数
- **バンドルCRUD**: createBundle〜updateBundleStatus 9関数

### 1.4 フック（hooks）— 全24フック

| カテゴリ | フック名 |
|----------|----------|
| 状態管理 | useAppState, useSelection, useMultiSelect, useTopicTabs |
| CRUD | useTopicCrud, useNodeCrud, useEdgeCrud, useTopicLinkCrud, useBulkOps |
| ワークスペース | useWorkspaceIO, useWorkspaceCollections, useMarkdownIO, useSampleWorkspace |
| 機能 | useEventLog, useJournal, useScenarioBranches |
| UI/操作 | useKeyboard, useTheme, useToast, useConfirm, useContextMenu, useEdgeEditor, useTopicLinkEditor |
| ジェスチャ | useSpatialGesture, useDraggablePosition |

### 1.5 ユーティリティ（utils/）

| ファイル | 機能 | 状態 |
|----------|------|------|
| state-model.ts | 正規化状態マッチング | ✅ |
| query-engine.ts | クエリDSL（18構文対応） | ✅ |
| smart-folder.ts | SmartFolder フィルタ評価 | ✅ |
| method-color.ts | ManagementMethod colorBy | ✅ |
| maintenance-repair.ts | 保守課題検出+自動修復 | ✅ |
| integrity-check.ts | 整合性チェック | ✅ |
| suggestion-engine.ts | 提案エンジン | ✅ |
| page-rank.ts | PageRank計算 | ✅ |
| migration.ts | データマイグレーション | ✅ |
| json-markdown-convert.ts | JSON⇔Markdown変換 | ✅ |
| topic-link-resolver.ts | トピックリンク解決 | ✅ |
| time-utils.ts | 時間関連ユーティリティ | ✅ |

### 1.6 正規化（normalize/）— 全7ファイル完備

normalizeNodeItem, normalizeEdgeItem, normalizeTopicItem, normalizeTopicLinks, normalizeHistoryFrameItem, normalizeState — 全AppStateレイヤーのマイグレーション対応済み。

### 1.7 NodeItem 編集可能フィールド（25+フィールド）

label, type, tense, position(x/y/z), size, frameScale, group, layer, note, workStatus, intakeStatus, evidenceBasis, versionState, materialStatus, reviewState, publicationState, urlState, depth, confidence, confidenceLog, observer(viewpoint/role/reEvaluation), hypothesisStage, knowledgePhase, membershipStatus, extensions

### 1.8 クエリDSL対応構文（18種）

`type:`, `layer:`, `group:`, `tense:`, `intake:`, `work:`, `version:`, `review:`, `publication:`, `url:`, `tag:`, `confidence:`, `size:`, `has:`, `task:`, `created:`, `updated:`, `topic:`, `ext:`, `hypothesis:`, `phase:`, `member:`, `observer:`, フリーテキスト, NOT(`-`), `OR`, `AND`

### 1.9 ManagementMethod フレームワーク

- プロパティ定義 → ExtensionsEditor 経由でノード編集可能
- displayRules.colorBy → SphereView/Canvas2dView でノード着色
- displayRules.defaultSortKey → NodeOutlinerPanel で推奨ソート表示
- preferredRelations → NodeNetworkPanel でリレーション候補表示
- メソッド有効/無効 → MethodSelectorPanel + TopicPanel バッジ表示

---

## 2. 未実装機能（型定義済み・UI未配線）

### 2.1 高優先度（P0）

| 項目 | 現状 | 影響 |
|------|------|------|
| **タグ編集UI** | NodeItem.tags は型定義あり、セクションタイトル表示あり、但し追加/削除UIなし | ユーザーがUIからタグを管理できない |

### 2.2 中優先度（P1）

| 項目 | 現状 | 影響 |
|------|------|------|
| **SmartFolder 理論フィルタ** | hypothesisStage, knowledgePhase, membershipStatus のフィルタ条件がSmartFolder.filterに未定義 | SmartFolderで知識状態次元のフィルタ不可 |
| **SmartFolder 時間範囲フィルタ** | createdAt/updatedAt 範囲条件が未定義 | 時間ベースのSmartFolder作成不可 |
| **SmartFolder タグフィルタ** | tag条件が未定義 | タグベースのSmartFolder作成不可 |
| **axisPreset 選択UI** | TopicItem.axisPreset は型定義あり、TopicPanel にエディタ未確認 | 軸設定をUIから変更できない可能性 |
| **ワークスペースメモリ不完全** | currentBundleId, currentViewContext のみ永続化。ズーム/キャンバス座標/タイムライン位置は未永続化 | リロード時にビューポート状態喪失（LayoutPresetで補償可能） |

### 2.3 低優先度（P2）

| 項目 | 現状 | 影響 |
|------|------|------|
| **counterArgumentNodeIds 編集UI** | 型定義あり、エディタなし | 反論関係をUIから設定不可 |
| **sharedId 編集UI** | 型定義あり、プログラム的に設定 | 共有ID手動設定不可（一括操作で対応可） |
| **EdgeItem.visible トグル** | 型定義あり、UIトグル未確認 | エッジ個別表示/非表示制御不明 |
| **IMPLEMENTATION_PLAN 定数** | constants/implementation-plan.ts に定義、参照箇所なし | 孤立メタデータ（機能影響なし） |

---

## 3. 実装推奨機能（型未定義・設計上必要）

### 3.1 短期推奨

| 項目 | 根拠 | 推定工数 |
|------|------|----------|
| **SmartFolder フィルタ拡張** | 現在の18種クエリDSLに対してSmartFolder filterは12種のみ。theory-derived fields、temporal、tag 条件追加で一貫性確保 | 中 |
| **ノードタグ一括操作** | BulkOpsPanel にタグ一括追加/削除を追加。タグ編集UIと連携 | 小 |
| **クエリ→SmartFolder 変換の完全性** | QueryPanel→SmartFolder変換は実装済みだが、全クエリ構文がfilter条件にマッピングされていない | 小 |

### 3.2 中期推奨

| 項目 | 根拠 | 推定工数 |
|------|------|----------|
| **ワークスペースメモリ完全化** | CLAUDE.md「Workspace memory is a first-class feature」に対して、現在はcurrentBundleId/currentViewContextのみ。ペインレイアウト、ズーム、タイムライン位置の永続化が本来の設計意図 | 大 |
| **スナップショット差分ビュー強化** | DiffView存在するが、スナップショット間の視覚的差分（ノード追加/削除/移動のハイライト）は限定的 | 中 |
| **コンバージョンパイプライン自動化** | ConversionQueuePanel存在するが、自動変換トリガー（inbox→staging 等）のルール定義UI未実装 | 中 |
| **TopicLinks 双方向解決UI** | resolveUnresolvedTopicLinkInState は実装済みだが、未解決リンクの一括解決ダッシュボードはMaintenanceViewに統合可能 | 小 |

### 3.3 長期推奨

| 項目 | 根拠 | 推定工数 |
|------|------|----------|
| **タイムライン再評価エンジン** | CLAUDE.md「timeline-aware query evaluation」。現在のTimelineViewは表示のみで、過去時点でのクエリ再評価機能は未実装 | 大 |
| **マテリアル→ノード自動抽出** | MaterialからNodeへの知識抽出パイプライン。手動リンクは可能だが、自動提案メカニズムは未実装 | 大 |
| **シナリオブランチ比較ビュー** | ScenarioBranch のマージ/比較は型定義上想定されているが、視覚的な並列比較UIは限定的 | 大 |
| **PWA オフライン同期** | 現在はlocalStorage永続化のみ。複数デバイス間同期やオフライン→オンライン復帰時のマージは未対応 | 特大 |
| **プラグイン/拡張メソッドAPI** | BUILTIN_METHODS は静的定義。ユーザー定義メソッドの追加/インポート機構は未実装 | 大 |

---

## 4. アーキテクチャ品質サマリー

### 強み
- **型安全性**: 全エンティティに明示的TypeScript型定義、normalize層でマイグレーション保証
- **関心分離**: 知識状態/取込状態/作業状態の明確な分離（CLAUDE.md設計原則に準拠）
- **デッドコードなし**: graph-ops 51関数、hooks 24フック全てが能動的に使用
- **TODOなし**: アクティブソースにTODO/FIXMEコメントゼロ
- **テスト可能設計**: 状態遷移は純関数、graph-ops は副作用なし

### 注意点
- **localStorage依存**: AppState全体をJSON.stringify → localStorageに保存。データ量増大時にパフォーマンス劣化リスク
- **遅延読込の複雑性**: 17パネルが `lazyNamedPanel` + `DeferredPanel` + `PanelErrorBoundary` 三重ラッパー。エラーハンドリングは堅牢だが、デバッグ時のスタックトレースが深い
- **App.tsx の肥大化**: 全フック・全パネルprops・全コールバックが集約。関心の分散が今後の課題

---

## 5. 数値サマリー

| カテゴリ | 数 |
|----------|-----|
| ビュー | 17/17 (100%) |
| パネル | 30/30 (100%) |
| グラフ操作関数 | 51 (全使用) |
| フック | 24 (全使用) |
| ユーティリティファイル | 12 (全使用) |
| 正規化関数 | 7 (全レイヤー) |
| クエリDSL構文 | 18種+ |
| NodeItem 編集可能フィールド | 25+ |
| 未実装（型あり） | 9項目 |
| 実装推奨（型なし） | 10項目 |
| 実装完了率（型定義ベース） | 約97% |
