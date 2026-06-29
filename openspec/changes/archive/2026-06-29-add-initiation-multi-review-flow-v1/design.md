# Design: add-initiation-multi-review-flow-v1

## Current Baseline

The current formal baseline is the 20260625 online platform internal document loop:

- 8 project stages.
- 64 ordinary stage documents.
- `completionMode` counts remain `submit_only 33`, `approval_required 24`, `conditional_submit 7`, `conditional_approval 0`.
- Attachments are saved in the online platform.
- File platform integration remains paused.
- Precise rework is available and `1.2` has fixed A-class candidate `1.1`.
- Project visibility was widened for viewing, but business operation permissions were not widened.

## Current Gap

`1.2 项目立项审批表` is still represented as a normal `approval_required` document. That means the ordinary status `confirmed` can be reached by one document-level review. For `1.2`, this is insufficient because the process requires business evaluation, technical evaluation and general manager approval.

The implementation must not treat a single reviewer confirmation as final `1.2` completion.

## Dedicated Flow

`1.2` should use a dedicated initiation review model instead of a generic workflow engine.

Recommended node keys:

- `business_review`
- `technical_review`
- `general_review`

Confirmed node ownership:

- Business evaluation approval: marketing center manager.
- Technical evaluation approval: R&D center manager.
- General manager approval: general manager.

Confirmed node ordering:

- `1.2` ordinary document submit/upload remains the entry action for starting the initiation review flow.
- `business_review` and `technical_review` become actionable in parallel only after the `1.2` base document status reaches `submitted`, or `confirmed` for legacy compatibility.
- When `1.2 status = not_submitted`, the three nodes may be pre-created, but `business_review` and `technical_review` must wait for document submission and must not appear in reviewer workbenches.
- When `1.2 status = returned`, the three nodes may remain, but approval must wait for the ordinary `1.2` document to be submitted again.
- `general_review` remains `not_started` or waiting for prerequisites until both `business_review` and `technical_review` are `approved`.
- After both parallel nodes are `approved`, `general_review` enters `pending` and appears in the general manager's workbench.
- After `general_review` is `approved`, `1.2` is finally approved if no related rework remains.

## Data Model Direction

Future implementation should add `project_initiation_review_nodes` or an equivalent dedicated structure.

Future migration or idempotent initialization must create three review nodes for every existing project that has an applicable `1.2 项目立项审批表`:

- `business_review`
- `technical_review`
- `general_review`

Existing projects must initialize node states according to the current `1.2` base document status:

- `not_submitted`: nodes exist, but `business_review` and `technical_review` wait for document submission and must not create approval workbench tasks; `general_review` remains `not_started` or waiting for prerequisites.
- `submitted`: `business_review` and `technical_review` initialize as pending/actionable; `general_review` remains `not_started` or waiting for prerequisites.
- legacy `confirmed`: treat as a compatibility signal that the document was already submitted, so `business_review` and `technical_review` initialize as pending/actionable and `general_review` remains waiting; this must not be treated as final multi-node approval.
- `returned`: nodes exist but wait for the ordinary `1.2` document to be submitted again; no business or technical approval workbench task is generated.

Existing ordinary `1.2 status = confirmed` must not bypass the new stage-advance or project-code gates.

Suggested fields:

- `id`
- `project_id`
- `stage_document_id`
- `node_key`
- `node_status`
- `reviewer_user_id`
- `reviewer_role`
- `comment`
- `return_reason`
- `submitted_by_user_id`
- `submitted_at`
- `reviewed_by_user_id`
- `reviewed_at`
- `created_at`
- `updated_at`

`node_status` should use explicit review-state values. The first version should at least support:

- `waiting_document_submission`: a node exists but ordinary `1.2` document submission or resubmission has not activated it.
- `pending`: the node is waiting for the configured reviewer to approve or return it.
- `approved`: the configured reviewer approved the node.
- `returned_blocked_by_rework`: the node was returned and linked `1.1 revision_required` has not been cleared.
- `not_started` or `waiting_prerequisite`: the node, especially `general_review`, is waiting for prerequisite nodes.
- `invalidated`: optional, for a generated or approved `general_review` that is reset after a business or technical return.

`submitted_by_user_id` and `submitted_at`, if kept, are trace fields for ordinary `1.2` document submission activating the multi-node flow. `submitted` must not be used as a node status that requires a frontend node-submit button before approval can continue.

`project_stage_documents.status` remains the base document state. For `1.2`, derived completion combines:

- base document applicability and status,
- all initiation review node states,
- precise rework state,
- `1.1 revision_required` when it was triggered by `1.2` NO.

`1.2` may keep `completionMode = approval_required` to preserve template statistics, but its completion derivation is special.

## State Rules

For `1.2`:

- Ordinary `1.2` document submit/upload is still required and acts as the trigger that activates initiation review nodes.
- The first version does not introduce a dedicated node-submit frontend button; `initiation_review.submitted`, if used, means the ordinary `1.2` document submission activated or initialized the multi-node review.
- If `1.2 status = not_submitted`, review nodes must not be approvable.
- If `1.2 status = returned`, review nodes must wait for the ordinary `1.2` document to be submitted again.
- Legacy `1.2 status = confirmed` must be treated as “document was submitted before” for node activation, but it is not final multi-node approval.
- Single document confirmation is not enough.
- Each required node must be approved.
- Any pending, returned or not-yet-started required node makes `1.2` incomplete.
- Any outstanding `1.1 revision_required` triggered by `1.2` NO makes `1.2` incomplete.
- `1.2` itself must not be marked `revision_required`; its own blocking state is represented by node status, base status or dedicated multi-node state.
- Final approval may set or leave `project_stage_documents.status = confirmed`, but the derived completion must still be based on node completion and rework clearance.

For returns:

- The returning node must require a non-empty return reason.
- `1.2` NO must reuse A-class precise rework candidate `1.1`.
- The system must not return the whole stage.
- The system must not automatically return all previous documents.
- The system must not set upstream `1.1` base status to `returned`; it must set `revision_required` using the existing precise-rework fields.
- The system must not set `1.2 revision_required`; the returned node or dedicated initiation review state blocks `1.2` completion.
- `business_review returned`: `business_review` becomes returned/blocking until the linked `1.1` rework is cleared; an already approved `technical_review` MUST remain approved; `general_review` must be invalidated, cleared or moved back to `not_started`.
- `technical_review returned`: `technical_review` becomes returned/blocking until the linked `1.1` rework is cleared; an already approved `business_review` MUST remain approved; `general_review` must be invalidated, cleared or moved back to `not_started`.
- `general_review returned`: `general_review` becomes returned/blocking until the linked `1.1` rework is cleared; already approved `business_review` and `technical_review` MUST remain approved.
- Any returned `1.2` node marks only `1.1 revision_required = true`; it must not mark `1.2 revision_required`.
- Before the `1.1 revision_required` caused by the return is cleared, the returned `1.2` node must not be approved.
- After `1.1` rework is cleared, the backend must automatically move the returned `1.2` node back to pending/actionable state for the corresponding node reviewer.
- The first version must not add a separate manual `1.2` rework-submission button and must not add a separate manual rework-submission workbench task.
- `1.2` final completion can resume only after the returned node and all downstream nodes satisfy their confirmed approval rules again.

## Stage Gate Integration

Stage 1 advancement must continue to evaluate all applicable current-stage documents by `completionMode` and `revision_required`.

Additional `1.2` rule:

- `1.2` is considered complete only after all required initiation review nodes pass and related rework is clear.
- Business-only approval or technical-only approval must not satisfy the stage gate.
- General manager approval alone must not satisfy the stage gate if business or technical review is incomplete.

`1.3 项目立项通知` remains `submit_only` and is complete after submit/upload according to current rules.

## Project Code Gate

The deferred `projectCode` update gate should become:

- `1.2` final initiation multi-node approval complete.
- `1.3` submitted/uploaded complete.
- No outstanding `1.1 revision_required` triggered by `1.2`.
- No blocking `1.2` node/base/special state remains.
- Existing business project-code maintenance permission remains required; system administrator platform-maintenance identity alone must not grant project-code update permission.

The gate must reject requests after only business approval or only technical approval.

## Workbench

Workbench should expose initiation review tasks only to users who can act on the current node:

- Business review task only for the marketing center manager.
- Technical review task only for the R&D center manager.
- General review task only for the general manager.
- Business and technical review tasks must not appear while `1.2 status = not_submitted` or `returned`.
- Business and technical review tasks appear in parallel after ordinary `1.2` document submission, or after legacy `confirmed` initialization.
- General review task must not appear before both business and technical review are `approved`.

The workbench must not:

- send tasks to every center manager,
- create or restore generic `stage_gate_approval` tasks,
- create push notifications,
- relax document responsibility or review permissions.

## Frontend

Project detail should show a dedicated `1.2` initiation review panel or equivalent section on the `1.2` document card:

- Node name.
- Node status.
- Reviewer or reviewer role.
- Comment or return reason.
- Reviewed/submitted timestamp.
- Overall `1.2` final completion status.
- Rework blocking reason if `1.1` has outstanding `revision_required`.

Action buttons:

- Show approve/return only for the current user's actionable node.
- Do not show all node actions to center managers merely because they can view all projects.
- Do not display this as a generic stage-gate approval flow.
- Stage advancement and project-code controls must continue to rely on backend permission fields and gate results.

## Logs

Initiation review node actions need structured business operation logs.

Suggested `action_type` values:

- `initiation_review.submitted`
- `initiation_review.business_approved`
- `initiation_review.business_returned`
- `initiation_review.technical_approved`
- `initiation_review.technical_returned`
- `initiation_review.general_approved`
- `initiation_review.general_returned`
- `initiation_review.completed`

`initiation_review.submitted`, if kept, represents ordinary `1.2` document submission starting or activating the multi-node initiation review. It must not imply a new frontend node-submit button or a separate node-submit workflow.

Each log should include:

- project id,
- `1.2` stage document id/code/name,
- node key and node name,
- previous and next node status,
- actor user id,
- comment or return reason,
- operation timestamp,
- linked precise-rework source/target context when a return marks `1.1 revision_required`.
- invalidated node context when a business or technical return invalidates a generated or approved `general_review`.
- retained parallel-node context when a business or technical return preserves the already approved other parallel node, or when a general return preserves both already approved parallel nodes.

Node state changes, precise rework field changes and logs must be committed transactionally.

## Architecture Boundaries

This change must not:

- reuse the legacy stage approval flow as the main path for `1.2`,
- introduce BPM, visual workflow configuration, or a generic approval engine,
- restore file platform integration,
- call file platform APIs,
- change document template count or `completionMode` statistics,
- change center-manager full viewing permissions,
- relax cross-center submit/review/return/rework/responsibility/applicability/attachment/stage-advance/project-code permissions,
- implement daily reports, weekly reports, user management or push notifications.
