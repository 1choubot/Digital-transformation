# Change: add-initiation-multi-review-flow-v1

## Summary

Plan a dedicated multi-node approval flow for `1.2 项目立项审批表`, so initiation completion, stage advancement and project-code generation no longer rely on a single ordinary `approval_required` confirmation.

## Problem

The current baseline treats `1.2 项目立项审批表` as an ordinary `approval_required` stage document. A single reviewer, such as a marketing center manager or another center manager, may confirm the document and cause `1.2` to be treated as complete. That can incorrectly satisfy the stage-1 advancement gate and the deferred project-code gate.

The 20260625 process requires a multi-node initiation approval path: business evaluation approval, technical evaluation approval and general manager approval. The current single-document confirmation model does not represent those nodes.

## Goals

- Make `1.2 项目立项审批表` a special multi-node approval document.
- Require all planned initiation review nodes to pass before `1.2` is considered complete.
- Keep `1.2` inside the existing 64 stage-document template and existing `approval_required` count.
- Integrate with the archived precise rework rules: `1.2` approval NO returns to fixed candidate `1.1 项目需求表`.
- Ensure stage-1 advancement and deferred project-code generation wait for final multi-node approval, not a single node approval.
- Plan workbench tasks for the exact initiation review node assignees only.
- Plan structured business operation logs for each node action.

## Non-Goals

- Do not implement backend or frontend code in this planning change.
- Do not change the database or create/run migrations in this planning change.
- Do not restore file platform integration.
- Do not handle daily reports or weekly reports.
- Do not handle user management.
- Do not implement push notifications.
- Do not implement a generic approval-flow engine.
- Do not change the 64-document template count.
- Do not change overall `completionMode` counts: `submit_only 33`, `approval_required 24`, `conditional_submit 7`, `conditional_approval 0`.
- Do not change the full-view permissions for center managers, general manager assistants or other full-view roles.
- Do not relax cross-center document operation permissions.

## Proposed Scope

This change plans:

- Dedicated `1.2` initiation review nodes:
  - Business evaluation approval.
  - Technical evaluation approval.
  - General manager approval.
- Confirmed business rules:
  - Ordinary `1.2` document submit/upload remains the trigger that activates initiation review nodes.
  - `business_review` and `technical_review` become actionable only after `1.2 status = submitted`, or legacy `confirmed` as a compatibility signal that the document was already submitted.
  - `not_submitted` and `returned` `1.2` documents may have pre-created nodes, but they must not generate business or technical approval workbench tasks until ordinary document submission or resubmission.
  - `business_review` and `technical_review` run in parallel.
  - `business_review` reviewer is fixed to the marketing center manager.
  - `technical_review` reviewer is fixed to the R&D center manager.
  - `general_review` is created or enters the workbench only after both `business_review` and `technical_review` are `approved`.
  - Returned node and downstream nodes must rerun; the approved result of the other parallel branch MUST be retained.
  - If `general_review` has been generated or approved and a business/technical node is returned, `general_review` must be invalidated and rerun.
- Derived completion logic:
  - `1.2` is complete only when all required nodes pass, `1.1` has no outstanding `revision_required` triggered by `1.2`, and `1.2` itself has no blocking node/base/special state.
  - Single-node confirmation cannot complete `1.2`.
- Project-code gate:
  - Requires `1.2` final multi-node approval, `1.3` submitted/uploaded, no outstanding `1.1` rework triggered by `1.2`, and valid business project-code maintenance permission.
- Workbench:
  - Business review task only for the marketing center manager.
  - Technical review task only for the R&D center manager.
  - General review task only for the general manager, and only after business and technical approvals both pass.
  - No generic `stage_gate_approval` task.
- Frontend:
  - Show `1.2` node states, reviewer/role, comments/reasons and timestamps.
  - Show approve/return actions only for the current user's actionable node.
  - Do not present the flow as generic stage-gate approval.
- Logs:
  - Add structured initiation review actions such as `initiation_review.business_approved`, `initiation_review.technical_returned` and `initiation_review.completed`.

## Baseline

This plan assumes the archived 20260625 online platform internal document flow, archived precise stage-document rework, and archived project visibility/audit access changes are already part of the formal specs.

`1.2` precise rework remains fixed:

- Approval NO returns to `1.1`.
- No whole-stage return.
- No automatic return of all previous documents.
- Return reason is required.
- Selected upstream document `1.1` enters `revision_required`.
- `1.2` itself is not a rework target and must not be marked `revision_required`; its blocking state is represented by node status, base status or dedicated multi-node state.
- Outstanding `1.1 revision_required` blocks final completion.

## Expected Outcome

After this change is implemented in a future implementation pass:

- `1.2` cannot be completed by one center manager confirmation.
- Stage 1 cannot advance until `1.2` marketing-center business review, R&D-center technical review and general manager approvals are complete, `1.3` is submitted, and no relevant rework remains.
- Project code cannot be filled until the same initiation gate passes.
- Workbench tasks target only the exact reviewers for the active `1.2` node.
- Business logs show each node action and final initiation-review completion.
