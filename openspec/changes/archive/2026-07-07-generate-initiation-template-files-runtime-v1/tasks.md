## 1. OpenSpec

- [x] 1.1 Create runtime proposal, design, specs, and tasks for initiation template file generation.
- [x] 1.2 Validate `generate-initiation-template-files-runtime-v1` with strict OpenSpec.

## 2. Backend Core

- [x] 2.1 Add backend template registry and explicit mapping manifests for `1.1 / 1.2 / 1.3`.
- [x] 2.2 Add generated file metadata schema initialization and repository mapping.
- [x] 2.3 Add internal generated-file storage helpers.
- [x] 2.4 Add OOXML rendering utilities for `.xlsx` and `.docx` template output.
- [x] 2.5 Implement generated-file service with source snapshot/hash, template hash, versioning, statuses, and failure records.
- [x] 2.6 Trigger `1.1` generation after online form submit.
- [x] 2.7 Trigger `1.2` generation after general manager final approval.
- [x] 2.8 Trigger `1.3` generation after online form submit.
- [x] 2.9 Add generated-file status and download APIs with project/stage-document permission checks.
- [x] 2.10 Align `1.1 项目需求表` schema and manifest with the real template sections, range fields, fixed symbols, and merged fill areas.
- [x] 2.11 Ensure OOXML renderer precisely replaces target cells, preserves template text for empty optional values, and consumes DOCX table-cell manifest targets.
- [x] 2.12 Align `1.1` noise, altitude, and explosion-proof generated text with the template parenthesis format.
- [x] 2.13 Remap `1.2 项目立项审批表` generation to the real header cells, scoring `K/L/O` columns, and review `A/I/M` cells without overwriting fixed `C/H` template text.
- [x] 2.14 Preserve `1.2` signer cells without auto-filling reviewer names and format review dates as local dates.
- [x] 2.15 Fill `1.3` notice footer date from `noticeDate` through manifest-declared DOCX fixed text replacement.
- [x] 2.16 Gate `1.2` collaboration todos, save, and submit until `1.1` is submitted/completed with no uncleared rework.
- [x] 2.17 Add backend-owned `1.1` online-form image storage with upload, download, delete, type validation, and permission checks.
- [x] 2.18 Embed mapped `1.1` site, workpiece, and operation-process images into the generated requirement `.xlsx`.
- [x] 2.19 Allow up to 3 active ordered images per `1.1` image field and reject the fourth image with a business error.
- [x] 2.20 Render up to 3 images per `1.1` Excel target area with horizontal layout and aspect-fit scaling.
- [x] 2.21 Keep `1.1` generated image anchors in image-only subregions so they do not obscure the filled text.
- [x] 2.22 Store uploaded image content hashes and include them in generated-file source snapshots.

## 3. Frontend

- [x] 3.1 Add generated-file API client helpers.
- [x] 3.2 Load generated-file status for `1.1 / 1.2 / 1.3` output cards.
- [x] 3.3 Show not generated, generating, generated, failed, and superseded-aware statuses.
- [x] 3.4 Add generated-file download/view action while retaining online form entry.
- [x] 3.5 Ensure output-card generated-file controls wrap correctly on mobile and desktop.
- [x] 3.6 Show `1.1` large-text field guidance plus controlled image upload/download/delete controls for site, workpiece, and operation-process sections.
- [x] 3.7 Ensure online-form image controls wrap correctly on mobile and desktop.
- [x] 3.8 Show ordered `1.1` image lists, per-image delete/download actions, and upload limit messaging at 3 images.

## 4. Smoke And Verification

- [x] 4.1 Extend API smoke to verify `1.1` submit creates `.xlsx` record and file.
- [x] 4.2 Extend API smoke to verify `1.2` general approval creates `.xlsx` record/file with review snapshot.
- [x] 4.3 Extend API smoke to verify `1.3` submit creates `.docx` record and file.
- [x] 4.4 Verify generation failure records `failed` without rolling back business state.
- [x] 4.5 Verify unauthorized users cannot download generated files or see paths.
- [x] 4.6 Verify regenerate after refill/rework creates a new version or supersedes old version.
- [x] 4.7 Verify generated files do not add stage-document items and v20260629 remains 71 items.
- [x] 4.8 Verify `1.1` generated XLSX preserves label cells/instruction rows and writes values into real template fill areas.
- [x] 4.9 Verify `1.3` generated DOCX writes key fields through manifest-declared table cell targets.
- [x] 4.10 Verify `1.1` generated XLSX uses template parenthesis format for noise, altitude, and explosion-proof values.
- [x] 4.11 Verify `1.2` generated XLSX writes scores, notes, responsible persons, and review opinions to real template cells while preserving fixed clause/evaluation columns.
- [x] 4.12 Verify `1.2` generated XLSX does not write reviewer names into signer cells and review dates contain no UTC/T artifacts.
- [x] 4.13 Verify `1.3` generated DOCX uses `initiationDate` in the table, `noticeDate` in the footer, and removes the template sample date.
- [x] 4.14 Verify `1.2` collaboration todos and save/submit are blocked before `1.1` submit, then appear after `1.1` submit.
- [x] 4.15 Verify `1.1` uploaded images are stored, downloadable with permission, and embedded into the generated requirement `.xlsx`.
- [x] 4.16 Verify `1.1` image fields support 1/2/3 image generation, reject the fourth image, and preserve stable order.
- [x] 4.17 Verify generated `1.1` XLSX media count, drawing relationships, and manifest-declared image anchors.
- [x] 4.18 Verify smoke cleanup removes online-form image storage files.
- [x] 4.19 Verify generated `1.1` XLSX image anchors use the non-text subregions `D12:E12`, `B18:E19`, and `B25:E29`.
- [x] 4.20 Verify wide/tall/three-image smoke samples are ordered, non-overlapping, and aspect-fit.
- [x] 4.21 Verify generated-file source snapshots include uploaded image content hashes.
- [x] 4.22 Run `digital-platform-api` check.
- [x] 4.23 Run `digital-platform-web` build.
- [x] 4.24 Run OpenSpec strict validation and list active changes.

## 5. Boundaries

- [x] 5.1 Confirm no file platform integration was added.
- [x] 5.2 Confirm no PDF generation was added.
- [x] 5.3 Confirm no new stage-document item and no 71-item count change.
- [x] 5.4 Confirm old projects were not migrated or backfilled.
- [x] 5.5 Confirm frontend does not fill Excel or Word templates.
