## Why

System validation P0-14/P0-15 found that `1.3 项目立项通知` can be submitted before `1.2 项目立项审批表` reaches final multi-node approval, and can still be submitted while `1.1 项目需求表` has uncleared `revision_required` triggered by `1.2` return. This allows the initiation notice completion point to bypass the same initiation prerequisites already required by project code and stage advance gates.

## What Changes

- Add a submit gate for `1.3 项目立项通知` so ordinary document submit requires `1.2 项目立项审批表` business review, technical review, and general manager review to be finally approved.
- Add the same submit gate so `1.3` submit requires `1.1 项目需求表` to have no uncleared `revision_required` triggered by `1.2`.
- Apply the same gate if attachment upload can make `1.3` reach the `submit_only` completion point.
- Return a stable failure code such as `INITIATION_NOTICE_GATE_NOT_READY` with blocking details for `1.2` and `1.1`.

## Non-Goals

- Do not change whether a `1.2` node return requires the ordinary `1.2` document to be resubmitted after `1.1` rework is cleared.
- Do not handle P0-17 attachment/content completeness rules.
- Do not implement file platform integration, notifications, daily/weekly reports, or UI redesign.
- Do not change project code gates, stage advance gates, or the `1.2` dedicated multi-node approval state machine.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `stage-document-checklist`: Add the `1.3 项目立项通知` submit prerequisite gate and define its blocking conditions.

## Impact

- Planning impact only in this change.
- Future backend implementation will affect ordinary stage document submit handling and any upload path that completes `1.3`.
- Future smoke coverage should extend the P0 gate matrix for `1.3` submit/upload behavior.
- No database migration is planned by this proposal.
