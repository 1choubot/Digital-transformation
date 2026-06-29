## 1. Planning / Spec Tasks

- [x] 1.1 Create `align-project-visibility-and-audit-access-v1` change directory and proposal/design/spec/tasks artifacts.
- [x] 1.2 Document the final visibility rules for general manager, general manager assistant, center manager, project creator, project manager, employee and system administrator.
- [x] 1.3 Document the boundary that this change only relaxes viewing, not business operations.
- [x] 1.4 Document that uploaded attachment view/download belongs to full stage-document viewing.
- [x] 1.5 Document that this change does not add daily reports, weekly reports or project report generation.
- [x] 1.6 Document that this change does not implement `1.2 项目立项审批表` multi-node approval.
- [x] 1.7 Document that this change does not restore file platform integration.
- [x] 1.8 Add delta specs for `project-core`, `stage-document-checklist`, `business-operation-log`, `project-core-frontend` and `technical-architecture`.
- [x] 1.9 `openspec validate align-project-visibility-and-audit-access-v1 --strict` passes.
- [x] 1.10 `openspec validate --all --strict` passes.

## 2. Future Implementation Tasks

- [x] 2.1 Backend: adjust `buildProjectVisibilityCondition` so general manager, general manager assistant and center manager can view all projects; project creator can view created projects; project manager can view managed projects; employees remain related-only; system administrator has no default business visibility.
- [x] 2.2 Backend: adjust `canViewProject`, project detail and project overview visibility to use the final viewing rules without changing operation permissions.
- [x] 2.3 Backend: adjust `canViewStageDocumentItem` so full-view users see the complete 64-item stage document checklist for visible projects.
- [x] 2.4 Backend: adjust attachment view/download permissions only through `canViewAttachments` and `canDownloadAttachment`.
- [x] 2.5 Backend: ensure `canUploadAttachment`, `canDeleteAttachment`, `canSubmitDocument`, `canReviewDocument`, `canManageResponsibility` and `canChangeApplicability` do not change because of full viewing.
- [x] 2.6 Backend: adjust `canViewProjectOperationLogs` or equivalent business-operation-log view helper for management, project creator and project manager visibility.
- [x] 2.7 Backend smoke: center manager can view cross-center projects, complete 64 items, business logs and attachment downloads.
- [x] 2.8 Backend smoke: general manager assistant can view all projects, complete 64 items, business logs and attachment downloads.
- [x] 2.9 Backend smoke: project creator can view created project complete documents, business logs and attachment downloads.
- [x] 2.10 Backend smoke: system administrator still cannot see business projects or business logs by default.
- [x] 2.11 Backend smoke: employee still only sees self-related projects and documents.
- [x] 2.12 Backend smoke: cross-center center manager still cannot review, submit, return, precise-rework return, assign responsibility, mark applicability, advance stage, upload attachments or delete attachments unless independently authorized.
- [x] 2.13 Backend smoke: general manager assistant still cannot review, submit, return, precise-rework return, assign responsibility, mark applicability, advance stage, upload attachments or delete attachments unless independently authorized.
- [x] 2.14 Backend smoke: full-view user who is not an attachment owner or authorized uploader/deleter cannot upload or delete attachments.
- [x] 2.15 Frontend: display projects, complete stage documents, business logs and attachment downloads according to backend visibility and permission fields.
- [x] 2.16 Frontend: confirm operation buttons do not appear merely because view access was relaxed.
- [x] 2.17 Validation: run `cmd /c npm.cmd run check` in `digital-platform-api`.
- [x] 2.18 Validation: run `cmd /c npm.cmd run build` in `digital-platform-web`.
- [x] 2.19 Validation: run `cmd /c openspec validate align-project-visibility-and-audit-access-v1 --strict`.
- [x] 2.20 Validation: run `cmd /c openspec validate --all --strict`.
- [x] 2.21 Backend: when implementing business-log view access, ensure `assertProjectAuditViewable` or equivalent query loads `created_by_user_id` and uses `canViewProjectOperationLogs` or an equivalent business-operation-log view helper so project creators can view logs for projects they created.
- [x] 2.22 Backend smoke: cover project creator can view business logs for projects they created, while a non-creator ordinary employee cannot view complete business logs.
- [x] 2.23 Backend smoke: update legacy visibility assertions so cross-center center manager document `canView` becomes true, while `canReview`, `canSubmit`, `canUpload`, `canDelete`, `canAdvance`, `canManageResponsibility`, `canChangeApplicability` and equivalent operation permissions remain false unless independently authorized.
- [x] 2.24 Frontend: confirm project detail renders via composed project base status, stage-document, attachment, business-log and completeness/overview APIs, and operation buttons still rely only on backend permission fields.
- [x] 2.25 Review follow-up: split the business operation log view helper from the legacy stage approval history view helper.
- [x] 2.26 Review follow-up: update `assertProjectAuditViewable` to use the business operation log view helper.
- [x] 2.27 Review follow-up smoke: cover that business operation log visibility does not relax legacy stage approval history visibility for general manager assistant, center manager or project creator.
- [x] 2.28 Review follow-up: restrict ordinary employee project overview cards so they do not return full current-stage completeness details or hidden document names.
- [x] 2.29 Review follow-up smoke: cover that an ordinary employee can see a related project overview card without receiving other users' document details, while full-view users still receive completeness details.
- [x] 2.30 Review follow-up: align overview dashboard specs with restricted ordinary-employee overview behavior and update helper naming after splitting business-log and legacy audit helpers.
- [x] 2.31 Review follow-up: update design and technical-architecture wording so business operation logs use `canViewProjectOperationLogs` or equivalent helper, while `canViewCompleteProjectAudit` remains a legacy stage approval history helper and is not widened by this change.
