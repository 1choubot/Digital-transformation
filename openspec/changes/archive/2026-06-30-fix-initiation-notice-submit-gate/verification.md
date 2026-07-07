## Verification Record

Change: `fix-initiation-notice-submit-gate`

## Implemented Scope

- Added the `1.3 项目立项通知` submit gate in the ordinary stage document submit path.
- The gate requires `1.2 项目立项审批表` business review, technical review, and general manager review to be finally approved.
- The gate requires `1.1 项目需求表` to have no uncleared `revision_required` whose source is `1.2`.
- Gate failures return `INITIATION_NOTICE_GATE_NOT_READY` with details containing the blocking document codes such as `1.2` and `1.1`.
- The gate runs before status update and success operation log insertion, so a rejected submit does not change `1.3` status and does not write `document.submitted`.

## Attachment Upload Path

- Reviewed `digital-platform-api/src/repositories/stageDocumentAttachmentRepository.js`.
- Current attachment upload only validates the target, writes the attachment file/row, and writes `document.attachment_uploaded`.
- Current attachment upload does not update `project_stage_documents.status`, does not call the document submit transition, and does not make `submit_only` documents complete by itself.
- Therefore no upload-path gate was added in this implementation.

## Smoke Coverage

- `1.2` submitted but no nodes approved: `1.3` submit is rejected.
- `1.2` business review approved but technical/general not finally approved: `1.3` submit is rejected.
- `1.2` business and technical approved but general manager not finally approved: `1.3` submit is rejected.
- `1.2` not submitted: `1.3` submit is rejected.
- `1.1 revision_required = true` sourced from `1.2`: `1.3` submit is rejected.
- Rejected `1.3` submit leaves status as `not_submitted`.
- Rejected `1.3` submit does not write a `document.submitted` success operation log.
- After `1.2` final approval and `1.1` rework clearance, the `1.3` responsible user can submit successfully.
- Existing project code and stage advance gate smoke continues to pass.

## Explicitly Not Changed

- P0-17 is not handled.
- `1.2` node return/rework restoration behavior is not changed.
- No ordinary `1.2` resubmission requirement was added.
- File platform, notification, daily/weekly report, and UI behavior were not changed.

## Validation Results

- `digital-platform-api`: `cmd /c npm.cmd run check` passed; output ended with `Stage document ownership smoke passed`.
- `OpenSpec change`: `cmd /c openspec validate fix-initiation-notice-submit-gate --strict` passed.
- `OpenSpec all`: `cmd /c openspec validate --all --strict` passed with 10/10 items valid.
