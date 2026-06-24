## Context

Current project workflow documentation and runtime templates are based on 20260610. The backend currently initializes 8 stages and 54 `v20260610` stage document templates. The 20260624 PDF is an image-only flowchart, so the source must be read from the prepared image slices under `.tmp_pdf_review_20260624`.

The 20260624 flow keeps the same 8-stage project backbone, but adds finer business nodes and changes document ownership semantics. New or clarified nodes include quotation, sales contract review, purchase request, purchase contract review, invoices, design-change outputs, random-material handoff, and project document server verification.

The 20260624 flow is initially counted as 64 direct file outputs. The planning table contains 66 rows because it additionally marks 2 key non-red process nodes: `7.P1 随机资料移交` and `8.P1 资料服务器核查`.

## Goals / Non-Goals

**Goals:**

- Create `docs/9.8_智能制造项目整体推进流程_20260624.md` from the 20260624 PDF slices.
- Create `docs/9.9_阶段资料清单与责任归属表_20260624.md` with document ownership, review ownership, requiredness, special node categories, and 20260610 comparison.
- Capture why `v20260610` 54 templates cannot be used directly as the 20260624 template basis.
- Separate ordinary document outputs from finance, procurement, approval, design-change, handoff, and verification nodes.
- Keep this change limited to documentation and planning.

**Non-Goals:**

- Do not change backend or frontend code.
- Do not change the runtime template version from `v20260610` to `v20260624`.
- Do not modify existing formal specs.
- Do not implement ownerDepartment, reviewDepartment, permissions, APIs, database migrations, or UI changes.
- Do not modify, complete, or archive `define-digital-platform-v1`.

## Decisions

### Use image slices as the direct source

The PDF has no extractable text, so the documentation is based on a fresh visual read of `flow_20260624_tile_01_0_1540.png` through `flow_20260624_tile_08_9823_11364.png`. Adjacent slice overlap is used to verify stage boundaries such as production-to-pre-acceptance and pre-acceptance-to-final-acceptance.

### Keep 8 stages but document finer internal nodes

The 20260624 flow still uses 8 stages. The documentation records finer nodes inside each stage rather than introducing new stages. This avoids prematurely changing the platform's stage model before business review.

### Separate document items from business nodes

Some red outputs are ordinary project documents, while others are financial, contract, procurement, approval, or conditional design-change records. Some critical nodes, such as random-material handoff and project document server verification, appear as process/checklist nodes rather than ordinary red document outputs.

The planning documents therefore mark `workflowNodeType`-like categories instead of assuming every item belongs in the same ordinary stage-document template table.

### Use a new planning-only capability

This change introduces `project-workflow-documentation-20260624` only inside the change spec. It does not modify the formal `project-core`, `project-core-frontend`, or `stage-document-checklist` specs because no runtime behavior is being changed in this step.

## Risks / Trade-offs

- Stage boundary interpretation may need business review, especially for 发货单 and 现场安装调试记录 -> The docs explicitly mark these as needing review.
- Some outputs have ambiguous names, such as 合同审核记录表 and 终验收报告/终验收单 -> The docs preserve the ambiguity and list it under business confirmation.
- Finance and procurement nodes may later require separate models rather than stage document templates -> The docs flag those nodes so later implementation can avoid collapsing them into ordinary documents.
- Because this change does not update runtime templates, the application remains on `v20260610` after this step -> This is intentional and documented as a non-goal.
