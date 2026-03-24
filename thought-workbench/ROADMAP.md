# ROADMAP

## 最新進捗

### 2026-03-22 時点
- `DATA_MODEL_SPEC.md`, `STATE_MODEL_SPEC.md`, `RELATION_MODEL_SPEC.md` を追加し、canonical schema / state / relation の正式参照元を分離した
- `INTEGRITY_RULES.md`, `MIGRATION_POLICY.md`, `OBSIDIAN_SYNC_POLICY.md`, `PRODUCT_POSITIONING.md` を追加し、運用安全性と公開説明の基準文書を作成した
- `README.md` を外向け紹介中心に整理し、stable / beta / planned の線引きと文書導線を追加した
- `CURRENT_PRODUCT_SPEC.md` を現行実装仕様へ寄せ、正式定義は canonical spec 群を参照する構成に改めた
- `CLAUDE.md` の `Topic / Sphere` 境界と state layer を canonical 方針へ同期した
- `Node` の intake / work / version を canonical vocabulary で扱う bridge を UI に入れ、`Smart Folder` / `Table` も alias-aware にした
- Query DSL に `intake / work / version / review / publication / url` を追加し、運用ロジック側も canonical alias-aware に寄せた
- `PersistEnvelope.version = 6` と migration 実装を追加し、localStorage / IndexedDB の両方を versioned envelope 保存へ揃えた
- `types/node.ts` の runtime enum も canonical 名へ切り替え、normalize 出力と sample / fixture を canonical state に統一した
- `Smart Folder` の共通 filter 判定 util を追加し、custom folder を inline 編集 / 開始できるようにした
- `Smart Folder` の custom filter で `version / review / publication / url` も扱えるようにし、選択時は最初の一致 node を開くようにした
- `INSTALL.md` のローカル絶対パスを相対リンクへ修正した
- Obsidian round-trip の扱いを「beta」とする方針を文書上で固定した

### 2026-03-21 時点
- Workspace にパン / ズーム / Home / Fit / ミニマップ / 最近見た地点履歴を追加
- MultiPane を `quad` まで拡張し、比較用 4 分割プリセットを追加
- ペインごとの `同期 / 固定` を実装し、比較ペインを独立表示可能にした
- Timeline Scrubber に比較アンカー `A / B` と未来分岐作成を追加
- 未来分岐を `ScenarioBranch` として永続化
- 分岐ごとの仮説 / 次アクション / メモ / スナップショット保存を追加
- 分岐を sandbox topic として実体化する流れを追加
- sandbox から元分岐への backport を実装
- backport は `位置 / サイズ / 内容 / 全部` とノード単位選択に対応
- 差分一覧で位置・サイズ・属性の変化量を表示できるようにした
- 属性差分の対象を `label / type / note / group / layer / tense / tags` まで拡張
- 分岐パネルに review UI を追加し、準備度・警告・差分件数で確認順を付けられるようにした
- `source -> sandbox` の逆同期を追加し、branch sandbox を手動で往復同期できるようにした
- 分岐パネルに衝突リスク表示を追加し、往復同期後の残差分と複合差分を見分けられるようにした
- branch ごとに `manual / source優先 / sandbox優先` の同期ポリシーを持たせ、分岐遷移時に自動適用できるようにした
- branch 単位の sync / backport に差分プレビュー付き確認 UI を追加した
- branch ごとに衝突リスクと policy を踏まえた推奨操作を表示するようにした
- ノード単位 backport にも差分プレビュー付き確認 UI を追加した
- ノード単位にも推奨操作を表示し、まず戻すべき mode を出すようにした
- build の chunk 分割を追加し、vendor / views / panels / spatial / core を分離した
- build を再調整し、500kB 超警告を解消した（`vendor-runtime` は 500kB 未満）
- 右パネルの default-open ではない section を遅延ロード化し、`app-panels` と `app-panels-deferred` を分離した
- 右インスペクタ本体を `components/RightInspector.tsx` に切り出し、`App.tsx` から表示構造を分離した
- 左サイドバー本体を `components/LeftSidebar.tsx` に切り出し、sample preview / import-export / settings UI を `App.tsx` から分離した
- `SplitModeSelector` を独立ファイルへ分離し、左サイドバーから `MultiPaneLayout` 本体への runtime 依存を外した
- 上部 chrome を `components/AppChrome.tsx` に切り出し、breadcrumb / panel toggle / build-PWA 表示を `App.tsx` から分離した
- sample preview / append / replace / export JSON の状態処理を `hooks/useSampleWorkspace.ts` に切り出した
- backup restore / CSV export / Obsidian ZIP export を `hooks/useWorkspaceIO.ts` に切り出した
- branch diff / review / sync / backport の状態処理を `hooks/useScenarioBranches.ts` に切り出した
- bookmark / layout preset / smart folder / conversion queue / bundle の CRUD を `hooks/useWorkspaceCollections.ts` に切り出した
- PDF import の worker をローカル bundle 化し、PWA icon / scope / start_url の実体も整備した
- README / INSTALL / 評価文書を現状の起動手順と配布構成に同期した
- GitHub Pages workflow 前提の配布手順と確認チェックリストを README / INSTALL に追加した
- service worker の更新状態と build version を画面上で確認できるようにした
- 初回セットアップ用の sample state と `Load Sample / Sample JSON` 導線を追加した
- sample state を複数化し、用途別に選んで読み込めるようにした
- sample 選択カードに topics / nodes / branches などの件数プレビューを追加した
- sample を既存 workspace に `Append` できるようにし、topic / branch / bookmark 参照も remap して共存可能にした
- `Load Sample / Append` の実行前 preview を追加し、追加対象 topic と件数を見てから確定できるようにした
- sample preview に `branch / bundle / layout preset` の名前一覧も出し、追加内容を事前確認しやすくした
- sample ごとに `最初に見る view / 最初の操作` を出す start guide を追加した
- sample preview から開始 view を切り替えて、そのまま確定できるようにした
- `Load Sample` の replace preview に、消える current state の件数警告を追加した
- sample preview 内から、そのまま `Export JSON` も実行できるようにした
- `Append` preview に、追加後の合計件数を出して規模を見積もれるようにした
- `Append` preview に、現在 state 比での増加率も出して重さを判断しやすくした
- current state が空に近い場合は `Load`、既存作業がある場合は `Append` を勧める推奨表示を追加した
- 推奨操作を `Load Sample / Append` ボタン強調と preview の見た目にも反映した
- sample 導線の文言を `Export JSON` に統一し、preview 上の説明表示も 1 か所に整理した
- sample `Import` 周辺の日本語文言を整理し、開始 view には view ラベルを使うようにした
- `Import / Export` セクションと `Markdown / JSON` panel の固定英語を減らし、日英切替に揃えた
- 左右パネルの `Settings / Recovery / Inspector / Node Network` などの固定英語 title も日英切替に寄せた
- `AppChrome / LeftSidebar / TopicPanel / TaskView / NodePanel / SearchFilterPanel / HistoryPanel / NodeNetworkPanel` の残り固定英語を整理し、主要導線の表示文言を日英切替に寄せた
- 右パネルの解析表示に `betweenness centrality / HITS (hub / authority) / degree centrality` を追加し、PageRank と並べて確認できるようにした
- 解析パネルに `community detection` を追加し、選択トピック内のクラスタ構造を一覧で確認できるようにした
- `Stats` view に `接続密度ヒート表示` を追加し、レイヤー間の接続密度と球体ごとの密度強度を俯瞰できるようにした
- `Stats` view の文言を日英切替に寄せ、統計画面でも固定英語を減らした
- `Timeline` view に A/B 比較窓を追加し、期間ごとの件数・球体数・タイプ数・増減差分を分析できるようにした
- `Review` view に `反対意見テンプレート / 問い返しテンプレート` を追加し、要レビュー項目ごとに次の掘り下げ方を出せるようにした
- `Maintenance` view に `layer / group / relation` 欠損の自動修復補助を追加し、推奨値をその場で適用できるようにした
- `Task` view に `Must One x Zettelkasten` セクションを追加し、中心 note まわりの forward / backlink / orphan / 支援 task を束で追えるようにした
- `PageRank` を `balanced / flow / focus` の 3 系統で比較できるようにし、weight / recent / Must One / task の焦点も確認できるようにした
- `Node` panel に `Zettelkasten` セクションを追加し、selected note 基準の forward / backlink / edge / orphan と接続理由テンプレートを扱えるようにした
- `Task` view に `GTD Focus / Weekly Review` を追加し、next action 抽出・waiting / review / stale の週次確認を 1 画面で扱えるようにした
- `Topic` panel に `Mandala` 3x3 専用編集 UI を追加し、center 変更時の自動再配置と slot 単位の入れ替えをできるようにした
- `Semantic` 向けに relation suggestion と layer hierarchy summary を追加し、関係語選択と抽象/具体の見通しを補助するようにした
- `Topic` panel に `PARA` subtree 移動 UI を追加し、選択 topic と子球体をまとめて `Projects / Areas / Resources / Archives` 配下へ移動できるようにした
- `Must One` に date と history を追加し、設定日保持と日別の切り替え履歴を topic から追えるようにした
- `Topic` panel に `Strata` セクションを追加し、layer ごとの可視性 / 色と時間堆積サマリをその場で確認・調整できるようにした
- `Sphere` / `Canvas 2D` 表示でも `Strata` の layer 設定を反映し、非表示 layer を描画対象から外せるようにした
- `Import / Export` に `Standalone HTML` を追加し、単一ファイルの配布用スナップショットと埋め込み JSON の再保存導線を用意した
- `Method Studio` sample を追加し、Strata / Semantic / PARA / Must One をまとめて確認できる配布向けデータセットを用意した
- sample append 時に `Must One history` の node 参照も remap するようにし、追加後の履歴ジャンプ整合性を直した
- `favicon / PWA screenshots / manifest shortcuts` を追加し、インストール時の見え方と配布用 metadata を整えた
- `package:release` を追加し、`dist` と配布用文書だけを `release/thought-workbench-web` にまとめる導線を用意した
- `obsidian-plugin/` に独立スケルトンを追加し、capture note / guide note / settings tab を持つ最小 plugin 土台を切った
- Obsidian plugin に `latest JSON snapshot import` を追加し、topic / node ノート展開と import report 出力までできるようにした
- Obsidian plugin に `exchange JSON export` を追加し、本体側も `JSON読込` から exchange patch を適用できるようにした
- topic / node の右クリック context menu に `プロパティ / インスペクタに固定 / 球体で開く / ブックマーク` を追加した
- `Cmd/Ctrl+K` の Command Palette を追加し、主要操作と view 切替を 1 箇所に集約した
- `Focus / Zen mode` を追加し、左右パネルと timeline を隠して中央ビューへ集中できるようにした
- 右インスペクタに `Inspector Lock` を追加し、Edit 対象の topic / node を固定できるようにした
- `Edit` に node outliner を追加し、選択中 topic 内 node の検索・固定・直接移動をしやすくした
- node outliner に `label / type / layer / group / updatedAt` の並び替えと `Selection Set` 保存 / 再適用 / 削除を追加した
- `Selection Set` の rename と、現在の複数選択との簡易 compare を追加した
- `Workspace` view に sibling / root group 向け `Align X / Align Y / Dist X / Dist Y` を追加した
- `Workspace` view に `Grid / Radial` 再配置も追加し、topic 群を一発で見やすく並べられるようにした
- `Workspace` view に `Lane X / Lane Y` を追加し、folder ごとに topic 群をレーン配置できるようにした
- `Workspace` view に `Cluster` を追加し、folder ごとの topic 群を塊単位で俯瞰配置できるようにした
- `Workspace` view に `Pack` を追加し、topic size を考慮しながら重なりを避けて密にまとめられるようにした
- `Workspace` view の `Lane / Cluster` に整理軸 selector を追加し、`folder / PARA / method / Must One` で topic 群を切り替えて並べられるようにした
- `Layout Preset` に `Workspace` の viewport / topic 配置 snapshot を含め、整理結果そのものを保存・再適用できるようにした
- `Layout Preset` 一覧に保存時の `Workspace` 整理方法も表示し、どの並べ方を保存した preset か見分けやすくした
- `Layout Preset` に用途タグ (`編集 / 俯瞰 / 分析 / 整理`) を追加し、一覧 filter と手動切替で探しやすくした
- `Layout Preset` panel に `おすすめ preset` を追加し、現在の view / split / 整理状態に近い候補を先頭から適用できるようにした
- `Layout Preset` 適用後に直前レイアウトとの差分サマリと `戻る` を表示し、preset を試しやすくした
- `Layout Preset` list に `比較 preview` を追加し、現在レイアウトとの差を見てから適用できるようにした
- compare preview で `split / panes / purpose / arrangement / topic数差分` を強調表示し、差が大きい preset を見分けやすくした
- custom `Layout Preset` に `固定` と `最終使用` を追加し、一覧を pinned / recently used 優先で並べるようにした
- `Layout Preset` panel に `all / pinned / recent` の quick filter を追加し、用途タグ filter と組み合わせて preset を探しやすくした
- `Layout Preset` panel に検索を追加し、preset 名 / mode / view / arrangement 文字列で直接絞り込めるようにした
- `Layout Preset` panel に hit 件数と `絞込解除` を追加し、探索状態を戻しやすくした
- custom `Layout Preset` をダブルクリック rename できるようにし、preset 整理をその場で行えるようにした
- `Selection Set` に色タグを追加し、Outliner compare 中の `共通 / 現在のみ / セットのみ` を行単位 highlight できるようにした
- `Selection Set` の compare 状態を `Sphere / Canvas 2D` にも反映し、空間ビューでも overlap を追えるようにした

### 現在の到達点
- 「無限キャンバス補助」「4 分割比較」「未来分岐 UI 土台」「branch sandbox」「差分選択 backport」までは到達
- 主要プリセットの専用 UI、解析支援、配布導線、Obsidian 往復の主要導線まで一通り到達
- roadmap 上の主要 phase は完了し、残りは canonical spec 固定、運用改善、別ライン拡張の扱い

### 進捗率（2026-03-21 工学見積）
- 全体進捗: `100%`
- Phase 1 ドキュメントと土台の安定化: `100%`
- Phase 2 プリセットの完成度向上: `100%`
- Phase 3 思考深化支援: `100%`
- Phase 4 解析支援: `100%`
- Phase 5 UI / UX 最適化: `100%`
- Phase 6 配布と運用: `100%`

### 進捗率の見方
- `80%+`: 日常利用に必要な主導線は概ねあり、残りは整理と磨き込み
- `60%+`: 基本導線はあるが、専用 UI や連携がまだ薄い
- `40%前後`: 初期実装はあるが、本格機能はこれから

## 方針

このプロジェクトの主軸は、以下の 4 層で進める。

1. 空間編集基盤
2. 思考法プリセット
3. 深化支援 / 解析支援
4. 実運用 / 配布基盤

---

## Phase 0: 現在地

### すでに実装済み
- 3D / 2D 表示と空間編集
- ノード / エッジ / トピック CRUD
- 履歴保存 / 再生 / Undo / Redo / Repair / Restore
- Workspace / Network / Folder / Depth / Journal / Calendar / Intake / Stats / Task / Table / Review / Timeline / Diff / Maintenance を含む複数ビュー
- MultiPane レイアウト
- PageRank オーバーレイ
- Suggestion / Integrity / Smart Folder / Bookmark / Layout Preset / Bundle / Conversion Queue / Event Log
- Mandala / Semantic / Strata / Zettelkasten / PARA / GTD に加え、Poincare / Hebbian / Dialectic / Toulmin / Causal / KJ の Seed / Guide
- Must One
- JSON / Markdown / CSV / Obsidian ZIP 入出力
- localStorage + IndexedDB の併用保存
- ErrorBoundary
- 日本語 / 英語 UI の一部切替

### 残課題
- UI の完全多言語化は未了
- 大規模データ時の描画 / 検索最適化が未完
- 一部の拡張プリセットは seed 中心で、専用 UI は今後の拡張余地がある
- 追加の外部連携や AI 連携は別ライン扱い

---

## Phase 1: ドキュメントと土台の安定化

### ステータス
完了

### 完了
- README.md / ROADMAP.md / Skills.md の配置
- 正規化パイプラインによる後方互換ロード
- Import / Export 基盤
- ErrorBoundary / Backup / Repair の基礎導線
- Quota 超過時の通知導線
- テスト基盤と主要ユニットテスト群の追加

### 今後の改善候補
- README / ROADMAP / 評価文書の運用同期
- 開発者向け導入文書の追加整理

### 完了条件
- 文書が現状実装とズレない
- 新規参加者が README と評価文書だけで全体像を把握できる
- JSON 互換性を壊さず更新できる

---

## Phase 2: プリセットの完成度向上

### ステータス
完了

### 完了
- Preset Guide / Seed 基盤
- Mandala / Semantic / Strata / Zettelkasten / PARA / GTD の基本 seed
- GTD 用 Task View
- PARA 用 topic 側カテゴリ導線
- Must One の固定表示
- Zettelkasten の backlink / orphan / 接続理由テンプレート導線
- Mandala の 3x3 専用編集 UI
- Semantic の relation suggestion / hierarchy summary
- PARA の subtree 移動
- GTD の next action / weekly review
- Must One の date / history
- Strata の layer 可視性 / 色 UI と時間堆積サマリ
- ノード分割 / 統合の操作導線

### 今後の拡張候補
- KJ / Toulmin / Causal など拡張プリセットの seed 整備
- 拡張プリセット向けの専用 UI 強化

### 完了条件
- 各主要プリセットに専用導線がある
- seed だけでなく、運用 UI とレビュー導線が揃う

---

## Phase 3: 思考深化支援

### ステータス
完了

### 完了
- Review View
- Suggestion engine
- orphan / 類似名 / 共通タグの候補検出
- Maintenance View による保守観点の可視化
- 反対意見テンプレート
- 問い返しテンプレート
- layer / group / relation 欠損の自動修復補助
- Must One と Zettelkasten の連携強化

### 今後の拡張候補
- 根拠不足 / 低確信度 / 未検証の可視化精度向上
- 未接続ノード候補の抽出強化

### 完了条件
- 「置くだけ」で終わらず、次に考えるべき点が見える

---

## Phase 4: 解析支援

### ステータス
完了

### 完了
- PageRank
- Timeline View
- Diff View
- betweenness centrality
- HITS / hub-authority
- degree centrality の可視化
- community detection
- 接続密度ヒート表示
- 時系列比較の分析強化
- PageRank 改良（balanced / flow / focus、weight / recent / Must One / task 反映）

### 完了条件
- ノード重要度や構造的役割が複数指標で可視化できる

---

## Phase 5: UI / UX 最適化

### ステータス
完了

### 完了
- キーボードショートカット基盤
- 選択 / 複数選択 / 一括編集
- 画面レイアウトプリセット
- 左右パネルの開閉 / サイズ調整
- MultiPane
- 右パネルの default-open ではない section の遅延ロード
- Inspector / AppChrome / LeftSidebar への配線分離
- 保守ビュー / 補助ビューの導線整理

### 今後の改善候補
- ラベル描画最適化
- 大量ノード時の簡易表示
- 右パネルのさらなる分割 / 軽量化
- view / 残りパネルの遅延ロードによる初期描画最適化
- outliner の階層化 / grouped view
- workspace arrange の pack layout

### 完了条件
- ノード数が増えても破綻しない
- 小さい UI でも扱いやすい

---

## Phase 6: 配布と運用

### ステータス
完了

### 完了
- `dist/` の生成物あり
- PWA 設定あり
- Obsidian / Logseq 互換を意識した ZIP export
- Standalone HTML snapshot export
- 複数の sample state と用途別 preview / start guide
- favicon / screenshots / manifest shortcut 整備
- release 用パッケージ出力（`release/thought-workbench-web`）
- Obsidian plugin 用の独立スケルトン（`obsidian-plugin/`）
- Obsidian plugin での JSON snapshot importer
- Obsidian exchange export / import 適用
- IndexedDB 併用保存
- 配布構成の整理

### 今後の改善候補
- 運用改善や別ライン拡張

### 完了条件
- ローカルで安定利用できる
- 別環境へ持ち運べる
- 配布手順が README に明記されている

---

## 今後の拡張候補

### 別ラインで扱うもの
- Obsidian プラグイン化
- 外部連携
- AI 連携

### 改善余地
- 完全多言語化
- 大規模データ時の描画 / 検索最適化
- 拡張プリセット向けの専用 UI 強化

---

## 完成イメージ

- 3D / 2D 空間上に思考を配置できる
- 時間・層・関係・重要度を同時に扱える
- 複数の思考法を切替できる
- 単なるノートではなく、思考そのものを設計・観察・更新できる
