## Verification Record

Change: `fix-stage-document-submit-permission-boundary`

## Fixed Scope

- P0-16: Unassigned stage documents no longer return submit permission for project managers, general managers, center managers, system administrators, general manager assistants, or other non-responsible users; direct submit calls are rejected with `FORBIDDEN_OPERATION`.
- P0-18: Review authority, management/view authority, and full project/document visibility no longer imply stage document submit permission.

## Not Fixed In This Change

- P0-14: Whether `1.3 项目立项通知` must wait for `1.2 项目立项审批表` final multi-node approval remains pending business confirmation.
- P0-15: The related `1.3` prerequisite sequencing behavior remains pending business confirmation.
- P0-17: Whether a responsible user may submit without attachment or online content remains pending business confirmation.

## Permission Matrix Covered

- Unassigned `1.1`: project manager, general manager, center manager, system administrator, and general manager assistant all have `canSubmitDocument = false` and direct submit is forbidden.
- Assigned `2.2`: responsible user has `canSubmitDocument = true`.
- Non-responsible reviewer: center manager has `canReviewDocument = true` for an already submitted review-required document but `canSubmitDocument = false` and cannot submit the unsubmitted document.
- Project manager as responsible user: project manager receives submit/upload permission only after being assigned as the document responsible user.
- Full view users keep view/download permission without upload/submit permission.
- Existing `1.2` multi-node approval smoke continues to pass after assigning the ordinary `1.2` document submission to its responsible user in test setup.

## Data And Migration Impact

- No migration was added.
- No production/real data was changed by code. The smoke script creates temporary smoke users/projects/documents and removes them in its existing cleanup path.
- Frontend role hardcoding was not added; project detail actions continue to use backend permission fields.

## Validation Results

- `digital-platform-api`: `cmd /c npm.cmd run check` passed; output ended with `Stage document ownership smoke passed`.
- `digital-platform-web`: `cmd /c npm.cmd run build` passed.
- `OpenSpec change`: `cmd /c openspec validate fix-stage-document-submit-permission-boundary --strict` passed.
- `OpenSpec all`: `cmd /c openspec validate --all --strict` passed with 10/10 items valid.
