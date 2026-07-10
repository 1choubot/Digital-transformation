## Overview

This change plans a backend-only, no-behavior-change refactor of `solutionDesignWorkflowRepository.js`. The first implementation pass should reduce risk by extracting pure functions, mappers and small adapters while keeping the current repository as the public facade and transaction coordinator.

The current repository combines these concerns in one file:

- Upload, form, node, role, quotation/tender and project context queries.
- C05 analysis form and C15/C16 review form normalize logic.
- Generated Excel source builders, cell mappings, image mappings and generated file persistence.
- Role, node, upload slot, finance confidentiality and quotation/tender permissions.
- Workflow DTO, workbench todo and generated file DTO mapping.
- Node transitions, return flows, logs, generated file lifecycle and automatic stage advance triggers.

## Recommended Module Split

Keep `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js` as the exported integration layer in the first implementation pass. Extracted modules should be private to the project repository boundary and called from the facade.

Recommended directory:

```text
digital-platform-api/src/repositories/projects/solutionDesignWorkflow/
  formPayloads.js
  formDtos.js
  generatedFiles.js
  permissions.js
  queries.js
  workflowDtos.js
  logs.js
```

This directory is a suggested implementation shape, not a new public API. If the codebase indicates a smaller or flatter split is safer during implementation, equivalent module names are acceptable as long as the same behavior boundaries hold.

## Split Order

### 1. Template generation module

Priority extraction targets:

- `buildGeneratedFormSource`
- `buildGeneratedFormCellValues`
- `buildGeneratedFormImageValues`
- `groupOnlineFormImagesByFieldKey`
- `readSolutionDesignTemplate`
- `buildGenerationErrorMessage`
- `generateSolutionDesignFormFile`
- C05/C15/C16 review type, recorder, repeat rows and normal Chinese font style handling.

Responsibilities:

- Build generated file source data from project, form, role and image context.
- Resolve template cell values from explicit mappings.
- Resolve image mappings and pass them to the OOXML renderer.
- Keep Excel generation adapter usage isolated from workflow state transitions.

Constraints:

- Must not change C05/C15/C16 target cells, style overrides, image anchors, merge adjustment behavior, file names, template names or generated file status transitions.
- Must not move generation persistence or transaction decisions out of the repository in the first pass.

### 2. Form payload and DTO modules

Priority extraction targets:

- `normalizeAnalysisFormPayload`
- `normalizeRepeatableReviewFormValue`
- `normalizeReviewFormPayload`
- `mapAnalysisForm`
- `mapReviewForm`
- `mapGeneratedFileStatus`
- `buildAnalysisFormDto`
- `buildReviewFormDto`

Responsibilities:

- Normalize C05 and C15/C16 payloads without changing accepted field names or current whitelist behavior.
- Map database rows into existing DTO structures.
- Keep generated file DTO mapping consistent with current API responses.

Constraints:

- Must not change API DTO field names, nullability, nested structures, permission fields or blocking reason values.
- Must not change save/submit rules, revision handling or generated file invalidation semantics.

### 3. Permission module

Priority extraction targets:

- `canProcessAnalysisForm`
- `canProcessReviewForm`
- `canSubmitNode`
- `canReviewSolutionDesignNode`
- `canActAsReviewerForSolutionDesignNode`
- `buildUploadSlotPermissions`
- `canViewFinanceCostUploadFile`
- `canDownloadUploadFile`
- quotation/tender permission helpers such as `canSubmitQuotation`, `canProcessQuotationResult` and `canSubmitTender`.

Responsibilities:

- Keep role and status based permission checks readable and testable.
- Preserve returned `permissions` and `blockingReasons` exactly.
- Keep finance confidential metadata filtering rules unchanged.

Constraints:

- This change does not introduce a global unified permission resolver.
- Existing organization and project-role checks remain the source of truth.

### 4. Query helper module

Priority extraction targets:

- `selectProjectContext`
- `selectSolutionDesignRoles`
- `selectSolutionDesignRolesForUpdate`
- `selectSolutionDesignNodes`
- `selectSolutionDesignUploadSlots`
- `selectCurrentAnalysisForm`
- `selectCurrentReviewForm`
- `selectCurrentReviewForms`
- `selectQuotationTenderFlow`
- stage document lookups for C05 and legacy C05 anchors.

Responsibilities:

- Centralize SQL snippets and row selection helpers.
- Keep `forUpdate` behavior explicit.
- Avoid changing transaction boundaries or lock timing during the first pass.

Constraints:

- Read helpers may move, but transaction orchestration and the order of writes must remain in the repository facade until a later, separately planned change.
- Any query extraction must preserve existing selected columns, joins, aliases and authorization inputs.

### 5. Integration repository facade

`solutionDesignWorkflowRepository.js` should initially keep:

- Exported repository functions and names.
- Transaction start/commit/rollback orchestration.
- High-level node transition orchestration.
- Calls into `tryAutoAdvanceProjectStage`.
- Operation log write ordering.
- Storage write cleanup and generated file persistence ordering.

The first implementation goal is not to shrink the file to an ideal size. The goal is to remove the clearest pure-function and adapter clutter while leaving high-risk behavior in place.

## Transaction Boundary Principles

- Do not move core transaction boundaries in the first implementation pass.
- Do not split a business action into multiple independent transactions.
- Do not change the order of business writes, generated file writes, operation log writes or automatic advance calls.
- If extraction requires passing transaction executors, pass the existing `executor`/`db` object through rather than opening new connections in helper modules.
- If a helper throws, existing rollback behavior must remain unchanged.

## Behavior Preservation Principles

Implementation must preserve:

- API response structures and DTO field names.
- Error codes and business error metadata.
- Permission booleans and blocking reason semantics.
- Operation log action types, summaries and metadata.
- Solution design node statuses, revisions and return behavior.
- Automatic stage advance trigger points, idempotency and logs.
- C04-C19 derived completion behavior.
- C05/C15/C16 generated file content, styles, image anchors, generated file lifecycle and download behavior.
- Finance confidential file redaction.
- Workbench todo behavior.

## Testing Strategy

The refactor implementation must use the current tests as the regression contract:

- `cmd /c npm.cmd run test:solution-design`
- `cmd /c npm.cmd run check`
- Existing C05/C15/C16 generated file tests, image tests, permission tests, quotation/tender tests and automatic advance tests must continue to pass unchanged unless a test only asserts internal module location.

New tests are optional for pure extraction, but any newly exported helper with meaningful branching should have focused tests if it reduces risk. Tests must not loosen existing assertions.

## Rollback Strategy

Because this change does not require database migration or API shape changes, rollback should be code-only:

- Keep the original repository facade as the single public import surface.
- If an extracted module causes regressions, inline that module back into the repository without data migration.
- Avoid deleting original behavior paths until tests show equivalent results.

No data migration, schema rollback or user-facing recovery path should be required.
