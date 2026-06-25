## 1. Change Structure

- [x] 1.1 Create `openspec/changes/plan-stage-document-template-v20260624/`
- [x] 1.2 Write `proposal.md` for the 20260624 template planning scope
- [x] 1.3 Write `design.md` with the 64-item planning口径 and non-goals
- [x] 1.4 Write this `tasks.md`

## 2. v20260624 Planning Document

- [x] 2.1 Review the existing 20260624 workflow and document ownership notes
- [x] 2.2 Create `docs/9.10_v20260624阶段资料模板规划_20260624.md`
- [x] 2.3 整理 64 个流程图直接产出文件
- [x] 2.4 Mark each document's stage
- [x] 2.5 Mark default `ownerDepartment` and `reviewDepartment` center planning口径
- [x] 2.6 Mark requiredness planning口径
- [x] 2.7 Mark planned submit mode
- [x] 2.8 Explicitly exclude `7.P1 随机资料移交` and `8.P1 资料服务器核查` from ordinary stage document templates

## 3. Spec Delta

- [x] 3.1 Add `specs/stage-document-checklist/spec.md`
- [x] 3.2 Specify future `v20260624` 64-item stage document template planning
- [x] 3.3 Specify that stage advance keeps the existing document completeness and stage approval口径
- [x] 3.4 Specify simulated-data reset strategy for a future implementation change

## 4. Validation and Review

- [x] 4.1 Run `cmd /c openspec validate plan-stage-document-template-v20260624 --strict`
- [x] 4.2 Run `cmd /c openspec validate --all --strict`
- [x] 4.3 Run `git status --short`
- [x] 4.4 Report changed documents, 64-item count, excluded nodes, validation results, and repository status to the review session

## 5. Review Follow-up

- [x] 5.1 Replace the 64-item planning table's global sequence with stable stage-based `documentCode`
- [x] 5.2 Split `ownerDepartment` / `reviewDepartment` from non-center audit or confirmation notes
- [x] 5.3 Normalize `ownerDepartment` and `reviewDepartment` to allowed department enum values or empty cells
- [x] 5.4 Split free-text requiredness into boolean template default requiredness and applicability condition
- [x] 5.5 Update the `stage-document-checklist` spec delta for document code, department enum, boolean requiredness, and applicability condition rules
- [x] 5.6 Update design notes for document code rules, center field boundaries, and requiredness split

## 6. Implementation

- [x] 6.1 Add `digital-platform-api/src/domain/stageDocumentTemplateItemsV20260624.js`
- [x] 6.2 Switch `STAGE_DOCUMENT_TEMPLATE_VERSION` to `v20260624`
- [x] 6.3 Switch `EXPECTED_STAGE_DOCUMENT_ITEM_COUNT` to 64
- [x] 6.4 Keep `7.P1 随机资料移交` and `8.P1 资料服务器核查` out of ordinary templates
- [x] 6.5 Add `reset-stage-documents-v20260624` script for the simulated database
- [x] 6.6 Update smoke checks for version, count, document codes, department enums, excluded nodes, and per-project document counts
- [x] 6.7 Update README upgrade instructions
- [x] 6.8 Check front-end fixed-count assumptions and keep dynamic rendering

## 7. Validation

- [x] 7.1 Confirm database connection is `digital_platform`
- [x] 7.2 Run `cmd /c npm.cmd run reset-stage-documents-v20260624`
- [x] 7.3 Run `cmd /c npm.cmd run init-stage-documents`
- [x] 7.4 Verify active template version, template count, excluded nodes, and per-project document counts
- [x] 7.5 Run `cmd /c npm.cmd run check` in `digital-platform-api`
- [x] 7.6 Run `cmd /c npm.cmd run build` in `digital-platform-web`
- [x] 7.7 Run `cmd /c openspec validate plan-stage-document-template-v20260624 --strict`
- [x] 7.8 Run `cmd /c openspec validate --all --strict`
- [x] 7.9 Run `git status --short`

## 8. Review Follow-up: Stage Ownership and Reset Corrections

- [x] 8.1 Correct `v20260624` stage distribution to 3/15/4/17/17/2/4/2 while keeping 64 ordinary document templates
- [x] 8.2 Move project kickoff, purchase request, delivery note, on-site installation record, final payment invoice, and closeout report to the reviewed document codes
- [x] 8.3 Keep `7.P1 随机资料移交` and `8.P1 资料服务器核查` excluded from ordinary templates
- [x] 8.4 Update 20260624 workflow, responsibility, and template planning docs for the reviewed stage ownership
- [x] 8.5 Update OpenSpec proposal, design, and spec delta for the reviewed distribution, stage summary display, and reset semantics
- [x] 8.6 Show all stage documents, applicable documents, required gate documents, and optional/conditional document visibility in the project detail checklist summary
- [x] 8.7 Reset simulated project stage state, stage approval history, operation logs, attachment records, physical attachment files, old documents, and old templates
- [x] 8.8 Update smoke checks for stage distribution, key document codes, optional documents, reset state, approval history, operation logs, and per-project document counts
- [x] 8.9 Run `cmd /c npm.cmd run reset-stage-documents-v20260624`
- [x] 8.10 Run `cmd /c npm.cmd run init-stage-documents`
- [x] 8.11 Run `cmd /c npm.cmd run check` in `digital-platform-api`
- [x] 8.12 Run `cmd /c npm.cmd run build` in `digital-platform-web`
- [x] 8.13 Run `cmd /c openspec validate plan-stage-document-template-v20260624 --strict`
- [x] 8.14 Run `cmd /c openspec validate --all --strict`
- [x] 8.15 Run `git status --short`

## 9. Review Follow-up: Markdown Parser, Reset Safety, and Optional Summary

- [x] 9.1 Support parsing the current 10-column `docs/9.10_v20260624阶段资料模板规划_20260624.md` table as a fallback template source
- [x] 9.2 Add smoke coverage for parsing the 9.10 markdown into 64 items with 3/15/4/17/17/2/4/2 distribution and without `7.P1` / `8.P1`
- [x] 9.3 Move physical attachment directory deletion after database commit and strengthen attachment directory safety checks
- [x] 9.4 Add `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR` to `.env.example` and document that reset clears this directory only for simulated data
- [x] 9.5 Show applicable count and applicability badges for optional/conditional documents in the stage summary
- [x] 9.6 Run `cmd /c npm.cmd run check` in `digital-platform-api`
- [x] 9.7 Run `cmd /c npm.cmd run build` in `digital-platform-web`
- [x] 9.8 Run `cmd /c openspec validate plan-stage-document-template-v20260624 --strict`
- [x] 9.9 Run `cmd /c openspec validate --all --strict`
- [x] 9.10 Run `git status --short`
