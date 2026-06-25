## Context

The platform already has organization roles, project managers, document responsible users, document-level review states, stage gate approval, stage advancement, business logs, and local document attachments. The remaining gap is that daily work and file access are still organized around project visibility: a user can find a project, but not all of their work; and a user who can see a project may see too much document detail.

This design defines a smaller first version: workbench todos plus document-item-level access control. It does not implement file-management-platform integration or a configurable RBAC engine.

## Goals / Non-Goals

Goals:

1. Add a "我的工作台 / 我的待办" model for current-user tasks.
2. Cover document responsibility, document review, stage gate approval, and stage advancement.
3. Separate project basic visibility from full document checklist and attachment access.
4. Limit ordinary employees to their relevant document tasks and attachments.
5. Preserve whole-project coordination views for the general manager and project manager.
6. Define document-item-level authorization for attachment list, download, upload, and delete.

Non-goals:

1. Do not integrate with the file management platform.
2. Do not add message push, notifications, daily reports, or weekly reports.
3. Do not add a complex RBAC configuration page.
4. Do not add file preview, file versioning, file permission sync, or file platform archive.
5. Do not add a project member table in this change unless a later design change proves it is necessary.
6. Do not change 8-stage definitions or the 54-item document template.

## Current Attachment Storage

1. Stage document attachment files are stored under `digital-platform-api/storage/stage-document-attachments` by default.
2. Deployments may override the storage directory with `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR`.
3. The database stores attachment metadata, including project, document item, original filename, size, uploader, timestamps, storage key, and soft-delete metadata.
4. Backend responses must not return local absolute paths, `storageKey`, `storedFileName`, temporary upload paths, or internal storage directory details to the frontend.
5. This change does not move attachments into the file management platform and does not create file platform folders, archive files, sync users, sync permissions, or decide file platform download rights.

## Workbench Todo Types

The first version defines four todo types.

1. `document_responsibility`
   A document item that the current user is responsible to handle now. First version MUST count only applicable documents where `responsibleUserId = current user id` and status is `not_submitted` or `returned`. `submitted` documents are already waiting for review and MUST NOT count as responsibility todos; they may be displayed as "已提交待审核" status information outside the actionable todo count.

2. `document_review`
   A submitted document item waiting for document-level review. First version MUST include only documents with `status = submitted` where the current user is the center manager of the responsible user's department. Project managers MUST NOT receive document review todos merely because `projectManagerUserId = current user id`. The general manager MUST NOT receive every submitted document as a document review todo in the first version; the general manager primarily handles stage gate approvals. If a later version needs general-manager document-level review for specific documents, that scope must be modeled explicitly with structured fields.

3. `stage_gate_approval`
   A current-stage gate approval that is waiting for the current user. First version MUST include only current stages where approval status is `pending_center_manager` and the current user is the matching approval-center manager, or approval status is `pending_general_manager` and the current user is the general manager.

4. `stage_advance`
   A current stage that the current user can actually advance. First version MUST include only current stages where stage gate approval status is `approved`, current applicable required documents are still complete, the project is not completed, the stage is not stage 8 `closeout`, and the current user has stage advancement permission. Stage 8 has no next stage and MUST NOT incorrectly generate a normal "advance stage" todo. If the product later needs a "project closeout complete" action, it must be defined in a separate change.

## Document Review Authority

First-version document-level review authority is executable and intentionally narrow.

1. A document review todo is generated from `status = submitted`.
2. The default reviewer is the center manager of the document responsible user's department.
3. The responsible user's department is read from `responsibleUser.department`.
4. If the document has no assigned responsible user, no center manager document-review todo is generated in the first version.
5. Project managers do not receive document review authority merely because they manage the project.
6. The general manager does not receive all submitted documents as `document_review` todos; the general manager handles stage gate approval unless a later change defines structured document-level general-manager review rules.
7. The general manager assistant and system administrator MUST NOT receive document review todos.
8. Future mappings from template `confirmRole` to reviewer centers must use structured fields. The implementation MUST NOT infer review authority by fuzzy matching Chinese responsibility text.

## Workbench Response Shape

The first API direction is:

```http
GET /api/me/workbench
Authorization: Bearer <token>
```

The response MUST include a summary and a list of todo items. Each todo item must include at least:

1. `type`
2. `projectId`
3. `projectCode`
4. `projectName`
5. `stageId`
6. `stageOrder`
7. `stageName`
8. `documentId`, nullable
9. `documentCode`, nullable
10. `documentName`, nullable
11. `status`
12. `actionText`
13. `createdAt` or `updatedAt`
14. `targetRoute`
15. `permissions` for document items, or an equivalent structured permission result

For ordinary employee document todos, `targetRoute` MUST point to a restricted task view or restricted project detail that includes task mode and document identity, such as a route carrying `documentId` and `taskMode`. It MUST NOT point ordinary employees directly to unrestricted project detail.

The response MUST also include summary counts grouped by todo type and a total count. The actionable todo count for `document_responsibility` MUST exclude submitted documents that are only waiting for review. The first version can use stable ordering by todo urgency, updated time, project code, stage order, document order, and ID.

When the workbench response includes document items, it MUST include current-user operation flags or enough structured permission data for the frontend to render controls without guessing from `organizationRole`. The first-version fields MUST include `canViewAttachments`, `canUploadAttachment`, `canDownloadAttachment`, `canDeleteAttachment`, `canSubmitDocument`, and `canReviewDocument`, or an equivalent backend-provided permission result.

In the first version, `canUploadAttachment` MUST be derived from the document item's `responsibleUserId = current user id`. It MUST NOT directly reuse a broader document submit permission such as an existing `canSubmitStageDocument` helper, because project managers, center managers, and the general manager may have coordination, review, approval, or return permissions without being allowed to upload attachments on behalf of the responsible user.

## Project Basic Visibility vs Document Access

Project visibility answers "can the user know this project exists and see basic project status?" Document access answers "can the user see this document item and its attachments?"

1. Ordinary employees may see basic information for projects where they are responsible for at least one document or are the project manager.
2. Ordinary employees must not gain the full project document checklist merely because one document in the project is assigned to them.
3. Ordinary employees entering from the workbench MUST land in a task view or restricted project detail.
4. The restricted view must show only document items relevant to the current user's tasks and only those attachments the user is allowed to access.
5. Project list and project overview may continue to show project basic information for projects the backend says are visible.
6. If an ordinary employee manually opens a project detail URL, backend document checklist APIs MUST still filter the checklist to documents the user is allowed to see.
7. Frontend button hiding is only user experience; direct API calls MUST still be rejected by backend authorization.

## Center-Related Document Rules

1. Project basic visibility may use `participatingDepartments` as one signal that a center is related to a project.
2. Document checklist access and attachment access MUST NOT open the whole project merely because `participatingDepartments` contains the user's center.
3. First-version document-level center matching MUST prefer `responsibleUser.department`.
4. If a document has no assigned responsible user, center managers may see project basic information but MUST NOT see that document's attachment list, download controls, upload controls, or complete document content by default.
5. A later change may introduce structured template fields for review center mapping. It MUST NOT rely on fuzzy matching Chinese `confirmRole`, default responsibility role, or document name text.

## Role Boundaries

### Ordinary Employees

1. May view project basic information for projects related to their own document responsibilities.
2. Must not see the full project document checklist by default.
3. May see their own responsible document items and those document attachments.
4. Must not see attachment lists, download buttons, upload controls, or delete buttons for document items owned by others.
5. Must not review documents, process stage gate approval, advance stages, or manage other users' document responsibilities unless another explicit role grants that ability.

### Project Managers

1. May view the full document checklist and attachments for projects where `projectManagerUserId = current user id`.
2. Need the full project view for coordination, completeness tracking, responsibility assignment, and stage advancement.
3. Must not replace center manager or general manager approval.
4. MUST NOT receive unrestricted attachment delete rights in the first version. Project managers can delete only attachments they uploaded and only while the document is not `confirmed`.

### Center Managers

1. May view and review documents whose responsible user belongs to their own center.
2. May see `document_review` todos for submitted documents that match their center.
3. First-version full-project visibility is restrained: center managers can see project basic information and documents related to their center, not all documents in every related project.
4. If a later implementation wants center managers to see full project document data, it must explicitly state the business reason and risk in a separate design update.
5. Cross-center document attachments must be forbidden.

### General Manager

1. May view all projects and all document items.
2. May view and download all document attachments.
3. May process stage gate approval nodes that require general manager approval.
4. May appear in workbench for `stage_gate_approval` and other global business tasks.

### General Manager Assistant

1. May view project summary and project progress according to existing read-only business rules.
2. The assistant can see project and document summaries where existing read-only rules allow it.
3. The assistant MUST NOT automatically receive attachment download permission.
4. The assistant MUST NOT submit documents, review documents, approve stage gates, advance stages, download business attachments, or delete attachments.

### System Administrator

1. The system administrator remains a platform maintenance role.
2. The system administrator MUST NOT automatically receive business document or attachment access.
3. Direct business attachment access by system administrator MUST return `FORBIDDEN_OPERATION` unless another future change defines a controlled support/audit path.

## Attachment Permission Rules

The backend must authorize attachments at document-item level for list, download, upload, and delete. Project visibility alone is not sufficient.

1. Ordinary employees:
   - Can upload attachments to document items where `responsibleUserId = current user id`.
   - Can list and download attachments for document items where `responsibleUserId = current user id`.
   - Cannot list, download, upload, or delete attachments for document items assigned to others.
   - Can delete only attachments they uploaded, only while the document is not `confirmed`, and only while they still have current attachment access to that document item. If responsibility changes away from the uploader, the old responsible user MUST NOT delete the old attachment merely because `uploadedByUserId = current user id`.

2. Project managers:
   - Can list and download attachments for document items in projects they manage.
   - Can upload only when they are also the document item's responsible user.
   - MUST NOT upload attachments on behalf of other responsible users by default.
   - Can delete only attachments they uploaded, only while the document is not `confirmed`, and only while they still have current attachment access to the document item.
   - Must not use attachment access to bypass center manager or general manager approval responsibilities.

3. Center managers:
   - Can list, download, and review attachments for document items related to their own center.
   - Can upload only when they are also the document item's responsible user.
   - MUST NOT upload attachments on behalf of other responsible users by default.
   - MUST NOT delete attachments uploaded by others by default; if they uploaded an attachment themselves, deletion still requires current attachment access and the document must not be `confirmed`. The preferred handling path remains returning the document for correction and letting the responsible user handle attachment changes.
   - Cannot access cross-center document attachments.

4. General manager:
   - Can list and download all document attachments.
   - MUST NOT upload attachments on behalf of responsible users by default.
   - Can delete only attachments they uploaded, only while the document is not `confirmed`, and every successful delete MUST write the existing business log.

5. General manager assistant:
   - MUST NOT download, upload, or delete business attachments by default.

6. System administrator:
   - MUST NOT download, upload, or delete business attachments by default.

Attachment upload authorization MUST happen before multipart parsing or persistent file writes. Failed attachment authorization must return `FORBIDDEN_OPERATION` and must not leave temporary files, create files, create attachment records, soft-delete records, change document status, or write success business logs. Attachment delete authorization MUST check current document-item attachment access, uploader identity, document status, and disallowed global roles before soft-delete or business log writes. If the product later needs delegated or assisted attachment upload or broader delete delegation, that rule MUST be designed in a separate change instead of expanding first-version permission implicitly.

## Complete Project Audit Visibility

Operation logs and stage gate approval history can disclose project-wide business actions, actor identities, return comments, attachment filenames, and other document context. In the first version, these whole-project audit surfaces are not part of ordinary employee restricted task view.

1. Project managers can view complete operation logs and stage gate approval history for projects they manage.
2. The general manager can view complete operation logs and stage gate approval history for all projects.
3. Ordinary employees who can see a project only because they are responsible for one document item MUST NOT view complete operation logs or complete stage gate approval history for that project.
4. The backend MUST NOT return complete operation logs or stage gate approval history based only on project basic visibility.
5. The frontend MUST hide whole-project operation log and stage gate approval history panels in restricted task views or when the current user lacks complete project audit permission.
6. First-version center manager complete audit visibility is not retained. If a later version needs center managers to see audit data, it must filter by center-related documents and stage nodes instead of returning full project audit records.

## Frontend Direction

1. Rename or upgrade "我的资料任务" to "我的工作台" or "我的待办".
2. Display workbench summary counts by todo type.
3. Support filtering by todo type.
4. Let users click a todo to open the correct handling location.
5. Ordinary employees must enter a restricted task view when opening document tasks.
6. Project managers and general managers can still enter the full project detail view where their roles permit it.
7. Attachment list, download, upload, and delete controls must be hidden when backend-provided permission flags say the user cannot use them.
8. The frontend MUST NOT hard-code final authorization by guessing from `organizationRole` alone. It MUST use backend permission flags such as `canViewAttachments`, `canUploadAttachment`, `canDownloadAttachment`, `canDeleteAttachment`, `canSubmitDocument`, and `canReviewDocument`, or equivalent backend-provided fields.
9. Frontend hiding is only user experience; backend document-level checks remain mandatory.

## Open Questions / Future Work

1. Whether center managers eventually need full-project document visibility for all projects related to their center.
2. Whether general manager assistant should ever download attachments under a separate audited support or executive-assistant rule.
3. Whether attachment deletion by project managers should expand beyond self-uploaded files.
4. Whether workbench todos need pagination in the first implementation or can start with a bounded list and summary counts.
5. Whether a later change should add notification delivery based on workbench todos.
