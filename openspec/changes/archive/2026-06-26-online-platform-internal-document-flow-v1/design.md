## Current State

Current online-platform code still reflects the older implementation model:

- `projectCode` is required in backend input normalization and frontend form validation.
- `projects.project_code` is `NOT NULL` and has a unique key in the initial project-core migration.
- Stage document templates and project-level stage document instances do not have `completionMode`.
- Stage document template data still primarily uses `isRequired`, `status`, `submitMode`, `targetFolderPath`, and nullable `targetFolderId`.
- Stage document status transitions still assume `submit -> submitted`, then `confirm -> confirmed`; there is no `submit_only` branch where submit/upload completes the document.
- Stage completeness still treats only `status = confirmed` as complete.
- Stage advancement still checks `project_stages.approval_status = approved`, which is a generic stage gate that conflicts with the 20260625 completion-rule model.
- The online platform already has stage document attachments and can store files internally.
- `file-platform-integration-v1` is active, but leadership now wants this work paused and not used for the immediate online-platform closure.

## Target State

- `projectCode` is nullable at project creation.
- Non-empty `projectCode` remains unique.
- `projectCode` is filled or generated after `1.2 项目立项审批表` is approved and `1.3 项目立项通知` is submitted/published.
- `completionMode` becomes a required field on the active stage document template and each project-level document snapshot.
- Current 64 document items use `submit_only 33`, `approval_required 24`, `conditional_submit 7`, and `conditional_approval 0`.
- `submit_only` documents complete after submit/upload.
- `approval_required` documents complete only after confirmation/review approval.
- `conditional_submit` documents reuse the existing applicability mechanism: `isApplicable=false` means untriggered/not applicable and non-blocking; `isApplicable=true` means triggered, and submit/upload completes them.
- API responses include both the base document `status` and a derived completion field such as `isComplete` or `completionStatus`.
- Stage advancement checks current-stage applicable documents by `completionMode`, not by a generic stage approval gate.
- Project overview, my document tasks, workbench todos, document operations, and attachment areas all use the backend-derived `completionMode` completion status rather than confirmed-only status.
- The workbench does not return or display `stage_gate_approval`; current todo types are document responsibility, document review, and stage advancement.
- Generic stage-gate approval is not part of the current flow. Any legacy stage-approval history can only remain read-only compatibility/audit information and cannot be a required advancement condition.
- Files remain in the online-platform attachment system for this phase.
- File-platform base URL/token/folder mappings/archive status are not required in this phase.

## Data Model Planning

- Change `projects.project_code` to nullable.
- Keep uniqueness for non-empty `projectCode`.
- MySQL InnoDB unique indexes normally allow multiple `NULL` values; if the deployed database confirms that behavior, the existing unique key can remain after making the column nullable.
- If a compatibility layer or future database mode treats empty values differently, use a non-empty unique index strategy and normalize empty strings to `NULL`.
- Add `completion_mode` to `stage_document_templates`.
- Add `completion_mode` to `project_stage_documents` so each project keeps a snapshot of the rule used at initialization time.
- Existing mock data can be cleaned and rebuilt; this planning does not require old mock-project compatibility.
- Init/reset scripts need to reinitialize the current 64 document items with 20260625 `completionMode` values and the 33/24/7/0 count check.
- No file-platform mapping tables or archive-status columns are introduced by this change.

## Backend Planning

- `normalizeCreateProjectInput` no longer requires `projectCode`.
- Project creation inserts `project_code = NULL` when no code has been generated.
- Duplicate-project-code validation only runs for non-empty project codes.
- Add a post-initiation project-code fill/update path, or reuse project update with explicit uniqueness validation.
- The project-code fill/update path should be available after `1.2 项目立项审批表` reaches the `approval_required` approved/confirmed point and `1.3 项目立项通知` reaches the `submit_only` submitted/uploaded point.
- Project-code update must reject duplicate non-empty codes and must not rebuild stages, project stage documents, or attachments.
- Project-code update permission should reuse existing project maintenance, project-manager, administrator, or equivalent project-maintenance permission boundaries; it must not introduce a new complex permission model.
- Stage document status logic branches by `completionMode`:
  - `submit_only`: submit/upload sets `status = submitted`; completion is derived from `completionMode + status`, not from `confirmed`.
  - `approval_required`: submit sets `status = submitted`; confirmation sets `status = confirmed`; only `confirmed` completes the item.
  - `conditional_submit`: use `isApplicable=false` for untriggered/not applicable items, excluding them from missing/blocking counts; use `isApplicable=true` for triggered items, where submit/upload sets `status = submitted` and completes the item.
  - `conditional_approval`: future extension only for this 64-item set; if later used, trigger plus confirmation completes it.
- Document query responses must include `completionMode` and a derived completion value. `submit_only + submitted` must return completed/已完成, `approval_required + submitted` must return pending_review/待审核, and `returned` must remain incomplete.
- Review todos are generated only for `approval_required` documents with `status = submitted` and matching review permission.
- Workbench todos only use `document_responsibility`, `document_review`, and `stage_advance`; `stage_gate_approval` is not returned in the current internal flow.
- Responsibility todos for `submit_only` should not remain open after the document has been submitted/uploaded.
- Stage completeness summary calculates completion by `completionMode`.
- Project overview and my document task APIs must return derived completion state and must not count completed `submit_only + submitted` items as pending work.
- Missing document lists should include `completionMode`, current status, and trigger/applicability context.
- Stage advancement removes the generic `approval_status = approved` gate and checks only current-stage applicable document completion plus existing advancement permissions and current-stage state.
- Existing formal specs that require all applicable required documents to be `confirmed`, submitting a stage-gate approval, or receiving `approval_status = approved` are superseded for the 20260625 online-platform internal flow.
- Attachment upload/list/download/delete stays on the online-platform attachment tables and storage path.
- No backend file-platform client, base URL, token, folder mapping, archive upload, archive retry, or archive status is added in this change.

## Frontend Planning

- New project form makes project code optional.
- Empty project code displays as `待生成` or an equivalent label in list/detail/workbench/search results.
- Project detail provides a post-initiation project-code fill/update entry when the `1.2 项目立项审批表` approval point and `1.3 项目立项通知` submission point have been reached.
- Project-code sorting and filtering tolerate empty codes.
- Stage document list displays `completionMode` labels:
  - `submit_only`: `提交即完成`
  - `approval_required`: `需审核`
  - `conditional_submit`: `条件触发后提交`
  - `conditional_approval`: future extension label only; current 64 items count is 0.
- `submit_only` documents do not show review/return wording and do not appear in review workbench.
- `submit_only` documents whose base `status = submitted` are shown as completed/已完成 through the derived completion field, not as pending review.
- `approval_required` documents keep submit, review approval, and return behavior.
- `approval_required` documents whose base `status = submitted` are shown as pending_review/待审核.
- `conditional_submit` documents show untriggered/not applicable state until the condition is triggered.
- Stage summaries show missing/incomplete documents based on `completionMode`, not just unconfirmed documents.
- Project overview, my task pages, project detail document operations, and attachment areas display the backend-derived completion state. `submitted` is shown as completed for `submit_only` and pending review for `approval_required`.
- The workbench displays document responsibility, document review, and stage advancement todos; it does not display stage-gate approval categories, filters, or routes.
- File-platform archive status, folder IDs, archive retry, file-platform file list, and file-platform download entry are hidden or not implemented in this phase.

## Testing Planning

- Create project with empty `projectCode`.
- Fill/update `projectCode` after creation and reject duplicate non-empty codes.
- Confirm project list/detail/workbench/search display empty code as `待生成` or equivalent.
- Confirm `submit_only` document submit/upload counts as complete for stage summary and stage advancement.
- Confirm `submit_only + submitted` returns and displays a derived completed state rather than pending review.
- Confirm `approval_required` submitted but unconfirmed document does not count as complete, and confirmed document does.
- Confirm `approval_required + submitted` returns and displays a derived pending_review state.
- Confirm `returned` remains incomplete for every completion mode.
- Confirm `conditional_submit` uses `isApplicable=false` as untriggered/not applicable and non-blocking, `isApplicable=true` as triggered, triggered unsubmitted blocks, and triggered submitted completes.
- Confirm review workbench includes only `approval_required` submitted documents.
- Confirm stage advancement no longer depends on `stage approval_status`.
- Confirm local online-platform attachments still upload, list, download, and delete.
- Confirm no file-platform API, base URL/token, folder mapping, archive status, archive retry, or file-platform download behavior is invoked.

## Risks / Trade-offs

- Nullable project codes can expose UI assumptions that format strings with `projectCode` directly. Mitigation: normalize display to `待生成` in shared project display helpers.
- MySQL nullable unique behavior must be confirmed in the deployed database. Mitigation: migration review verifies whether multiple `NULL` values are allowed before implementation.
- Reusing `status = submitted` for completed `submit_only` documents may be confusing. Mitigation: expose derived completion fields or `completionMode` in API responses so UI can show `已完成` rather than `待审核`.
- Removing the generic stage approval gate may conflict with older workbench/stage-gate specs. Mitigation: this change explicitly scopes the new target to the 20260625 completion-rule model and lists stage-gate behavior as out of current implementation.
- Pausing file-platform integration means attachments are not archived to the file server. Mitigation: keep file-platform work in `file-platform-integration-v1` paused and re-open it later with `completionMode` archive triggers.
