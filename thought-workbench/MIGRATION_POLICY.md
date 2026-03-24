# Migration Policy

最終更新: 2026-03-22

## 1. Rule

保存データには schema version を持たせ、起動時に migration する。

## 2. Envelope

現行 envelope:
- `PersistEnvelope.version`
- `savedAt`
- `state`

将来方針:
- `version` を schema version として扱う
- additive migration を基本とする

## 3. Migration Principles

1. 破壊的変更を避ける
2. 削除より deprecate を優先する
3. 既定値補完を明示する
4. 変換不能項目は report に残す
5. repair と migration を混同しない

## 4. Required Cases

- enum rename
- field split
- field move
- topic/sphere naming cleanup
- relation canonicalization
- saved view / workspace separation
- version / snapshot / archive separation

## 5. Fallback Rules

- unknown field は読み飛ばさず保持優先
- unknown enum は canonical fallback へマップ
- 参照切れは warning に落として本体起動は継続

## 6. Testing Rule

migration 追加時は:
- old payload fixture
- migrated payload assertion
- no-data-loss assertion

を最低限用意する。

## 7. Current Implementation

- `PersistEnvelope.version = 6`
- localStorage は envelope で保存 / 復旧する
- IndexedDB も envelope で保存し、旧 plain `AppState` も後方互換で読める
- 保存時は canonical persistence 形へ寄せる
  - node `intake / work / version`
  - edge / topicLink / unresolvedTopicLink `relation`
  - smart folder filter の `intakeStatus / workStatus`
- 読込時は version を見て migration を通し、その後 runtime state へ normalize する

## 8. Current Migration Coverage

- legacy `placed -> structured`
- legacy `organizing -> active`
- legacy `hold -> onHold`
- legacy `draft -> working`
- legacy `comparison -> snapshotted`
- legacy `published(versionState) -> versioned`
- legacy `frozen(versionState) -> archived`
- relation alias canonicalization
- `publicationState` の導出補完
