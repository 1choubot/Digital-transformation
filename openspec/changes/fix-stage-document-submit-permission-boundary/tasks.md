## 1. OpenSpec

- [x] 1.1 Add proposal, design, tasks, and stage-document-checklist delta for the submit permission boundary.
- [x] 1.2 Validate the new change and full OpenSpec set in strict mode.

## 2. Backend Permission Boundary

- [x] 2.1 Tighten `canSubmitStageDocument` so only the assigned responsible user can submit a stage document.
- [x] 2.2 Confirm returned `canSubmitDocument` fields and direct submit endpoint authorization both use the tightened helper.
- [x] 2.3 Confirm document review permission and `1.2` dedicated multi-node review authorization remain unchanged.

## 3. Smoke Coverage

- [x] 3.1 Extend stage document ownership smoke coverage for unassigned documents and non-responsible PM/general manager/center manager/system admin/general manager assistant users.
- [x] 3.2 Extend smoke coverage for responsible-user submit permission, project-manager-as-responsible submit permission, and non-responsible reviewer review-without-submit behavior.
- [x] 3.3 Record P0-14, P0-15, and P0-17 as not fixed in this change.

## 4. Validation

- [x] 4.1 Run backend check.
- [x] 4.2 Run frontend build.
- [x] 4.3 Run strict OpenSpec validation for this change and all specs.
- [x] 4.4 Review git status and commit the verified fix.
