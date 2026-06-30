## Why

System validation found P0 permission defects where full project/document visibility, project manager identity, general manager identity, center manager identity, or review authority could make `canSubmitDocument` true for documents that the current user did not own. This breaks the confirmed boundary that viewing or reviewing a document is not the same as submitting it.

## What Changes

- Tighten stage document submission authorization so the first version only grants submit permission to the current document responsible user.
- Ensure unassigned documents remain visible to users with view permission but return `canSubmitDocument = false` and reject direct submit API calls.
- Keep attachment upload permission on the existing responsible-user-only boundary.
- Keep document review permission and `1.2 项目立项审批表` dedicated multi-node review authorization unchanged.
- Do not resolve P0-14/P0-15 `1.3` prerequisite sequencing or P0-17 attachment/content completeness rules in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `stage-document-checklist`: Clarify that `canSubmitDocument` is a document responsibility permission and must not be inferred from full view, project manager, general manager, center manager, or review authority.

## Impact

- Backend: stage document submit permission helper, returned document permission fields, and submit endpoint authorization.
- Frontend: no role-based hardcoding is planned; existing buttons continue to follow backend `canSubmitDocument`.
- Tests/smoke: extend stage document ownership checks for unassigned documents, non-responsible management/view roles, responsible users, and reviewers.
- No database migration and no real data mutation are planned beyond test setup/teardown performed by smoke scripts.
