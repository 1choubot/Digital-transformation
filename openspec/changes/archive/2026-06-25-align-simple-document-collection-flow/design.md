## Context

The current runtime stage document template is `v20260624` with 64 ordinary stage document items. `openspec/specs/stage-document-checklist/spec.md` has already been cleaned up to use this active template, but `project-core` and `project-core-frontend` still contain archived wording from the `v20260610` / 54-item planning period. This change brings the forward plan back to one simple first-version workflow.

## Simple First-Version Loop

The first version should be described as a document collection loop, not as a broad workflow platform:

1. Project creation initializes standard 8 stages and 64 `v20260624` stage document items.
2. Each document item has applicability, requiredness, responsibility, attachments, and status.
3. The responsible user uploads attachments or organizes the required materials, then submits the document item for review.
4. The review department or reviewer confirms or returns the document item.
5. A confirmed document item counts toward stage completeness only when it is applicable and required for the current project.
6. Stage advance checks only the current stage:
   - applicable required document items are all `confirmed`;
   - stage gate approval is `approved`;
   - the existing 8-stage sequence and permission boundaries are satisfied.
7. File management platform integration is responsible for folder binding, archive storage, file list, download permission, and file logs.
8. The digital platform does not build contract, purchase, payment, design-change, or file-server-check workflow engines in the first version.

## Special Document Items

The `v20260624` template includes some business-sensitive artifacts. For the first version they remain document items:

- `合同审核记录表` is a document item, not a contract approval workflow.
- `采购申请表` is a document item, not a purchase request workflow.
- `采购合同审核记录表` is a document item, not a purchase contract workflow.
- `发票` items are document items and may be conditional; they do not create payment status or invoice workflow.
- The four design-change outputs are conditional document items; they do not create a design-change workflow engine.
- `7.P1 随机资料移交` and `8.P1 资料服务器核查` stay out of the ordinary stage document template unless the business confirms they produce independent files.

This keeps the first version inspectable and implementable: every item is still handled by the same applicability, responsibility, attachment, submission, review, and completeness rules.

## File Management Platform Boundary

The file management platform remains the file system of record. A later `file-platform-integration` change should own:

- creating or binding project, stage, and document folders;
- saving folder IDs on project, stage, or document records;
- archiving confirmed document attachments to the file management platform;
- reading file lists from the file management platform;
- delegating download permission to the file management platform;
- writing file logs with source system, project, stage, document item, and real submitter.

This change does not implement those calls and does not treat them as tasks for this change. It only defines the intended boundary so future implementation does not turn document collection into multiple workflow engines.

## Online Form Roadmap

Online forms should also be a later independent change. That later work can choose a small set of necessary forms, support online fill, draft save, submit, and generated archive files, then archive generated files through the same document item path as uploaded attachments.

This change does not implement online forms and does not count online-form work as part of its task list.

## Relationship to `define-digital-platform-v1`

`define-digital-platform-v1` remains active and should not be modified by this change. Its broad V1 planning is now partly stale because the current implementation has already advanced through smaller archived changes. After review, the team should either split the still-relevant parts into smaller changes or treat it as historical planning rather than an implementation checklist.

## Non-Goals

- No backend or frontend code changes.
- No database changes or migrations.
- No new contract approval flow, purchase approval flow, payment flow, invoice flow, design-change workflow engine, file-server-check workflow, or random-material-transfer workflow.
- No import of `7.P1` or `8.P1` into ordinary stage document templates unless future business confirmation says they are independent files.
- No file-platform-integration or online-form implementation tasks in this change.
- No git commit or archive as part of preparing this proposal.
