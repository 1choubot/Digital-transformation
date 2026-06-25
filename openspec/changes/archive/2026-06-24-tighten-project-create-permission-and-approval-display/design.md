## Context

The platform now has organization roles, department rules, project managers, responsibility assignment, stage document status, stage gate approval, and project visibility. Testing with the initialized development dataset surfaced three gaps that are small but important before further workflow work:

1. Ordinary business pages show too many user identity fields together, such as `研发工程师一 / 研发中心 / 员工 / 研发工程师`.
2. `POST /api/projects` only requires login, so employees, the general manager assistant, and system admins can create business projects.
3. Project detail wording does not clearly distinguish document-level review from stage gate approval.

## Goals / Non-Goals

**Goals:**

- Make project creation a backend-enforced business permission.
- Keep the first allowed project creators narrow: general manager and center managers.
- Make user display readable on ordinary business pages.
- Clarify document-level review and stage gate approval in specs and UI wording.
- Preserve current project creation success side effects for allowed users.

**Non-Goals:**

- Do not add a new approval table, workflow engine, or permission matrix.
- Do not change project visibility rules.
- Do not change project manager assignment rules.
- Do not change stage document state machine values.
- Do not change attachment storage or file platform integration.
- Do not modify mock data.

## Decisions

### 1. Project Creation Permission

Project creation is a business operation, not a generic authenticated action.

Allowed creators:

1. `organizationRole = general_manager`
2. `organizationRole = center_manager`

Forbidden creators:

1. `organizationRole = employee`
2. `organizationRole = general_manager_assistant`
3. `organizationRole = system_admin`

The backend must enforce this before inserting any project row or starting project side effects. Forbidden creation must return `FORBIDDEN_OPERATION` with HTTP 403.

Rationale: the general manager has global business authority, and center managers represent department-level business ownership. Employees can be project managers or document responsible users but should not create new projects by default. The general manager assistant is read-only/summary-oriented. The system administrator manages system configuration and accounts, not business project creation.

### 2. Frontend Creation Entry Is Advisory

The frontend should hide the create-project entry for users without permission and block submission if they navigate directly to the create page. This is only a user-experience guard. The backend remains the authority.

Rationale: direct API calls and stale frontend state must still be rejected safely.

### 3. User Display Format

`organizationRole` is the system permission role. `role` is the job/title display text.

Ordinary business pages must not concatenate `name / department / organizationRole / role` as one user label. Recommended display:

1. Primary text: user name.
2. Auxiliary text: department + job/title.

Examples:

1. Project manager: `研发工程师一（研发中心 · 研发工程师）`
2. Creator: `营销中心负责人（营销中心 · 营销中心负责人）`

`organizationRole` should only be shown in:

1. User management.
2. Permission explanations.
3. Necessary approval-role contexts, such as approval history showing `项目经理`、`中心负责人` or `总经理`.

Rationale: users need to identify people by name, department, and job. System permission roles are useful for administration and audit, but noisy and confusing in ordinary workflow views.

### 4. Document-Level Review vs Stage Gate Approval

Document-level review and stage gate approval are separate concepts:

1. Document-level review object: a single stage document item.
2. Stage gate approval object: the whole current project stage.
3. Attachment upload is only file preparation and does not submit the document for review.
4. A responsible user uploads or prepares attachments, then submits the document item for review.
5. An authorized reviewer confirms or returns that document item.
6. The stage completeness summary counts applicable required document items whose status is `confirmed`.
7. Only after the current stage applicable required documents are all confirmed can the project manager submit stage gate approval.
8. Stage gate approval is the gate before stage advancement and does not replace document-level review.

Rationale: users need to understand that files can be uploaded before review, individual documents are reviewed first, and the stage is approved only after the stage is complete.

## Risks / Trade-offs

- [Risk] Existing frontend links may still let forbidden users open the create page. -> Mitigation: page must display a no-permission state and disable submission; backend returns `FORBIDDEN_OPERATION`.
- [Risk] Some business users may expect project managers to create projects. -> Mitigation: keep first version narrow and revisit with a later change if the organization wants project managers to create projects.
- [Risk] Removing organization-role text from ordinary user labels could hide useful audit context. -> Mitigation: keep approval role labels in approval history and keep organization role visible in user management.
