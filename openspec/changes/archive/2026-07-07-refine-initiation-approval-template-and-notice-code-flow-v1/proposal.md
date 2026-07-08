## Why

The runtime template generation change has made initiation-stage outputs downloadable, but the reviewed `1.2 项目立项审批表` template has now changed: the new approval template no longer contains a project code field. The current "fill project code in `1.2`, then read it in `1.3`" flow conflicts with the new template and with the intended business rule that the project code is formally determined by `1.3 项目立项通知`.

`1.3` also needs to generate a cumulative project-code notice rather than a one-project notice, and its generated Word table must remove unused blank rows so the signature date is not pushed to a later page.

## What Changes

- Plan the migration of project code ownership from `1.2 项目立项审批表` to `1.3 项目立项通知`.
- Plan the updated `1.2` online form schema and generated approval `.xlsx` mapping for the new approval template.
- Plan `1.3` submit-time validation: project code is editable, required, unique, and persisted to `projects.project_code`.
- Plan cumulative `1.3` notice generation containing historical projects with confirmed codes plus the current project.
- Plan Word table rendering changes: clone data rows, remove unused blank rows, preserve table style, and allow natural pagination.

This planning change does not implement business code, database migrations, file generation changes, file-platform integration, PDF generation, new stage-document items, v20260629 / 71-item count changes, old-project migration, or a rework of `1.1 项目需求表`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `project-core`: Updates initiation project-code ownership, `1.2` approval template requirements, and `1.3` cumulative notice requirements.
- `project-core-frontend`: Updates online-form and output-card frontend requirements for the new `1.2` template and editable `1.3` project code.
- `technical-architecture`: Updates backend template registry, manifest, source snapshot, and DOCX table-rendering requirements for the new flow.

## Impact

- API planning: `1.2` online form schema and submit validation must stop requiring project code; `1.3` submit must validate and persist project code.
- Backend planning: `1.2` template manifest must be remapped to the new workbook; `1.3` manifest and source snapshot must include a cumulative project list.
- Renderer planning: DOCX table rendering must support multiple data rows, row cloning, unused blank-row deletion, and style preservation.
- Frontend planning: `1.2` no longer displays project code; `1.3` displays editable required project code and handles duplicate-code business errors.
- Boundaries: no file platform, no PDF, no new资料项, no 71-item change, no old-project migration.
