# Relation Model Spec

最終更新: 2026-03-22

## 1. Rule

`Edge.relation` と `TopicLink.relation` は free text のまま放置しない。  
canonical relation vocabulary を持ち、方向性と適用先を定義する。

## 2. Canonical Relation Types

| Relation | Direction | Applies To | Meaning |
| --- | --- | --- | --- |
| `supports` | directed | Node↔Node | 根拠づける |
| `contradicts` | directed | Node↔Node | 反証・対立する |
| `elaborates` | directed | Node↔Node | 詳細化する |
| `questions` | directed | Node↔Node | 問いを投げる |
| `references` | directed | Node↔Node, Topic↔Topic, URL↔Node, Material↔Node | 参照する |
| `contains` | directed | Bundle↔Node, Bundle↔Topic, Topic↔Region | 内包する |
| `belongsTo` | directed | Node↔Bundle, Node↔Topic, Material↔Topic | 所属する |
| `derivedFrom` | directed | Node↔Node, Topic↔Topic, Material↔Material | 派生元を持つ |
| `comparesWith` | bidirectional | Node↔Node, Topic↔Topic | 比較対象 |
| `causedBy` | directed | Node↔Node | 原因関係 |
| `leadsTo` | directed | Node↔Node, Topic↔Topic | 帰結関係 |
| `versionOf` | directed | Snapshot↔Version, Version↔Version | 版の関係 |
| `attachedTo` | directed | Material↔Node, URL↔Node, Material↔Topic | 添付される |
| `relatedTo` | bidirectional | any | 緩い関連 |

## 3. Current Runtime Mapping

- `Edge.relation`
  - Node↔Node の relation 値
- `TopicLink.relation`
  - Topic↔Topic の relation 値
- `Edge.meaning` / `TopicLink.meaning`
  - 表示・補助説明

## 4. Endpoint Policy

### Node↔Node

主に使う:
- `supports`
- `contradicts`
- `elaborates`
- `questions`
- `derivedFrom`
- `comparesWith`
- `causedBy`
- `leadsTo`
- `relatedTo`

### Topic↔Topic

主に使う:
- `references`
- `derivedFrom`
- `comparesWith`
- `leadsTo`
- `relatedTo`

### Bundle↔Node / Bundle↔Topic

主に使う:
- `contains`
- `belongsTo`

### Material / URL

主に使う:
- `attachedTo`
- `references`
- `derivedFrom`

## 5. Directionality Rule

- `supports`, `contradicts`, `elaborates`, `questions`, `causedBy`, `leadsTo`, `derivedFrom`, `versionOf`, `attachedTo`, `contains`, `belongsTo` は有向
- `comparesWith`, `relatedTo` は無向的に扱ってよいが、保存上は 1 本の有向 relation で表現してよい

## 6. UI Rule

- UI 上の線は canonical relation を基本候補として提示する
- free text relation は互換のため許容するが、保存時正規化の対象とする
- `Semantic` suggestion はこの relation vocabulary を起点に組み立てる

## 7. Migration Rule

既存の自由入力 relation は:
1. exact match
2. known alias match
3. fallback `relatedTo`

の順に canonicalize する。
