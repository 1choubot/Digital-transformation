## Context

The archived runtime change `generate-initiation-template-files-runtime-v1` generated initiation-stage template files from online forms. After leadership review, the template folder was replaced with the `智能制造项目管理文件模板v1` contents. `1.1 项目需求表` and `1.3 项目立项通知` template names remain unchanged, while the new `1.2 项目立项审批表-模板.xlsx` removes the project code field and changes the approval table content.

## Decisions

### Decision 1: `1.2` no longer owns project code

`1.2 项目立项审批表` MUST NOT contain a project code input, MUST NOT require project code on save or submit, and MUST NOT write `projects.project_code`. The `1.2` form remains responsible for business/technical scoring collaboration and the subsequent marketing, R&D, and general-manager approval flow.

The new approval template path remains:

`D:\Digital transformation\智能制造项目管理文件模板\项目立项审批表-模板.xlsx`

The template registry should treat this as a new template version, for example `20260707-initiation-approval-v1`.

### Decision 2: New `1.2` approval manifest

The implementation rebuilds the `1.2` schema and manifest from the new template, not from old field names. Final mapping changes:

- Do not map project number/project code.
- Header mapping must be relocated to the new template cells.
- Header fields include project name, customer name, customer project contact, customer contact phone, company business owner, and company business owner phone.
- Business scoring changes from the old 7-item structure to 6 items:
  - 客户企业属性
  - 项目来源
  - 项目定位
  - 商务竞争条件
  - 项目预算
  - 付款条件
- Technical scoring changes from the old 4-item structure to 5 items:
  - 项目需求
  - 特殊环境要求
  - 行业门槛
  - 技术成熟度
  - 研发模式
- Review opinion rows move from old rows `19/20/21` to new rows `17/18/19`.
- Project execution mode includes 自研模式 / 供应链模式. Leadership has confirmed this field is required. The first version must add a required `1.2` business-owner single-select field with options 自研模式 and 供应链模式.
- Project execution mode is a `1.2 项目立项审批表` output-file field only. It must not be bound to the system project mode, must not write `projects.project_mode`, and must not affect project stage, project status, project filtering, or other business logic.
- The manifest must explicitly map the `1.2` project execution mode field to the new template target position and select/check 自研模式 or 供应链模式 according to the submitted value.
- Header fields map to the verified workbook coordinates: `A2` project name, `A3` customer name, `A4` customer project contact, `G4` customer contact phone, `J4` company business owner, and `M4` company business owner phone.
- Business scoring rows are `6-11`; technical scoring rows are `12-16`. Scores write to `K`, information notes write to `L`, and responsible persons write to `O`; fixed clause and scoring-standard cells are not overwritten.
- Review opinions write to `A17/A18/A19`, review dates write to `M17/M18/M19`, and signature cells stay as template text/blank signing positions.
- Project execution mode writes check marks to the verified template targets `D20` for 自研模式 and `G20` for 供应链模式.
- Project execution mode generation must preserve the template rich-text runs in `D20/G20`: only the checkbox symbol run may be changed, while the Chinese label run and its font must remain from the template. The renderer must not replace the whole cell with Unicode checkbox text such as `☑ 自研模式` or `□ 供应链模式`.

### Decision 3: Project code is determined by `1.3`

`1.3 项目立项通知` becomes the official project-code determination step.

- `1.3.projectCode` is editable and required.
- `1.3` submit validates non-empty project code and uniqueness in the same transaction that writes `projects.project_code`.
- Uniqueness is protected with a project-code named lock plus duplicate check before update. The implementation must not rely only on a pre-update `SELECT` check.
- The independent `PUT /project-code` path must not bypass `1.3` for initiation-flow projects. When a project has the `1.3 项目立项通知` stage-document item, independent project-code updates must return `PROJECT_CODE_MANAGED_BY_INITIATION_NOTICE_FORM`.
- If a legacy path without a `1.3` stage-document item still writes `projects.project_code`, it must use the same project-code named lock strategy before checking duplicates and updating.
- `1.3` generation uses the submitted project code after persistence.
- Existing projects with `projects.project_code` may default that value into `1.3`, but authorized users may still edit it before submit; submit still validates uniqueness.
- The old gate "project code must already exist before opening/submitting `1.3`" must be removed. The `1.2` general-manager approval prerequisite for `1.3` remains.

### Decision 4: `1.3` generates a cumulative notice list

The notice file includes historical confirmed-code projects plus the current project. The first-version query is:

- Include projects whose `1.3` online form has been submitted and whose `projects.project_code` is non-empty.
- Include the current project after its `1.3` submit transaction writes `projects.project_code`.
- Apply a cutoff at the current project's `1.3.submitted_at`: the cumulative list includes only projects with `1.3.submitted_at <= currentSubmittedAt`. If the current project's notice generation fails and is retried after later projects are submitted, the retry must still use the original currentSubmittedAt cutoff and must not include future projects.
- Sort by `1.3` submitted time ascending, then by project id ascending when submitted time is missing or equal.
- Render each row with sequence number, project code, project name, customer unit, and initiation date.
- Exclude old projects that never submitted `1.3` or do not have a project code.

The generated file source snapshot/hash must include the cumulative list inputs and the cutoff timestamp, not only the current project fields.

### Decision 5: DOCX table renderer supports multiple rows

The existing `1.3` DOCX rendering must move from "write one data row and clear later rows" to controlled multi-row table rendering:

- Use a manifest-declared table row template.
- Clone the data row for each project in the cumulative list.
- Remove unused template blank rows so the signature/footer date is not pushed to a second page by empty rows.
- Preserve table style, cell borders, widths, fonts, paragraph formatting, and existing footer/signature content.
- When project count exceeds the template's first-page capacity, keep appending cloned rows and allow Word to paginate naturally.

### Decision 6: Compatibility and boundaries

- No old project migration or backfill.
- Old projects without submitted `1.3` or project code do not enter the cumulative list.
- Old projects with existing `project_code` may show that value in `1.3`, but submit still owns final validation.
- Do not connect the file platform.
- Do not generate PDF.
- Do not add stage-document items or change v20260629 / 71-item count.
- Do not rework `1.1 项目需求表` in this change.

## Risks

- The exact new `1.2` cell coordinates have been verified against the replaced workbook; future template replacements must update the manifest and smoke assertions together.
- The `1.2` project execution mode checkbox cells are rich text. Replacing the whole cell can cause Chinese labels to inherit the checkbox symbol font, so smoke must assert rich-text/font preservation for both 自研模式 and 供应链模式.
- Project execution mode has been confirmed as required by leadership; implementation risk is limited to keeping it isolated from the system project mode and `projects.project_mode`, and ensuring it is used only for the `1.2 项目立项审批表` output file.
- Cumulative notice query must be stable and auditable; source snapshot/hash must cover all listed rows.
- DOCX row cloning must preserve table style and avoid corrupting the document package.
