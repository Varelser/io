# Changelog

## 2026-03-21

### Completed

- `ScenarioBranch` の差分確認、sandbox、sync、backport、推奨操作を含む往復導線を実装
- `LeftSidebar`、`RightInspector`、`AppChrome` と複数の hook に `App.tsx` の責務を分離
- `betweenness centrality`、`HITS`、`degree centrality`、`community detection`、接続密度、時系列比較、強化 `PageRank` を追加
- `Mandala`、`Semantic`、`Strata`、`Zettelkasten`、`PARA`、`GTD`、`Must One` の専用 UI と支援ロジックを拡張
- `Review`、`Maintenance`、`Task`、`Stats`、`Timeline` の思考支援ビューを強化
- `Standalone HTML` export、sample state 拡張、PWA asset、release packaging を追加
- `obsidian-plugin/` と exchange import / export により Obsidian 往復ワークフローを追加
- roadmap の主要 phase を完了扱いへ更新し、vitest cache の追跡を停止

### Commit Summary

- `04941f0` `docs(roadmap): mark roadmap phases complete`
- `2a89140` `chore(git): stop tracking vitest cache`
- `23549fd` `feat(obsidian): add vault exchange workflow`
- `1b367ed` `chore(release): add packaged PWA distribution`
- `d09d17c` `feat(workbench): add analytics and guided workflows`
- `e46e7db` `refactor(app): extract sidebar and inspector panels`
- `a99c70f` `feat(workspace): add scenario branching and PWA support`

### Release Notes

- 現在の main はローカル保存型の思考ワークベンチとして、主要 roadmap phase を一通り満たす状態
- release 用配布物は `release/thought-workbench-web/` に生成可能
- Obsidian 連携は import / export が安定、round-trip sync は beta 扱い
