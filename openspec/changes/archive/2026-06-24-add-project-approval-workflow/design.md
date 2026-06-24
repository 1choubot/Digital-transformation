## Context

业务依据包括 `智能制造项目管理流程图20260610.pdf`、`AI数字化管理系统思维导图2026.6.23.pdf`、`docs/9.7_智能制造项目整体推进流程_20260610.md` 和 `docs/9.2_阶段资料清单与责任角色表_20260610.md`。现有系统已经完成 8 阶段、20260610 版 54 项资料清单、资料责任人、组织角色、项目经理用户关联、项目可见范围、阶段推进齐套门禁、附件和项目业务日志。

当前缺口是阶段审批流还没有统一模型：资料可以被确认或退回，阶段可以在齐套后推进，但系统尚未沉淀“项目经理发起阶段审批、匹配中心负责人审批、必要时总经理审批、退回后重新提交、审批历史追溯”的状态机。该缺口会阻塞后续消息通知、文件平台归档触发点、日报周报查看权限和管理层汇总统计。

本 change 只规划审批流，不实现业务代码。第一版只做阶段级审批，不做独立项目级审批。

## Goals / Non-Goals

**Goals:**

- 建立阶段审批状态模型。
- 建立审批动作和审批历史记录模型。
- 固定 8 个阶段的第一版审批节点规则。
- 固定阶段审批接口路径和错误码。
- 明确项目经理、员工、中心负责人、总经理、总经理助理和系统管理员的审批边界。
- 将阶段审批与当前阶段适用必填资料齐套门禁串联。
- 将阶段推进约束为“齐套 + 阶段审批通过 + 原有阶段推进规则”。
- 为审批提交、通过、退回、重新提交定义业务日志动作。
- 为前端项目详情页和阶段区域定义审批状态、操作入口和审批历史展示。

**Non-Goals:**

- 不做独立项目级审批、项目级审批单或 `stageId` 可为空的审批记录。
- 不做文件管理平台联动。
- 不做消息通知、自动提醒、催办消息或站内信。
- 不做日报、周报或日报周报查看权限。
- 不做中心负责人管理本部门员工。
- 不做复杂工作流引擎、可视化流程配置、任意节点编排或条件分支引擎。
- 不做项目成员表、技术负责人表或项目参与人表。
- 不做自动阶段流转、跳阶段、阶段回退或批量审批。
- 不修改 8 阶段名称和顺序，不修改 54 项资料模板。

## Decisions

### 1. 第一版只做阶段级审批

第一版审批目标固定为项目阶段。每个审批接口都必须通过 `projectId` 和 `stageId` 定位审批目标。

- 审批记录里的 `stageId` 第一版必须非空。
- 不保存独立项目级审批状态。
- 不创建项目级审批单。
- 不支持 `stageId` 为空的审批记录。
- 项目级审批、可空 `stageId` 和项目级审批单放入 Future Work。

### 2. 审批目标和唯一性

每个项目的每个阶段只有一个当前审批状态。

- 当前审批状态挂在项目阶段记录上。
- 审批历史记录只是历史流水，不作为当前状态来源。
- 退回后重新提交复用同一个阶段审批状态。
- 退回后重新提交不新建第二个当前审批目标。
- 审批历史可以有多条记录。

### 3. 审批状态模型

阶段审批状态使用稳定枚举：

- `not_submitted`
- `pending_center_manager`
- `returned_by_center_manager`
- `pending_general_manager`
- `returned_by_general_manager`
- `approved`
- `cancelled`

`closed` 暂不作为第一版状态，避免与项目 `completed` 或业务关闭混淆。若后续需要关闭审批单，再另起 change 明确关闭语义。

### 4. 审批动作

第一版固定动作只包括：

- `submit`
- `center_manager_approve`
- `center_manager_return`
- `general_manager_approve`
- `general_manager_return`
- `resubmit`

审批历史查询是只读查询接口，不是审批动作。查询历史不写审批记录，不写业务日志，不改变审批状态、项目状态、阶段状态或资料状态。

状态流转：

- `not_submitted` 提交后进入 `pending_center_manager`。
- `returned_by_center_manager` 或 `returned_by_general_manager` 重新提交后进入 `pending_center_manager`。
- 中心负责人通过后，如果当前阶段需要总经理审批，则进入 `pending_general_manager`。
- 中心负责人通过后，如果当前阶段不需要总经理审批，则直接进入 `approved`。
- 中心负责人退回后进入 `returned_by_center_manager`。
- 总经理通过后进入 `approved`。
- 总经理退回后进入 `returned_by_general_manager`。
- `approved`、`cancelled` 和非 pending 状态不得直接审批通过或退回。

### 5. 第一版审批节点规则

1. 阶段 1：立项阶段
   - 阶段 key：`initiation`
   - 中心负责人审批中心：营销中心
   - 是否需要总经理审批：是
   - 流转规则：项目经理提交后进入 `pending_center_manager`；营销中心负责人通过后进入 `pending_general_manager`；总经理通过后进入 `approved`。
   - 说明：立项涉及项目立项审批，第一版抽象为营销中心负责人审批加总经理审批。

2. 阶段 2：方案设计阶段
   - 阶段 key：`solution`
   - 中心负责人审批中心：研发中心
   - 是否需要总经理审批：否
   - 流转规则：项目经理提交后进入 `pending_center_manager`；研发中心负责人通过后直接进入 `approved`。
   - 说明：方案设计由研发中心主导，第一版只需要研发中心负责人审批。

3. 阶段 3：合同签订阶段
   - 阶段 key：`contract`
   - 中心负责人审批中心：营销中心
   - 是否需要总经理审批：是
   - 流转规则：项目经理提交后进入 `pending_center_manager`；营销中心负责人通过后进入 `pending_general_manager`；总经理通过后进入 `approved`。
   - 说明：销售合同和技术协议是关键商务节点，第一版需要总经理审批。

4. 阶段 4：详细设计阶段
   - 阶段 key：`detailedDesign`
   - 中心负责人审批中心：研发中心
   - 是否需要总经理审批：否
   - 流转规则：项目经理提交后进入 `pending_center_manager`；研发中心负责人通过后直接进入 `approved`。
   - 说明：详细设计由研发中心主导，第一版只需要研发中心负责人审批。

5. 阶段 5：生产制作阶段
   - 阶段 key：`manufacturing`
   - 中心负责人审批中心：制造中心
   - 是否需要总经理审批：否
   - 流转规则：项目经理提交后进入 `pending_center_manager`；制造中心负责人通过后直接进入 `approved`。
   - 说明：生产制作由制造中心主导，第一版只需要制造中心负责人审批。

6. 阶段 6：预验收阶段
   - 阶段 key：`preAcceptance`
   - 中心负责人审批中心：制造中心
   - 是否需要总经理审批：否
   - 流转规则：项目经理提交后进入 `pending_center_manager`；制造中心负责人通过后直接进入 `approved`。
   - 说明：预验收资料主要由制造中心形成，第一版只需要制造中心负责人审批。

7. 阶段 7：终验收阶段
   - 阶段 key：`finalAcceptance`
   - 中心负责人审批中心：制造中心
   - 是否需要总经理审批：否
   - 流转规则：项目经理提交后进入 `pending_center_manager`；制造中心负责人通过后直接进入 `approved`。
   - 说明：终验收资料主要由制造中心形成，第一版只需要制造中心负责人审批。

8. 阶段 8：结题阶段
   - 阶段 key：`closeout`
   - 中心负责人审批中心：项目经理所属中心
   - 是否需要总经理审批：是
   - 流转规则：项目经理提交后进入 `pending_center_manager`；项目经理所属中心的中心负责人通过后进入 `pending_general_manager`；总经理通过后进入 `approved`。
   - 说明：结题报告需要总经理确认；中心负责人审批归属固定为项目经理所属中心。
   - 特殊规则：如果项目经理没有部门，或者项目经理不属于运营中心、营销中心、制造中心、研发中心之一，则阶段 8 提交审批必须失败，返回 `PROJECT_APPROVAL_NOT_SUBMITTABLE`。

### 6. 审批记录模型

每次审批动作必须保存审批历史记录，至少包含：

- 项目 ID。
- 阶段 ID，第一版必须非空。
- 审批节点。
- 审批动作。
- 审批人。
- 审批角色。
- 审批意见或退回原因。
- 审批时间。
- 审批前状态。
- 审批后状态。

审批记录只追溯审批动作本身，不替代项目业务日志。审批成功动作仍需要写项目业务操作日志。

第一版审批历史查询不分页，排序固定为 `createdAt ASC, id ASC`。如果后续数据量变大，再另起 change 做分页、筛选或导出。

### 7. 角色边界

- 员工：提交和维护自己负责的资料，不审批项目或阶段。
- 项目经理：负责跟进资料齐套、协调责任人、发起审批、重新提交审批、查看自己负责项目全量进度，并在审批通过后推进自己负责项目。
- 中心负责人：只能审批第一版审批节点规则中匹配本中心的阶段，不得跨中心审批。
- 总经理：只处理阶段 1、阶段 3、阶段 8 的 `pending_general_manager` 审批。
- 总经理助理：只读查看和汇总，不确认资料、不退回资料、不推进阶段、不分配责任人、不审批、不代替总经理审批。
- 系统管理员：系统维护角色，不参与业务审批，不因 `isPlatformAdmin` 获得审批权。

项目经理不是审批人。如果项目经理同时是某中心负责人，其审批权来自中心负责人身份和本中心范围，而不是项目经理身份。

### 8. 审批与齐套、资料、附件的关系

提交当前阶段审批前，必须重新计算当前阶段齐套摘要。当前阶段适用必填资料未全部 `confirmed` 时，不得提交审批，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`。

资料责任人提交资料不等于审批通过。附件存在也不等于资料合格。资料必须先通过既有资料确认/退回状态机进入 `confirmed`，才能计入齐套并支撑阶段审批。

如果资料被退回，或审批时发现当前阶段仍存在未完成适用必填资料，则对应阶段不得通过审批，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`。

### 9. 阶段推进门禁

阶段推进必须同时满足：

- 当前阶段唯一且状态可推进。
- 当前阶段适用必填资料全部 `confirmed`。
- 当前阶段审批状态为 `approved`。
- 当前用户具备推进该项目的权限，例如该项目项目经理。

审批流不改变 8 阶段顺序，不支持跳阶段或回退。审批通过后也不自动推进阶段；阶段推进仍由项目经理显式触发。审批未通过导致不能推进时返回 `PROJECT_APPROVAL_NOT_APPROVED`。

### 10. 错误码

第一版固定以下错误码：

- 当前阶段缺少适用必填资料：`PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- 当前审批状态不能提交或重新提交：`PROJECT_APPROVAL_NOT_SUBMITTABLE`
- 当前审批状态不是待审批：`PROJECT_APPROVAL_NOT_PENDING`
- 当前审批未通过导致不能推进：`PROJECT_APPROVAL_NOT_APPROVED`
- 越权审批、越权提交、越权查看审批历史：`PROJECT_APPROVAL_FORBIDDEN`
- 非法退回原因：`INVALID_APPROVAL_COMMENT`
- 非法审批动作：`INVALID_APPROVAL_ACTION`
- 非法项目 ID：`INVALID_PROJECT_ID`
- 非法阶段 ID：`INVALID_PROJECT_STAGE_ID`
- 项目不存在：`PROJECT_NOT_FOUND`
- 阶段不存在或阶段不属于该项目：`PROJECT_STAGE_NOT_FOUND`

### 11. 固定接口路径

第一版接口路径固定为：

- 提交审批：`POST /api/projects/:projectId/stages/:stageId/approval/submit`
- 审批通过：`POST /api/projects/:projectId/stages/:stageId/approval/approve`
- 审批退回：`POST /api/projects/:projectId/stages/:stageId/approval/return`
- 重新提交：`POST /api/projects/:projectId/stages/:stageId/approval/resubmit`
- 查询历史：`GET /api/projects/:projectId/stages/:stageId/approval/history`

参数规则：

- `projectId` 必须是严格正整数。
- `stageId` 必须是严格正整数。
- `stageId` 必须属于该项目。
- 非法 `projectId` 返回 `INVALID_PROJECT_ID`。
- 非法 `stageId` 返回 `INVALID_PROJECT_STAGE_ID`。
- 项目不存在返回 `PROJECT_NOT_FOUND`。
- 阶段不存在或阶段不属于项目返回 `PROJECT_STAGE_NOT_FOUND`。

## Risks / Trade-offs

- 审批节点过度配置化会演变成复杂工作流引擎 -> 第一版使用固定 8 阶段审批规则，不提供可视化编排。
- 审批与资料确认混淆会导致“上传附件即通过” -> specs 明确附件、资料提交、资料确认和审批通过是不同概念。
- 项目经理权限被误扩大为审批权 -> specs 明确项目经理只能发起、协调和推进，不能替代中心负责人或总经理审批。
- 总经理助理或系统管理员通过绕过前端执行审批 -> 后端必须强制拒绝对应接口。
- 审批状态与阶段状态不一致 -> 阶段推进时必须重新校验审批状态和齐套状态，失败不得改变项目或阶段状态。

## Migration Plan

后续实现需要新增数据库迁移，保存项目阶段当前审批状态和阶段审批历史记录。开发阶段模拟数据不做历史兼容迁移；如需要初始化已有开发项目审批状态，可作为开发库初始化脚本处理，不作为长期业务兼容设计。

实现顺序建议：先迁移和领域模型，再审批状态机和权限校验，再接口和业务日志，最后前端展示与操作。

## Future Work

- 第一版审批历史不分页，排序固定为 `createdAt ASC, id ASC`。如果后续数据量变大，再另起 change 做分页、筛选或导出。
