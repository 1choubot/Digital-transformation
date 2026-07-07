## Context

The archived planning change `generate-initiation-online-form-template-files-v1` established that initiation outputs must become generated template files after online form submission or final approval. The current runtime system already stores structured online form data, `1.2` review nodes, project metadata, internal attachment storage, and project/stage-document permissions. This change implements the first vertical slice for `1.1 / 1.2 / 1.3` using backend-generated files and internal storage only.

## Goals / Non-Goals

**Goals:**
- Maintain explicit mapping manifests for `1.1 / 1.2 / 1.3` before rendering.
- Resolve template paths only from a backend whitelist/registry.
- Persist generated file records with versions, status, source hash/snapshot, template hash, trigger event, and optional `1.2` review snapshot.
- Generate `.xlsx` for `1.1` after online form submission.
- Generate `.xlsx` for `1.2` after general manager final approval.
- Generate `.docx` for `1.3` after online form submission.
- Expose status and download APIs using existing project and stage-document view permissions.
- Show generated file status and download entry on output cards while keeping online form filling/browsing entry.

**Non-Goals:**
- No file platform integration or file platform archive state.
- No PDF generation.
- No new stage-document items and no change to v20260629 / 71-item count.
- No migration or backfill of old project historical form data.
- No frontend-side Excel or Word template filling.
- No arbitrary local template path accepted from API callers.

## Decisions

### Decision 1: Backend template registry and mapping manifests

Templates are registered by stable keys and resolved to known local files under `智能制造项目管理文件模板` by default. Runtime deployments MAY override the template root with `INITIATION_TEMPLATE_FILES_DIR`, but business APIs still resolve templates only through the backend registry and never accept caller-provided paths. Each manifest explicitly lists document code, file type, template key, trigger event, required sources, target cell or Word insertion targets, and formatting-preservation requirements.

Rationale: the renderer must not guess target positions from field names or expand schema fields to fit generation. The manifest is the contract between online form data and the real templates.

### Decision 2: Generated file records in digital-platform-api storage

The first version stores metadata in a digital-platform-api generated-file table and stores files under an internal generated-file storage directory. Records include `projectId`, `stageDocumentId`, `onlineFormId`, `documentCode`, `templateKey`, `fileType`, `version`, `status`, `fileName`, `storageKey`, `generatedByUserId`, `generatedAt`, `failureReason`, `sourceFormSubmittedAt`, `sourceFormDataHash`, `sourceSnapshotJson`, `triggerEvent`, `reviewSnapshotJson`, `templateVersion`, and `templateHash`. For `1.1` images, upload metadata includes a `contentSha256`/`contentHash` value; the generated file source snapshot and hash include that image content hash so historical generated files can be traced to the exact uploaded image bytes used for rendering.

Rationale: generated files must be durable, auditable, versioned, and independent from the file platform.

### Decision 3: Best-effort generation after business commit

Generation triggers run after the online form submission or approval transaction has committed. If generation fails, the generated-file record becomes `failed`; the online form submission or approval result is not rolled back.

Rationale: a template-rendering or path problem must not undo accepted business state. The output card will show the generation failure separately.

### Decision 4: Versioned records, no silent overwrite

Each generation attempt receives the next version number. When a new version succeeds, older generated versions for the same project/document/template are marked `superseded`. When a new version fails, the failed attempt is retained as the latest status, but the latest successful generated file remains downloadable until another successful version replaces it. The status API returns the latest generation attempt plus latest downloadable version metadata; the download API serves the latest `generated` record with a readable storage file.

Rationale: rework or refilling must keep historical source snapshots and output files traceable.

### Decision 5: Minimal OOXML rendering without new external dependency

The implementation uses backend utilities to update OOXML package entries for `.xlsx` and `.docx` templates and preserves the template package structure. The first slice writes only manifest-targeted Excel cells or the manifest-targeted Word table row; it does not append a generated-data snapshot section or add fields outside the real templates.

Rationale: the API currently has no Excel/Word dependency and network access is restricted. A backend renderer keeps generation server-side without expanding package dependencies in this change.

### Decision 5a: 1.1 项目需求表按真实模板区域填充

`1.1 项目需求表` 在线表单 schema follows the real template layout. The environment section captures range endpoints and fixed-symbol values separately, then formats them back into the template sentences such as `工作温度：（min）℃~（max）℃`, `噪音：≤（value）dB`, `海拔高度：≤（value）m`, and `防爆要求：（value）`. The workpiece, operation process, and target sections are large text fields written to the real merged fill areas `B16:E19`, `B21:E29`, and `B31:E35`; the instruction rows `B15`, `B20`, and `B30` are preserved.

The runtime slice supports up to three controlled image uploads for each of three `1.1` sections: site condition, workpiece description, and operation process. Images belong to the current `1.1` online form, are stored in backend-managed internal storage, and are embedded into the generated Excel workbook through manifest-declared image targets that do not overlap the text fill areas. When images exist, the renderer splits the original merged free-text regions into text and image subregions:

- Site condition text remains in `B12:C12`; images use `D12:E12`.
- Workpiece text remains in `B16:E17`; images use `B18:E19`.
- Operation process text remains in `B21:E24`; images use `B25:E29`.

When no image exists for a section, the text-only generation remains valid. Images are generated in stable upload order; one image is aspect-fit in the available image subregion, two images are aspect-fit in left/right slots, and three images are aspect-fit in three horizontal slots. Uploading more than three active images for the same project, document, and field is rejected as a business error. The target section `B31:E35` remains text-only. Non-image attachments, OLE objects, file-platform files, and PDF conversion remain outside this change.

Rationale: the real `项目需求表-模板.xlsx` uses instruction rows plus merged free-text regions, not the earlier split fields. This avoids overwriting template labels and keeps the generated file aligned with the reviewed template.

### Decision 5d: 1.2 collaboration requires submitted 1.1

`1.2 项目立项审批表` collaboration is not actionable until `1.1 项目需求表` has been submitted or completed and no outstanding `1.1` rework blocks the same `1.2` document. Before that point, direct `1.2` online-form viewing remains allowed for users with view permission, but `canEdit` and `canSubmit` are false and the blocking reason is `请先提交 1.1 项目需求表`. Direct save/submit calls are rejected with `INITIATION_REQUIREMENT_NOT_SUBMITTED`.

Rationale: collaboration and evaluation for `1.2` depend on the submitted demand form. Hiding the workbench todo is not sufficient; the backend must enforce the same gate.

### Decision 5b: 1.2 项目立项审批表按真实模板评分区填充

`1.2 项目立项审批表` manifest writes only the real fill areas in `项目立项审批表-模板.xlsx`. Header values are written to merged-area left-top cells `A2`, `I2`, `A4`, `A5`, `A6`, `I5`, and `I6` with the original labels retained. Scoring rows write only `K` for score, `L` for information collection notes, and `O` for responsible person across business rows `8-14` and technical rows `15-18`. The fixed clause content and evaluation standard columns `C` and `H` are never overwritten by online form values. Review opinions write to merged-area left-top cells `A19`, `A20`, and `A21`; signer cells `I19/I20/I21` preserve the template signer placeholder and do not auto-fill reviewer names. Review dates write to `M19/M20/M21` in local `YYYY-MM-DD` format without `T`, UTC markers, or offsets.

Rationale: the real approval template stores instructions and evaluation standards in merged `C:G` and `H:J` regions, while user-entered scores and notes belong only in the right-side fill columns. This keeps the generated approval file aligned with the reviewed Excel template.

### Decision 5c: 1.3 项目立项通知 table and footer date manifest

`1.3 项目立项通知` manifest targets the first table data row cells explicitly: sequence number, project code, project name, customer unit, and initiation date. The table initiation date uses `form.initiationDate` only. The footer/sign-off date uses `form.noticeDate` and is rendered as Chinese `YYYY年M月D日` by a manifest-declared fixed text replacement of the template sample date `2026年2月9日`. If `noticeDate` is empty, the fixed replacement clears the sample date instead of preserving it.

Rationale: the manifest must describe what the renderer actually writes, so later template changes can be reviewed at the mapping layer. The template sample date must never leak into generated business output.

### Decision 6: Permission and path hygiene

Generated file status and downloads reuse project/stage-document view permission checks. Responses expose status, file name, file type, version, generated time, file size, and failure summary only; they never expose local template paths or storage paths. Business APIs cannot pass arbitrary template paths.

Rationale: generated files are stage-document outputs and must follow the same visibility boundary as the document.

## Risks / Trade-offs

- OOXML format preservation is narrower than a dedicated Excel/Word library -> smoke validates generated files and future changes can replace the renderer behind the same service boundary.
- Template cell mapping may need refinement after template-by-template visual review -> manifests are explicit and isolated so mappings can be corrected without frontend changes.
- File generation can fail after business success -> failures are recorded and shown without rolling back business state.
- Generated versions increase disk usage -> versioning is required for audit; cleanup/retention can be planned later.
- File platform integration remains separate -> this avoids coupling runtime generation to the active `file-platform-integration-v1` change.
