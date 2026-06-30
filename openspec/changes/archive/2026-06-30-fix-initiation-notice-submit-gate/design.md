## Context

The formal specs already require project code filling and stage advance to wait for `1.2` final multi-node approval and no uncleared `1.1` rework triggered by `1.2`. P0-14/P0-15 show that the `1.3 项目立项通知` document completion path does not yet apply the same prerequisite gate, so `1.3` can become complete too early.

## Goals / Non-Goals

**Goals:**
- Gate ordinary `1.3` submit on final `1.2` multi-node approval.
- Gate ordinary `1.3` submit on absence of uncleared `1.1 revision_required` caused by `1.2`.
- Apply the same gate to attachment upload if upload can cause `1.3` `submit_only` completion.
- Provide stable backend error semantics with blocking details.

**Non-Goals:**
- Do not decide whether `1.2` ordinary document submission must rerun after a node return and `1.1` rework.
- Do not handle P0-17.
- Do not change `1.2` node state transitions, project code gate, stage advance gate, file platform integration, notification, reports, or UI structure.

## Decisions

- Add or reuse a backend helper such as `assertInitiationNoticeSubmitGateReady({ connection, projectId })`.
- Invoke the helper in the ordinary `1.3` submit path before applying the status transition.
- Inspect the attachment upload path for `1.3`. If upload can make `1.3` reach the `submit_only` completion point, invoke the same helper before persisting that completion effect.
- Use a stable error code, for example `INITIATION_NOTICE_GATE_NOT_READY`, and include structured `details` identifying blockers such as `1.2` not finally approved and `1.1` rework not cleared.
- Keep the helper specific to `1.3 项目立项通知`; do not generalize into a workflow engine.

## Risks / Trade-offs

- If upload currently does not alter document status, adding a gate there may be unnecessary. Mitigation: implementation task 2.3 explicitly requires checking the upload behavior before adding the gate.
- If `1.2` node state names evolve, the helper could duplicate final-completion logic. Mitigation: prefer reusing existing `1.2` final-completion helpers or repository queries if available.
- Returning detailed blockers may expose internal state names. Mitigation: details should identify business blockers (`1.2`, `1.1`) without leaking implementation-only fields beyond existing API conventions.
