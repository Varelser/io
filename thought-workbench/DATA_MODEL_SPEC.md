# Data Model Spec

最終更新: 2026-03-22

## 1. Canonical Naming

- 正式な永続モデル名は `Topic`
- `Sphere` は `Topic` の空間表示名
- したがって:
  - data / persistence / import-export / migration では `Topic`
  - UI で 3D 空間表示を説明するときだけ `Sphere`

## 2. Model Status

| Model | Role | Status | Notes |
| --- | --- | --- | --- |
| `Node` | 最小の思考・知識・作業単位 | stable | 実装済み |
| `Topic` | Node を束ねる主題空間 / 文脈単位 | stable | 実装済み |
| `Edge` | Node 間の関係 | stable | 実装済み |
| `TopicLink` | Topic 間の関係 | stable | 実装済み |
| `Bundle` | Topic / Node 横断の作業束 | stable | 実装済み |
| `JournalEntry` | 日次・時系列記録 | stable | 実装済み |
| `Workspace` | 作業セッションの画面構成と配置 | stable | 実装済み |
| `SavedView` | query / filter / camera 条件の保存 | beta | 現在は `LayoutPreset`, `Bookmark`, `SmartFolder` に分散 |
| `Snapshot` | 復元・比較用の時点保存 | stable | `HistoryFrame` と `ScenarioBranch.snapshotFrameId` で実装 |
| `Version` | 意味的な節目保存 | planned | `Snapshot` と分離予定 |
| `ArchiveRecord` | 現役運用から退避した対象 | planned | 現在は state で表現 |
| `ScenarioBranch` | sandbox 比較・未来分岐 | stable | 実装済み |
| `NodeSelectionSet` | topic 単位の保存済み複数選択 | stable | 実装済み |
| `Task` | Node に従属する作業情報 | stable | `Node.task` として実装済み |
| `MaterialRecord` | PDF / image / markdown などの資料実体 | planned | 現在は import/export と node 拡張へ分散 |
| `URLRecord` | URL の確認・追跡対象 | planned | 現在は `linkedUrls` と exchange ロジックへ分散 |

## 3. Canonical Schemas

### 3.1 Node

必須:
- `id: string`
- `label: string`
- `type: string`
- `tense: string`
- `position: [number, number, number]`
- `note: string`
- `size: number`
- `group: string`
- `layer: string`

主要任意:
- `depth`
- `confidence`
- `tags`
- `sharedId`
- `counterArgumentNodeIds`
- `linkedUrls`
- `task`
- `createdAt`
- `updatedAt`
- `observer`
- `hypothesisStage`
- `confidenceLog`
- `knowledgePhase`
- `membershipStatus`
- `intakeStatus`
- `workStatus`
- `evidenceBasis`
- `versionState`
- `materialStatus`
- `extensions`

責務:
- 知識断片、問い、仮説、主張、根拠、定義、反証、タスクの保持
- 空間配置の最小単位
- relation / review / conversion の主対象

### 3.2 Topic

必須:
- `id`
- `title`
- `folder`
- `description`
- `axisPreset`
- `workspace`
- `style`
- `history`
- `paraCategory`
- `mustOneNodeId`
- `sourceFile`
- `unresolvedTopicLinks`
- `nodes`
- `edges`

主要任意:
- `mustOneDate`
- `mustOneHistory`
- `parentTopicId`
- `outsideNodeIds`
- `activeMethods`
- `canvasRegions`
- `layerStyles`

責務:
- Node / Edge / Snapshot を束ねる主題空間
- 3D `Sphere` 表示の論理元
- import/export / branch / workspace 配置の主単位

### 3.3 Edge

必須:
- `id`
- `from`
- `to`
- `relation`
- `meaning`
- `weight`

主要任意:
- `visible`
- `contradictionType`
- `transformOp`

責務:
- Node 間の意味的・論理的・作業的関係の保持

### 3.4 TopicLink

必須:
- `id`
- `from`
- `to`
- `relation`
- `meaning`

責務:
- Topic 間の横断関係
- MOC / hierarchy / cross-topic navigation の導線

### 3.5 Bundle

必須:
- `id`
- `title`
- `bundleType`
- `description`
- `memberNodeIds`
- `memberTopicIds`
- `status`
- `createdAt`
- `updatedAt`

主要任意:
- `tags`
- `reviewAt`

責務:
- Topic や Node を横断して束ねる作業コンテナ
- フォルダの代替ではなく、意味と作業の cross-cutting unit

### 3.6 JournalEntry

責務:
- 日次ログ
- topic / node と時間軸を接続する基底記録

### 3.7 Task

現行表現:
- `Node.task`

必須:
- `status: "todo" | "doing" | "done" | "archived"`

主要任意:
- `deadline`
- `priority`

責務:
- Node に付随する実行単位
- 独立 collection 化は将来検討

### 3.8 Workspace

現行表現:
- `WorkspaceViewport`
- MultiPane state
- `LayoutPreset.workspaceSnapshot`
- bookmark の `workspaceViewport`
- `canvasRegions`

責務:
- 作業セッション全体の pane / camera / sync / arrangement / bookmarks の保持

### 3.9 SavedView

現行表現:
- `LayoutPreset`
- `CanvasBookmark`
- `SmartFolder`

責務:
- 実体移動ではなく、query / camera / filter / arrangement 条件の保存

区別:
- `Workspace` はセッション全体
- `SavedView` は見え方や抽出条件
- `CanvasRegion` はキャンバス上の意味領域

### 3.10 Snapshot

現行正式名:
- `HistoryFrame`

必須:
- `id`
- `label`
- `createdAt`
- `nodes[]`

責務:
- ある時点の復元・比較のための軽量保存
- Event Log とは別

### 3.11 Version

status: planned

責務:
- 意味的節目の保存
- snapshot より低頻度で、説明責任を持つ版

### 3.12 ArchiveRecord

status: planned

責務:
- 現役導線から退避した対象の読み取り中心保存
- `delete` とは別

### 3.13 ScenarioBranch

必須:
- `id`
- `label`
- `anchorTs`
- `status`
- `createdAt`

主要任意:
- `topicId`
- `materializedTopicId`
- `nodeIdMap`
- `anchorEventId`
- `anchorLabel`
- `note`
- `hypothesis`
- `nextAction`
- `syncPolicy`
- `snapshotFrameId`
- `snapshotLabel`
- `lastSourceSyncAt`
- `lastBackportAt`

責務:
- sandbox topic を介した未来分岐
- sync / backport / diff review の単位

### 3.14 NodeSelectionSet

必須:
- `id`
- `label`
- `topicId`
- `nodeIds`
- `createdAt`

主要任意:
- `color`

責務:
- 再選択、比較、review のための保存済みノード集合

### 3.15 MaterialRecord

status: planned

想定必須:
- `id`
- `kind`
- `title`
- `source`
- `processingState`
- `createdAt`

想定任意:
- `topicId`
- `nodeId`
- `filePath`
- `mimeType`
- `excerpt`
- `tags`
- `note`

責務:
- URL 取得前後とは別に、資料実体を管理する

### 3.16 URLRecord

status: planned

想定必須:
- `id`
- `url`
- `status`
- `createdAt`

想定任意:
- `title`
- `domain`
- `fetchedAt`
- `checkedAt`
- `note`
- `tags`
- `topicId`
- `nodeId`

責務:
- URL の確認・失効・重複・未読状態を管理する

## 4. Boundary Decisions

- `Topic` と `Sphere`
  - `Topic` が正式モデル
  - `Sphere` は 3D view 上の表現名
- `Edge` と `TopicLink`
  - `Edge` は Node↔Node
  - `TopicLink` は Topic↔Topic
- `Bundle`
  - フォルダではなく横断コンテナ
- `MaterialRecord` と `URLRecord`
  - 別モデル
  - URL は参照先、Material は資料実体
- `Workspace` と `SavedView`
  - Workspace は作業セッション全体
  - SavedView は query / filter / camera 条件
- `Snapshot` と `Version` と `ArchiveRecord`
  - Snapshot は軽量復元点
  - Version は意味的版
  - ArchiveRecord は退避状態

## 5. Source of Truth

以下を canonical source とする:
- schema: この文書
- state enum: `STATE_MODEL_SPEC.md`
- relation semantics: `RELATION_MODEL_SPEC.md`
- integrity: `INTEGRITY_RULES.md`
- migration: `MIGRATION_POLICY.md`
