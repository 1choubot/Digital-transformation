## 1. Backend Schema and Domain

- [x] 1.0 Confirm detailed design workflow state and DTO are the authoritative stage 4 execution source before any ordinary checklist implementation work.
- [x] 1.1 Add formal migrations for detailed design workflow tables.
- [x] 1.2 Add schema ensure matching the formal migrations.
- [x] 1.3 Add detailed design workflow domain constants for stage, nodes, upload slots, roles, statuses, errors, and permission helpers.
- [x] 1.4 Define 7.20 detailed design document baseline mapping and v20260629 compatibility handling.
- [x] 1.5 Confirm the change does not create a new v20260720 ordinary document template and keeps the current ordinary document count and initialization mechanism unchanged.

## 2. Backend Repository and DTO

- [x] 2.1 Implement workflow initialization when projects enter or have reached `detailedDesign`.
- [x] 2.2 Implement workflow query and DTO builder for nodes, roles, upload slots, review forms, drawing review state, permissions, blocking reasons, and isProjectEnded.
- [x] 2.3 Implement role assignment for project manager, business owner, technical owner, procurement owner, finance accountant, drawing review owner, and professional group members.
- [x] 2.4 Implement ended-project write protection and node activation guards.
- [x] 2.5 Implement current file, revision, replacement, and download helpers.
- [x] 2.6 Enforce ordinary document API boundaries so detailed design workflow-owned main-process documents cannot be completed through ordinary cards.

## 3. Uploads and Review Forms

- [x] 3.1 Implement project kickoff book upload by manufacturing center manager.
- [x] 3.2 Implement detailed design work plan upload by project manager.
- [x] 3.3 Implement 8 detailed design file uploads by technical owner, including documents, archives, engineering files, source code, and program packages.
- [x] 3.4 Implement product plan drawing upload by technical owner.
- [x] 3.5 Implement parts list upload by technical owner.
- [x] 3.6 Implement customer countersigned drawing scan upload by business owner.
- [x] 3.7 Implement internal design review online form save, submit, generated file creation, download, approval, and return.
- [x] 3.8 Implement customer design review online form save, submit, generated file creation, download, approval, and return.
- [x] 3.9 Read and analyze `D:\Digital transformation\智能制造项目管理文件模板\设计评审记录表-模板.xlsx` to derive internal/customer design review form schema, required fields, generated-file mapping, and template placeholder rules.

## 4. Drawing Review

- [x] 4.1 Implement drawing review record upload with retained history.
- [x] 4.2 Implement drawing review owner downloads for current product plan drawing and current parts list.
- [x] 4.3 Implement drawing review owner no-issue pass.
- [x] 4.4 Implement drawing review owner return that requires an uploaded drawing review record.
- [x] 4.5 Implement rework reset from drawing review return back to product plan drawing.
- [x] 4.6 Implement research and development center manager drawing review approval and return.
- [x] 4.7 Implement conditional download behavior for drawing review records based on whether history exists.
- [x] 4.8 Implement C31 compatibility-only handling and C40 conditional history rules for detailed design checklist display.

## 5. Stage Integration

- [x] 5.1 Integrate detailed design workflow into workspace repository.
- [x] 5.2 Integrate detailed design workflow into navigation service.
- [x] 5.3 Remove old detailed design blue modules as stage 4 main process nodes when workflow DTO exists.
- [x] 5.4 Add detailed design stage gate to manual and automatic stage advance.
- [x] 5.5 Ensure customer drawing countersign completion auto-advances to existing stage key `manufacturing`.
- [x] 5.6 Integrate detailed design derived completion into ordinary stage document checklist boundary.
- [x] 5.7 Implement revision reset and resubmission semantics for design review returns and drawing review rework.
- [x] 5.8 Fix design review return node reset, revision gating, and old file/form exclusion from current revision.

## 6. Workbench and Operation Logs

- [x] 6.1 Add detailed design workflow workbench todo type.
- [x] 6.2 Generate detailed design workbench todos directly from DTO permissions.
- [x] 6.3 Add operation log action types for detailed design workflow actions.
- [x] 6.4 Record logs for role assignment, uploads, design review forms, approvals, returns, drawing review, customer countersign, and automatic advance.
- [x] 6.5 Add frontend operation log Chinese mappings.
- [x] 6.6 Ensure ordinary checklist and compatibility views expose only derived completion and traceability log semantics.
- [x] 6.7 Exclude detailed design workflow-owned documents from ordinary workbench responsibility/review selectors.

## 7. API Routes and Error Handling

- [x] 7.1 Add detailed design workflow read route.
- [x] 7.2 Add role assignment route.
- [x] 7.3 Add upload and download routes.
- [x] 7.4 Add review form and generated file routes.
- [x] 7.5 Add drawing review record and action routes.
- [x] 7.6 Add customer countersign upload route.
- [x] 7.7 Add detailed design workflow error handling middleware mapping.

## 8. Frontend

- [x] 8.1 Add detailed design workflow API client functions.
- [x] 8.2 Add detailed design workflow composable.
- [x] 8.3 Add detailed design node layout.
- [x] 8.4 Add project kickoff meeting page.
- [x] 8.5 Add detailed design preparation page.
- [x] 8.6 Add detailed design files page.
- [x] 8.7 Add internal and customer design review pages.
- [x] 8.8 Add product plan drawing and parts list pages.
- [x] 8.9 Add drawing review page with checker and RD approval substates.
- [x] 8.10 Add customer drawing countersign page and refresh current stage after auto advance.
- [x] 8.11 Update node page route mapping for all detailed design workflow node keys.
- [x] 8.12 Update workbench page display for `detailed_design_workflow`.

## 9. Tests

- [x] 9.1 Add backend tests for initialization and 9-node navigation.
- [x] 9.2 Add backend tests for role assignment and wrong-role write rejection.
- [x] 9.3 Add backend tests for project kickoff book upload.
- [x] 9.4 Add backend tests for detailed design 8-file completeness and file type acceptance.
- [x] 9.5 Add backend tests for internal and customer design review form generation, approval, and return.
- [x] 9.6 Add backend tests for drawing review no-issue pass.
- [x] 9.7 Add backend tests for drawing review return requiring uploaded record.
- [x] 9.8 Add backend tests for drawing review history retained across rework.
- [x] 9.9 Add backend tests for RD approval download rules and return to product plan drawing.
- [x] 9.10 Add backend tests for customer countersign automatic advance to `manufacturing`.
- [x] 9.11 Add backend tests for stage gate and workbench todos.
- [x] 9.12 Add backend tests for 7.20 baseline compatibility and no old/new double entry.
- [x] 9.13 Add frontend tests for route/page rendering and permission-based buttons where feasible.
- [x] 9.14 Add integration tests for normal full flow automatic progression.
- [x] 9.15 Add tests that C31 does not block detailed design workflow completion or stage advance.
- [x] 9.16 Add tests that C40 without issue and without history does not block stage advance.
- [x] 9.17 Add tests that C40 issue return is rejected until the record is uploaded.
- [x] 9.18 Add tests that C40 history is retained and downloadable.
- [x] 9.19 Add tests that design review return opens a new revision and requires resubmission before downstream approval.
- [x] 9.20 Add tests that drawing review return opens a new revision and requires resubmission before downstream approval.
- [x] 9.21 Add tests that ordinary document write APIs cannot bypass detailed design workflow.
- [x] 9.22 Add tests that ordinary checklist views show only compatibility, archive, derived completion, and traceability states.
- [x] 9.23 Add tests that design review template fields map correctly from `设计评审记录表-模板.xlsx`.

## 10. Documentation and Validation

- [x] 10.1 Update implementation notes for 7.20 detailed design baseline migration.
- [x] 10.2 Run backend detailed design workflow tests.
- [x] 10.3 Run solution design and contract signing regression tests.
- [x] 10.4 Run frontend check/build.
- [x] 10.5 Run `openspec validate add-detailed-design-workflow-v1 --strict`.
- [x] 10.6 Run `openspec validate --all --strict`.
- [x] 10.7 Run `git diff --check`.

## 11. Upload Submit Split and Review Form Refinement

- [x] 11.1 Update OpenSpec docs so upload actions save/replace files only and explicit node submit actions drive workflow progression.
- [x] 11.2 Add backend schema, migration, DTO, permissions, API, logs, and tests for 8-file no-upload marking on detailed design slots only.
- [x] 11.3 Split detailed design upload behavior from node submission for project kickoff, preparation, detailed design, product plan drawing, parts list, and customer countersign.
- [x] 11.4 Add backend submit API and guards for upload-class detailed design nodes, including C38/C39 joined current-file checks and C41 submit-triggered automatic advance.
- [x] 11.5 Update workbench, navigation, stage gate, and ordinary checklist derived states so uploaded-but-unsubmitted nodes remain current todos and incomplete derived outputs.
- [x] 11.6 Update frontend detailed design upload pages with explicit submit node action, no-upload controls for C27-C30/C32-C35, and compact upload list display.
- [x] 11.7 Change detailed design review form interaction and payload/generation to the target/risk/suggestion matrix with per-item implementation plans.
- [x] 11.8 Add backend and frontend tests for upload-without-advance, submit-only advance, no-upload toggles, C38/C39 true progression, C41 submit advance, and review form matrix behavior.
- [x] 11.9 Run detailed design workflow tests, API check, web check, OpenSpec validation, and `git diff --check` after this adjustment.
- [x] 11.10 Add the detailed design preparation page submit-node action after work plan upload.
- [x] 11.11 Adjust C38/C39 drawing rework submission, blocking reasons, drawing review input traceability, and checklist derived completion to require current files rather than file revision >= node revision.
- [x] 11.12 Add backend and frontend regression tests for the preparation submit button and C38/C39 rework submit rules, then rerun validation.
- [x] 11.13 Fix detailed design review generated implementation plans so generated files include only plan content, not repeated target/risk/suggestion source text.
- [x] 11.14 Fix C41 customer countersign submit readiness after drawing rework revisions so current uploaded scan can be submitted even when file revision is lower than node revision.
- [x] 11.15 Add DTO/frontend submit-button visibility for upload-class nodes so responsible users see a disabled submit action with backend blocking reasons until canSubmit is true.
- [x] 11.16 Add backend/frontend regression tests and rerun detailed design, API, web, OpenSpec, and diff validation for the manual acceptance fixes.
