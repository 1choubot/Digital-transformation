## Why

领导更新的项目流程图和思维导图已经明确“方案设计阶段”不只是一个普通资料清单阶段，而是包含角色分配、方案分析、方案设计、两轮评审、三段成本估算以及报价/投标分支的内部流程。现有 OpenSpec 只覆盖 8 大阶段和资料项基础流转，缺少该阶段内部节点、退回路径、项目内角色、财务文件保密和工作台待办的统一规格。

本 change 已完成 OpenSpec 规划，当前按任务清单分轮实现。已完成方案设计内部节点、项目内角色、工作计划/产品功能框图/方案设计 8 个产出上传槽、项目方案分析在线表单、内部/客户方案评审在线表单、成本估算三段后端基础闭环、财务文件后端脱敏、本地下载权限和报价/投标分支后端闭环；当前第七轮实现项目方案分析表、C15 内部方案评审记录表、C16 客户方案评审记录表的 Excel 模板文件生成、状态记录和下载后端闭环。不包含前端、合同签订阶段业务、文件平台、PDF、Word、额外格式成品生成、旧数据迁移或 SQL dump 导入。

## What Changes

- 保留现有 8 大阶段：立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收、结题；本 change 只规划“方案设计阶段”内部流程。
- 规划方案设计阶段 9 个内部子节点：方案设计准备、项目方案分析、方案设计、内部方案评审、客户方案评审、研发成本估算、制造成本估算、财务成本估算、报价/投标。
- 规划研发中心负责人在“方案设计准备”节点分配项目内角色：项目经理、技术负责人、商务负责人、采购负责人、财务会计、财务负责人；这些不是新增全局组织角色。
- 规划项目方案分析表、C15 方案评审记录表（内部方案评审）和 C16 方案评审记录表（客户方案评审）作为在线表单，并沿用立项阶段的模板文件生成机制；方案设计工作计划、报价单、成本估算三段文件第一版按上传处理。
- 规划方案设计 8 个产出全部由技术负责人上传，目标口径将工艺时序图归入“方案设计”节点，但不改变 v20260629 / 71 项资料数量。
- 规划内部方案评审和客户方案评审继续作为 C15、C16 两个独立产出/资料项存在，二者复用同一个 `方案评审记录表-模板.xlsx`，通过评审类型/节点上下文区分，支持多次评审记录和历史审计，不合并资料项。
- 规划 C17 成本估算表仍为一个主资料项，内部拆成研发、制造、财务/运营三段上传与审批，不新增三个资料项。
- 规划财务/运营成本估算文件的后端保密权限：只允许总经理和运营中心授权处理人查看或下载；运营中心授权处理人至少包括本项目财务会计、财务负责人，以及后续规格明确授权的运营中心人员。研发中心负责人、技术负责人、项目经理、商务负责人、采购负责人、制造中心负责人、非授权运营中心人员、总经理助理、系统管理员和其他无关用户只能看到节点状态和审批结果，不能看到文件名、附件明细、预览地址或下载入口。
- 规划报价/投标单节点分支：总经理在财务成本估算最终通过后选择报价流程或投标流程；报价单由商务负责人上传并由商务负责人执行报价结果处理，报价未被客户接受时商务负责人线下与总经理讨论后在系统中选择退回研发成本估算或项目结束；投标书内设商务标、技术标两个上传槽并仍由总经理审批，不新增资料项。
- 规划工作台待办、前端节点展示、业务日志动作、状态机建模、上传槽/版本建模、权限边界和验收测试。
- 明确边界：不新增大阶段，不改变 71 项资料数量，不接文件平台，不生成 PDF，不生成 Word 或额外格式成品文件，不迁移旧项目，不导入 SQL dump，不处理无关 dirty/untracked。已按任务清单进入分轮实现，当前第七轮只做项目方案分析表和 C15/C16 方案评审记录表的 Excel 模板文件生成与下载后端闭环，不做前端、文件平台、PDF、Word、额外格式成品或合同签订阶段业务实现。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-core`: 增加方案设计阶段内部流程状态机、项目内角色分配、节点推进/退回路径、报价未被客户接受后的退回或项目结束路径。
- `stage-document-checklist`: 明确方案设计阶段资料项与内部节点映射、C17 成本估算表三段协作、投标书双上传槽、71 项数量不变和工艺时序图目标归属。
- `project-core-frontend`: 增加方案设计阶段子节点展示、工作台待办入口、报价/投标分支 UI、财务文件保密展示和退回重提体验要求。
- `business-operation-log`: 增加方案设计阶段角色分配、表单生成、文件提交、审批、退回、分支选择、项目结束和进入合同签订阶段门禁的日志动作要求；第六轮记录 `solution_design.ready_for_contract` 并返回 `permissions.canAdvanceToContract=true`，当前第七轮补充项目方案分析表和 C15/C16 方案评审记录表生成成功/失败日志，不直接实现合同签订阶段业务或真实阶段推进。
- `technical-architecture`: 增加方案设计阶段状态机建模、项目内角色权限、在线表单生成复用、上传槽/版本建模、财务文件后端保密和不接文件平台的架构约束。

## Impact

- Affected backend planning areas: project stage workflow state machine, project-internal role assignment, stage document online forms, generated template file tracking, stage document uploads, approval history, business operation logs, workbench todo APIs, permission checks, and project end state.
- Affected frontend planning areas: project workspace solution design stage, internal node timeline, node action cards, workbench todo display, online form entry, upload slots, approval panels, branch selection, reject reason/resubmit UI, and confidential finance file display.
- Affected data planning areas: project-internal role assignments, node state/history, review versions, cost estimate segment versions, bid upload slots, quote/bid branch state, approval history, and financial attachment visibility rules.
- Current implementation affects backend schema/API/tests for the solution design workflow foundation and this round's online form Excel template generation/download closure only. Frontend implementation, contract stage business implementation, file platform integration, SQL import, PDF/Word/extra-format artifact generation, archive, commit, and push are out of scope for this round.
