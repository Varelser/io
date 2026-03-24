# Integrity Rules

最終更新: 2026-03-22

## Severity

- `error`: 保存・参照・復元が壊れる
- `warning`: 運用上の破綻や取りこぼしが出る

## Rules

| Rule | Severity | Scope | Current |
| --- | --- | --- | --- |
| duplicate id | error | all | implemented partially |
| broken topic parent | error | Topic | implemented partially |
| missing node reference in edge | error | Edge | implemented partially |
| missing topic reference in topicLink | error | TopicLink | implemented partially |
| broken scenario branch node map | error | ScenarioBranch | implemented partially |
| broken selection set node ref | warning | NodeSelectionSet | implemented |
| stale workspace snapshot topic ref | warning | LayoutPreset / Workspace | beta |
| orphan node | warning | Node | implemented partially |
| orphan material | warning | MaterialRecord | planned |
| orphan url | warning | URLRecord | planned |
| duplicate url | warning | URLRecord | planned |
| circular bundle membership | warning | Bundle | planned |
| invalid state combination | warning | Node / Bundle / Material | planned |
| snapshot without provenance | warning | Snapshot | planned |
| saved view without valid filters | warning | SavedView | planned |

## Repair Principles

- error は起動時 normalize / repair の対象
- warning は UI と report に出し、ユーザー確認付きで修正
- destructive repair は自動実行しない

## Display Policy

- `Integrity` panel: 集約一覧
- `Maintenance` panel: 修復候補と apply
- import/export report: 主要 error / warning 件数

## Source of Truth

runtime 実装の整合性判定はこの文書を基準に増やす。
