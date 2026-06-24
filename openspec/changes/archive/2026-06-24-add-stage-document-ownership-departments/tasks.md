## 1. OpenSpec

- [x] 1.1 Create `openspec/changes/add-stage-document-ownership-departments/`
- [x] 1.2 Write `proposal.md`
- [x] 1.3 Write `design.md`
- [x] 1.4 Write `tasks.md`
- [x] 1.5 Add spec deltas for `stage-document-checklist` and `project-core-frontend`
- [x] 1.6 State that this change keeps `v20260610` 54 templates and does not switch to `v20260624`

## 2. Data Structure

- [x] 2.1 Add `ownerDepartment` to stage document templates
- [x] 2.2 Add `reviewDepartment` to stage document templates
- [x] 2.3 Persist `ownerDepartment` and `reviewDepartment` on project-level stage document snapshots
- [x] 2.4 Use existing `BUSINESS_DEPARTMENT` constants for field values and allow null when ownership is not fixed
- [x] 2.5 Add database schema initialization or migration-compatible logic for `owner_department` and `review_department`
- [x] 2.6 Ensure old rows tolerate null fields and can be backfilled from `v20260610` template defaults

## 3. v20260610 Template Mapping

- [x] 3.1 Map marketing-owned `v20260610` items to marketing owner/review departments
- [x] 3.2 Map RD-owned `v20260610` items to RD owner/review departments
- [x] 3.3 Map manufacturing-owned `v20260610` items to manufacturing owner/review departments
- [x] 3.4 Keep project-manager planning/closeout documents nullable for owner/review departments
- [x] 3.5 Conservatively map cost estimation as RD-owned and manufacturing-reviewed

## 4. Backend Interfaces and Permissions

- [x] 4.1 Write owner/review departments when initializing new project stage documents
- [x] 4.2 Return `ownerDepartment` and `reviewDepartment` from stage document checklist APIs
- [x] 4.3 Keep project overview and workbench field compatibility when reading document items
- [x] 4.4 Allow center managers to view documents whose owner/review department matches their department, including unassigned documents
- [x] 4.5 Allow center managers to assign responsible users for documents whose owner department matches their department
- [x] 4.6 Allow center managers to review submitted documents whose review department matches their department
- [x] 4.7 Keep normal employees restricted to their own responsible documents
- [x] 4.8 Keep project managers and general managers existing broad project document visibility
- [x] 4.9 Keep system administrators and general manager assistants excluded from business attachment and review permissions
- [x] 4.10 Ensure attachment visibility follows document visibility while upload remains limited to the responsible user

## 5. Workbench

- [x] 5.1 Generate `document_review` todos from `reviewDepartment`
- [x] 5.2 Keep `document_responsibility` todos limited to the responsible user and `not_submitted` / `returned`
- [x] 5.3 Do not create center-manager todos for unassigned documents

## 6. Frontend

- [x] 6.1 Display owner department and review department names in project detail stage document lists
- [x] 6.2 Use backend permission fields for responsibility assignment and document review buttons
- [x] 6.3 Avoid front-end-only `organizationRole` hard guesses for document operations
- [x] 6.4 Keep normal employee restricted views filtered by backend response
- [x] 6.5 Keep workbench wording as “我的工作台 / 我的待办”

## 7. Verification

- [x] 7.1 Add or update backend tests/smoke coverage for 54 `v20260610` owner/review mappings
- [x] 7.2 Verify center managers can see and assign their center's unassigned documents
- [x] 7.3 Verify center managers cannot assign other centers' documents
- [x] 7.4 Verify normal employees still cannot see others' documents
- [x] 7.5 Verify `document_review` uses `reviewDepartment`
- [x] 7.6 Verify system administrators and general manager assistants do not gain business permissions
- [x] 7.7 Run `cmd /c npm.cmd run check` in `digital-platform-api`
- [x] 7.8 Run `cmd /c npm.cmd run build` in `digital-platform-web`
- [x] 7.9 Run `cmd /c openspec validate add-stage-document-ownership-departments --strict`
- [x] 7.10 Run `cmd /c openspec validate --all --strict`
- [x] 7.11 Run `git status --short`

## 8. Review Follow-up

- [x] 8.1 Add `project-core` spec delta for center-manager project visibility, stage advance, and `stage_advance` todos using owner/review departments
- [x] 8.2 Fix front-end stage advance visibility so responsible-user department is only a fallback when owner/review departments are both empty
- [x] 8.3 Make document applicability management use owner/review center-related scope without broadening submit, review, or attachment upload permissions
- [x] 8.4 Update backend smoke coverage for template version/count, 20260624 exclusion, applicability boundaries, and front-end stage advance ownership helper
- [x] 8.5 Document `012_stage_document_ownership_departments.sql` deployment and post-migration `npm run init-stage-documents`
