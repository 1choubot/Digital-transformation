## 1. Source Review

- [x] 1.1 Read `docs/审查规划新会话交接记忆_20260624.md`
- [x] 1.2 Read `docs/9.2_阶段资料清单与责任角色表_20260610.md`
- [x] 1.3 Read `docs/9.7_智能制造项目整体推进流程_20260610.md`
- [x] 1.4 Review current `v20260610` stage document templates, stage definitions, and project approval rules as context only
- [x] 1.5 Visually review `flow_20260624_tile_01_0_1540.png` through `flow_20260624_tile_08_9823_11364.png`
- [x] 1.6 Cross-check overlapping slice boundaries for stage transitions and YES/NO return paths

## 2. Documentation Outputs

- [x] 2.1 Create `docs/9.8_智能制造项目整体推进流程_20260624.md`
- [x] 2.2 In the 9.8 document, describe the 8-stage 20260624 workflow, workflow nodes, responsible centers, YES/NO return paths, outputs, and checklist notes
- [x] 2.3 Create `docs/9.9_阶段资料清单与责任归属表_20260624.md`
- [x] 2.4 In the 9.9 document, list 20260624 process files or outputs by stage with owner center, owner role, review center, requiredness, optional status, special category, and notes
- [x] 2.5 Mark finance, procurement, approval, design-change, random-material handoff, and document-server verification nodes separately from ordinary document items

## 3. Difference Review

- [x] 3.1 Add a `20260610` vs `20260624` comparison section to the 9.9 document
- [x] 3.2 Classify differences as added, removed or not present, renamed, moved between stages, changed owner center, changed requiredness, and requiring business confirmation
- [x] 3.3 Explicitly mark new items including quotation, contract review, purchase request, purchase contract review, invoices, design-change outputs, random-material handoff, and document-server verification
- [x] 3.4 Explicitly mark moved items including work instructions, product manuals, maintenance manuals, training PPT, installation/debug records, self-acceptance report, and delivery note
- [x] 3.5 State that the current `v20260610` 54 document templates must not be used directly as the 20260624 template basis
- [x] 3.6 Clarify the quantity distinction between 64 direct file outputs and the 66-row planning table

## 4. OpenSpec Validation

- [x] 4.1 Create `proposal.md`, `design.md`, and a documentation-only planning spec for this change
- [x] 4.2 Confirm this change contains no backend, frontend, database, or runtime template implementation tasks
- [x] 4.3 Run `cmd /c openspec validate align-project-workflow-20260624-docs --strict`
- [x] 4.4 Run `cmd /c openspec validate --all --strict`
- [x] 4.5 Run `git status --short`
- [x] 4.6 Confirm no code files were modified by this change
- [x] 4.7 Confirm `.tmp_pdf_review_20260624` remains untracked and is not added to the change
