## 1. Planning Artifacts

- [x] 1.1 Review `智能制造项目管理流程图20260625.pdf` and existing 20260624 planning documents.
- [x] 1.2 Review formal specs for project core, frontend, stage document checklist and technical architecture.
- [x] 1.3 Create the `align-project-workflow-20260625` OpenSpec change structure.
- [x] 1.4 Create proposal and design documents for the planning change.
- [x] 1.5 Create `docs/9.11_20260625项目流程资料审批口径规划.md`.

## 2. 64-Item Classification Planning

- [x] 2.1 Keep the ordinary red output-file count at 64.
- [x] 2.2 Exclude `7.P1 随机资料移交` and `8.P1 资料服务器核查` from ordinary document templates.
- [x] 2.3 Classify each of the 64 document items by mainline, conditional trigger, approval/confirmation need and completion rule.
- [x] 2.4 Identify unresolved completion-mode items in the earlier planning pass.
- [x] 2.5 Document that NO rollback on mainline nodes does not make the related document conditional.

## 3. Spec Delta Planning

- [x] 3.1 Add project-core delta for deferred project code and completion-rule-based stage gate planning.
- [x] 3.2 Add project-core-frontend delta for empty project code display and richer document states.
- [x] 3.3 Add stage-document-checklist delta for `completionMode` and conditional document rules.
- [x] 3.4 Add technical-architecture delta for pausing or rewriting file-platform and online-form sequencing.

## 4. Guardrails

- [x] 4.1 Do not implement backend business code.
- [x] 4.2 Do not implement frontend business code.
- [x] 4.3 Do not execute migrations.
- [x] 4.4 Do not modify the database.
- [x] 4.5 Do not modify `D:\file-server-local`.
- [x] 4.6 Do not modify `define-digital-platform-v1`.
- [x] 4.7 Do not commit git changes.
- [x] 4.8 Do not archive this change.
- [x] 4.9 Do not continue executing `file-platform-integration-v1`.

## 5. Validation

- [x] 5.1 Run `cmd /c openspec validate align-project-workflow-20260625 --strict`.
- [x] 5.2 Run `cmd /c openspec validate --all --strict`.
- [x] 5.3 Run `cmd /c openspec list`.
- [x] 5.4 Run `git status --short`.
- [x] 5.5 Report results for review.

## 6. Review Follow-Up: 20260625 Leadership Alignment

- [x] 6.1 Remove the generic stage gate approval requirement from this planning change.
- [x] 6.2 State that stage advance checks only whether current-stage applicable documents are complete by `completionMode`.
- [x] 6.3 State that only documents or nodes with explicit YES/NO or YES-only control require confirmation or approval.
- [x] 6.4 Reclassify 5.13-5.16 design-change outputs as `conditional_submit`.
- [x] 6.5 Reclassify 8.2 项目结题报告 as `submit_only`.
- [x] 6.6 Keep 3.4, 6.2 and 8.1 as invoice outputs under review follow-up tracking.
- [x] 6.7 Update completionMode statistics to the then-current 28/26/7/0/3 planning snapshot.
- [x] 6.8 Keep this change planning-only and do not add file-platform or online-form implementation tasks.
- [x] 6.9 Record that invoice output completion mode needed a later review follow-up.
- [x] 6.10 Re-run OpenSpec validation and report review results.

## 7. Review Follow-Up: Requirement Strengthening

- [x] 7.1 Tighten the NO rollback mainline document rule from SHOULD to MUST.
- [x] 7.2 Tighten the 64-item ordinary document count from SHOULD to MUST.
- [x] 7.3 Tighten the 8-stage mainline requirement from SHOULD to MUST.
- [x] 7.4 Keep the then-current completionMode statistics stable until final convergence in section 8.
- [x] 7.5 Do not modify backend code, frontend code, database, file platform code, `define-digital-platform-v1`, or other active changes.
- [x] 7.6 Do not commit or archive this change.

## 8. Review Follow-Up: Final Completion Mode Convergence

- [x] 8.1 Removed the previous business-confirmation hold items from this planning change.
- [x] 8.2 Reclassify `3.4 发票（预付款）`, `6.2 发票（发货款）` and `8.1 发票（尾款）` as `submit_only`.
- [x] 8.3 Remove the unused pending completion mode from docs and spec deltas.
- [x] 8.4 Update completionMode statistics to the then-current invoice convergence snapshot.
- [x] 8.5 State that invoice outputs do not introduce payment flow, invoice approval flow or extra workflow engines.
- [x] 8.6 Keep this change planning-only and do not modify backend code, frontend code, database, file platform code, `define-digital-platform-v1`, `file-platform-integration-v1` or other active changes.
- [x] 8.7 Do not commit or archive this change.

## 9. Review Follow-Up: Drawing Review Completion Mode

- [x] 9.1 Reclassify `4.14 产品平面图` as `submit_only`.
- [x] 9.2 Reclassify `4.15 产品零部件清单` as `submit_only`.
- [x] 9.3 Keep `4.16 图纸审查记录` as `approval_required`.
- [x] 9.4 Clarify that a NO rollback target does not automatically inherit approval behavior.
- [x] 9.5 Update completionMode statistics to 33/24/7/0.
- [x] 9.6 Keep this change planning-only and do not modify code, database, file platform code or other active changes.
- [x] 9.7 Do not commit or archive this change.
