# 4D Thinking OS 現行仕様書

最終更新: 2026-03-22

## 1. 目的

4D Thinking OS は、topic と node を使って思考・整理・比較・分析を同一ワークスペース上で行うための PKM / thinking workbench である。  
単なるノート管理ではなく、空間配置、時間比較、構造分析、管理法プリセット、配布、Obsidian 往復までを一体で扱う。

## 2. 正式参照元

この文書は「現行実装仕様」であり、正式定義は以下を参照する。

- schema: `DATA_MODEL_SPEC.md`
- state enum: `STATE_MODEL_SPEC.md`
- relation vocabulary: `RELATION_MODEL_SPEC.md`
- integrity: `INTEGRITY_RULES.md`
- migration: `MIGRATION_POLICY.md`
- Obsidian sync safety: `OBSIDIAN_SYNC_POLICY.md`

## 3. 主要データモデル（現行実装）

- `Topic`
  - 正式モデル名
  - `Sphere` はこの `Topic` を 3D 空間で表示するときの UI 名
  - `title`, `folder`, `workspace`, `activeMethods`, `mustOneNodeId`, `history`, `layerStyles` などを持つ
- `Node`
  - topic 内の思考要素
  - `label`, `type`, `tense`, `note`, `layer`, `group`, `position`, `confidence`, `task`, `extensions` などを持つ
- `Edge`
  - node 間関係
  - `relation`, `meaning`, `weight`, `visible` などを持つ
- `TopicLink`
  - topic 間関係
- `ScenarioBranch`
  - 未来分岐 / sandbox 比較用の枝
- `NodeSelectionSet`
  - topic ごとの保存済み複数選択セット
  - `label`, `topicId`, `nodeIds`, `createdAt`

## 4. 安定度の線引き

- `stable`
  - Topic / Node / Edge / TopicLink / Bundle / ScenarioBranch / NodeSelectionSet / Workspace arrangement / Standalone HTML export
- `beta`
  - Integrity / Maintenance rule coverage
  - Obsidian round-trip sync
- `planned`
  - first-class `MaterialRecord`
  - first-class `URLRecord`
  - explicit `Version` / `ArchiveRecord`

## 5. 主要ビュー

- `Sphere`
  - topic 内ノードの主編集ビュー
  - drag で回転、click で選択、modifier drag で duplicate / link
- `Workspace`
  - topic 全体の空間配置ビュー
- `Canvas 2D`
  - topic の 2D 観測ビュー
- `Network`, `Mindmap`, `Folder`, `Depth`, `Journal`, `Calendar`, `Intake`, `Stats`, `Task`, `Table`, `Review`, `Timeline`, `Diff`, `Maintenance`
  - 観測・分析・整理・運用用ビュー

## 6. 画面構成

- 左: `Map / Workspace`
  - topic ツリー、view 切替、入出力、sample、theme
- 中央: main viewport
  - single / multi-pane 表示
- 右: `Edit / Analyze / Library`
- `Edit`: topic / node properties, methods, outliner
  - `Analyze`: search, network, history, topic links, PageRank, integrity, suggestions
  - `Library`: markdown/json, bookmark, layout preset, smart folder, bundle, conversion queue, event log, scenario branch

## 7. 現在の主要 UX

### 5.1 Command Palette

- `Cmd/Ctrl+K`
- view 切替、topic / node 追加、Edit / Analyze / Library 表示、左右パネル表示、Focus mode 切替を 1 箇所から実行

### 5.2 Focus / Zen mode

- 左右パネルと下部 timeline scrubber を隠して、中央ビューに集中する

### 5.3 Inspector Lock

- 右インスペクタ `Edit` の対象を固定可能
- 選択中の topic / node を変えても、固定中の properties は保持される
- 右クリックメニューからも `インスペクタに固定` が可能

### 5.4 Outliner + Details

- `Edit` に node outliner を配置
- topic 内ノードを `label / type / layer / group / updatedAt` で並び替え
- 検索で絞り込み
- `選択` と `固定` を分離
- `selection set` を保存・再適用・削除可能
- `selection set` の rename が可能
- 現在の複数選択と保存済み set の overlap / current only / set only を簡易 compare 可能
- `selection set` ごとに色タグを持てる
- compare 中は Outliner の node 行に `shared / current only / set only` の highlight を表示する
- compare 中は `Sphere` と `Canvas 2D` でも multi-selection / shared / current only / set only を視覚表示する

### 5.5 Canonical State Bridge

- `Node` の intake / work / version は canonical vocabulary を UI 上で表示する
- 具体的には `structured`, `active`, `onHold`, `working`, `snapshotted`, `versioned`, `archived` を表示語彙として使う
- runtime state も canonical 値へ正規化される
- `Smart Folder` と `Table` は canonical alias と runtime 値の両方を解釈して一致判定 / 表示を行う
- `Smart Folder` の custom filter editor では `intake / work / version / review / publication / url` を canonical vocabulary で編集できる
- `Smart Folder` を選ぶと最初の一致 node を開き、custom folder は panel 内で inline 編集できる
- Query DSL でも `intake`, `work`, `version`, `review`, `publication`, `url` を canonical vocabulary で検索できる
- `Intake` / GTD / Suggestion / Maintenance などの運用ロジックも alias-aware に寄せてある
- persistence では `PersistEnvelope.version = 6` を使い、保存 payload は canonical persistence 形に寄せる
- localStorage と IndexedDB はどちらも versioned envelope 保存を使い、旧 plain state も後方互換で読める

### 5.6 Context Menu

- topic / node を右クリックすると context menu を表示
- `プロパティ`, `インスペクタに固定`, `球体で開く`, `ブックマーク` を実行可能

### 5.7 Workspace Arrangement

- `Workspace` view で sibling group もしくは root group を対象に `Align X`, `Align Y`, `Dist X`, `Dist Y`, `Grid`, `Radial`, `Pack`, `Lane X`, `Lane Y`, `Cluster` を実行可能
- topic の現在位置と size を使って再配置する
- `Pack` は topic size を考慮しながら中心付近へ衝突なしで詰める
- `Lane X / Y` と `Cluster` は `folder / PARA / method / Must One` を整理軸として切り替えられる
- `Cluster` は選んだ整理軸ごとに topic 群を塊として分け、全体俯瞰をしやすくする
- `Layout Preset` は split/pane だけでなく `Workspace` の viewport と topic 配置スナップショットも保存できる
- `Layout Preset` には保存時の `Workspace` 整理方法（mode / groupBy / topicCount）も含まれ、一覧で見分けられる
- `Layout Preset` は `編集 / 俯瞰 / 分析 / 整理` の用途タグを持ち、filter と手動切替ができる
- `Layout Preset` panel は現在の view / split / 整理状態から `おすすめ preset` を上部に出す
- `Layout Preset` を適用した直後は、直前レイアウトとの差分サマリと `Back` が表示される
- `Layout Preset` list では任意 preset を `現在` と比較 preview してから適用できる
- compare preview では `split / panes / purpose / arrangement / topic数差分` の変化を強調表示する
- custom `Layout Preset` は `固定` と `最終使用時刻` を持ち、一覧は pinned と recently used を優先して並ぶ
- `Layout Preset` panel には `all / pinned / recent` の quick filter があり、用途タグと組み合わせて絞り込める
- `Layout Preset` panel では名前・mode・pane view・arrangement 文字列でも検索できる
- `Layout Preset` panel は hit 件数と `絞込解除` を表示し、探索状態をすぐ戻せる
- custom `Layout Preset` はダブルクリックで rename できる
- MultiPane の `Workspace` でも同じ操作を使用可能

## 8. 永続化

- `localStorage` + `IndexedDB`
- 自動保存
- JSON / Markdown / CSV / Standalone HTML / Obsidian ZIP export

## 9. 分析・支援

- PageRank `balanced / flow / focus`
- betweenness, HITS, degree, community detection
- density heatmap
- timeline A/B comparison
- review prompts
- maintenance repair assist

## 10. プリセット・思考法

- Mandala
- Semantic
- Strata
- Zettelkasten
- PARA
- GTD
- Must One
- Toulmin / Issue Tree 向け reasoning presets
- MOC / Framework scaffolds

## 11. 外部連携

- Obsidian plugin scaffold
- JSON snapshot import
- exchange JSON export / import
- round-trip sync は beta 扱い
- GitHub Pages 前提の静的配布

## 12. 現在の改善重点

- canonical schema / state / relation の固定
- UI の学習コスト低減
- `Outliner + Details` の強化
- 高密度画面でも迷わない導線整理
- 大規模データ時の描画 / 検索最適化
