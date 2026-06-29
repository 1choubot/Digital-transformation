## Overview

This planning change aligns the next project workflow model with `智能制造项目管理流程图20260625.pdf`. The ordinary red output-file count remains 64, based on the existing `v20260624` stage document template and `docs/9.10_v20260624阶段资料模板规划_20260624.md`, but the meaning of project code and document completion changes.

This change is planning-only. It does not modify backend code, frontend code, database schema, file platform code, or `define-digital-platform-v1`.

## Source Materials

- `智能制造项目管理流程图20260625.pdf`
- `docs/9.10_v20260624阶段资料模板规划_20260624.md`
- `docs/9.9_阶段资料清单与责任归属表_20260624.md`
- `openspec/specs/project-core/spec.md`
- `openspec/specs/project-core-frontend/spec.md`
- `openspec/specs/stage-document-checklist/spec.md`
- `openspec/specs/technical-architecture/spec.md`

The temporary review slices under `.tmp_pdf_review_20260625/` and `.tmp_pdf_review_20260624/` are only analysis aids and are not part of this change.

## 20260625 Workflow Differences

### Project Code Is Deferred

The 20260625 flow starts with project input and market investigation. At that point the project does not yet have a formal project code. The project code should be generated or filled only after project initiation approval passes and `项目立项通知` is published.

The planning consequence is:

- project creation may save an empty `projectCode`;
- `projectCode` uniqueness applies only when the value exists;
- list, detail, search, workbench, file-platform integration and logs must tolerate empty project code;
- the UI should show a clear placeholder such as `待立项编号`.

### Document Completion Is Not Uniform Approval

The 20260624 implementation treats applicable required documents as complete only when `status = confirmed`. The 20260625 flow has more nuanced meanings:

- Some documents are plain outputs and should be complete after submit/upload.
- Some documents are controlled by YES/NO nodes and need confirmation or approval.
- NO rollback on a review/check node means the upstream file is a rework target; it does not automatically make that upstream file `approval_required`.
- Conditional documents are those produced only when a specific branch happens, such as design-change documents after factory installation/debugging fails.
- Invoice outputs are treated as ordinary stage output files when the process chart does not show an explicit invoice approval or confirmation node.

## Completion Mode Model

Future implementation should add a per-document completion rule field such as `completionMode`.

Recommended values:

- `submit_only`: the applicable document is complete after submit/upload.
- `approval_required`: the applicable document is complete only after confirmation or approval.
- `conditional_submit`: the document is not missing until its condition is triggered; after trigger it is complete after submit/upload.
- `conditional_approval`: the document is not missing until its condition is triggered; after trigger it is complete only after confirmation or approval. The current 64-item 20260625 planning does not assign any document to this mode.

Stage completeness should be calculated by `completionMode`:

- untriggered `conditional_*` documents do not count as missing;
- triggered conditional documents use their corresponding submit or approval rule;
- non-applicable documents remain excluded;
- upstream documents referenced by NO rollback remain complete according to their own node's `completionMode`; they do not inherit the review/check node's approval rule.

Current 64-item classification counts:

- `submit_only`: 33
- `approval_required`: 24
- `conditional_submit`: 7
- `conditional_approval`: 0

## Stage Gate Boundary

The stage advance gate remains simple:

- only the current stage is checked;
- the current stage's applicable documents that participate in the gate must be complete according to each document's `completionMode`;
- there is no extra generic stage-level approval requirement in this planning;
- only documents or nodes with explicit YES/NO or YES-only control in the 20260625 flow require confirmation or approval;
- output documents without such a control node can pass after submit/upload;
- invoice documents without explicit YES/NO or YES-only control pass after submit/upload;
- NO rollback targets do not automatically become `approval_required`; the review/check record is the approval item when the review/check node has its own record output;
- stage advance still follows the fixed 8-stage sequence;
- this planning change does not add jump-stage, rollback-stage, workflow-engine, contract-flow, procurement-flow, payment-flow or design-change engine behavior.

## Special Document Handling

For the 20260625 planning stage:

- `合同审核记录表` remains a stage document and is approval/confirmation controlled.
- `采购申请表` remains a stage document and is approval/confirmation controlled by the purchase application node.
- `采购合同` and `采购合同审核记录表` should be described separately.
- `发票（预付款）`, `发票（发货款）` and `发票（尾款）` are ordinary document outputs in this planning. Because the 20260625 flow does not show explicit invoice approval or confirmation nodes, they use `submit_only`.
- For internal drawing review, `产品平面图` and `产品零部件清单` are `submit_only`; `图纸审查记录` is `approval_required`. This keeps consistency with scheme review and internal design review: upstream design outputs remain submit-only unless their own node has explicit YES/NO or YES-only.
- `3D模型（设计变更）`, `产品平面图（设计变更）`, `零部件清单（设计变更）` and `技术通知单（设计变更）` are conditional design-change outputs triggered by failed factory installation/debugging. Because the reviewed flow does not show a separate explicit approval node for these four outputs, the current planning classifies them as `conditional_submit`.
- `7.P1 随机资料移交` and `8.P1 资料服务器核查` remain process nodes and are excluded from the ordinary 64-item document template unless later confirmed as independent files.

## File Platform And Online Form Sequencing

The active `file-platform-integration-v1` planning assumed archive triggers primarily from `confirmed`. Under the 20260625 model, that trigger rule is not stable because some documents are complete after submit/upload while others need confirmation/approval.

Therefore:

- `file-platform-integration-v1` should be paused or revised before implementation;
- file platform archive triggers should be based on `completionMode`, not only `confirmed`;
- `submit_only` can archive after submit/upload completes;
- `approval_required` can archive after confirmation/approval passes;
- `conditional_submit` can archive only after the condition is triggered and submit/upload completes;
- `conditional_approval`, if introduced in a future change, can archive only after the condition is triggered and confirmation/approval passes;
- online form implementation should wait until the 20260625 document completion rules are accepted;
- file platform integration and online forms must remain separate follow-up changes, not tasks in this planning change.

## Planning Scope

This change creates planning artifacts only:

- OpenSpec proposal, design, tasks and spec deltas;
- `docs/9.11_20260625项目流程资料审批口径规划.md`;
- no backend implementation;
- no frontend implementation;
- no database migration;
- no file-platform code changes;
- no git commit;
- no archive.
