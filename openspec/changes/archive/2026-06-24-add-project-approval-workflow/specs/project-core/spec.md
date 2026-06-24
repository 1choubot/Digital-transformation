## ADDED Requirements

### Requirement: 阶段审批流状态模型
系统 MUST 为每个项目阶段维护唯一当前审批状态，并 MUST 在第一版只支持阶段级审批。

#### Scenario: 第一版只支持阶段级审批
- **WHEN** 系统创建、查询或处理审批目标
- **THEN** 审批目标必须绑定到项目阶段，审批记录中的 `stageId` 必须非空

#### Scenario: 不支持独立项目级审批
- **WHEN** 用户尝试创建不绑定阶段的项目级审批
- **THEN** 系统必须拒绝该能力边界，不得创建项目级审批单或可空 `stageId` 的审批记录

#### Scenario: 审批状态枚举
- **WHEN** 系统保存阶段审批状态
- **THEN** 审批状态必须是 `not_submitted`、`pending_center_manager`、`returned_by_center_manager`、`pending_general_manager`、`returned_by_general_manager`、`approved` 或 `cancelled` 之一

#### Scenario: 每项目每阶段唯一当前审批状态
- **WHEN** 系统保存项目阶段审批状态
- **THEN** 每个项目的每个阶段必须只有一个当前审批状态，且该状态必须挂在项目阶段记录上

#### Scenario: 审批记录不是当前状态来源
- **WHEN** 系统判断某阶段当前审批状态
- **THEN** 系统必须读取项目阶段记录上的当前审批状态，不得把审批历史记录聚合结果作为当前状态来源

#### Scenario: 退回后重新提交复用同一审批目标
- **WHEN** 阶段审批被退回后项目经理重新提交
- **THEN** 系统必须复用同一个阶段审批状态，不得创建第二个当前审批目标

#### Scenario: 审批历史允许多条记录
- **WHEN** 阶段审批经过提交、退回、重新提交或审批通过
- **THEN** 系统可以保存多条审批历史记录，但当前审批状态仍只能有一个

### Requirement: 阶段审批接口和参数校验
系统 MUST 使用固定阶段审批接口路径，并 MUST 严格校验项目 ID、阶段 ID 和阶段归属。

#### Scenario: 提交审批接口路径
- **WHEN** 用户提交阶段审批
- **THEN** 系统必须使用 `POST /api/projects/:projectId/stages/:stageId/approval/submit`

#### Scenario: 审批通过接口路径
- **WHEN** 用户审批通过阶段审批
- **THEN** 系统必须使用 `POST /api/projects/:projectId/stages/:stageId/approval/approve`

#### Scenario: 审批退回接口路径
- **WHEN** 用户退回阶段审批
- **THEN** 系统必须使用 `POST /api/projects/:projectId/stages/:stageId/approval/return`

#### Scenario: 重新提交接口路径
- **WHEN** 项目经理重新提交已退回阶段审批
- **THEN** 系统必须使用 `POST /api/projects/:projectId/stages/:stageId/approval/resubmit`

#### Scenario: 审批历史接口路径
- **WHEN** 用户查询阶段审批历史
- **THEN** 系统必须使用 `GET /api/projects/:projectId/stages/:stageId/approval/history`

#### Scenario: 非法项目 ID
- **WHEN** `projectId` 不是严格正整数
- **THEN** 系统必须返回 `INVALID_PROJECT_ID`

#### Scenario: 非法阶段 ID
- **WHEN** `stageId` 不是严格正整数
- **THEN** 系统必须返回 `INVALID_PROJECT_STAGE_ID`

#### Scenario: 项目不存在
- **WHEN** `projectId` 合法但项目不存在
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND`

#### Scenario: 阶段不存在或不属于项目
- **WHEN** `stageId` 合法但阶段不存在或阶段不属于该项目
- **THEN** 系统必须返回 `PROJECT_STAGE_NOT_FOUND`

### Requirement: 第一版审批节点规则
系统 MUST 按固定 8 阶段审批节点规则确定阶段审批中心和是否需要总经理审批。

#### Scenario: 阶段 1 立项审批规则
- **WHEN** 阶段 key 为 `initiation`
- **THEN** 审批中心必须是营销中心，且必须需要总经理审批

#### Scenario: 阶段 2 方案设计审批规则
- **WHEN** 阶段 key 为 `solution`
- **THEN** 审批中心必须是研发中心，且不得需要总经理审批

#### Scenario: 阶段 3 合同签订审批规则
- **WHEN** 阶段 key 为 `contract`
- **THEN** 审批中心必须是营销中心，且必须需要总经理审批

#### Scenario: 阶段 4 详细设计审批规则
- **WHEN** 阶段 key 为 `detailedDesign`
- **THEN** 审批中心必须是研发中心，且不得需要总经理审批

#### Scenario: 阶段 5 生产制作审批规则
- **WHEN** 阶段 key 为 `manufacturing`
- **THEN** 审批中心必须是制造中心，且不得需要总经理审批

#### Scenario: 阶段 6 预验收审批规则
- **WHEN** 阶段 key 为 `preAcceptance`
- **THEN** 审批中心必须是制造中心，且不得需要总经理审批

#### Scenario: 阶段 7 终验收审批规则
- **WHEN** 阶段 key 为 `finalAcceptance`
- **THEN** 审批中心必须是制造中心，且不得需要总经理审批

#### Scenario: 阶段 8 结题审批规则
- **WHEN** 阶段 key 为 `closeout`
- **THEN** 审批中心必须是项目经理所属中心，且必须需要总经理审批

#### Scenario: 阶段 8 项目经理没有有效部门
- **WHEN** 阶段 key 为 `closeout` 且项目经理没有部门或部门不是 `operations_center`、`marketing_center`、`manufacturing_center`、`rd_center` 之一
- **THEN** 系统必须拒绝提交审批，并返回 `PROJECT_APPROVAL_NOT_SUBMITTABLE`

### Requirement: 阶段审批动作状态机
系统 MUST 提供提交审批、中心负责人审批、总经理审批、退回和重新提交能力，并 MUST 使用固定错误码拒绝非法动作。

#### Scenario: 提交审批
- **WHEN** 项目经理对自己负责项目的当前阶段提交审批，审批状态为 `not_submitted`，且当前阶段适用必填资料全部 `confirmed`
- **THEN** 系统必须将对应审批状态流转为 `pending_center_manager`

#### Scenario: 当前阶段未齐套不能提交审批
- **WHEN** 当前阶段存在未完成适用必填资料
- **THEN** 系统必须拒绝提交审批，返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`，且不得改变审批状态

#### Scenario: 当前审批状态不能提交
- **WHEN** 当前审批状态不是 `not_submitted` 且用户调用提交审批接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_NOT_SUBMITTABLE`，且不得改变审批状态

#### Scenario: 重新提交审批
- **WHEN** 项目经理对自己负责项目中审批状态为 `returned_by_center_manager` 或 `returned_by_general_manager` 的阶段重新提交，且当前阶段仍满足提交条件
- **THEN** 系统必须将审批状态重新流转为 `pending_center_manager`

#### Scenario: 当前审批状态不能重新提交
- **WHEN** 当前审批状态不是 `returned_by_center_manager` 或 `returned_by_general_manager` 且用户调用重新提交接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_NOT_SUBMITTABLE`，且不得改变审批状态

#### Scenario: 不需要总经理审批的阶段中心负责人通过
- **WHEN** 阶段 2、阶段 4、阶段 5、阶段 6 或阶段 7 处于 `pending_center_manager` 且匹配中心负责人执行通过
- **THEN** 系统必须将审批状态直接流转为 `approved`

#### Scenario: 需要总经理审批的阶段中心负责人通过
- **WHEN** 阶段 1、阶段 3 或阶段 8 处于 `pending_center_manager` 且匹配中心负责人执行通过
- **THEN** 系统必须将审批状态流转为 `pending_general_manager`

#### Scenario: 中心负责人退回审批
- **WHEN** 匹配中心负责人在 `pending_center_manager` 状态填写非空退回原因执行退回
- **THEN** 系统必须将审批状态流转为 `returned_by_center_manager`

#### Scenario: 总经理通过审批
- **WHEN** 阶段 1、阶段 3 或阶段 8 处于 `pending_general_manager` 且总经理执行通过
- **THEN** 系统必须将审批状态流转为 `approved`

#### Scenario: 总经理退回审批
- **WHEN** 阶段 1、阶段 3 或阶段 8 处于 `pending_general_manager` 且总经理填写非空退回原因执行退回
- **THEN** 系统必须将审批状态流转为 `returned_by_general_manager`

#### Scenario: 当前审批状态不是待审批
- **WHEN** 用户调用审批通过或审批退回接口，但当前审批状态不是 `pending_center_manager` 或 `pending_general_manager`
- **THEN** 系统必须返回 `PROJECT_APPROVAL_NOT_PENDING`，并且不得改变项目、阶段或审批状态

#### Scenario: 非法审批动作
- **WHEN** 用户提交不支持的审批动作
- **THEN** 系统必须返回 `INVALID_APPROVAL_ACTION`，并且不得改变项目、阶段或审批状态

#### Scenario: 退回原因必填
- **WHEN** 中心负责人或总经理退回审批但未填写非空审批意见或退回原因
- **THEN** 系统必须返回 `INVALID_APPROVAL_COMMENT`，并且不得改变审批状态

### Requirement: 阶段审批权限边界
系统 MUST 在后端强制校验审批权限，不得只依赖前端隐藏按钮。

#### Scenario: 项目经理可以发起自己负责项目审批
- **WHEN** 当前用户是该项目 `projectManagerUserId`
- **THEN** 系统可以允许其在齐套条件满足时提交或重新提交该项目阶段审批

#### Scenario: 非项目经理不能提交审批
- **WHEN** 当前用户不是该项目 `projectManagerUserId` 且调用提交或重新提交接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 系统根据第一版审批节点规则确定审批中心
- **WHEN** 系统处理中心负责人审批通过或退回
- **THEN** 系统必须根据当前阶段的第一版审批节点规则确定唯一审批中心

#### Scenario: 匹配中心负责人可以审批
- **WHEN** 当前用户 `organizationRole = center_manager` 且 `department` 匹配当前阶段审批中心
- **THEN** 系统可以允许其处理 `pending_center_manager` 的审批通过或退回

#### Scenario: 其他中心负责人审批失败
- **WHEN** 当前用户是中心负责人但 `department` 不匹配当前阶段审批中心
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 员工不能执行中心负责人审批
- **WHEN** 当前用户 `organizationRole = employee` 且调用中心负责人审批通过或退回
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 项目经理不能替代中心负责人审批
- **WHEN** 当前用户仅因项目经理身份调用中心负责人审批通过或退回接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 总经理助理不能执行中心负责人审批
- **WHEN** 当前用户 `organizationRole = general_manager_assistant` 且调用中心负责人审批通过或退回
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 系统管理员不能执行中心负责人审批
- **WHEN** 当前用户 `organizationRole = system_admin` 且调用中心负责人审批通过或退回
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 只有总经理可以处理总经理审批
- **WHEN** 阶段审批状态为 `pending_general_manager`
- **THEN** 只有 `organizationRole = general_manager` 的用户可以审批通过或退回

#### Scenario: 总经理只能处理需要总经理审批的阶段
- **WHEN** 总经理对阶段 2、阶段 4、阶段 5、阶段 6 或阶段 7 调用总经理审批动作
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 项目经理不能替代总经理审批
- **WHEN** 当前用户仅因项目经理身份调用总经理审批通过或退回接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 总经理助理不得审批
- **WHEN** `organizationRole = general_manager_assistant` 的用户直接调用审批提交、通过、退回或代替总经理审批接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 系统管理员不得业务审批
- **WHEN** `organizationRole = system_admin` 的用户直接调用审批通过、退回或阶段推进审批相关接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 审批失败无副作用
- **WHEN** 审批操作因权限、状态、参数或齐套校验失败
- **THEN** 系统不得改变项目状态、阶段状态、审批状态、资料状态或业务日志

### Requirement: 阶段审批历史
系统 MUST 为每次成功审批动作保存审批历史记录，并 MUST 支持按项目阶段查询只读审批历史。

#### Scenario: 保存审批记录字段
- **WHEN** 审批动作成功
- **THEN** 系统必须保存项目 ID、非空阶段 ID、审批节点、审批动作、审批人、审批角色、审批意见或退回原因、审批时间、审批前状态和审批后状态

#### Scenario: 审批历史查询
- **WHEN** 已登录且有权查看项目阶段审批历史的用户查询审批历史
- **THEN** 系统必须按 `createdAt ASC, id ASC` 返回该项目该阶段的审批记录

#### Scenario: 审批历史为空
- **WHEN** 已登录且有权查看项目阶段审批历史的用户查询审批历史，但该阶段没有审批记录
- **THEN** 系统必须返回空列表，且空列表不是错误

#### Scenario: 审批历史不分页
- **WHEN** 用户查询第一版审批历史
- **THEN** 系统必须返回该阶段审批历史列表，不得要求分页参数

#### Scenario: 越权查看审批历史
- **WHEN** 用户无权查看该项目阶段审批历史
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 审批历史只读
- **WHEN** 用户查询审批历史
- **THEN** 系统不得写审批记录、不得写业务日志、不得改变审批状态、项目状态、阶段状态或资料状态

### Requirement: 阶段审批流与阶段推进约束
系统 MUST 要求当前阶段审批通过后才允许阶段推进，并 MUST 保持原有齐套门禁和标准 8 阶段顺序。

#### Scenario: 审批未提交不能推进
- **WHEN** 当前阶段审批状态为 `not_submitted`
- **THEN** 系统必须拒绝阶段推进，并返回 `PROJECT_APPROVAL_NOT_APPROVED`

#### Scenario: 审批待处理不能推进
- **WHEN** 当前阶段审批状态为 `pending_center_manager` 或 `pending_general_manager`
- **THEN** 系统必须拒绝阶段推进，并返回 `PROJECT_APPROVAL_NOT_APPROVED`

#### Scenario: 审批被退回不能推进
- **WHEN** 当前阶段审批状态为 `returned_by_center_manager` 或 `returned_by_general_manager`
- **THEN** 系统必须拒绝阶段推进，并返回 `PROJECT_APPROVAL_NOT_APPROVED`

#### Scenario: 审批通过后仍需齐套门禁
- **WHEN** 当前阶段审批状态为 `approved` 但当前阶段适用必填资料不再齐套
- **THEN** 系统必须拒绝阶段推进，并返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`

#### Scenario: 审批通过且齐套后允许推进
- **WHEN** 当前阶段审批状态为 `approved`、当前阶段适用必填资料全部 `confirmed`、阶段状态合法且当前用户具备推进权限
- **THEN** 系统必须允许按标准 8 阶段顺序执行阶段推进

## MODIFIED Requirements

### Requirement: 20260610 阶段推进边界
系统 MUST 在 20260610 项目流程依据下继续使用当前阶段齐套门禁推进项目阶段，并 MUST 在本 change 引入的阶段审批流中要求当前阶段审批通过后才允许推进。系统 MUST 不因审批流新增跳阶段、回退、自动阶段流转或复杂工作流引擎。

#### Scenario: 阶段推进继续基于当前阶段齐套门禁
- **WHEN** 已登录且有推进权限的用户请求推进项目当前阶段
- **THEN** 系统必须继续只检查当前阶段适用必填资料齐套情况，并在满足门禁和审批状态后按 8 阶段顺序推进

#### Scenario: 阶段推进要求当前阶段审批通过
- **WHEN** 用户请求推进项目当前阶段且当前阶段审批状态不是 `approved`
- **THEN** 系统必须返回 `PROJECT_APPROVAL_NOT_APPROVED`，并不得修改项目或阶段状态

#### Scenario: 不新增跳阶段或回退
- **WHEN** 系统按 20260610 流程和审批流推进项目阶段
- **THEN** 系统不得新增跳阶段、阶段回退、任意选择目标阶段或自由调整阶段顺序能力

#### Scenario: 不新增复杂审批流引擎
- **WHEN** 系统实现阶段审批流
- **THEN** 系统不得新增可视化流程编排、任意节点配置器、自动通知、日报周报或文件管理平台联动能力
