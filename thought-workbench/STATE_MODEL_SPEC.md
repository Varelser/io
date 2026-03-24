# State Model Spec

最終更新: 2026-03-22

## 1. Rule

状態は 1 つの巨大 `status` に潰さない。  
最低でも以下の層に分ける。

1. knowledge
2. intake
3. work
4. review
5. conversion
6. publication
7. version
8. integrity
9. material
10. url

## 2. Canonical Enums

### 2.1 Knowledge State

値:
- `fragment`
- `observation`
- `question`
- `hypothesis`
- `claim`
- `definition`
- `evidence`
- `rebuttal`

役割:
- 知識の意味種別
- Node の `type` を将来的にこの層へ寄せる基準

### 2.2 Intake State

値:
- `inbox`
- `staging`
- `structured`
- `archive`

役割:
- 未整理断片の置き場
- capture から整理済みへの流れ

現行対応:
- `Node.intakeStatus`

### 2.3 Work State

値:
- `active`
- `review`
- `onHold`
- `done`
- `frozen`

役割:
- 作業進行状態

現行対応:
- `Node.workStatus`

### 2.4 Review State

値:
- `none`
- `queued`
- `inReview`
- `reviewed`
- `needsFollowUp`

役割:
- review の進み具合

status:
- planned

### 2.5 Conversion State

値:
- `none`
- `queued`
- `converting`
- `converted`
- `failed`

役割:
- 資料変換、task 化、split / merge 候補などの処理状態

現行対応:
- `ConversionItem.status` は暫定実装

### 2.6 Publication State

値:
- `private`
- `internal`
- `publishReady`
- `published`
- `deprecated`

役割:
- 公開状態

status:
- partially implemented

備考:
- 現在の `published` は `workStatus` や `versionState` に混ざっているため、将来はこの層へ寄せる

### 2.7 Version State

値:
- `working`
- `snapshotted`
- `versioned`
- `archived`

役割:
- 版としての節目

現行対応:
- `Node.versionState` は暫定で `draft / published / frozen / comparison` を保持
- migration でこの canonical 値へ寄せる

### 2.8 Integrity State

値:
- `valid`
- `warning`
- `error`
- `repairing`

役割:
- 整合性評価の結果

status:
- derived, not stored by default

### 2.9 Material State

値:
- `unread`
- `skimmed`
- `reading`
- `summarized`
- `cited`

役割:
- 資料の消化段階

現行対応:
- `Node.materialStatus`

### 2.10 URL State

値:
- `unverified`
- `verified`
- `broken`
- `duplicated`
- `archived`

役割:
- URL の確認状態

status:
- planned

## 3. Current Implementation Mapping

| Canonical Layer | Current Field | Status |
| --- | --- | --- |
| knowledge | `Node.type` | partial |
| intake | `Node.intakeStatus` | implemented |
| work | `Node.workStatus` | implemented |
| review | review prompts / maintenance / branch review UI | partial |
| conversion | `ConversionItem.status` | partial |
| publication | mixed into work/version docs | not normalized |
| version | `Node.versionState` | partial |
| integrity | derived by integrity / maintenance panels | partial |
| material | `Node.materialStatus` | implemented |
| url | linkedUrls + exchange/import logic | not first-class |

## 4. Naming Decisions

- `draft` は version ではなく `working`
- `published` は publication layer
- `archived` は archive / version 退避の語であり、work の完了語としては使わない
- `review` は work layer の中間点ではなく review layer としても持てる
- `conversion-queued` は work ではなく conversion layer

## 5. UI Label Rule

- 内部値は英語 snake/camel で固定
- UI 表示は `ja / en` ラベルを別管理
- filter / color / badge は canonical enum に従う

## 6. Migration Rule

canonical enum と現行 enum がズレる箇所は `MIGRATION_POLICY.md` に従って段階移行する。
