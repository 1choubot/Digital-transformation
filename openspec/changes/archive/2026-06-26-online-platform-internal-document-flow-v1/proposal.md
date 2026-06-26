## Why

The 20260625 workflow clarified that stage documents are not all reviewed the same way: the 64 document items must follow `completionMode` rules instead of a single "submit then confirm everything" path. Leadership also confirmed the immediate priority is to pause file-management-platform linkage and first keep attachments inside the online platform while the online platform closes the loop for project creation, document submission/review, and stage advancement.

Current implementation still has two core gaps:

- `projectCode` is still required at project creation, while the 20260625 workflow says the project number is generated or filled only after `1.2 项目立项审批表` is approved and `1.3 项目立项通知` is submitted/published.
- Stage documents still behave as if every document must be submitted and then confirmed, instead of using `submit_only 33`, `approval_required 24`, `conditional_submit 7`, and `conditional_approval 0`.
- Existing formal specs still contain older "all required documents must be `confirmed`" and generic stage-gate approval rules; this change narrows the online-platform internal flow to `completionMode`-based completion and stage advancement.

## What Changes

- Allow project creation with empty `projectCode`.
- Plan post-initiation project-code fill/generation after `1.2 项目立项审批表` is approved and `1.3 项目立项通知` is submitted/published.
- Keep non-empty `projectCode` unique while allowing multiple projects without a generated code.
- Add `completionMode` to online-platform stage document templates and project-level document instances.
- Make document status, review todos, completeness summaries, and stage advancement follow `completionMode`.
- Return `completionMode` plus a derived completion field such as `isComplete` or `completionStatus` so `submit_only + submitted` is shown as complete rather than pending review.
- Treat `submit_only` documents as complete after submit/upload without creating review todos.
- Treat `approval_required` documents as complete only after confirmation/review approval.
- Treat `conditional_submit` as the current applicability mechanism: `isApplicable=false` means untriggered/not applicable and non-blocking; `isApplicable=true` means triggered and submit/upload completes it.
- Remove the generic stage approval gate from this internal flow; stage advancement depends on current-stage applicable documents reaching their `completionMode` completion point plus existing advancement permissions.
- Keep current attachments in the online platform attachment system for this stage.
- Pause file management platform linkage, folder mapping, archive status, archive retry, and file-platform file list/download display.

Out of scope:

- No file management platform integration implementation.
- No `D:\file-server-local` changes.
- No `filePlatformClient`, file-platform folder mapping, or `archived` / `archive_failed` status.
- No contract approval flow, purchase approval flow, payment flow, invoice approval flow, or design-change workflow engine.
- No new conditional trigger workflow engine beyond the existing `isApplicable` applicability mechanism.
- No implementation code, backend/frontend business-code change, database migration, git commit, or archive in this planning change.
- No changes to `file-platform-integration-v1` or `define-digital-platform-v1`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: Plan nullable project code, post-initiation project-code update, completionMode-based stage advancement, no generic stage approval gate, and online-platform attachment storage while file-platform integration is paused.
- `project-core-frontend`: Plan project-code optional UI, empty-code display, post-initiation code entry, completionMode-specific document actions/statuses, and hidden file-platform archive UI.
- `stage-document-checklist`: Plan completionMode on templates and project document instances, 20260625 33/24/7/0 rules, review todo filtering, and online-platform attachment storage.
- `technical-architecture`: Plan the current-stage architecture boundary: no file-platform calls/config, online-platform attachment storage first, and `file-platform-integration-v1` paused until a later change.

## Impact

- Adds planning document `docs/9.12_在线平台内部资料闭环规划_20260625.md`.
- Adds OpenSpec planning artifacts under `openspec/changes/online-platform-internal-document-flow-v1/`.
- Future implementation will affect digital platform API validation, migrations/schema, stage document templates, stage document status logic, stage advancement logic, workbench/todos, and Vue project/document UI.
- This planning change does not modify runtime code, database schema, migrations, `D:\file-server-local`, `file-platform-integration-v1`, or `define-digital-platform-v1`.
