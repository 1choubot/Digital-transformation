## Why

The archived 20260625 online-platform internal document flow correctly separates `submit_only`, `approval_required`, and `conditional_submit`, but approval rejection still lacks a precise way to mark which upstream documents must be reworked. Without this, teams either over-return a whole stage or rely on offline communication, which weakens stage advancement and workbench accuracy.

## What Changes

- Add planning for precise rework after approval NO, using a separate `revision_required` marker instead of reusing `returned` on upstream documents.
- Define fixed A/B/C rejection handling:
  - A class: reviewer must choose at least one fixed upstream candidate.
  - B class: current approval document returns itself.
  - C class: `5.12 安装调试记录（厂内）` uses `designChangeTargetDocumentIds` to trigger selected `5.13-5.16` design-change documents.
- Make `revision_required = true` block stage advancement and appear in responsible-user workbench tasks.
- Plan backend validation for A-class `revisionTargetDocumentIds`, C-class `designChangeTargetDocumentIds`, candidate range, applicability, and non-A-class rejection.
- Require C-class `designChangeTargetDocumentIds` to include at least one target and only allow `5.13`、`5.14`、`5.15`、`5.16`.
- Plan frontend rejection modal, candidate selector, `需返工` document display, and workbench display.
- Add business log planning for `document.revision_requested` and `document.revision_completed`.
- Keep file-platform integration paused and keep `completionMode` counts unchanged.

Out of scope:

- No full-stage rollback.
- No automatic return of all previous documents.
- No push notification implementation.
- No file-platform changes.
- No generic approval workflow engine.
- No change to `submit_only 33`, `approval_required 24`, `conditional_submit 7`, `conditional_approval 0`.
- No implementation of `1.2 项目立项审批表` internal commercial/technical/general-manager multi-node online approval.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `stage-document-checklist`: add precise rework markers, fixed A/B/C rejection mapping, completion-state impact, and rework clear rules.
- `project-core`: make stage advancement, overview, and workbench treat `revision_required` as incomplete and actionable.
- `project-core-frontend`: add precise rework selection/display planning and prevent old return UI from hiding required rework choices.
- `business-operation-log`: add rework requested/completed log actions and required details.
- `technical-architecture`: preserve online-platform ownership of rework state while keeping file platform and workflow-engine boundaries unchanged.

## Impact

- Future backend work will affect stage document schema, return/confirm/submit behavior, checklist responses, stage advancement gates, workbench queries, and smoke checks.
- Future frontend work will affect project detail document cards, approval return modal, candidate selection, and workbench.
- Future docs/specs will remain inside the digital platform repo; this planning change does not modify backend/frontend business code, database schema, migrations, or `D:\file-server-local`.
