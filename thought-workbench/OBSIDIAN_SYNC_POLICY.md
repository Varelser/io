# Obsidian Sync Policy

最終更新: 2026-03-22

## Status

| Capability | Status |
| --- | --- |
| JSON snapshot import | stable |
| Obsidian vault export | stable |
| exchange JSON export | stable |
| round-trip sync | beta |
| automatic conflict resolution | experimental |

## Current Rule

- import は安定導線として扱う
- export は安定導線として扱う
- Obsidian で編集した内容を本体へ戻す round-trip は beta 扱い

## Conflict Policy

canonical policy:
- local newer change がある場合は silent overwrite しない
- stale patch は conflict として記録する
- default は `manual merge required`

current implementation:
- `updatedAt` 比較で stale patch を reject
- import report に conflict 件数を出す

## ID Strategy

1. frontmatter の stable id を最優先
2. topic `_index.md` の `topicId` を優先
3. node note の `nodeId` を優先
4. fallback として title / label の一意一致を使う

## Rename / Move Rule

- ファイル名や folder 名は stable identity ではない
- rename / move に耐えるため、frontmatter id を source of truth にする

## Safe Messaging Rule

README / ROADMAP / CHANGELOG では:
- round-trip を completed と表現しない
- beta と明記する
- conflict policy 未固定部分を stable と言わない
