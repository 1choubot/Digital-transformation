## Context

The baseline is the archived 20260625 online-platform internal document flow: project attachments remain in the online platform, stage advancement uses current-stage applicable documents by `completionMode`, and the current 64-item template counts are `submit_only 33`, `approval_required 24`, `conditional_submit 7`, `conditional_approval 0`.

Approval NO now needs a precise rework model. Some review documents imply upstream artifacts must be revised, but not every prior document in the stage should be returned. Reusing `returned` on upstream documents would confuse their own approval lifecycle, especially for `submit_only` outputs like `4.14` and `4.15`.

## Goals / Non-Goals

**Goals:**

- Fixed, auditable A/B/C rework planning for approval NO.
- Independent `revision_required` marker that blocks advancement and appears in workbench.
- Candidate validation that prevents reviewers from selecting arbitrary same-stage documents.
- Completion clearing rules that respect the upstream document's `completionMode`.
- Business logs for requesting and completing rework.

**Non-Goals:**

- No code implementation in this planning turn.
- No database migration execution.
- No file-platform linkage or folder mapping.
- No push notification.
- No generic approval workflow engine.
- No full-stage rollback and no automatic return of all previous documents.
- No implementation of the `1.2 项目立项审批表` commercial/technical/general-manager multi-node online approval.

## Decisions

### Fixed A/B/C Classification

Use fixed mapping rather than free-form reviewer selection.

- A class requires upstream candidate selection:
  - `1.2 -> 1.1`
  - `2.12 -> 2.4-2.11`
  - `2.13 -> 2.4-2.11`
  - `3.3 -> 3.2`
  - `4.12 -> 4.3-4.11`
  - `4.13 -> 4.3-4.11`
  - `4.16 -> 4.14, 4.15`
  - `4.17 -> 4.14, 4.15`
  - `5.4 -> 5.3`
- `2.12` / `2.13` explicitly exclude `2.2` / `2.3`.
- B class returns only the current approval document.
- C class is limited to `5.12` triggering selected `5.13-5.16`.
- A-class return requests use `revisionTargetDocumentIds`; `5.12` C-class requests use the independent `designChangeTargetDocumentIds` field.
- Non-A-class returns MUST NOT carry `revisionTargetDocumentIds`. `5.12` carrying `designChangeTargetDocumentIds` is valid and is not treated as a non-A-class upstream-target violation.
- `designChangeTargetDocumentIds` must include at least one item and may only contain `5.13`, `5.14`, `5.15`, and `5.16`.
- Every A-class or C-class write that sets `revision_required = true` must clear `revision_resubmitted_by_user_id` and `revision_resubmitted_at`.

Alternative considered: allow reviewer to select any previous same-stage document. Rejected because it creates unpredictable gates and would let `2.12` incorrectly force `2.2` / `2.3`.

### Independent Revision Marker

Add independent rework fields:

- `revision_required`
- `revision_reason`
- `revision_source_document_id`
- `revision_requested_by_user_id`
- `revision_requested_at`
- `revision_resubmitted_by_user_id`
- `revision_resubmitted_at`
- `revision_completed_by_user_id`
- `revision_completed_at`

Alternative considered: set upstream documents to `returned`. Rejected because `returned` is the approval document's own state machine, while upstream `submit_only` documents need a separate "submitted but rework required" state.

### Completion And Clearing Rules

`revision_required = true` makes the document incomplete for stage gate purposes even if its base status is `submitted` or `confirmed`.

- `submit_only` / `conditional_submit`: responsible user must perform an explicit rework completion action after upload/modify to clear the marker.
- `approval_required`: responsible user must perform a "revision resubmit" and the reviewer must confirm before the marker clears.
- If an `approval_required` upstream target is already `confirmed`, `revision_required = true` still makes it incomplete and the responsible user must be allowed to resubmit.
- Revision resubmit changes the base status to `submitted`, sets `revision_resubmitted_by_user_id` and `revision_resubmitted_at`, and makes the item eligible for review, but it MUST NOT clear `revision_required`.
- If the resubmitted item is returned again, `revision_required` remains and the current `revision_resubmitted_by_user_id` / `revision_resubmitted_at` must be cleared or invalidated until a later resubmit is confirmed.

This keeps `3.2 销售合同` and `5.3 采购合同` strict when they are A-class rework targets.

### Workbench And Unassigned Rework

Rework documents enter responsibility workbench. If a rework target has no responsible user, it remains visible in project detail as "需返工但未分配责任人" and must not silently disappear from workflow; project manager or authorized center owner can assign a responsible user first.

For `approval_required + revision_required` documents, the item enters responsibility workbench before revision resubmit and must not enter review workbench yet. It enters review workbench only after revision resubmit, using `revision_resubmitted_at` or an equivalent explicit resubmit marker to prove the current submitted state is the rework submission. It must not infer resubmission by comparing `submitted_at` with `revision_requested_at`.

### Logging

Rework request and completion are business actions:

- `document.revision_requested`
- `document.revision_completed`

Logs include source approval document, target rework document, reason, actor, and time. Logs do not send notifications.

A-class rework requests and C-class `5.12` design-change triggers both write `document.revision_requested`. Explicit completion of `submit_only` / `conditional_submit` rework writes `document.revision_completed`; `approval_required` writes `document.revision_completed` only when review confirmation clears `revision_required`.

## Risks / Trade-offs

- Fixed mapping may miss a rare business exception -> first version intentionally favors predictable gates; exceptions require later change.
- Separate revision marker adds schema and UI complexity -> avoids corrupting existing status semantics and preserves `completionMode`.
- Unassigned rework needs project-detail visibility -> prevents workbench-only logic from losing required rework.
- Legacy stage-approval specs still exist in some formal areas -> this change scopes rework to document-level approval NO inside the 20260625 internal flow, not generic stage-gate approval.

## Migration Plan

Future implementation should add nullable revision columns with defaults preserving current data. Existing documents start with `revision_required = false`. No historical revision backfill is required. Smoke tests should extend `check-stage-document-ownership.js` or an equivalent check to cover A/B/C mapping, blocking, clearing, workbench, and logs.
