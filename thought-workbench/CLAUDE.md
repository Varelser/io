# 4D KMS Project Memory

## Purpose
This repository implements a 4D knowledge management system focused on:
- time-aware knowledge structures
- infinite canvas and multi-pane workspaces
- separation of knowledge state and work state
- intake, review, conversion, material handling, integrity, and workspace memory layers
- long-term maintenance without forcing premature classification

## Product intent
The main goal is not just to render nodes in 3D.
The main goal is to let the user capture messy input quickly, preserve ambiguity, and reorganize or reinterpret it later without losing traceability.

## Architectural priorities
1. Protect the data model before adding UI complexity.
2. Separate semantic knowledge structures from temporary work structures.
3. Prefer explicit state transitions over implicit mutation.
4. Saved views are query-based projections, not physical moves.
5. Topic is the canonical model. Sphere is the 3D display name of a topic.
6. Bundle is a cross-cutting work unit, not a folder replacement.
7. Workspace memory is a first-class feature, not a UI convenience.
8. Auto-organization must remain proposal-oriented unless the user confirms.

## Core object boundaries
### Node
Atomic opinion or knowledge unit. May belong to multiple spheres and multiple bundles.

### Topic
Canonical theme/context unit. A topic is not a task board and not a case folder.

### Sphere
UI term for the 3D spatial display of a topic.

### Bundle
Cross-cutting work unit that can collect nodes, spheres, materials, URLs, tasks, journal entries, and snapshots.

### Material
Reference material such as document, image, audio transcript, PDF, article note, or imported record.

### URLRecord
A tracked URL object with verification and processing status.

### Snapshot
A point-in-time capture used for comparison, recovery, publication, or timeline inspection.

### Workspace
Saved arrangement of panes, zoom, filters, timeline position, and current working surfaces.

## Required state separation
Never collapse these into one field.

### Knowledge state examples
- fragment
- observation
- question
- hypothesis
- claim
- definition
- evidence
- rebuttal

### Intake state examples
- inbox
- staging
- structured
- archive

### Work state examples
- active
- review
- onHold
- done
- frozen

### Review state examples
- none
- queued
- inReview
- reviewed
- needsFollowUp

### Conversion state examples
- none
- queued
- converting
- converted
- failed

### Publication state examples
- private
- internal
- publishReady
- published
- deprecated

### Material processing state examples
- unread
- skimmed
- reading
- summarized
- cited

### URL verification state examples
- unverified
- verified
- broken
- duplicated
- archived

### Version state examples
- working
- snapshotted
- versioned
- archived

## Saved view rules
Saved views must:
- be backed by query conditions
- expose counts
- open inside any pane
- support timeline-sensitive reevaluation
- never move the source objects physically

## Timeline rules
Timeline UI must not be treated as decoration.
If a feature depends on "time travel", implement or preserve:
- event history or version chain
- snapshot references
- reversible or reconstructable state
- timeline-aware query evaluation where needed

## Workspace memory rules
Workspace memory must preserve:
- pane layout
- pane type per pane
- sync groups
- canvas coordinates
- zoom level
- region bookmarks
- current bundle
- current saved views
- timeline position

## Integrity rules
Always guard against:
- duplicate names and near-duplicate names
- orphan nodes
- broken relationships
- invalid multi-membership
- material records without processing state
- URL records without verification state
- contradictory transitions
- snapshots with missing provenance

## Delivery rules for code work
Before implementing a feature:
1. identify affected schema objects
2. identify affected state transitions
3. identify affected queries/saved views
4. identify affected persistence and migration
5. identify affected tests

Do not ship UI-only fixes that silently change semantics.

## Implementation preferences
- Prefer TypeScript with explicit types.
- Keep reducers/state machines deterministic.
- Prefer additive migrations over destructive rewrites.
- Use feature flags for risky behavior.
- Write tests for transitions, queries, persistence, and regression-prone UI actions.
- For large changes, propose sequence: schema -> state -> query -> persistence -> UI -> tests.

## Working agreements for Claude Code
When modifying this project:
- explain boundary decisions when changing Node/Topic/Bundle semantics
- call out hidden coupling between UI and persistence
- keep naming consistent across schema, UI labels, and filters
- do not invent new global concepts unless necessary
- avoid flattening nuanced states into a single status field
- prefer small, reviewable changes
- when unsure, preserve user ambiguity rather than forcing categorization

## Recommended subagents in this repository
- schema-guardian
- state-flow-designer
- canvas-ui-implementer
- query-view-builder
- import-material-pipeline
- test-regression-reviewer

## Recommended skills in this repository
- object-boundary-check
- state-transition-check
- saved-view-audit
- import-pipeline-audit
- workspace-memory-audit
- regression-gate
