## Why

Current project visibility, document checklist, and attachment rules are still too project-centric for daily execution. Testing shows that a user who only owns one document can enter the full project detail and potentially see or download unrelated document attachments, while reviewers and stage gate approvers do not have a unified place to find their pending work.

This change defines a first version of "My Workbench" and document-level access control so document responsibility, document review, stage gate approval, stage advancement, and attachment permissions have a clear product and backend contract before implementation.

## What Changes

- Add a unified "我的工作台 / 我的待办" entry for current-user work items.
- Define four initial workbench todo types:
  - `document_responsibility`: documents I am responsible to handle now, limited to actionable statuses such as `not_submitted` and `returned`.
  - `document_review`: submitted documents waiting for the current user's document-level review authority.
  - `stage_gate_approval`: current-stage gate approvals currently waiting for the current user.
  - `stage_advance`: current stages the user can actually advance after stage gate approval and current completeness checks pass.
- Define `GET /api/me/workbench` as the first backend direction for current-user workbench data and summary counts.
- Distinguish project visibility from document and attachment access.
- Require ordinary employees to use a task view or restricted project detail when they enter from a workbench task.
- Require ordinary employees to see only their own relevant document items and attachments, not the full project checklist.
- Require workbench routes for ordinary employees to target the restricted task view, not unrestricted project detail.
- Tighten attachment list, download, upload, and delete permissions so they are checked at document-item level instead of only project visibility.
- Limit first-version attachment upload to the document item's `responsibleUserId`; project managers, center managers, and the general manager can view, download, review, approve, or return according to their permissions, but they must not upload on behalf of the responsible user.
- Require backend-provided per-document action flags so the frontend does not guess attachment or document permissions from `organizationRole` alone.
- Preserve necessary whole-project coordination views for the general manager and project managers.
- Define first-version center manager and general manager assistant boundaries for document and attachment access.
- Keep current local attachment storage in `digital-platform-api/storage/stage-document-attachments` or `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR`; do not add file-management-platform linkage.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: distinguish project basic visibility from full document/attachment access, and define the current-user workbench API contract.
- `project-core-frontend`: replace or upgrade "我的资料任务" into "我的工作台 / 我的待办", define task categories, restricted task views, and attachment button visibility.
- `stage-document-checklist`: require permission-filtered checklist results and document-level attachment permissions.

## Impact

- Backend API direction: add `GET /api/me/workbench`.
- Backend authorization: document checklist filtering and attachment list/download/upload/delete must use document-item-level permission checks.
- Frontend navigation and pages: rename or upgrade "我的资料任务" to "我的工作台 / 我的待办"; support todo type filtering and task-oriented navigation.
- Frontend project detail: support full project view and restricted task view depending on the current user's permission.
- Storage: attachment files remain in local platform storage and metadata remains in the database; file-management-platform archive, sync, download permission, preview, versioning, and permission propagation are out of scope.
- Non-goals: no messages or push notifications, no daily/weekly reports, no complex RBAC configuration page, no file-management-platform integration, no file preview, no multi-version file handling, no delegated or assisted attachment upload, and no project member table unless a later design proves it is necessary.
