## 1. Planning / Requirements

- [x] 1.1 固化阶段节点工作区范围。
- [x] 1.2 固化立项阶段 4 个节点：项目输入、项目市场调研、项目立项审批、项目立项通知。
- [x] 1.3 固化 1.1/1.2/1.3 在线表单模板映射。
- [x] 1.4 固化项目创建轻量字段：项目名称、客户、客户联系方式。
- [x] 1.5 固化 1.2 评价/审批模型：营销评价、研发评价、总经理最终审批。
- [x] 1.6 固化 1.3 前置门禁：1.2 总经理审批通过后才能填写/提交。
- [x] 1.7 固化第二阶段补录边界：本 change 只取消创建时必填并保留旧字段兼容，补录能力由后续 change 实现。
- [x] 1.8 明确本 change 定位为全局项目工作区骨架 + 立项阶段第一批完整落地，其他阶段不在本 change 补齐完整节点映射。

## 2. Backend Implementation Future Tasks

- [x] 2.1 调整项目创建校验，只要求项目名称、客户、客户联系方式。
- [x] 2.2 增加客户联系方式字段或确认现有字段承载方式。
- [x] 2.3 提供项目阶段节点视图接口。
- [x] 2.4 提供节点工作区数据结构。
- [x] 2.5 建立立项阶段节点到产出映射。
- [x] 2.6 建立在线表单 schema/data/submission 能力。
- [x] 2.7 实现 1.1 项目需求表在线表单。
- [x] 2.8 实现 1.2 项目立项审批表在线表单。
- [x] 2.9 实现 1.3 项目立项通知在线表单。
- [x] 2.10 改造 1.2 为营销评价、研发评价、总经理最终审批。
- [x] 2.11 实现 1.3 前置门禁。
- [x] 2.12 实现总经理不通过后的 1.1 返工和 1.2 重新填写。
- [x] 2.13 调整阶段推进门禁。
- [x] 2.14 调整项目编号门禁。
- [x] 2.15 补充业务日志。
- [x] 2.16 设计旧三节点审批数据到新评价/审批模型的迁移或兼容解释策略。

## 3. Frontend Implementation Future Tasks

- [x] 3.1 改造项目创建页，只展示项目名称、客户、客户联系方式必填项。
- [x] 3.2 改造项目详情为项目工作区。
- [x] 3.3 左侧展示 8 阶段导航框架，完整展示立项阶段节点，其他阶段占位或旧清单入口。
- [x] 3.4 右侧展示节点工作区。
- [x] 3.5 实现 1.1 项目需求表表单入口。
- [x] 3.6 实现 1.2 项目立项审批表表单、营销评价、研发评价和总经理审批入口。
- [x] 3.7 实现 1.3 项目立项通知表单入口。
- [x] 3.8 权限按钮按后端字段展示。
- [x] 3.9 1.3 未满足前置时展示阻塞原因。
- [x] 3.10 节点第一屏展示状态、产出、责任人、阻塞原因和动作入口，不直接展示编辑表单。

## 4. Smoke / Tests Future Tasks

- [x] 4.1 创建项目只需项目名称、客户、客户联系方式。
- [x] 4.2 创建项目不要求项目经理、项目模式、参与中心、计划时间或立项日期。
- [x] 4.3 项目详情能按节点展示立项阶段。
- [x] 4.4 1.1/1.2 责任人由营销中心负责人分配。
- [x] 4.5 非责任人不能提交 1.1/1.2。
- [x] 4.6 1.3 只能营销中心负责人提交。
- [x] 4.7 营销/研发评价只保存文本，不决定通过。
- [x] 4.8 两项评价未完成时总经理审批拒绝。
- [x] 4.9 两项评价完成后总经理审批通过，1.2 完成。
- [x] 4.10 总经理不通过触发 1.1 返工和 1.2 重新填写。
- [x] 4.11 1.2 未通过时 1.3 提交拒绝。
- [x] 4.12 1.3 提交后立项阶段可按规则完成。
- [x] 4.13 节点状态与产出状态一致。
- [x] 4.14 业务日志记录关键动作。
- [x] 4.15 旧三节点审批数据不得直接绕过新评价/审批门禁。
- [x] 4.16 普通员工只因负责某一资料可看项目时，不得查看同项目无关 `1.1/1.2/1.3` 在线表单。
- [x] 4.17 在线表单提交与资料状态提交、`1.2` 节点激活和业务日志必须同事务成功或回滚。
- [x] 4.18 迁移入口必须校验轻量创建和在线表单所需列/表存在。
- [x] 4.19 旧资料清单入口中 `1.3` 提交按钮必须遵守 `1.2` 最终通过门禁，不能被旧责任人规则绕过。
- [x] 4.20 `1.1/1.2/1.3` 在线表单提交后不得再次保存或提交覆盖已提交表单。
- [x] 4.21 工作台 `1.3` 责任待办必须与详情页前置门禁一致，`1.2` 未最终通过或 `1.1` 有关联返工时不得展示为可提交。
- [x] 4.22 普通资料提交接口不得提交 `1.1/1.2/1.3`，必须返回在线表单提交要求且不改变资料状态、节点状态或成功日志。
- [x] 4.23 `1.1/1.2/1.3` 在线表单提交成功响应必须返回提交后的收敛权限，`canEdit` 和 `canSubmit` 不得继续为 true。
- [x] 4.24 旧资料操作区不得向 `1.1/1.2/1.3` 展示普通提交或返工重提入口，必须引导到在线表单入口。
- [x] 4.25 普通返工完成接口不得清除 `1.1/1.2/1.3` 返工，必须返回在线表单返工重提要求。
- [x] 4.26 `1.1` 在线表单重提必须清除由 `1.2` 触发的返工并记录返工完成追溯和日志。
- [x] 4.27 `1.2` 在线表单重填后必须重新进入营销评价、研发评价和总经理审批，不得复用旧通过结果。
- [x] 4.28 工作台 `1.1/1.2/1.3` 资料责任待办文案不得指向旧资料提交或旧返工完成入口。
- [x] 4.29 `1.1` 关联返工未清除时，`1.2` 在线表单保存和提交必须失败且不改变 form/document/node/log。
- [x] 4.30 `1.1` 关联返工未清除时，营销评价、研发评价和总经理最终审批工作台不得出现可处理的 `1.2` 待办。
- [x] 4.31 `1.2` 在线表单 GET 必须在 `1.1` 关联返工未清除时返回 `canEdit=false`、`canSubmit=false` 和阻塞原因。
- [x] 4.32 `1.1` 在线表单重提清除返工后，`1.2` 原责任人才可重新提交在线表单并重新激活评价/最终审批。
- [x] 4.33 `1.1/1.2/1.3` 在资料清单和工作台中的 `canSubmitDocument` 必须为 false，在线表单提交权限只看 online form permissions。
- [x] 4.34 `1.1/1.2/1.3` 附件上传入口不得制造完成或可提交错觉，后端上传权限和前端文案必须收敛到在线表单入口。

## 5. Review Follow-up

- [x] 5.1 Enforce online form document visibility, atomic submission transaction, migration script, and 1.3 legacy checklist gate.
- [x] 5.2 Prevent submitted online forms from being overwritten and align 1.3 workbench todo gating with detail-page permissions.
- [x] 5.3 Block ordinary stage-document submit for `1.1/1.2/1.3`, recompute post-submit online form permissions, hide legacy submit buttons, and cover the online-form-only path in smoke.
- [x] 5.4 Converge `1.1/1.2/1.3` entry points so ordinary submit and ordinary revision completion cannot change their completion/rework state; online form submit and `1.2` dedicated evaluation/approval are the allowed drivers.
- [x] 5.5 Enforce `1.1` rework clearance before `1.2` refill save/submit or review activation, suppress blocked `1.2` workbench todos, and make `canSubmitDocument` false for initiation online form only documents.

## 6. Entry Convergence Notes

- `1.1 / 1.2 / 1.3` are initiation online form only documents.
- Ordinary stage-document submit MUST NOT submit them.
- Ordinary stage-document revision complete MUST NOT clear their rework state.
- Ordinary confirm/return remains rejected for `1.2`; no new ordinary confirm/return capability is introduced for `1.1` or `1.3`.
- `1.1` rework clearing MUST be triggered by online form resubmission.
- `1.2` refill MUST be triggered by online form resubmission, then marketing evaluation, R&D evaluation, and general manager approval must be satisfied again.
- `1.3` MUST be submitted through online form and remains blocked until `1.2` final approval is complete.
