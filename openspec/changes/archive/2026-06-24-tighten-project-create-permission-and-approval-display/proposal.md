## Why

Recent functional testing exposed three real usability and permission issues: project detail pages show users as a dense `name / department / organizationRole / role` string that is hard to understand, project creation is currently available to every authenticated user, and the UI wording makes it too easy to confuse document-level review with stage gate approval.

This change tightens the project creation boundary and clarifies approval-related presentation before adding any larger workflow features.

## What Changes

- Restrict project creation to `general_manager` and `center_manager`.
- Reject project creation by `employee`, `general_manager_assistant`, and `system_admin` in the backend with `FORBIDDEN_OPERATION` and HTTP 403.
- Keep successful project creation behavior unchanged: create the project, initialize the standard 8 stages, initialize the v20260610 54 document checklist, and write `project.created`.
- Require failed project creation to leave no project, stage, document, or business log side effects.
- Define a clearer user display format for ordinary business pages: primary text is the user name; auxiliary text is department and job title.
- Limit `organizationRole` display to user management, permission explanations, and explicit approval-role contexts.
- Clarify UI wording between document-level review and stage gate approval.
- Clarify that uploading an attachment does not submit a document for review.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: tighten backend project creation permission and no-side-effect requirements.
- `project-core-frontend`: hide or block project creation for users without permission and improve user/approval display wording.
- `stage-document-checklist`: clarify document-level review, attachment behavior, and its relationship to stage gate approval.

## Impact

- Backend API: `POST /api/projects` permission check.
- Frontend pages: project list/create/detail, project overview, approval history, document checklist wording, user display helpers.
- Specs only in this change; no business code, database migration, seed data, OpenSpec apply, or archive is performed.
