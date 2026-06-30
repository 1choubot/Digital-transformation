## Context

`canSubmitStageDocument` currently grants submit permission to general managers, project managers, and center managers by department in addition to the assigned document responsible user. `buildStageDocumentPermissions` and the submit endpoint both consume that helper, so the over-broad helper causes both incorrect button visibility and direct API authorization defects.

## Goals / Non-Goals

**Goals:**
- Make `canSubmitDocument` true only when the current user is the assigned responsible user for that document.
- Keep unassigned documents visible where view rules allow them, while making submit/upload completion unavailable.
- Keep document review authority independent from submit authority.
- Keep `1.2` dedicated multi-node approval behavior outside this permission helper change.

**Non-Goals:**
- Do not decide whether `1.3 项目立项通知` must wait for `1.2` final approval.
- Do not decide whether a responsible user may submit without attachment or online content.
- Do not add file platform integration, notification, daily/weekly report, or UI redesign work.

## Decisions

- Centralize the fix in `canSubmitStageDocument`. This keeps returned permission fields and the submit API consistent because both already call the helper.
- Do not add frontend role checks. The project detail page already uses backend `canSubmitDocument`, so the frontend should naturally hide submit actions once backend permissions are corrected.
- Leave `canReviewStageDocument` and `isStageDocumentReviewAuthority` unchanged. Reviewers may still review already-submitted review-required documents, but review authority does not create submit authority.
- Leave upload authorization unchanged. `canUploadStageDocumentAttachment` already requires the current user to be the responsible user.

## Risks / Trade-offs

- Existing tests may have encoded the old management submit behavior. Mitigation: update smoke expectations to the clarified spec boundary.
- A project manager who is also the assigned responsible user must still be able to submit. Mitigation: the helper checks assigned responsible user ID, not role exclusion.
- Unassigned documents with full visibility must remain visible. Mitigation: only submit permission is narrowed; view helpers are not changed.
