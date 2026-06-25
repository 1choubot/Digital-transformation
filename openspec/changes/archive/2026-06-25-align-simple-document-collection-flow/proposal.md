## Why

The platform has switched the stage document template to `v20260624` with 64 ordinary stage document items, but parts of the forward OpenSpec plan still describe the old `v20260610` / 54-item flow or imply future complex workflow engines. This change aligns the plan around a simple first-version loop: collect stage documents, review them, archive approved files to the file management platform, and advance stages through the existing gate.

## What Changes

- Align project-core requirements with the current `v20260624` / 64-item template and the 20260624 workflow source documents.
- Replace old `20260610` flow wording in project-core and project-core-frontend with current-template wording.
- Document that self-developed and outsourced projects share the same 8 stages and same `v20260624` 64 ordinary stage document items.
- Define the first-version business loop:
  - project creation initializes 8 stages and 64 stage document items;
  - document owners upload or organize attachments and submit for review;
  - the review department or reviewer confirms or returns the document item;
  - confirmed applicable required items count toward stage completeness;
  - stage advance still requires current-stage applicable required documents confirmed and the stage gate approval approved;
  - file management platform integration is responsible for archive storage, download permissions, and file logs.
- Clarify that contract review records, purchase requests, purchase contract review records, invoices, and design-change outputs are handled as ordinary or conditional document items for the first version.
- Exclude contract approval workflow, purchase approval workflow, payment workflow, design-change workflow engines, and file-server-check/random-material-transfer nodes unless later confirmed as independent files.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: Align project creation, workflow basis, project mode, and stage advance planning with `v20260624` / 64 items and the simple document collection loop.
- `project-core-frontend`: Align project detail display wording with dynamic `v20260624` / 64-item data and keep the frontend free of hard-coded template counts.
- `stage-document-checklist`: Clarify special document items are ordinary or conditional document items, not separate workflow engines.
- `technical-architecture`: Clarify the first-version boundary between the digital platform and the file management platform.

## Impact

- OpenSpec only: adds a planning change under `openspec/changes/align-simple-document-collection-flow/`.
- No backend, frontend, database, migration, or runtime template change in this proposal.
- Does not modify, complete, or archive `define-digital-platform-v1`; that older planning change remains active and should be split or superseded later rather than implemented wholesale.
