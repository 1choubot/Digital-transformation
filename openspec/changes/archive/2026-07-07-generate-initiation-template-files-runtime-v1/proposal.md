## Why

The initiation stage now captures `1.1 / 1.2 / 1.3` as structured online forms, but the accepted business output is still a filled template file that authorized users can view or download. This change implements the first runtime vertical slice for generating those template files while keeping the design reusable for later stage documents.

## What Changes

- Add a backend template registry and explicit mapping manifests for:
  - `1.1 项目需求表` -> `项目需求表-模板.xlsx`
  - `1.2 项目立项审批表` -> `项目立项审批表-模板.xlsx`
  - `1.3 项目立项通知` -> `关于确定项目名称及编号的通知-模板.docx`
- Persist generated file records with version, status, source snapshot/hash, template hash, storage metadata, trigger event, and failure reason.
- Generate files from backend services after the accepted trigger points:
  - `1.1` online form submitted.
  - `1.2` general manager final approval passed.
  - `1.3` online form submitted.
- Add backend status and download/view APIs protected by project and stage-document permissions.
- Update project output cards to keep the online form entry and show generated file status/download entry.
- Add smoke coverage for generation, permissions, failure behavior, versioning, and unchanged stage-document item count.

This change does not connect the file platform, generate PDF, add new stage-document items, change the v20260629 / 71-item template count, migrate old projects, or let the frontend fill Excel or Word templates.

## Capabilities

### New Capabilities

### Modified Capabilities
- `project-core`: Adds runtime generation, file records, versioning, permission checks, and trigger behavior for initiation template files.
- `project-core-frontend`: Adds generated file state and download/view entry on initiation output cards while retaining online form entry.
- `stage-document-checklist`: Clarifies generated files are output records of existing `1.1 / 1.2 / 1.3` items and do not change document counts.
- `technical-architecture`: Adds reusable backend-governed template registry, mapping manifest, renderer, file record, storage, and permission boundaries.

## Impact

- API: adds generated-file status and download endpoints under project stage-document routes.
- Backend: adds template registry/mapping manifest, OOXML rendering utilities, generated file repository/service, schema initialization for generated file records, and trigger hooks in online form submission and `1.2` final approval.
- Frontend: updates project workspace output cards and project detail data flow to show generated file status and download actions.
- Storage: uses digital-platform-api internal generated-file storage; does not use the external file platform.
- Database: adds a generated file metadata table through existing schema initialization logic if durable storage is required.
