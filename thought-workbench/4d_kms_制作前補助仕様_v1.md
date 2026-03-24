# 4Dナレッジマネージメントシステム 制作前補助仕様
## 実装着手前の整理・責務分解・優先順位・チェックリスト / v1

---

## 0. 本書の目的

本書は、既存のUI仕様および追加要件補完を、実制作に移すための橋渡し文書である。

主目的は次の4点である。

1. 概念仕様を実装仕様へ落とす
2. UI要求とデータ構造要求を分離する
3. MVPで先に固定すべき点と後回しにすべき点を明確化する
4. 実装中に設計が崩れやすい箇所を先に監視する

本書は新規構想を増やすための文書ではない。
本書は、既存思想を破綻なく実装するための補助文書である。

---

## 1. 最初に固定すべき結論

### 1-1. このシステムの本質

このシステムは単なるノートアプリではない。

これは以下を同時に扱う。

- 知識管理
- 作業管理
- 資料管理
- 時間変化の追跡
- 空間配置による思考補助
- 再浮上と再構成
- 将来の変換待機

したがって、設計上は **「知識グラフ + ワークスペース + 状態管理 + 履歴管理」** として扱う。

### 1-2. 先に決めるべき原則

#### 原則A: 実体と見え方を分離する

- Node / Sphere / Bundle / Material / URL は実体
- Saved View / Dynamic Collection / 名前付き領域 / フィルタ結果 は見え方

この分離が崩れると、後から再構成できなくなる。

#### 原則B: 状態は必ず型ごとに分ける

- 知識状態
- 作業状態
- 変換状態
- レビュー状態
- 版状態
- 資料処理状態
- URL処理状態

これらを1つの status に混ぜてはいけない。

#### 原則C: 自動化は提案止まりを基本にする

- 自動分類
- 自動整列
- 自動統合
- 自動移動

これらは原則として確定実行せず、候補提示を基本とする。

#### 原則D: 時間は表示機能ではなく、基盤機能として持つ

- 作成日時
- 更新日時
- 状態変更履歴
- 所属変更履歴
- リンク変更履歴
- スナップショット

時間軸UIを生かすには、内部データが時間変化を保持している必要がある。

---

## 2. 実装前に明文化すべき不足点

### 2-1. 追加で定義しないと危険なもの

以下は既存文書で方向性はあるが、実装には定義が足りない。

1. 各オブジェクトの厳密なスキーマ
2. 各状態の遷移条件
3. 各オブジェクト間の関係種別
4. タイムライン再生時に何を巻き戻すか
5. Snapshot と Version の違い
6. Saved View の保存形式
7. 整合性警告の発火条件
8. 再浮上の優先順位計算
9. Bundle と Sphere の競合時の扱い
10. 削除・退避・凍結の違い

### 2-2. 実制作で起きやすい事故

1. Node が何でも入る箱になり肥大化する
2. Sphere と Bundle の責務が曖昧になる
3. 状態名が増殖して運用不能になる
4. Workspace Memory が UI 状態の保存だけで終わる
5. Saved View が実体移動の代替になり設計が混乱する
6. Conversion Queue が Task と混ざる
7. Review と Notification が混ざる
8. Version と Snapshot と Archive が混ざる
9. 重複候補が検出されても統合手順がない
10. 多分割キャンバスが重くなり、設計思想以前に操作不能になる

---

## 3. 先に固定すべきオブジェクト定義

## 3-1. 最小オブジェクト集合

MVPでは以下だけに絞る。

- Node
- Sphere
- Bundle
- Material
- URLItem
- JournalEntry
- Task
- SavedView
- Workspace
- Snapshot

### 3-2. Node の最小必須プロパティ

```md
id
nodeType
knowledgeState
workState
title
body
tags[]
confidence
evidenceType
createdAt
updatedAt
archivedAt?
reviewAt?
sourceIds[]
relationIds[]
sphereIds[]
bundleIds[]
versionState
```

### 3-3. Sphere の最小必須プロパティ

```md
id
sphereType
title
description
parentSphereId?
childSphereIds[]
nodeIds[]
bundleIds[]
layoutHints
createdAt
updatedAt
versionState
```

### 3-4. Bundle の最小必須プロパティ

```md
id
bundleType
title
description
memberIds[]
status
createdAt
updatedAt
reviewAt?
versionState
```

### 3-5. Material / URLItem の分離

Material と URL は分ける。

理由:

- URL は参照先
- Material は保存済み実体または管理対象資料

URL を Material に即時変換してしまうと、取得前後の状態差が潰れる。

---

## 4. 関係種別を先に固定する

### 4-1. relationType の最小セット

```md
supports
opposes
relatesTo
belongsToSphere
belongsToBundle
derivedFrom
references
sameAsCandidate
splitFrom
mergedFrom
causes
temporalNext
```

### 4-2. 重要原則

- UI上の線は、必ず relationType を持つ
- 無名リンクを作らない
- `supports` と `relatesTo` を混同しない
- 統合時も旧 relation を履歴として保持する

---

## 5. 状態設計の分離

## 5-1. Node に持たせる状態

### knowledgeState

- fragment
- observation
- question
- hypothesis
- claim
- definition
- evidence
- rebuttal

### workState

- inbox
- staging
- active
- review
- onHold
- archived
- frozen

### versionState

- working
- published
- frozen
- compare

### reviewState

- none
- queued
- due
- snoozed
- reviewed

### conversionState

- none
- candidate
- queued
- processing
- done
- discarded

### 5-2. 禁止事項

以下のような曖昧状態を作らない。

- important
- thinking
- maybe
- pending-all
- misc

これらはタグか優先度で表現し、状態にはしない。

---

## 6. タイムラインと履歴の最低仕様

### 6-1. イベントとして残すべき操作

- 作成
- 更新
- タイトル変更
- 本文変更
- 状態変更
- Sphere所属変更
- Bundle所属変更
- relation追加
- relation削除
- Archive移動
- Freeze
- Review予約変更
- Conversion Queue 追加/除去

### 6-2. Snapshot と Event の違い

- Event: 1操作の履歴
- Snapshot: ある時点の復元用状態

### 6-3. MVP方針

MVPでは完全イベントソーシングにこだわりすぎず、以下でよい。

- 現在状態テーブル
- 主要イベントログ
- 手動または定期 Snapshot

---

## 7. Saved View と 名前付き領域の責務分離

### 7-1. Saved View

条件による抽出結果。

例:

- 未統合ノード
- 低確信度ノード
- URL要検証
- 要レビュー

### 7-2. 名前付き領域

キャンバス上の意味空間。

例:

- 発想中
- 比較台
- 作品構想域
- 整理待ち

### 7-3. 重要ルール

- Saved View は検索・抽出
- 名前付き領域は空間配置
- 両者を同一オブジェクトにしない

---

## 8. UIコンポーネントの初期分割

## 8-1. MVPコンポーネント

1. Global Shell
2. Left Sidebar
3. Right Inspector
4. Main Canvas
5. Timeline Bar
6. Multi-Pane Manager
7. Saved View Panel
8. Intake Panel
9. Review Panel
10. Conversion Queue Panel
11. Integrity Warning Panel
12. Workspace Switcher

### 8-2. 依存順

1. データモデル
2. 状態管理
3. 左パネル一覧
4. Inspector
5. 単一キャンバス
6. Saved View
7. Intake三層
8. Review / Conversion / Integrity
9. 多分割
10. Timeline
11. Workspace Memory

多分割とTimelineは魅力が強いが、基盤後回しにすると壊れやすい。

---

## 9. MVP実装順

## Phase 1

- Node / Sphere / Bundle / Material / URLItem のスキーマ確定
- relationType 確定
- 状態 enum 確定
- ID規則確定
- local DB あるいは IndexedDB ベースの保存層確定

## Phase 2

- Inbox / Staging / Archive
- 左パネル一覧
- 右Inspector
- Node詳細編集
- Material / URL 処理状態

## Phase 3

- Saved View
- Review Queue
- Conversion Queue
- Integrity Warning
- 一時テーブル

## Phase 4

- 名前付き領域
- Bundle比較
- Workspace保存
- Snapshot

## Phase 5

- 多分割キャンバス
- タイムライン再生
- バージョン比較

---

## 10. 技術的に先に警戒すべき点

### 10-1. パフォーマンス

危険点:

- 多分割ごとの再描画
- キャンバス上の大量ノード
- 線描画の増加
- Saved View の都度再計算
- Timeline スクラブ時の大量差分反映

初期対策:

- 仮想化
- 差分更新
- 描画レイヤー分離
- キャッシュ
- Viewごとの計算制限

### 10-2. ストレージ

危険点:

- 履歴増大
- Snapshot肥大化
- Materialメタデータ肥大化

初期対策:

- 本文と履歴を分離
- Snapshot頻度制限
- 添付実体とメタデータ分離

### 10-3. 命名崩壊

初期対策:

- 表示名と内部IDを分離
- title 正規化キーを持つ
- alias を独立配列化
- merge時に旧ID保管

---

## 11. 制作中チェックリスト

## 11-1. データモデル

- [ ] Node / Sphere / Bundle の責務が文章で説明できる
- [ ] URL と Material を別物として保存している
- [ ] status が1個に混ざっていない
- [ ] relationType が列挙型で固定されている
- [ ] Archive と Delete を区別している

## 11-2. UI

- [ ] Inbox から正式配置前の操作ができる
- [ ] Saved View が実体移動なしで成立している
- [ ] 名前付き領域がページ化していない
- [ ] Review / Conversion / Integrity が別パネルで分離されている
- [ ] 右Inspectorで状態系が見分けられる

## 11-3. 時間

- [ ] 主要変更履歴を記録している
- [ ] Snapshot の生成条件が決まっている
- [ ] timeline が単なる日付表示ではない

## 11-4. 運用

- [ ] 未統合のまま保持できる
- [ ] 保留が正式状態として扱える
- [ ] 統合候補は即時統合されない
- [ ] 再浮上は通知ではなく作業再開導線として機能する

---

## 12. Definition of Done

以下を満たしたら、MVPの基礎は成立とみなしてよい。

1. 雑に入力しても止まらない
2. 後から整理できる
3. 実体と見え方が混ざらない
4. 状態が混ざらない
5. 資料とURLが死蔵しにくい
6. 重複と孤立が見つけられる
7. Review と Conversion が機能する
8. Workspace を再開できる
9. 多分割がなくても価値が成立している
10. Timeline を後から載せられる構造になっている

---

## 13. いま制作に入るなら最初の一言で決めるべきこと

最初のセッションで固定するべきは、見た目ではなく以下である。

1. オブジェクト一覧
2. relationType 一覧
3. 状態 enum 一覧
4. Eventログ方針
5. Saved View の保存形式
6. Sphere と Bundle の責務境界

これを固定せずに UI 実装へ入ると、あとで確実に崩れる。

---

## 14. 推奨する次の制作物

次に作るべき文書は以下。

1. データモデル完全仕様 md
2. 状態遷移表 md
3. relationType 仕様 md
4. MVP画面一覧 md
5. Event / Snapshot 仕様 md
6. コンポーネント責務表 md

---

## 15. 最終結論

追加要件補完文書は、思想としてかなり良い。
特に、

- 最初から正しく入れさせない
- 未統合や保留を正式状態とする
- 自動化を提案型に留める
- 再浮上と整合性監視を重視する

という方向は、このシステムの核として強い。

一方で、制作前に必要なのは、さらに新しい機能案ではなく、

- スキーマ固定
- 状態固定
- 関係種別固定
- UI責務分離
- 時間履歴仕様固定

である。

つまり、次段階で必要なのは構想拡張ではなく、**実装のための厳密化** である。
