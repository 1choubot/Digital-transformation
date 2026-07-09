# project-core Specification

## Purpose
TBD - created by archiving change add-project-core. Update Purpose after archive.
## Requirements
### Requirement: 项目主数据

系统 MUST 以数字化管理平台保存项目主数据。项目主数据至少包括可空项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划开始时间、计划完成时间、备注和可空 `createdByUserId`；非空项目编号 MUST 唯一，多个空项目编号 MUST 允许共存。

#### Scenario: 创建项目主数据允许空编号
- **WHEN** 已登录且有权限用户提交项目名称、客户和项目经理等创建项目所需基础信息
- **THEN** 系统 MUST 在数字化管理平台创建项目主数据记录
- **AND** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST 记录 `createdByUserId`

#### Scenario: 非空项目编号唯一
- **WHEN** 用户填写、生成或更新非空项目编号
- **THEN** 系统 MUST 校验该项目编号唯一
- **AND** 系统 MUST 拒绝与已有非空项目编号重复的保存请求

#### Scenario: 空项目编号不冲突
- **WHEN** 多个项目尚未生成项目编号
- **THEN** 系统 MUST 允许这些项目同时保持空 `projectCode`

#### Scenario: 项目初始状态
- **WHEN** 项目创建成功
- **THEN** 系统必须将项目状态初始化为正常，除非创建请求明确提供其他允许的基础状态

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建请求 MUST 只要求项目名称、客户和客户联系方式作为必填业务字段，创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、当前 20260625 64 项项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入，并 MUST NOT 因 `projectCode`、项目经理、项目模式、参与中心、计划开始时间、计划结束时间或立项日期为空拒绝创建。`1.2 项目立项审批表` 后置项目编号门禁 MUST 使用营销评价完成、研发评价完成和总经理最终审批通过的派生状态，而不是普通单资料 `confirmed` 状态或旧三审批节点全部通过状态。

#### Scenario: 轻量创建项目

- **WHEN** 已登录且有创建项目权限的用户提交项目名称、客户和客户联系方式
- **THEN** 系统 MUST 创建项目主数据记录
- **AND** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST 记录 `createdByUserId`
- **AND** 系统 MUST 初始化标准 8 阶段和当前 20260625 64 项项目级阶段资料清单
- **AND** 系统 MUST 写入 `project.created` 项目业务操作日志

#### Scenario: 创建不要求后置字段

- **WHEN** 用户创建项目时未提交项目经理、项目模式、参与中心、计划开始时间、计划结束时间或立项日期
- **THEN** 系统 MUST NOT 因这些字段为空拒绝创建
- **AND** 系统 MUST 将这些字段保留为后续 change 可规划的补录字段
- **AND** 本 change MUST NOT 要求当前实现第二阶段补录能力

#### Scenario: 后置项目编号触发点

- **WHEN** `1.2 项目立项审批表` 已提交并完成营销评价和研发评价
- **AND** 总经理已审批通过 `1.2 项目立项审批表`
- **AND** `1.3 项目立项通知` 已按在线表单提交或上传完成
- **AND** `1.1 项目需求表` 不存在由 `1.2` 总经理审批不通过触发且未清除的 `revision_required`
- **AND** `1.2 项目立项审批表` 不存在待填写、待评价、待审批、审批不通过后需重填或其他专用阻塞状态
- **THEN** 系统 MUST 允许具备项目维护权限、项目经理权限或等价业务项目编号维护权限的用户填写或生成 `projectCode`
- **AND** 系统 MUST NOT 将仅系统管理员身份解释为业务项目编号维护权限

#### Scenario: 评价未完成不得填写项目编号

- **WHEN** `1.2 项目立项审批表` 的营销评价或研发评价任一项尚未完成
- **THEN** 系统 MUST NOT 允许填写或生成 `projectCode`
- **AND** 系统 MUST 返回可理解的门禁未满足原因

#### Scenario: 总经理未通过不得填写项目编号

- **WHEN** `1.2 项目立项审批表` 的总经理最终审批尚未通过
- **THEN** 系统 MUST NOT 允许填写或生成 `projectCode`
- **AND** 系统 MUST 返回可理解的门禁未满足原因

### Requirement: 标准 8 阶段初始化

系统 MUST 在项目创建成功后为项目初始化标准 8 阶段，阶段必须包含顺序、阶段标识、阶段名称和阶段状态，并作为项目级阶段资料清单分组依据。

#### Scenario: 初始化阶段顺序

- **WHEN** 项目创建成功
- **THEN** 系统必须按顺序生成立项阶段、方案设计阶段、合同签订阶段、详细设计阶段、生产制作阶段、预验收阶段、终验收阶段和结题阶段

#### Scenario: 初始化阶段标识

- **WHEN** 系统生成标准 8 阶段记录
- **THEN** 每个阶段必须保存稳定阶段标识：`initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout`

#### Scenario: 初始化当前阶段

- **WHEN** 系统完成 8 阶段初始化
- **THEN** 立项阶段必须被标记为当前阶段，其他阶段必须处于未开始状态

#### Scenario: 阶段资料清单随项目初始化

- **WHEN** 系统完成项目创建和 8 阶段初始化
- **THEN** 系统必须为该项目生成按 8 阶段归属的项目级阶段资料清单

#### Scenario: 阶段初始化不生成排除能力

- **WHEN** 系统完成项目创建、8 阶段初始化和阶段资料清单初始化
- **THEN** 除项目创建事务按业务操作日志能力记录 `project.created` 外，系统不能在本能力中生成在线表单填写记录、文件上传记录、文件归档记录、资料齐套率结果或阶段推进记录

### Requirement: 项目列表

系统 MUST 提供项目列表，用于查看当前用户有权查看的项目基础信息、项目状态、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目列表

- **WHEN** 用户打开项目列表
- **THEN** 系统必须按“项目可见范围”过滤后展示项目编号、项目名称、客户、项目经理、项目状态、当前阶段、计划开始时间、计划完成时间和创建人基础信息或创建人字段

#### Scenario: 管理层项目列表全量查看

- **WHEN** 总经理、总经理助理或中心负责人打开项目列表
- **THEN** 系统 MUST 返回全部业务项目的列表项
- **AND** 系统 MUST NOT 因返回列表项而授予任何项目内业务操作权限

#### Scenario: 创建人项目列表查看自己创建项目

- **WHEN** 当前用户是某项目 `createdByUserId`
- **THEN** 系统 MUST 允许该用户在项目列表中看到该项目

#### Scenario: 已完成项目当前阶段为空

- **WHEN** 项目 `status` 为 `completed` 且所有 8 个阶段均已完成
- **THEN** 系统必须允许项目列表中的当前阶段为空或展示为已完成状态，并不得因此阻止列表读取

#### Scenario: 历史项目列表创建人为空

- **WHEN** 项目列表包含 `createdByUserId` 为空的历史项目
- **THEN** 系统必须允许创建人基础信息为空，并继续按项目可见范围判断是否返回该项目

#### Scenario: 从列表进入项目详情

- **WHEN** 用户在项目列表中选择某个可见项目
- **THEN** 系统必须打开该项目的项目详情基础状态页

#### Scenario: 列表不展示看板指标

- **WHEN** 用户打开项目列表
- **THEN** 系统不能在本能力中展示管理层看板指标、资料齐套率、资料缺失统计或文件归档状态

### Requirement: 项目详情基础状态

系统 MUST 提供项目详情基础状态，用于有项目查看权的用户查看项目主数据、标准 8 阶段、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目基础信息

- **WHEN** 有项目查看权的用户打开项目详情
- **THEN** 系统必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段

#### Scenario: 查看历史项目详情

- **WHEN** 有项目查看权的用户打开 `createdByUserId` 为空的历史项目详情
- **THEN** 系统必须允许创建人基础信息为空，并继续展示项目基础状态

#### Scenario: 查看 8 阶段基础进度

- **WHEN** 有项目查看权的用户打开项目详情
- **THEN** 系统必须展示该项目的全部 8 个阶段、阶段顺序、阶段名称、阶段状态和当前阶段标记

#### Scenario: 已完成项目没有当前阶段

- **WHEN** 有项目查看权的用户打开 `status` 为 `completed` 且所有 8 个阶段均已完成的项目详情
- **THEN** 系统必须允许当前阶段为空，并继续展示项目基础状态和 8 阶段完成状态

#### Scenario: 项目详情查看不放宽操作权限

- **WHEN** 用户因总经理、总经理助理、中心负责人、项目创建人或项目经理身份获得项目详情查看权
- **THEN** 系统 MUST NOT 因该查看权授予阶段推进、项目编号填写、责任人分配、适用性变更、资料提交、资料审核、资料退回或精准返工退回权限

#### Scenario: 项目基础状态接口职责边界

- **WHEN** 有项目查看权的用户请求 `GET /api/projects/:projectId`
- **THEN** 该接口 MUST 只承载项目主数据、标准 8 阶段基础状态、当前阶段和创建人追溯字段
- **AND** 阶段资料清单、附件列表/下载、业务日志、齐套摘要 MUST 由阶段资料、附件、日志、总览/齐套等独立接口承载，供项目详情页组合展示
- **AND** 该接口 MUST NOT 展示或依赖文件平台同步状态
- **AND** 系统 MUST NOT 因项目详情基础状态接口恢复文件平台联动

### Requirement: 项目阶段手工推进

系统 MUST 提供项目阶段手工推进能力，已登录用户只能推进项目当前阶段，目标阶段必须由服务端根据标准 8 阶段顺序自动确定；推进成功后 MUST 记录项目业务操作日志。

#### Scenario: 阶段推进要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `POST /api/projects/:projectId/stages/advance`
- **THEN** 系统必须拒绝推进，并提示需要登录

#### Scenario: 阶段推进不做角色权限

- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只校验登录态、项目阶段状态和齐套门禁，不得在本能力中校验项目经理角色、复杂权限、角色权限或轻角色规则

#### Scenario: 项目必须存在

- **WHEN** 已登录用户请求推进不存在的项目
- **THEN** 系统必须拒绝推进，并返回项目不存在错误

#### Scenario: 只推进当前阶段

- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须根据服务端保存的当前阶段执行推进，不得要求或信任前端提交的目标阶段、目标阶段顺序或目标阶段标识

#### Scenario: 当前阶段必须唯一

- **WHEN** 项目没有当前阶段或存在多个当前阶段
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 当前阶段必须为 current

- **WHEN** 项目唯一当前阶段的 `stage_status` 不是 `current`
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 按标准顺序推进到下一阶段

- **WHEN** 当前阶段不是第 8 阶段、当前阶段适用必填资料齐套，且下一阶段存在、顺序为 `current.stage_order + 1`、`stage_status` 为 `not_started`、`is_current` 为 `0`
- **THEN** 系统必须在事务中将当前阶段 `stage_status` 改为 `completed`、`is_current` 改为 `0`、记录 `completed_at`，并将下一顺序阶段 `stage_status` 改为 `current`、`is_current` 改为 `1`、记录 `started_at`

#### Scenario: 下一阶段必须可接收推进

- **WHEN** 当前阶段不是第 8 阶段，但下一阶段不存在、下一阶段顺序不是 `current.stage_order + 1`、下一阶段 `stage_status` 不是 `not_started` 或下一阶段 `is_current` 不是 `0`
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 不支持跳阶段或回退

- **WHEN** 用户试图通过请求参数、请求体或其他前端输入指定跳阶段、回退阶段或任意目标阶段
- **THEN** 系统必须忽略或拒绝该输入，并且只能按当前阶段的下一顺序阶段推进

#### Scenario: 第 8 阶段推进完成项目

- **WHEN** 当前阶段是第 8 阶段 `closeout` 且当前阶段适用必填资料齐套
- **THEN** 系统必须在事务中将该阶段 `stage_status` 改为 `completed`、`is_current` 改为 `0`、记录 `completed_at`，并将项目 `status` 改为 `completed`，且项目不再有当前阶段

#### Scenario: 已完成项目不能继续推进

- **WHEN** 项目 `status` 为 `completed`
- **THEN** 系统必须拒绝阶段推进请求，并且不得修改项目状态或任何阶段状态

#### Scenario: 已完成项目异常残留当前阶段仍不能推进

- **WHEN** 项目 `status` 为 `completed`，但异常数据中仍存在 `is_current = 1` 的阶段
- **THEN** 系统必须拒绝阶段推进请求，并且不得修改项目状态或任何阶段状态

#### Scenario: 阶段推进成功记录业务日志

- **WHEN** 已登录用户成功推进项目阶段
- **THEN** 系统必须从 `req.auth.user.id` 传入 `userId`，并在同一事务中记录 `action_type = stage.advanced` 且 `target_type = stage` 的项目业务操作日志，日志 `actor_user_id` 必须使用该 `userId`

#### Scenario: 第 8 阶段完成项目记录业务日志

- **WHEN** 第 8 阶段 `closeout` 推进成功并使项目 `status` 变为 `completed`
- **THEN** 系统必须在同一事务中额外记录 `action_type = project.completed` 且 `target_type = project` 的项目业务操作日志，日志 `actor_user_id` 必须使用阶段推进请求的当前登录用户 `userId`

#### Scenario: 阶段推进日志失败回滚业务变更

- **WHEN** 阶段状态或项目完成状态已经准备提交，但 `stage.advanced` 或 `project.completed` 业务操作日志写入失败
- **THEN** 系统必须回滚阶段推进事务，不得修改项目状态或任何阶段状态

#### Scenario: 阶段推进不生成排除能力

- **WHEN** 阶段推进成功或失败
- **THEN** 除本变更定义的项目业务操作日志外，系统不得在本能力中执行阶段回退、批量推进、审批流、阶段推进操作人完整日志、管理层看板、文件上传、文件下载、文件管理平台联动、在线表单、责任人分配、个人待办或通知

### Requirement: 阶段推进齐套门禁

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化，并 MUST 只按当前阶段适用资料的 `completionMode`、基础状态、适用性、`revision_required` 和特殊资料派生完成规则判断阶段推进门禁；`1.2 项目立项审批表` MUST 由在线表单提交、营销评价完成、研发评价完成、总经理最终审批通过和相关返工清除共同派生完成，不得只按普通单资料 `confirmed` 或旧三审批节点通过判断。

#### Scenario: 1.2 评价或审批未完成阻塞推进

- **WHEN** 第 1 阶段包含适用的 `1.2 项目立项审批表`
- **AND** 营销评价、研发评价或总经理最终审批中任一必需环节尚未完成
- **THEN** 系统 MUST 将 `1.2` 视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进

#### Scenario: 评价完成不等于最终通过

- **WHEN** `1.2 项目立项审批表` 已完成营销评价和研发评价
- **AND** 总经理最终审批尚未通过
- **THEN** 系统 MUST NOT 将 `1.2` 计为阶段齐套完成
- **AND** 系统 MUST NOT 因两项评价完成允许第 1 阶段推进

#### Scenario: 1.2 相关返工阻塞推进

- **WHEN** `1.2 项目立项审批表` 总经理审批不通过已触发 `1.1 项目需求表` 精准返工
- **AND** `1.1` 存在未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 相关门禁视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进

#### Scenario: 1.2 重新填写阻塞推进

- **WHEN** `1.2 项目立项审批表` 因总经理审批不通过处于需重新填写状态
- **THEN** 系统 MUST 将 `1.2` 视为未完成
- **AND** 系统 MUST 拒绝第 1 阶段推进

#### Scenario: 1.2 最终通过后参与普通齐套

- **WHEN** `1.2 项目立项审批表` 已提交在线表单
- **AND** 营销评价和研发评价均已完成
- **AND** 总经理最终审批已通过
- **AND** `1.1` 不存在由 `1.2` 总经理审批不通过触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 按专用派生完成规则计为已完成
- **AND** 第 1 阶段仍 MUST 继续检查其他适用资料是否按各自 `completionMode` 完成

### Requirement: 项目总览看板查询接口

系统 MUST 提供 `GET /api/projects/overview-dashboard`，用于已登录用户查询其有权查看项目的跨项目总览数据和汇总指标，并 MUST 按当前 20260625 `completionMode` 与 `revision_required` 派生完成口径返回我的待办资料任务数量；当前阶段齐套摘要和未完成资料明细 MUST 仅在当前用户拥有该项目完整资料查看权时返回。

#### Scenario: 返回项目总览汇总指标

- **WHEN** 系统返回项目总览看板数据
- **THEN** 响应必须包含 `summary`
- **AND** `summary` 至少包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`

#### Scenario: 总览按项目查看范围返回项目

- **WHEN** 总经理、总经理助理或中心负责人查询项目总览
- **THEN** 系统 MUST 按全量项目范围返回总览项目和汇总指标
- **AND** 系统 MUST NOT 因总览可见性放宽而放宽任何阶段推进或资料操作权限

#### Scenario: 创建人总览可见自己创建项目

- **WHEN** 项目创建人查询项目总览
- **THEN** 系统 MUST 在可见项目范围中包含其 `createdByUserId` 匹配的项目

#### Scenario: 汇总我的待办资料任务

- **WHEN** 系统计算 `myPendingStageDocumentTasks`
- **THEN** 系统必须使用当前登录用户 ID，按资料责任人、适用性、`completionMode` 和 `revision_required` 派生完成状态统计待办资料任务数量
- **AND** 系统 MUST 将当前用户负责且 `revision_required = true` 的适用资料计入待办
- **AND** 系统 MUST NOT 将 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料计入待办
- **AND** 系统 MUST NOT 将 `isApplicable = false` 的未触发 `conditional_submit` 资料计入待办

#### Scenario: 当前阶段正常返回齐套摘要

- **WHEN** 当前用户拥有该项目完整资料查看权，且项目存在唯一当前阶段且当前阶段存在资料项记录
- **THEN** 系统必须返回该当前阶段的 `currentStageCompletenessSummary`
- **AND** 摘要至少包含 `requiredTotal`、`completedRequiredCount` 或等价完成数量、`incompleteRequiredCount` 和 `completionPercent`
- **AND** 如为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 等同按 `completionMode` 与 `revision_required` 派生的完成数量，不得只统计 `status = confirmed`

#### Scenario: 当前阶段缺失资料列表字段

- **WHEN** 当前用户拥有该项目完整资料查看权，并且当前阶段存在未按 `completionMode` 完成或 `revision_required = true` 的适用资料
- **THEN** `currentStageIncompleteRequiredDocuments` 中每个资料项必须至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode`、返工标记和 `isComplete`、`completionStatus` 或等价派生完成状态

#### Scenario: 普通员工受限总览不返回完整齐套明细

- **WHEN** 普通员工仅因负责项目中某个资料项而可见该项目总览卡片
- **THEN** 系统 MAY 返回项目基础卡片字段，用于识别项目
- **AND** 系统 MUST NOT 返回该项目完整当前阶段齐套摘要
- **AND** 系统 MUST NOT 返回该项目中当前用户无权查看的未完成资料编号、名称、状态或 `completionMode`
- **AND** `myPendingStageDocumentTasks` 仍 MUST 只按当前登录用户的责任资料统计

### Requirement: 项目总览看板筛选与排序

系统 MUST 支持项目总览看板的基础筛选，并 MUST 使用稳定错误码处理非法筛选参数。

#### Scenario: 按项目状态筛选

- **WHEN** 已登录用户使用合法 `status` 请求项目总览看板
- **THEN** 系统必须只返回该项目状态匹配的项目，并按同一结果计算筛选后的项目数量指标

#### Scenario: 合法项目状态筛选枚举

- **WHEN** 用户提供 `status`
- **THEN** `status` 必须是 `normal`、`risk`、`paused`、`delayed` 或 `completed` 之一

#### Scenario: 非法项目状态筛选

- **WHEN** 已登录用户提供空字符串、多值或不属于项目状态枚举的 `status`
- **THEN** 系统必须通过统一错误处理返回 `INVALID_PROJECT_STATUS_FILTER` 和明确 HTTP 状态，建议为 400，并且不得回退为无状态筛选查询

#### Scenario: 按当前阶段序号筛选

- **WHEN** 已登录用户使用合法 `currentStageOrder` 请求项目总览看板
- **THEN** 系统必须只返回当前阶段序号匹配的未完成项目；当前阶段为空的已完成项目或异常项目不得匹配该筛选

#### Scenario: 非法当前阶段序号筛选

- **WHEN** 已登录用户提供非数字、空字符串、0、负数、小数、超过 8 或其他非 1 到 8 正整数格式的 `currentStageOrder`
- **THEN** 系统必须通过统一错误处理返回 `INVALID_STAGE_ORDER` 和明确 HTTP 状态，建议为 400，并且不得回退为无阶段筛选查询

#### Scenario: 按关键字筛选

- **WHEN** 已登录用户提供非空 `keyword`
- **THEN** 系统必须按 `projectCode`、`projectName` 或 `customerName` 模糊匹配项目；trim 后为空的 `keyword` 必须等同未提供

#### Scenario: 项目总览无匹配结果

- **WHEN** 筛选条件合法但没有匹配项目
- **THEN** 系统必须返回空项目列表，并返回对应筛选结果下的项目数量指标，不得把无匹配作为错误

#### Scenario: 项目总览稳定排序

- **WHEN** 系统返回项目总览项目列表
- **THEN** 系统必须按 `projectCode ASC, projectId ASC` 稳定排序

#### Scenario: 第一版不分页

- **WHEN** 已登录用户请求项目总览看板
- **THEN** 系统不得要求分页参数，也不得在本能力中实现复杂分页；非法或未知分页参数不得改变项目总览筛选和排序口径

#### Scenario: 项目总览只读

- **WHEN** 已登录用户查询项目总览看板
- **THEN** 系统不得写入项目业务操作日志，不得改变项目状态、阶段状态、资料状态、适用性、责任人、齐套摘要或阶段推进状态

### Requirement: 项目总览看板边界

项目总览看板 MUST 只表示跨项目只读汇总视图，不得扩展为文件、表单、通知、权限、导出或批量操作能力。

#### Scenario: 项目总览不代表文件或表单状态

- **WHEN** 系统返回或前端展示项目总览齐套率
- **THEN** 系统必须保持齐套率基于当前手工状态和人工适用性判断，不得把齐套率解释为文件已上传、文件已归档或在线表单已填写

#### Scenario: 项目总览不创建协同动作

- **WHEN** 用户查询项目总览看板
- **THEN** 系统不得创建消息提醒、超期提醒、截止日期、个人待办实体、审批流或通知

#### Scenario: 项目总览不联动文件平台

- **WHEN** 用户查询项目总览看板
- **THEN** 系统不得上传文件、下载文件、调用文件管理平台、同步文件权限或判断文件权限

#### Scenario: 项目总览不提供管理大屏和批量能力

- **WHEN** 用户查询项目总览看板
- **THEN** 系统不得在本能力中提供大屏图表、导出、批量提交、批量确认、批量退回、批量标记适用性、批量阶段推进或批量责任人变更能力

### Requirement: 项目核心后端模块化保持行为
系统 MUST 允许对项目核心后端仓储和路由内部结构做模块化拆分，但拆分后 MUST 保持项目核心能力的对外 API、数据语义、事务边界、权限边界和错误口径不变。

#### Scenario: 项目创建行为保持
- **WHEN** 后端完成项目核心模块拆分后，已登录用户提交有效项目创建请求
- **THEN** 系统必须仍按既有口径创建项目主数据、记录创建人、初始化标准 8 阶段、初始化项目级阶段资料清单，并在同一事务中写入 `project.created` 业务日志

#### Scenario: 项目列表和详情行为保持
- **WHEN** 后端完成项目核心模块拆分后，用户查询项目列表或项目详情
- **THEN** 系统必须保持既有 API 路径、响应字段、创建人追溯字段、当前阶段字段、已完成项目当前阶段为空的处理口径和历史项目兼容口径不变

#### Scenario: 阶段初始化行为保持
- **WHEN** 后端完成项目核心模块拆分后，新项目创建成功
- **THEN** 系统必须仍按标准 8 阶段顺序、阶段标识、阶段名称、阶段状态和当前阶段口径初始化项目阶段，不得新增、删除、重命名或重排阶段

#### Scenario: 阶段推进行为保持
- **WHEN** 后端完成项目核心模块拆分后，已登录用户请求推进项目当前阶段
- **THEN** 系统必须保持既有登录要求、非角色权限边界、当前阶段唯一性校验、齐套门禁、下一阶段选择、第 8 阶段完成项目、错误码、HTTP 状态码和业务日志事务规则不变

#### Scenario: 项目总览看板行为保持
- **WHEN** 后端完成项目核心模块拆分后，已登录用户请求 `GET /api/projects/overview-dashboard`
- **THEN** 系统必须保持静态路由优先匹配、`requireAuth` 但不要求平台管理员、筛选规则、汇总指标、项目卡片字段、当前阶段异常口径、齐套摘要口径、排序和只读边界不变

#### Scenario: 项目核心数据库结构保持
- **WHEN** 实现项目核心后端模块拆分
- **THEN** 系统不得新增项目核心数据库迁移，不得修改项目、项目阶段、阶段资料、业务日志或附件相关表结构、字段、索引、默认值或历史数据

#### Scenario: 项目核心路由路径保持
- **WHEN** 实现项目核心后端模块拆分
- **THEN** `routes/projects.js` 对外注册的项目创建、列表、详情、阶段推进、项目总览和项目业务日志路径必须保持不变，静态路由仍必须注册在可能冲突的动态 `/:projectId` 路由之前

#### Scenario: 项目核心不新增排除能力
- **WHEN** 实现项目核心后端模块拆分
- **THEN** 系统不得因本次结构治理新增文件管理平台联动、在线表单、表单草稿、表单归档文件、消息提醒、超期提醒、项目成员权限、项目经理权限、复杂权限、导出、批量操作或管理大屏图表

### Requirement: 项目模式
系统 MUST 为项目维护项目模式字段，并 MUST 保持自研模式和供应链/外包模式共用同一项目流程、阶段资料和状态机。

#### Scenario: 项目模式枚举
- **WHEN** 系统创建或保存项目
- **THEN** `projectMode` 必须是 `self_developed` 或 `outsourced` 之一

#### Scenario: 自研模式说明
- **WHEN** 项目 `projectMode = self_developed`
- **THEN** 系统必须表示该项目由公司员工自己产出资料

#### Scenario: 外包模式说明
- **WHEN** 项目 `projectMode = outsourced`
- **THEN** 系统必须表示第三方产出资料，但系统内仍由公司员工负责检查、整理成公司模板并提交

#### Scenario: 项目模式不改变阶段流程
- **WHEN** 系统初始化自研或外包项目
- **THEN** 两种模式都必须使用同一套标准 8 阶段，不得建立两套流程

#### Scenario: 项目模式不改变资料清单
- **WHEN** 系统初始化自研或外包项目阶段资料
- **THEN** 两种模式都必须使用同一套 `v20260624` 64 项阶段资料

#### Scenario: 项目模式不改变状态规则
- **WHEN** 系统处理自研或外包项目
- **THEN** `projectMode` 不得改变阶段推进规则、资料状态机、适用/不适用规则、附件规则或齐套门禁

### Requirement: 项目可见范围

系统 MUST 对项目列表、项目详情和项目总览看板按当前用户过滤可见项目，并 MUST 使用后端校验作为安全边界；查看范围放宽 MUST NOT 放宽任何业务操作权限。

#### Scenario: 项目列表必须登录

- **WHEN** 未登录用户请求 `GET /api/projects`
- **THEN** 系统必须返回未登录错误，不得返回项目列表

#### Scenario: 项目详情必须登录

- **WHEN** 未登录用户请求 `GET /api/projects/:projectId`
- **THEN** 系统必须返回未登录错误，不得返回项目详情

#### Scenario: 管理层全局查看

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 项目列表、项目详情和项目总览看板 MUST 可返回全部业务项目

#### Scenario: 项目创建人查看自己创建项目

- **WHEN** 当前用户是某项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目列表项、详情和总览卡片

#### Scenario: 项目经理查看自己负责项目

- **WHEN** 当前用户是某项目 `projectManagerUserId`
- **THEN** 系统 MUST 允许其查看该项目列表项、详情和总览卡片

#### Scenario: 资料责任人可见相关项目

- **WHEN** 当前用户在某项目中至少负责一项资料
- **THEN** 系统必须允许该用户查看该项目列表项、详情和总览卡片，但完整资料和附件视图仍按阶段资料权限过滤

#### Scenario: 普通员工只能查看自己相关项目

- **WHEN** 当前用户 `organizationRole = employee`
- **THEN** 系统只能返回该用户负责资料、作为项目经理或作为项目创建人的项目

#### Scenario: 系统管理员无默认业务项目权限

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理身份返回全部业务项目或授予项目详情查看权限

#### Scenario: 查看权限不派生操作权限

- **WHEN** 用户因项目可见范围规则可查看某项目
- **THEN** 系统 MUST NOT 仅因项目可见授予阶段推进、项目编号填写、责任人分配、适用性标记/恢复、资料提交、资料审核、资料退回、精准返工退回、附件上传或附件删除权限

#### Scenario: 无权项目详情返回权限错误

- **WHEN** 已登录用户直接访问无权项目详情
- **THEN** 系统必须返回稳定权限错误码 `FORBIDDEN_OPERATION`，不得返回项目详情

### Requirement: 项目参与部门枚举
系统 MUST 将项目参与部门保存为四个业务部门稳定枚举数组，并 MUST NOT 保存中文部门名或自由文本。

#### Scenario: 参与部门合法枚举
- **WHEN** 用户创建或保存项目并提交 `participatingDepartments`
- **THEN** 每个参与部门必须是 `operations_center`、`marketing_center`、`manufacturing_center` 或 `rd_center` 之一

#### Scenario: 参与部门空值
- **WHEN** 用户不提交参与部门、提交空值或空数组
- **THEN** 系统必须允许保存为空配置，表示未配置参与部门

#### Scenario: 参与部门重复值去重
- **WHEN** 用户提交重复的参与部门枚举
- **THEN** 系统必须去重后保存，不得保存重复部门值

#### Scenario: 非法参与部门返回稳定错误
- **WHEN** 用户提交中文部门名、未知值、非数组非空值或任意自由文本参与部门
- **THEN** 系统必须拒绝保存，并返回稳定错误码 `INVALID_PARTICIPATING_DEPARTMENT`，HTTP 状态为 400

#### Scenario: 参与部门不限制中心负责人项目查看
- **WHEN** 系统判断中心负责人是否可见某项目
- **THEN** 系统 MUST 将中心负责人项目查看范围视为全部业务项目
- **AND** `participatingDepartments`、结构化资料归属和责任人部门只用于阶段推进、责任分配、适用性管理、审核等本中心业务操作判断
- **AND** 系统 MUST NOT 使用 `participatingDepartments`、结构化资料归属或责任人部门限制中心负责人项目查看范围

### Requirement: 项目经理用户关联
系统 MUST 将项目经理建模为项目内用户关联，并 MUST 校验项目经理只能由启用的部门用户担任。

#### Scenario: 项目保存项目经理用户 ID
- **WHEN** 系统创建或编辑项目
- **THEN** 系统必须保存 `projectManagerUserId`，并在响应中返回 `projectManagerUser`

#### Scenario: 项目经理权威字段
- **WHEN** 系统判断项目经理身份或项目经理权限
- **THEN** 系统必须以 `projectManagerUserId` 为权威字段，不得使用旧 `projectManager` 文本作为权限判断依据

#### Scenario: 项目创建编辑以项目经理用户 ID 为准
- **WHEN** 用户创建或编辑项目经理
- **THEN** 请求必须以 `projectManagerUserId` 为准；如果响应保留 `projectManager` 文本，该文本只能从 `projectManagerUser.name` 派生，不能由前端任意提交

#### Scenario: 项目经理必须是启用用户
- **WHEN** 用户指定项目经理
- **THEN** 被指定用户必须是启用的数字化平台用户

#### Scenario: 非法项目经理 ID 返回稳定错误
- **WHEN** 用户提交非数字、空字符串、0、负数、小数或其他非法 `projectManagerUserId`
- **THEN** 系统必须返回稳定错误码 `INVALID_PROJECT_MANAGER_USER_ID`

#### Scenario: 项目经理不存在或禁用返回稳定错误
- **WHEN** 用户提交的 `projectManagerUserId` 对应用户不存在或已禁用
- **THEN** 系统必须返回稳定错误码 `PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED`

#### Scenario: 项目经理必须是部门用户
- **WHEN** 用户指定项目经理
- **THEN** 被指定用户 `organizationRole` 必须是 `center_manager` 或 `employee`，且必须隶属于四个业务部门之一

#### Scenario: 全局角色不能作为项目经理
- **WHEN** 用户尝试指定总经理、系统管理员或总经理助理为项目经理
- **THEN** 系统必须拒绝该项目经理设置，并返回稳定错误码 `PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED`

#### Scenario: 项目经理不是全局角色
- **WHEN** 系统判断用户组织角色
- **THEN** 系统不得把项目经理保存为全局 `organizationRole`；项目经理只能来自具体项目的用户关联

#### Scenario: 项目经理默认不是审批人
- **WHEN** 项目经理执行资料确认、资料退回或审批相关动作
- **THEN** 系统不得仅因其为项目经理而授予资料审批权

#### Scenario: 项目经理可同时作为资料责任人
- **WHEN** 项目经理被分配为某个资料项责任人
- **THEN** 系统必须允许该用户作为该资料项 `responsibleUserId`

### Requirement: 项目经理职责边界

系统 MUST 明确项目经理在项目内负责推进、任务分配、催办和全量进度查看，但不得因此改变资料审核身份、`completionMode` 派生完成门禁或精准返工审核边界。

#### Scenario: 项目经理查看项目全量进度
- **WHEN** 项目经理查看其负责项目
- **THEN** 系统必须允许其查看该项目阶段、资料、齐套摘要、责任人、返工标记和附件等全量进度信息

#### Scenario: 项目经理完成后推进阶段
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为完成且没有 `revision_required`
- **THEN** 项目经理可推进其负责项目当前阶段，且阶段推进仍必须基于完成门禁、返工门禁和既有推进权限

#### Scenario: 项目经理可分配未指定责任人的返工资料
- **WHEN** 项目存在 `revision_required = true` 且未分配责任人的资料
- **THEN** 项目经理或既有规则允许的负责人可先按资料责任人分配能力为该资料分配责任人

#### Scenario: 项目经理不因项目身份获得资料审批权
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认、退回或精准返工退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备资料级审核规则允许的审核身份

#### Scenario: 非项目经理不得推进不属于自己的项目
- **WHEN** 普通员工不是该项目项目经理却直接调用该项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

### Requirement: 项目参与人派生

系统 MUST 从项目资料责任人派生项目参与人，不得在第一版新增项目成员表或项目参与人表，并 MUST NOT 因项目参与人派生改变当前阶段 `completionMode` 派生完成门禁。

#### Scenario: 项目参与人由资料责任人派生
- **WHEN** 用户在某项目中至少负责一项资料
- **THEN** 系统必须将该用户视为该项目参与人

#### Scenario: 不新增项目参与人表
- **WHEN** 系统表达项目参与人
- **THEN** 系统不得在本 change 中新增项目参与人表或手工维护项目参与人清单

#### Scenario: 项目参与人不改变阶段推进门禁
- **WHEN** 系统判断阶段是否可推进
- **THEN** 项目参与人派生规则不得改变当前阶段适用资料按 `completionMode` 派生完成的门禁口径

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核、`1.2` 专用评价/审批和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份；当前内部资料闭环 MUST NOT 返回泛化阶段关口审批待办，且 MUST 将有责任人的精准返工资料纳入资料责任待办。

#### Scenario: 1.2 营销评价待办只给营销中心负责人

- **WHEN** `1.2 项目立项审批表` 已提交且营销评价尚未完成
- **THEN** 工作台 MUST 只向营销中心负责人返回营销评价待办
- **AND** 工作台 MUST NOT 因用户是任意中心负责人而返回该待办

#### Scenario: 1.2 研发评价待办只给研发中心负责人

- **WHEN** `1.2 项目立项审批表` 已提交且研发评价尚未完成
- **THEN** 工作台 MUST 只向研发中心负责人返回研发评价待办
- **AND** 工作台 MUST NOT 因用户是任意中心负责人而返回该待办

#### Scenario: 1.2 营销研发评价待办并行出现

- **WHEN** `1.2 项目立项审批表` 在线表单已提交
- **THEN** 工作台 MUST 同时向营销中心负责人返回营销评价待办、向研发中心负责人返回研发评价待办
- **AND** 二者 MUST NOT 互相等待或互相阻塞

#### Scenario: 1.2 未提交不生成评价待办

- **WHEN** `1.2 项目立项审批表` 尚未提交
- **THEN** 工作台 MUST NOT 向营销中心负责人返回营销评价待办
- **AND** 工作台 MUST NOT 向研发中心负责人返回研发评价待办

#### Scenario: 总经理审批待办后置生成

- **WHEN** `1.2 项目立项审批表` 的营销评价和研发评价均已完成
- **THEN** 工作台 MUST 生成总经理最终审批待办
- **AND** 工作台 MUST 只向总经理返回对应待办
- **AND** 工作台 MUST NOT 向总经理助理、中心负责人或项目创建人自动返回该审批待办

#### Scenario: 总经理审批待办不得提前生成

- **WHEN** 营销评价或研发评价任一项尚未完成
- **THEN** 工作台 MUST NOT 生成总经理最终审批待办

#### Scenario: 1.2 专用待办不恢复泛化阶段关口

- **WHEN** 系统生成 `1.2 项目立项审批表` 评价或审批待办
- **THEN** 工作台 MUST 使用专用 `1.2` 评价/审批待办类型或等价资料专项待办
- **AND** 工作台 MUST NOT 生成 `stage_gate_approval` 或泛化阶段关口审批待办

### Requirement: 项目基础可见与资料访问分离

系统 MUST 区分项目基础信息可见性、完整资料查看权限、附件查看/下载权限和业务操作权限；完整查看角色可以查看完整资料和已上传附件，但不得因此获得资料、附件或阶段业务操作权限。

#### Scenario: 普通员工可见相关项目基础信息

- **WHEN** 普通员工负责某项目中的至少一个资料项
- **THEN** 系统可以允许该员工查看该项目基础信息，用于理解任务所属项目

#### Scenario: 普通员工不因项目可见获得完整资料清单

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看该项目完整阶段资料清单

#### Scenario: 普通员工不因项目可见获得全部附件访问

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看、下载、上传或删除其他资料项附件

#### Scenario: 项目经理查看自己项目完整资料

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统必须允许其查看该项目完整资料清单、已上传附件和业务日志，用于统筹项目

#### Scenario: 项目创建人查看自己创建项目完整资料

- **WHEN** 当前用户是项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目完整资料清单、已上传附件和业务日志

#### Scenario: 管理层查看完整项目资料

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 系统 MUST 允许其查看全部项目的完整项目资料、已上传附件和业务日志

#### Scenario: 系统管理员无默认业务资料访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份授予业务项目资料、附件或业务日志访问权限

#### Scenario: 完整查看不授予附件上传删除

- **WHEN** 用户因总经理、总经理助理、中心负责人、项目创建人或项目经理身份获得完整资料和附件查看权限
- **THEN** 系统 MUST NOT 仅因该查看权限授予附件上传或附件删除权限

#### Scenario: 项目列表仍展示有权基础项目

- **WHEN** 用户查询项目列表或项目总览
- **THEN** 系统可以继续返回该用户有权看到的项目基础信息，但不得通过列表或总览泄露无权资料附件内容

#### Scenario: 员工直接打开项目详情仍受资料过滤

- **WHEN** 普通员工直接打开项目详情地址或直接调用资料清单 API
- **THEN** 后端仍必须只返回该员工有权访问的资料项，不得因绕过工作台入口返回完整资料清单

### Requirement: 工作台阶段关口审批和阶段推进待办

系统 MUST 在当前 20260625 在线平台内部资料闭环中只按 `completionMode` 完成情况和既有推进权限生成阶段推进待办，并 MUST NOT 因泛化阶段关口审批生成推进前置。

#### Scenario: 阶段关口审批待办暂停
- **WHEN** 系统生成当前阶段工作台待办
- **THEN** 工作台 MUST NOT 因泛化阶段关口审批状态生成 `stage_gate_approval` 待办

#### Scenario: 项目经理阶段推进待办
- **WHEN** 当前用户是项目经理、当前阶段适用资料已经按 `completionMode` 完成、且当前阶段不是第 8 阶段
- **THEN** 工作台可以返回 `stage_advance` 待办

#### Scenario: 阶段推进待办不要求 approval_status
- **WHEN** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 工作台 MUST NOT 因当前阶段关口审批状态不是 `approved` 而隐藏阶段推进待办

#### Scenario: 阶段推进待办仍要求资料完成
- **WHEN** 当前阶段存在适用资料未按 `completionMode` 完成，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

### Requirement: 整项目审计信息访问控制

系统 MUST 将项目基础可见性与整项目业务日志访问权限分开；总经理、总经理助理、中心负责人、项目创建人和项目经理按其可见项目范围查看完整业务日志，查看日志不得放宽任何业务操作权限。

#### Scenario: 管理层查看全部项目业务日志

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 系统 MUST 允许其查看全部项目的完整业务日志

#### Scenario: 项目创建人查看自己创建项目业务日志

- **WHEN** 当前用户是项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目完整业务日志

#### Scenario: 项目经理查看自己项目审计信息

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统可以允许其查看该项目完整业务日志
- **AND** 如 legacy 阶段审批历史接口仍存在，系统 MAY 允许其按既有权限只读查看

#### Scenario: 普通员工不得查看整项目业务日志

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整业务日志，并返回无权错误

#### Scenario: 系统管理员无默认业务日志权限

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统 MUST NOT 仅因系统管理员身份允许其查看项目业务日志

#### Scenario: 日志查看不放宽操作

- **WHEN** 用户获得某项目业务日志查看权限
- **THEN** 系统 MUST NOT 因日志查看权限授予资料提交、资料审核、资料退回、精准返工、附件上传、附件删除、阶段推进、责任人分配或适用性管理权限

#### Scenario: legacy 阶段审批历史不是当前必备能力

- **WHEN** 当前 20260625 在线平台内部资料闭环运行
- **THEN** 系统 MUST NOT 要求展示、生成或依赖新的泛化阶段关口审批历史
- **AND** legacy 阶段审批历史 MUST NOT 作为当前阶段推进或资料完成判断依据

### Requirement: 项目可见性按结构化归属中心识别

系统 MUST 保留结构化归属中心用于资料审核、责任分配、适用性管理和既有本中心业务操作判断，但中心负责人项目查看范围 MUST 按本 change 放宽为全部业务项目，不再仅按本中心相关项目过滤。

#### Scenario: 中心负责人查看全部项目

- **WHEN** 当前用户是中心负责人且系统判断其是否可见某项目
- **THEN** 系统 MUST 将全部业务项目视为该中心负责人可查看项目

#### Scenario: 结构化归属中心仍用于操作权限

- **WHEN** 系统判断中心负责人是否可审核资料、分配资料责任人、管理适用性或执行其他受中心边界约束的业务操作
- **THEN** 系统 MUST 继续使用 `ownerDepartment`、`reviewDepartment`、`participatingDepartments` 或既有规则判断操作权限
- **AND** 系统 MUST NOT 仅因中心负责人可查看全部项目而允许其操作跨中心资料

#### Scenario: 责任人部门仅作为旧数据 fallback

- **WHEN** 项目阶段资料已保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 系统 MUST 优先使用 `ownerDepartment` 和 `reviewDepartment` 判断中心负责人资料操作范围，不得再无条件使用 `responsibleUser.department`

#### Scenario: 旧资料缺少归属中心时兼容责任人部门

- **WHEN** 某项目阶段资料的 `ownerDepartment` 和 `reviewDepartment` 都为空
- **THEN** 系统 MAY 继续使用该资料责任人的部门作为旧数据兼容判断

### Requirement: 阶段推进按结构化归属中心识别本中心项目

系统 MUST 使用结构化归属中心判断中心负责人是否可推进本中心相关项目阶段，并 MUST 保持当前阶段 `completionMode` 完成门禁不变。

#### Scenario: 中心负责人推进本中心相关项目
- **WHEN** 当前用户是中心负责人且项目属于其本中心相关项目
- **AND** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 系统 MAY 允许其推进当前阶段

#### Scenario: 中心负责人不得跨中心推进
- **WHEN** 当前用户是中心负责人但项目不属于其本中心相关项目
- **THEN** 系统 MUST 拒绝其推进阶段，除非该用户同时具备项目经理或总经理等其他允许身份

#### Scenario: 阶段推进归属判断优先级
- **WHEN** 系统判断中心负责人是否可推进某项目阶段
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门

### Requirement: 工作台阶段推进待办按结构化归属中心识别

系统 MUST 使用结构化归属中心生成中心负责人 `stage_advance` 工作台待办，并 MUST 以当前阶段适用资料按 `completionMode` 完成为前置条件。

#### Scenario: 中心负责人因归属中心获得阶段推进待办
- **WHEN** 当前用户是中心负责人且项目中存在 `ownerDepartment = 本人部门` 或 `reviewDepartment = 本人部门` 的阶段资料
- **AND** 当前阶段适用资料已经按 `completionMode` 完成
- **AND** 当前阶段不是第 8 阶段
- **THEN** 工作台 MAY 返回该项目当前阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段仍不生成普通推进待办
- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台 MUST NOT 生成普通 `stage_advance` 待办

#### Scenario: 阶段推进待办限制不变
- **WHEN** 当前阶段适用资料未按 `completionMode` 完成，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

### Requirement: 20260624 项目流程依据

当前 `online-platform-internal-document-flow-v1` MUST NOT 将 `智能制造项目管理流程图20260624.pdf` 或 `v20260624` 作为当前主流程依据；当前实现依据 MUST 收敛到 20260625 流程图、`docs/9.11_20260625项目流程资料审批口径规划.md` 和 `docs/9.12_在线平台内部资料闭环规划_20260625.md`。

#### Scenario: 20260624 不再作为当前主流程依据
- **WHEN** 系统说明或实现当前项目主流程、阶段推进和阶段资料完成口径
- **THEN** 系统 MUST NOT 以 `智能制造项目管理流程图20260624.pdf` 或 `v20260624` 作为当前主流程依据

#### Scenario: 保持 8 阶段主干不变
- **WHEN** 系统初始化或展示项目阶段
- **THEN** 系统必须继续按顺序使用立项阶段、方案设计阶段、合同签订阶段、详细设计阶段、生产制作阶段、预验收阶段、终验收阶段和结题阶段

#### Scenario: 阶段标识保持不变
- **WHEN** 系统保存标准 8 阶段
- **THEN** 系统必须继续使用 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 作为稳定阶段标识

### Requirement: 简单阶段推进边界

系统 MUST 使用当前阶段资料 `completionMode` 完成门禁推进项目阶段，并 MUST 不因 20260625 内部资料闭环引入跳阶段、回退、自动阶段流转、泛化阶段关口审批或复杂工作流引擎。

#### Scenario: 阶段推进继续基于当前阶段资料门禁
- **WHEN** 已登录且有推进权限的用户请求推进项目当前阶段
- **THEN** 系统必须继续只检查当前阶段适用资料按 `completionMode` 派生出的完成情况，并在满足推进权限和阶段状态后按 8 阶段顺序推进

#### Scenario: 阶段推进不要求当前阶段审批通过
- **WHEN** 用户请求推进项目当前阶段
- **AND** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化阶段关口审批或 `approval_status = approved` 而拒绝阶段推进

#### Scenario: 不新增跳阶段或回退
- **WHEN** 系统按 20260625 内部资料闭环推进项目阶段
- **THEN** 系统不得新增跳阶段、阶段回退、任意选择目标阶段或自由调整阶段顺序能力

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统实现阶段资料收集、资料审核或阶段推进
- **THEN** 系统不得新增可视化流程编排、任意节点配置器、合同审批流、采购审批流、付款流、发票审批流、设计变更流程引擎、自动通知、日报周报或资料服务器核查流程

### Requirement: 第一版简单资料闭环

系统 MUST 将当前第一版业务闭环限定为在线平台内部阶段资料收集、资料提交/审核、在线平台附件保存和阶段推进。

#### Scenario: 项目创建初始化闭环对象
- **WHEN** 项目创建成功
- **THEN** 系统必须初始化标准 8 阶段和当前 20260625 64 项阶段资料，作为资料收集和阶段推进依据

#### Scenario: completionMode 计入齐套
- **WHEN** 当前阶段资料项适用且按其 `completionMode` 达到完成点
- **THEN** 系统必须将该资料项计入当前阶段完成资料

#### Scenario: 未达到 completionMode 不计入齐套
- **WHEN** 当前阶段资料项适用但未达到其 `completionMode` 完成点
- **THEN** 系统不得将该资料项计入已完成资料

#### Scenario: 文件平台暂停
- **WHEN** 当前阶段保存资料附件
- **THEN** 系统 MUST 将附件保存在在线平台现有附件系统
- **AND** 系统 MUST NOT 调用文件管理平台、保存文件平台 folder mapping 或产生归档状态

### Requirement: 20260625 项目流程依据

系统 MUST 将 `智能制造项目管理流程图20260625.pdf`、`docs/9.11_20260625项目流程资料审批口径规划.md` 和 `docs/9.12_在线平台内部资料闭环规划_20260625.md` 作为当前在线平台内部资料闭环的实现依据。

#### Scenario: 使用 20260625 流程作为当前依据
- **WHEN** 系统说明或实现项目主流程、项目编号生成、阶段资料完成规则和阶段推进门禁
- **THEN** 系统 MUST 以 20260625 流程图、`docs/9.11` 和 `docs/9.12` 作为当前依据
- **AND** 普通阶段资料项数量 MUST 为 64 项

#### Scenario: completionMode 数量
- **WHEN** 系统初始化或校验当前 20260625 64 项资料
- **THEN** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

#### Scenario: 排除非普通资料过程节点
- **WHEN** 系统维护当前普通阶段资料模板
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 计入普通 64 项资料模板，除非后续正式确认它们形成独立文件

#### Scenario: 保持 8 阶段主干
- **WHEN** 系统初始化或展示项目阶段
- **THEN** 系统 MUST 继续使用立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段

### Requirement: 项目编号后置规划

系统 MUST 在后续规划中支持项目创建时项目编号为空，并 MUST 在项目立项审批通过且 `项目立项通知` 发布后填写或生成正式项目编号。

#### Scenario: 创建项目允许项目编号为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST 继续保存项目名称、客户、项目经理、参与部门、计划时间和创建人等基础信息

#### Scenario: 立项通过后生成项目编号
- **WHEN** 项目立项审批通过且 `项目立项通知` 已发布
- **THEN** 系统 MUST 支持填写或生成正式 `projectCode`
- **AND** 该编号 SHOULD 与项目立项通知形成可追溯关系

#### Scenario: 非空项目编号仍需唯一
- **WHEN** 系统保存或更新非空 `projectCode`
- **THEN** 系统 MUST 校验该编号在项目主数据中唯一

#### Scenario: 空项目编号不参与唯一冲突
- **WHEN** 多个尚未立项的项目暂未生成 `projectCode`
- **THEN** 系统 MUST 允许它们同时保持空项目编号，不得按重复编号拒绝

#### Scenario: 项目查询兼容空编号
- **WHEN** 项目列表、项目详情、搜索、工作台、业务日志或后续文件平台联动读取项目基础信息
- **THEN** 系统 MUST 兼容 `projectCode` 为空，并使用项目 ID 或其他稳定字段完成内部关联

### Requirement: 20260625 阶段推进按资料完成规则判断

系统 MUST 规划阶段推进门禁按每个资料项的完成规则判断当前阶段是否可推进，而不是统一要求所有适用必填资料均为 `confirmed`，也不得额外叠加一个泛化的阶段级审批。

#### Scenario: submit_only 资料提交后计为完成
- **WHEN** 当前阶段适用且参与阶段推进门禁的资料项 `completionMode = submit_only`
- **AND** 该资料项已经提交或上传
- **THEN** 系统 MUST 将该资料项计为阶段齐套已完成

#### Scenario: approval_required 资料确认后计为完成
- **WHEN** 当前阶段适用且参与阶段推进门禁的资料项 `completionMode = approval_required`
- **AND** 该资料项已经确认或审批通过
- **THEN** 系统 MUST 将该资料项计为阶段齐套已完成

#### Scenario: 条件资料未触发不计缺失
- **WHEN** 当前阶段资料项 `completionMode` 为 `conditional_submit` 或 `conditional_approval`
- **AND** 该资料项的业务触发条件尚未发生
- **THEN** 系统 MUST 不将该资料项计入缺失资料或阶段推进阻塞项

#### Scenario: 条件资料触发后按对应规则判断
- **WHEN** 条件资料的业务触发条件已经发生
- **THEN** 系统 MUST 按 `conditional_submit` 或 `conditional_approval` 对应的提交或确认规则判断该资料是否完成

#### Scenario: 不叠加泛化阶段审批
- **WHEN** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化的阶段级审批而拒绝阶段推进

#### Scenario: 只有显式节点资料需要确认审批
- **WHEN** 资料本身对应 20260625 流程图中的明确 YES/NO 或 YES-only 节点
- **THEN** 系统 MUST 按该资料的 `approval_required` 完成规则要求确认或审批通过
- **AND** 没有明确确认/审批节点的产出资料 MUST NOT 被强制要求确认或审批通过

#### Scenario: 发票资料不触发额外流程
- **WHEN** 当前阶段适用资料为 `发票（预付款）`、`发票（发货款）` 或 `发票（尾款）`
- **AND** 该发票资料 `completionMode = submit_only`
- **THEN** 阶段推进 MUST 只要求该发票资料提交或上传完成
- **AND** 系统 MUST NOT 因该发票资料要求付款流、发票审批流或额外确认前置

#### Scenario: 图纸审查 NO 回退不改变上游资料完成规则
- **WHEN** 当前阶段包含 `4.14 产品平面图`、`4.15 产品零部件清单` 和 `4.16 图纸审查记录`
- **THEN** 阶段推进 MUST NOT 因 4.14 或 4.15 是图纸审查 NO 回退目标而要求它们审批通过
- **AND** `4.14 产品平面图` MUST 只需要提交或上传完成
- **AND** `4.15 产品零部件清单` MUST 只需要提交或上传完成
- **AND** `4.16 图纸审查记录` MUST 需要确认或审批通过
- **AND** 如果 4.16 不通过，系统 MAY 提示修改 4.14 或 4.15 后重新发起或提交图纸审查记录，但 MUST NOT 改变 4.14 或 4.15 的 `completionMode`

#### Scenario: NO 回退不改变主线必产属性
- **WHEN** 流程图中主线资料经过 YES/NO 确认节点且 NO 回退到前序修改节点
- **THEN** 系统 MUST 将该资料继续视为主线必产资料
- **AND** 系统 MUST NOT 仅因存在 NO 回退箭头而把该资料改为条件触发资料

### Requirement: 在线平台项目编号后置

系统 MUST 支持项目创建初期没有正式项目编号，并 MUST 在 `1.2 项目立项审批表` 在线表单提交、营销评价完成、研发评价完成、总经理最终审批通过且 `1.3 项目立项通知` 提交或上传完成后填写或生成正式 `projectCode`。

#### Scenario: 后置项目编号节点

- **WHEN** `1.2 项目立项审批表` 已提交在线表单
- **AND** 营销评价和研发评价均已完成
- **AND** 总经理最终审批已通过
- **AND** `1.3 项目立项通知` 已按在线表单提交或上传完成
- **AND** `1.1 项目需求表` 不存在由 `1.2` 总经理审批不通过触发且未清除的 `revision_required`
- **AND** `1.2 项目立项审批表` 不存在待填写、待评价、待审批、审批不通过后需重填或其他专用阻塞状态
- **THEN** 系统 MUST 允许填写或生成 `projectCode`
- **AND** 系统 MUST 沿用项目维护权限、项目经理或等价业务项目编号维护权限，不新增复杂权限模型
- **AND** 系统 MUST NOT 因当前用户仅具备系统管理员身份而允许填写或生成 `projectCode`

#### Scenario: 单项评价完成不生成编号

- **WHEN** `1.2 项目立项审批表` 仅完成营销评价或仅完成研发评价
- **THEN** 系统 MUST NOT 将项目编号填写门禁视为满足
- **AND** 系统 MUST NOT 因单项评价完成提前生成正式 `projectCode`

#### Scenario: 总经理未审批通过不生成编号

- **WHEN** `1.2 项目立项审批表` 的总经理最终审批尚未通过
- **THEN** 系统 MUST NOT 将项目编号填写门禁视为满足
- **AND** 系统 MUST NOT 提前生成正式 `projectCode`

#### Scenario: 系统管理员不默认拥有项目编号填写权限

- **WHEN** 当前用户仅具备系统管理员身份
- **AND** 不具备项目维护权限、项目经理权限或等价业务项目编号维护权限
- **THEN** 系统 MUST NOT 允许其填写或生成 `projectCode`
- **AND** 系统 MUST NOT 将系统管理员平台维护职责解释为业务项目编号维护职责

### Requirement: 在线平台 completionMode 阶段推进

系统 MUST 按当前阶段适用资料的 `completionMode` 判断阶段推进门禁，并 MUST NOT 额外叠加泛化阶段审批门禁。

#### Scenario: 阶段推进按 completionMode 计算
- **WHEN** 系统判断当前阶段是否可推进
- **THEN** 系统 MUST 只检查当前阶段适用资料是否按各自 `completionMode` 完成

#### Scenario: submit_only 资料提交后完成
- **WHEN** 当前阶段适用资料 `completionMode = submit_only`
- **AND** 该资料已提交或上传
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: approval_required 资料审核通过后完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料已确认或审批通过
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: approval_required 未审核不完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料仅为已提交但未确认或审批通过
- **THEN** 系统 MUST 将该资料计为未完成

#### Scenario: conditional_submit 未触发不阻塞
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** 该资料 `isApplicable = false`
- **THEN** 系统 MUST NOT 将该资料计入缺失资料或阶段推进阻塞项

#### Scenario: conditional_submit 触发后提交完成
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** 该资料 `isApplicable = true`
- **AND** 该资料已提交或上传
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: 不依赖泛化阶段审批门禁
- **WHEN** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化阶段级审批或 `approval_status = approved` 而拒绝阶段推进

#### Scenario: 阶段推进仍保留权限边界
- **WHEN** 用户请求推进当前阶段
- **THEN** 系统 MUST 继续校验当前用户是否具备阶段推进权限
- **AND** 系统 MUST 继续只允许按标准 8 阶段顺序推进当前阶段

### Requirement: 在线平台资料接口派生完成状态

系统 MUST 在阶段资料相关后端响应中返回 `completionMode` 和派生完成状态，使前端能够区分基础状态 `submitted` 在不同完成规则下的业务含义。

#### Scenario: 返回 completionMode 和完成状态
- **WHEN** 后端返回项目阶段资料项、缺失资料项、资料责任待办或资料审核待办
- **THEN** 每个资料项 MUST 包含 `completionMode`
- **AND** 每个资料项 MUST 包含 `isComplete`、`completionStatus` 或等价派生完成状态字段

#### Scenario: submit_only submitted 返回已完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 基础状态为 `submitted`
- **THEN** 后端 MUST 返回派生完成状态为 `completed` 或等价已完成状态
- **AND** 后端 MUST NOT 将该资料项返回为待审核状态

#### Scenario: approval_required submitted 返回待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 基础状态为 `submitted`
- **THEN** 后端 MUST 返回派生完成状态为 `pending_review` 或等价待审核状态
- **AND** `isComplete` MUST 为 false

#### Scenario: returned 返回未完成
- **WHEN** 资料项基础状态为 `returned`
- **THEN** 后端 MUST 返回派生完成状态为 `returned`、`incomplete` 或等价未完成状态
- **AND** `isComplete` MUST 为 false

### Requirement: 在线平台附件本地保存

暂停文件平台联动时，阶段资料附件 MUST 保存在在线平台现有附件系统中，且系统 MUST NOT 调用文件管理平台。

#### Scenario: 附件保存到在线平台
- **WHEN** 用户上传阶段资料附件
- **THEN** 系统 MUST 使用在线平台现有附件存储和附件记录保存文件

#### Scenario: 不调用文件平台
- **WHEN** 用户上传、查看、下载、删除或提交阶段资料附件
- **THEN** 系统 MUST NOT 调用文件管理平台 API
- **AND** 系统 MUST NOT 创建或更新 file-platform folder mapping
- **AND** 系统 MUST NOT 创建 `archived` 或 `archive_failed` 归档状态

#### Scenario: 文件平台恢复需独立 change
- **WHEN** 后续需要恢复文件管理平台联动
- **THEN** 系统 MUST 通过独立 change 重新规划和实现文件夹映射、归档触发、文件列表、下载和文件日志

### Requirement: 精准返工阶段门禁

系统 MUST 将 `revision_required` 作为当前阶段推进门禁的一部分。

#### Scenario: 返工标记未清除不得推进
- **WHEN** 当前阶段存在适用资料 `revision_required = true`
- **THEN** 系统 MUST 拒绝阶段推进
- **AND** 拒绝结果 MUST 能让前端展示需返工资料

#### Scenario: 清除返工后恢复推进判断
- **WHEN** 当前阶段所有适用资料均按 `completionMode` 完成且所有 `revision_required` 均已清除
- **THEN** 系统 MUST 按既有当前阶段、顺序推进、项目状态和推进权限规则继续判断是否允许推进

### Requirement: 精准返工工作台集成

系统 MUST 将有责任人的需返工资料纳入资料责任待办，并保持工作台不包含阶段关口审批待办。

#### Scenario: 工作台显示需返工资料
- **WHEN** 当前用户负责某个 `revision_required = true` 的适用资料
- **THEN** 工作台 MUST 返回该资料的 `document_responsibility` 待办
- **AND** 待办必须包含资料编号、资料名称、项目、阶段、返工原因和目标路由

#### Scenario: 返工重提改变待办类型
- **WHEN** `approval_required + revision_required` 资料尚未返工重提
- **THEN** 工作台 MUST 将其作为责任待办
- **WHEN** 该资料返工重提后进入 `submitted`
- **THEN** 工作台 MUST 将其作为审核待办返回给有审核权限的用户

#### Scenario: 工作台不发送通知
- **WHEN** 系统生成需返工工作台数据
- **THEN** 系统 MUST NOT 因本 change 创建推送通知、站内信、短信或邮件

### Requirement: 1.2 项目立项多节点审批

系统 MUST 将 `1.2 项目立项审批表` 规划为专用评价/审批资料；该能力只适用于 `1.2`，不得扩展为通用审批流引擎。`1.2` 的最终完成 MUST 由在线表单提交、营销评价完成、研发评价完成、总经理最终审批通过和相关返工清除共同派生。

#### Scenario: 1.2 必须评价完成后由总经理最终通过

- **WHEN** 系统判断 `1.2 项目立项审批表` 是否最终完成
- **THEN** 系统 MUST 同时要求 `1.2` 在线表单已提交、营销评价已完成、研发评价已完成且总经理最终审批已通过
- **AND** 系统 MUST 要求 `1.1` 不存在由 `1.2` 总经理审批不通过触发且未清除的 `revision_required`
- **AND** 系统 MUST 要求 `1.2` 自身不存在待填写、待评价、待审批、审批不通过后需重填或其他专用阻塞状态

#### Scenario: 1.2 保持在 64 项模板内

- **WHEN** 系统规划或初始化 20260625 阶段资料模板
- **THEN** `1.2 项目立项审批表` MUST 仍是 64 项普通阶段资料之一
- **AND** `1.2` MUST 继续复用阶段资料底座保存基础状态、责任人、提交追溯和派生完成状态

#### Scenario: 营销研发只评价不审批

- **WHEN** 营销中心负责人或研发中心负责人处理 `1.2 项目立项审批表`
- **THEN** 系统 MUST 只允许其提交评价文本
- **AND** 系统 MUST NOT 要求或允许其选择通过或不通过
- **AND** 系统 MUST NOT 因评价文本内容自动判定 `1.2` 通过或不通过

#### Scenario: 评价人规则

- **WHEN** 系统判断 `1.2` 评价处理人
- **THEN** 营销评价 MUST 由营销中心负责人处理
- **AND** 研发评价 MUST 由研发中心负责人处理
- **AND** 总经理最终审批 MUST 由总经理处理

#### Scenario: 总经理审批前置条件

- **WHEN** 营销评价和研发评价均已完成
- **THEN** 系统 MUST 允许总经理按权限处理最终审批
- **AND** 在两项评价均完成前，系统 MUST 拒绝总经理最终审批动作

#### Scenario: 总经理审批不通过触发 1.1 返工和 1.2 重填

- **WHEN** 总经理对 `1.2 项目立项审批表` 审批不通过
- **THEN** 系统 MUST 触发 `1.1 项目需求表` 精准返工
- **AND** 系统 MUST 要求 `1.2 项目立项审批表` 重新填写
- **AND** 系统 MUST NOT 将该退回解释为整阶段退回或自动退回全部前置资料

#### Scenario: 1.2 原责任人继续处理重填

- **WHEN** 总经理审批不通过后 `1.2 项目立项审批表` 需要重新填写
- **THEN** 系统 MUST 保留 `1.2` 原责任人作为重新填写处理人
- **AND** 系统 MUST NOT 因审批不通过自动清空或重新分配 `1.2` 责任人

#### Scenario: 不放宽业务操作权限

- **WHEN** 总经理助理、中心负责人、项目创建人或项目经理因项目查看规则能查看项目和 `1.2` 状态
- **THEN** 系统 MUST NOT 因查看权限授予其 `1.2` 表单提交、营销评价、研发评价或总经理最终审批权限

#### Scenario: 不处理文件平台和推送

- **WHEN** 系统处理 `1.2` 评价、审批、退回或重填
- **THEN** 系统 MUST NOT 调用文件管理平台
- **AND** 系统 MUST NOT 因 `1.2` 状态变化发送推送通知、站内信、短信或邮件

### Requirement: 项目阶段节点工作区

系统 MUST 支持将项目详情组织为项目工作区：项目列表和项目总览仍用于选择项目，进入单个项目后，项目详情 MUST 支持 8 阶段导航框架，并在节点工作区展示关联产出、责任人、状态、阻塞原因和当前用户可执行操作。第一版 MUST 完整支持立项阶段节点和产出映射；其他 7 个阶段 MAY 先展示阶段级占位、旧资料清单入口或后续待配置状态。

#### Scenario: 项目详情作为项目工作区
- **WHEN** 有项目查看权的用户从项目列表或项目总览进入某个项目
- **THEN** 系统 MUST 展示该项目的项目工作区
- **AND** 项目工作区 MUST 保留项目基础信息、8 阶段进度和当前阶段信息

#### Scenario: 8 阶段导航框架
- **WHEN** 系统展示项目工作区
- **THEN** 系统 MUST 按立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段展示导航
- **AND** 系统 MUST NOT 将 8 阶段导航框架解释为本 change 必须一次性补齐全部阶段的蓝色节点映射

#### Scenario: 节点工作区展示核心上下文
- **WHEN** 用户点击某个蓝色流程节点
- **THEN** 系统 MUST 展示该节点的节点工作区
- **AND** 节点工作区 MUST 至少能表达节点名称、派生状态、关联产出、产出责任人、表单或附件状态、评价或审批状态、阻塞原因和当前用户可执行操作

#### Scenario: 节点不单独保存完成状态
- **WHEN** 系统计算蓝色节点状态
- **THEN** 系统 MUST 从关联产出、在线表单、评价/审批记录、`completionMode` 和精准返工状态派生节点状态
- **AND** 系统 MUST NOT 为蓝色节点建立脱离阶段资料底座的独立完成状态

#### Scenario: 第一版产出映射边界
- **WHEN** 系统规划第一版节点与产出关系
- **THEN** 系统 MUST 按一个蓝色节点对应一个或多个独立产出处理
- **AND** 系统 MUST NOT 在第一版要求支持多个蓝色节点共用同一产出的复杂多入口场景

#### Scenario: 其他阶段暂不补齐完整节点
- **WHEN** 系统展示方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段
- **THEN** 系统 MAY 先展示阶段级占位、旧资料清单入口或后续待配置状态
- **AND** 系统 MUST NOT 要求本 change 一次性补齐其他 7 个阶段的全部蓝色节点映射
- **AND** 系统 MUST NOT 要求本 change 将其他阶段产出全部改为在线表单
- **AND** 后续阶段节点和产出映射 MUST 通过后续 change 逐阶段补齐

### Requirement: 立项阶段节点和产出映射

系统 MUST 在第一版完整支持立项阶段节点工作区，并 MUST 将立项阶段蓝色节点映射到当前 64 项阶段资料底座中的对应产出。

#### Scenario: 立项阶段节点集合
- **WHEN** 系统展示立项阶段节点
- **THEN** 系统 MUST 展示项目输入、项目市场调研、项目立项审批和项目立项通知 4 个节点

#### Scenario: 项目市场调研产出
- **WHEN** 用户打开项目市场调研节点
- **THEN** 系统 MUST 将该节点关联到 `1.1 项目需求表`
- **AND** 该产出 MUST 规划为在线表单
- **AND** 字段设计来源 MUST 为 `项目需求表-模板.xlsx`

#### Scenario: 项目立项审批产出
- **WHEN** 用户打开项目立项审批节点
- **THEN** 系统 MUST 将该节点关联到 `1.2 项目立项审批表`
- **AND** 该产出 MUST 规划为在线表单
- **AND** 字段设计来源 MUST 为 `项目立项审批表-模板.xlsx`

#### Scenario: 项目立项通知产出
- **WHEN** 用户打开项目立项通知节点
- **THEN** 系统 MUST 将该节点关联到 `1.3 项目立项通知`
- **AND** 该产出 MUST 规划为在线表单
- **AND** 字段设计来源 MUST 为 `关于确定项目名称及编号的通知-模板.docx`

#### Scenario: 项目输入节点不新增资料产出
- **WHEN** 用户打开项目输入节点
- **THEN** 系统 MUST 展示项目创建后已有的轻量项目基础信息
- **AND** 系统 MUST NOT 因项目输入节点新增脱离 64 项阶段资料底座的资料完成状态

### Requirement: 项目治理字段后置边界

系统 MUST 将项目经理、项目模式、参与中心、计划时间和立项日期从项目创建必填字段中移除，并 MUST 保留既有项目字段兼容展示；第二阶段补录能力不属于本 change 的当前实现范围，必须由后续 change 另行规划和实现。

#### Scenario: 创建时不要求项目治理字段
- **WHEN** 用户创建项目
- **THEN** 系统 MUST NOT 要求项目经理、项目模式、参与中心、计划开始时间、计划结束时间或立项日期作为创建必填字段
- **AND** 系统 MUST NOT 因这些字段为空拒绝创建

#### Scenario: 补录能力后续实现
- **WHEN** 第 1 阶段已完成且项目进入第 2 阶段
- **THEN** 本 change MUST NOT 要求当前实现项目经理、项目模式或立项日期补录能力
- **AND** 第二阶段补录字段、补录权限和补录门禁 MUST 通过后续 change 另行规划和实现

#### Scenario: 旧字段兼容展示
- **WHEN** 既有项目已经保存项目经理、项目模式、参与中心、计划时间或立项日期
- **THEN** 系统 MUST 继续兼容展示这些字段
- **AND** 系统 MUST NOT 因新建项目不再必填这些字段而删除或隐藏既有项目数据

### Requirement: 1.3 项目立项通知前置门禁

系统 MUST 要求 `1.3 项目立项通知` 在 `1.2 项目立项审批表` 总经理最终审批通过后才能填写或提交。

#### Scenario: 1.2 未最终通过时不得提交 1.3

- **WHEN** `1.2 项目立项审批表` 尚未完成营销评价、研发评价和总经理最终审批通过
- **THEN** 系统 MUST 拒绝 `1.3 项目立项通知` 的填写或提交
- **AND** 系统 MUST 返回可展示的前置门禁原因

#### Scenario: 1.2 最终通过后可处理 1.3

- **WHEN** `1.2 项目立项审批表` 已由总经理最终审批通过
- **THEN** 系统 MUST 允许营销中心负责人按权限填写或提交 `1.3 项目立项通知`
- **AND** `1.3` 仍 MUST 按其在线表单和 `completionMode` 规则参与阶段齐套判断

### Requirement: 项目入口与工作区数据边界

系统 MUST 支持前端将项目总览作为项目主入口、将项目详情作为项目工作区；第一版 MUST 复用现有项目核心接口，不新增后端接口、不改变项目创建、立项阶段在线表单或阶段资料状态机。

#### Scenario: 项目总览承载项目入口
- **WHEN** 前端加载项目主入口
- **THEN** 系统 MUST 允许前端通过现有 `GET /api/projects/overview-dashboard` 获取项目总览数据
- **AND** 响应 MUST 能继续支持展示用户可见项目、项目状态、当前阶段、齐套或进度信息

#### Scenario: 项目工作区承载单项目内部导航
- **WHEN** 前端进入某个项目 `/projects/:id`
- **THEN** 系统 MUST 允许前端通过现有 `GET /api/projects/:id`、`GET /api/projects/:id/workspace` 和 `GET /api/projects/:id/stage-document-checklist` 组合展示项目工作区
- **AND** 系统 MUST 继续保持项目基础状态、阶段节点视图和阶段资料清单的接口职责边界

#### Scenario: 第一版不新增后端接口
- **WHEN** 实现项目入口和工作区导航调整
- **THEN** 系统 MUST NOT 因本 change 新增项目入口、主导航、蓝色节点点击或产出工作区后端接口
- **AND** 系统 MUST NOT 因本 change 修改数据库、migration 或后端权限模型

#### Scenario: 不改变立项阶段状态机
- **WHEN** 前端通过项目工作区展示立项阶段节点和在线表单入口
- **THEN** 系统 MUST 继续沿用既有 `1.1 / 1.2 / 1.3` 在线表单、评价/审批、返工和前置门禁规则
- **AND** 系统 MUST NOT 因项目入口调整改变这些资料的提交、完成或返工状态判断

### Requirement: 项目工作区阶段范围边界

系统 MUST 支持项目工作区展示 8 阶段导航框架；第一版只要求立项阶段完整节点体验，其他 7 个阶段 MAY 通过占位、旧资料清单入口或后续配置状态表达。

#### Scenario: 8 阶段导航框架
- **WHEN** 前端请求项目工作区数据
- **THEN** 系统 MUST 继续支持展示立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段
- **AND** 系统 MUST NOT 将 8 阶段导航框架解释为本 change 必须补齐所有阶段蓝色节点映射

#### Scenario: 立项阶段完整支持
- **WHEN** 前端展示立项阶段
- **THEN** 系统 MUST 继续支持项目输入、项目市场调研、项目立项审批和项目立项通知节点
- **AND** 系统 MUST 继续支持立项阶段节点到 `1.1`、`1.2`、`1.3` 产出的映射

#### Scenario: 其他阶段暂不完整映射
- **WHEN** 前端展示其他 7 个阶段
- **THEN** 系统 MAY 返回占位、旧资料清单入口或后续配置状态
- **AND** 系统 MUST NOT 要求本 change 补齐其他 7 个阶段完整蓝色节点映射
- **AND** 系统 MUST NOT 要求本 change 将其他阶段产出在线表单化

### Requirement: 蓝色节点状态和产出入口边界

系统 MUST 将蓝色节点作为阶段内业务语境入口，节点状态 MUST 从产出、在线表单、评价/审批、返工和 `completionMode` 派生，不得为项目入口调整新增独立节点完成状态。

#### Scenario: 节点状态派生
- **WHEN** 系统向前端提供蓝色节点状态
- **THEN** 节点状态 MUST 从关联产出、在线表单状态、评价/审批状态、返工状态和 `completionMode` 派生
- **AND** 系统 MUST NOT 因本 change 新增独立蓝色节点完成状态

#### Scenario: 节点产出工作区数据
- **WHEN** 前端展示节点产出工作区
- **THEN** 系统 MUST 继续通过现有阶段资料清单、项目工作区和在线表单接口提供产出名称、资料状态、完成状态、责任人、阻塞原因和可操作权限
- **AND** 系统 MUST NOT 要求新增专用产出工作区接口作为第一版前置条件

### Requirement: 20260629 自研模式流程图项目核心边界

系统 MUST 将 20260629 自研模式流程图作为后续项目阶段节点迁移输入，并 MUST 继续以当前 20260625 64 项资料模板、标准 8 阶段和现有阶段推进规则作为运行基线，除非后续独立 change 明确修改。

#### Scenario: 20260629 仍保留标准 8 阶段
- **WHEN** 团队评审 20260629 自研模式流程图
- **THEN** 系统 MUST 继续保留立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段
- **AND** 系统 MUST NOT 因流程图更新新增、删除或重排项目阶段

#### Scenario: 当前运行基线仍为 20260625 64 项
- **WHEN** 系统创建项目、初始化阶段资料清单、计算齐套或推进阶段
- **THEN** 系统 MUST 继续使用当前 20260625 64 项资料模板作为运行基线
- **AND** 系统 MUST NOT 因 20260629 流程图中疑似新增、改名或阶段移动的产出自动改变项目初始化结果

#### Scenario: 67 和 71 不改变项目核心运行
- **WHEN** 团队将 20260629 PDF 图面红色产出统计为 67 项，或将业务修正后逻辑产出候选统计为 71 项
- **THEN** 项目创建、8 阶段初始化、阶段资料清单初始化和阶段推进 MUST 继续按当前运行基线执行
- **AND** 系统 MUST NOT 因分析数量变化直接新增项目阶段、资料实例或阶段推进门禁

#### Scenario: 立项阶段当前实现不被流程图评审推翻
- **WHEN** 团队评审 20260629 流程图中的立项阶段
- **THEN** 系统 MUST 继续保留当前 `1.1 项目需求表`、`1.2 项目立项审批表` 和 `1.3 项目立项通知` 在线表单、评价审批、返工和前置门禁规则
- **AND** 系统 MUST NOT 因本规划 change 修改 `1.2` 审批不通过后的返工和重填状态机

#### Scenario: 后续阶段迁移逐阶段实施
- **WHEN** 团队准备将 20260629 后 7 阶段蓝色节点纳入系统
- **THEN** 系统 MUST 通过后续独立 change 按阶段实施
- **AND** 系统 MUST NOT 以一次性全阶段迁移作为当前 change 的实现要求

#### Scenario: 准备签订节点按草稿和成品建模
- **WHEN** 后续 change 实施合同签订阶段或生产制作阶段中准备和签订类节点
- **THEN** 团队 MUST 将准备节点和签订节点区分为草稿产出候选和成品产出候选
- **AND** 系统 MUST NOT 长期用同一个成品产出同时表达准备、审核和签订完成状态

#### Scenario: 成本估算表是多节点协作例外
- **WHEN** 后续 change 实施方案设计阶段成本估算和价格估算节点
- **THEN** 系统 MAY 将 `成本估算表` 作为真实多人或多节点协作同一产出处理
- **AND** 该例外 MUST NOT 推导为所有准备/签订节点均可共用同一产出

### Requirement: 20260629 71 项候选不改变项目运行基线

项目核心能力 MUST 继续以当前 20260625 64 项资料模板驱动项目创建、阶段初始化和阶段推进门禁；20260629 71 项资料清单在本 change 中只能作为后续模板确认输入。

#### Scenario: 项目创建仍初始化 64 项
- **WHEN** 用户创建新项目
- **THEN** 系统 MUST 继续按当前 20260625 64 项资料模板初始化项目级阶段资料
- **AND** 系统 MUST NOT 初始化 71 项候选模板中的新增资料

#### Scenario: 阶段推进仍读取当前资料状态
- **WHEN** 系统判断阶段齐套或阶段推进门禁
- **THEN** 系统 MUST 继续读取当前项目级 64 项资料及其现有 completionMode、状态、适用性和返工字段
- **AND** 系统 MUST NOT 因 71 项候选清单改变阶段推进结果

#### Scenario: 候选变化不得混入项目核心实现
- **WHEN** 71 项候选涉及新增、删除、合并、改名、阶段移动、必填性或 completionMode 调整
- **THEN** 项目核心实现 MUST NOT 在本 change 中修改项目创建、项目编号、阶段推进、业务日志、工作台任务或状态机
- **AND** 相关运行时变化 MUST 由后续独立 change 处理

#### Scenario: 目标模板切换必须独立实现
- **WHEN** 团队准备将 20260629 图面产出 + 4 个草稿修正形成的 71 项候选切换为运行模板
- **THEN** 团队 MUST 通过后续独立 change 修改模板、初始化、迁移、阶段推进门禁、工作台和验收
- **AND** 本规划 change MUST NOT 改变任何项目核心运行时行为

#### Scenario: 目标工作区迁移围绕八阶段蓝色模块推进
- **WHEN** 后续迁移项目工作区主操作
- **THEN** 项目核心 MUST 继续保持 8 阶段结构
- **AND** 迁移目标 MUST 围绕阶段、蓝色模块、产出卡片、责任人、上传、提交和审核入口推进
- **AND** 项目核心 MUST NOT 在本规划 change 中一次性改变阶段推进、工作台或状态机

### Requirement: v20260629 shell 不改变项目初始化与旧项目状态

项目核心能力 MUST 将本 change 限定为 `v20260629` 配置和项目工作区 shell 实现边界；本 change MUST NOT 默认把新项目切到 `v20260629`，也 MUST NOT 自动补初始化、迁移或改写旧项目 64 项资料状态。

#### Scenario: 新项目默认模板不在本 change 切换
- **WHEN** 本 shell change 定义 `v20260629` 目标模板配置或受控开关设计
- **THEN** 项目创建 MUST 继续使用当前运行模板
- **AND** 系统 MUST NOT 因本 change 默认将新项目初始化为 `v20260629`
- **AND** 真正切换新项目模板 MUST 通过后续独立 change 实现

#### Scenario: 旧项目不自动补初始化或迁移
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 shell change MUST NOT 自动补初始化 71 项目标模板资料
- **AND** 本 shell change MUST NOT 迁移旧项目、改写 64 项资料状态、改写责任人、改写附件或改变阶段推进结果
- **AND** 旧项目迁移或补初始化 MUST 通过后续独立 change 明确映射、保留项、废弃项、草稿/成品拆分和追溯规则

#### Scenario: 阶段推进边界保持受控
- **WHEN** 项目使用 `v20260629` 或仍使用 20260625 模板
- **THEN** 阶段推进 MUST 基于该项目实际模板版本、项目级资料状态、completionMode、适用性和返工字段判断
- **AND** 本 shell change MUST NOT 改变任何项目的阶段推进结果

#### Scenario: 工作区 shell 不改变项目核心状态机
- **WHEN** 项目工作区返回或渲染 8 阶段、蓝色模块和产出卡片 shell
- **THEN** 项目核心 MUST NOT 因 shell 展示改变项目状态机、阶段推进门禁、工作台任务生成或项目编号规则
- **AND** 产出卡片入口和状态展示 MUST 读取既有后端状态，不创建第二套项目完成状态

#### Scenario: 工作台和业务日志不在 shell 中改变
- **WHEN** 本 shell change 只实现大框架 shell
- **THEN** 系统 MUST NOT 修改工作台任务生成、项目业务日志语义、项目编号规则或状态机
- **AND** 这些运行时变化 MUST 由后续 implementation change 明确规格和验证

### Requirement: 产出卡片资料操作沿用项目核心状态边界

项目核心能力 MUST 让产出卡片触发的资料通用操作沿用当前项目资料的同一套后端状态、权限、业务日志和阶段推进判断；迁移 MUST NOT 创建第二套资料状态机、阶段推进规则、工作台任务规则或项目编号规则。

#### Scenario: 产出卡片复用现有资料接口和权限
- **WHEN** 上方产出卡片执行责任人分配、附件上传、提交资料、审核通过、审核退回、返工重提/返工完成、标记不适用或恢复适用
- **THEN** 后端 MUST 使用现有阶段资料接口、权限判断、状态字段和业务日志
- **AND** 系统 MUST NOT 为产出卡片创建第二套上传、提交、审核或退回规则

#### Scenario: 阶段推进结果不因入口迁移改变
- **WHEN** 同一资料通过上方产出卡片完成上传、提交、审核、返工或适用性操作
- **THEN** 项目阶段推进 MUST 继续按当前项目实际资料状态、completionMode、适用性和返工字段判断
- **AND** 入口从旧资料清单迁移到产出卡片 MUST NOT 改变阶段推进结果

#### Scenario: 只迁移现有项目资料
- **WHEN** 产出卡片没有绑定现有 documentId 或稳定 documentCode
- **THEN** 系统 MUST NOT 创建实际资料记录或把 v20260629 71 项候选落库
- **AND** 系统 MUST NOT 对旧项目补初始化新增资料

#### Scenario: 新项目默认模板不在本 change 切换
- **WHEN** 本 change 规划或实现产出卡片通用操作迁移
- **THEN** 项目创建 MUST 继续使用当前运行模板
- **AND** 系统 MUST NOT 因本 change 默认启用 v20260629 71 项模板

#### Scenario: 旧项目不自动迁移
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 change MUST NOT 迁移旧项目、改写旧项目 64 项资料状态、改写责任人或改写附件
- **AND** 旧项目迁移 MUST 通过后续独立 change 明确映射和验收

#### Scenario: 立项专用状态保持
- **WHEN** 产出卡片对应 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 项目核心 MUST 继续沿用现有在线表单、评价审批、返工和前置门禁规则
- **AND** 系统 MUST NOT 新增普通提交路径绕过立项专用规则

### Requirement: 项目核心覆盖核查输入边界

项目核心能力 MUST 支持以当前运行模板资料、workspace 输出卡片和 v20260629 目标模板配置作为覆盖率核查输入，但核查 MUST NOT 改变项目运行模板、项目资料记录或旧项目状态。

#### Scenario: 当前 64 项作为运行基线
- **WHEN** 执行 workspace card 覆盖率核查
- **THEN** 核查 MUST 以当前运行的 20260625 64 项资料作为主表
- **AND** v20260629 71 项目标模板 MUST 仅作为参照，不得替代当前运行基线

#### Scenario: 核查不写项目资料
- **WHEN** 生成覆盖率核查结论
- **THEN** 项目核心 MUST NOT 创建、补初始化、删除或改写项目阶段资料记录
- **AND** 系统 MUST NOT 将 71 项候选资料落库

#### Scenario: 核查不迁移旧项目
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 change MUST NOT 迁移旧项目、改写旧项目资料状态、改写责任人或改写附件
- **AND** 旧项目迁移 MUST 通过后续独立 change 明确映射和验收

#### Scenario: 覆盖状态和目标模板状态分离
- **WHEN** 某项资料完成覆盖核查
- **THEN** 项目核心核查结论 MUST 使用 `workspaceCoverageStatus` 标记 `covered_by_workspace_card`、`legacy_only`、`shell_placeholder_only`、`needs_mapping_fix` 或 `needs_business_confirmation` 之一
- **AND** 项目核心核查结论 MUST 使用 `targetTemplateStatus` 单独标记 `kept_in_v20260629`、`removed_in_v20260629`、`split_in_v20260629`、`renamed_or_mapped_in_v20260629` 或 `needs_business_confirmation` 之一
- **AND** 后续旧清单清理 MUST 主要依据 `workspaceCoverageStatus` 识别阻塞项，MUST NOT 仅因 `targetTemplateStatus` 决定当前旧清单清理

### Requirement: 旧模板合同审核资料 workspace 兼容卡片

项目核心能力 MUST 为当前运行 64 项资料中剩余的 `3.3 合同审核记录表（销售合同）` 和 `5.4 采购合同审核记录表` 提供上方 workspace card 主入口，并 MUST 保持 v20260629 71 项目标模板口径不变。

#### Scenario: 3.3 作为销售合同审核兼容卡片
- **WHEN** 系统构建合同签订阶段 workspace shell
- **THEN** 系统 MUST 返回绑定 `legacyDocumentCode=3.3` 的 `合同审核记录表（销售合同）` 兼容 output/card
- **AND** 该卡片 MUST 位于合同签订阶段，并靠近或归属于销售合同签订语境
- **AND** 该卡片 MUST 使用当前运行资料的 documentId 或稳定 documentCode 作为绑定依据

#### Scenario: 5.4 作为采购合同审核兼容卡片
- **WHEN** 系统构建生产制作阶段 workspace shell
- **THEN** 系统 MUST 返回绑定 `legacyDocumentCode=5.4` 的 `采购合同审核记录表` 兼容 output/card
- **AND** 该卡片 MUST 位于生产制作阶段，并靠近或归属于采购合同签订语境
- **AND** 该卡片 MUST 使用当前运行资料的 documentId 或稳定 documentCode 作为绑定依据

#### Scenario: 当前 64 项覆盖率达到 64/64
- **WHEN** 团队执行旧资料清单清理前覆盖率核查
- **THEN** 当前运行 64 项资料 MUST 全部可在上方 workspace card 找到主入口
- **AND** `workspaceCoverageStatus` 汇总 MUST 为 `covered_by_workspace_card=64`、`legacy_only=0`、`shell_placeholder_only=0`、`needs_mapping_fix=0`、`needs_business_confirmation=0`

#### Scenario: 兼容卡片不改变目标模板状态
- **WHEN** 系统为 `3.3` 或 `5.4` 返回 workspace 兼容卡片
- **THEN** 系统 MUST NOT 将这两个资料重新计入 v20260629 71 项目标模板
- **AND** 覆盖核查中的 `targetTemplateStatus` MUST 继续允许将这两个资料标记为 `removed_in_v20260629`
- **AND** 系统 MUST NOT 因兼容卡片创建、补初始化或迁移任何项目资料记录

### Requirement: 新项目默认使用 v20260629 模板且旧项目不迁移

项目核心能力 MUST 在本 change implementation 完成后让新建项目默认使用 v20260629 71 项资料模板，并 MUST 保持旧项目按其已有项目资料记录运行。

#### Scenario: 创建新项目生成 71 项资料
- **WHEN** 用户创建新项目
- **THEN** 项目创建事务 MUST 初始化标准 8 阶段和 v20260629 71 项项目级阶段资料
- **AND** 项目创建 MUST 继续记录创建人和 `project.created` 业务日志
- **AND** 项目创建 MUST NOT 因项目编号、项目经理、项目模式、参与中心、计划时间或立项日期为空被拒绝

#### Scenario: 71 项模板字段映射必须先封口
- **WHEN** 团队实现 v20260629 新项目默认模板启用
- **THEN** 项目核心 MUST 在切换默认模板前固化 71 项字段映射清单
- **AND** 字段映射清单 MUST 至少包含 documentCode、documentName、stageOrder、stageKey、documentOrder、completionMode、submitMode 和 isRequired
- **AND** 字段映射清单 MUST 明确 documentCode 是否使用 targetOutputCode，且 completionMode、submitMode、isRequired MUST NOT 在编码时临时决定

#### Scenario: 旧项目不迁移
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 项目核心 MUST NOT 自动补初始化 71 项资料
- **AND** 项目核心 MUST NOT 迁移旧项目、改写旧项目 64 项资料状态、改写责任人、改写附件或改变阶段推进结果

#### Scenario: 阶段推进按项目实际资料集合判断
- **WHEN** 系统判断阶段齐套、阶段推进门禁、工作台待办或项目工作区状态
- **THEN** 判断 MUST 基于该项目实际存在的阶段资料记录、completionMode、适用性、状态和返工字段
- **AND** 系统 MUST 支持 v20260629 新项目和 20260625 旧项目并存

#### Scenario: LC33 LC54 不进入新项目
- **WHEN** 项目创建事务初始化 v20260629 新项目资料
- **THEN** 项目核心 MUST NOT 创建 `3.3`、`5.4`、`LC33` 或 `LC54` 对应项目资料记录
- **AND** `LC33 / LC54` MUST 仅用于旧项目或 64 项项目的 workspace 兼容展示

#### Scenario: 回滚不自动改写已创建项目
- **WHEN** 团队将默认模板版本从 v20260629 回滚到旧模板版本
- **THEN** 回滚 MUST 只影响后续新建项目默认初始化
- **AND** 已按 v20260629 创建的项目 MUST NOT 自动回滚、删除资料或改写为 64 项

#### Scenario: 立项主流程不回退
- **WHEN** v20260629 新项目处理 `1.1 / 1.2 / 1.3`
- **THEN** 项目核心 MUST 继续使用现有在线表单、`1.2` 专用评价审批、精准返工和项目编号前置门禁
- **AND** 项目核心 MUST NOT 新增普通提交、普通审核或普通退回路径绕过立项专用规则

### Requirement: v20260629 新项目运行基线验证

项目核心能力 MUST 支持对 v20260629 新项目真实运行基线进行验证和阻塞 bug 修复；验证和修复 MUST 保持旧项目不迁移，并 MUST NOT 新增业务规则、数据库 migration、文件平台联动或第二套状态机。

#### Scenario: 新项目生成 71 项运行资料
- **WHEN** 团队执行 v20260629 新项目运行基线 API smoke
- **THEN** 新建测试项目 MUST 初始化标准 8 阶段和 71 项项目级阶段资料
- **AND** 新项目资料 MUST 保存 `v20260629` 模板版本或等价稳定版本标识

#### Scenario: 新项目不包含旧兼容资料
- **WHEN** 团队核查 v20260629 新项目资料集合
- **THEN** 新项目 MUST NOT 包含 `3.3`、`5.4`、`LC33` 或 `LC54` 对应项目资料记录
- **AND** `LC33 / LC54` MUST 继续仅服务旧项目 workspace 兼容展示

#### Scenario: 旧项目保持 64 项
- **WHEN** 系统存在已按 20260625 64 项初始化的旧项目
- **THEN** 本 change MUST NOT 迁移旧项目、补初始化旧项目或改写旧项目资料状态、责任人、附件和阶段推进结果
- **AND** 旧项目 MUST 继续按其已有项目级资料记录运行

#### Scenario: 阶段推进按项目实际资料集合
- **WHEN** 系统判断 v20260629 新项目或 20260625 旧项目的阶段齐套、阶段推进门禁、工作台待办或项目工作区状态
- **THEN** 判断 MUST 基于该项目实际存在的资料记录、completionMode、适用性、状态和返工字段
- **AND** 系统 MUST NOT 将 64 项旧模板和 71 项新模板混用为同一个项目资料集合

#### Scenario: 运行阻塞 bug 可在本 change 修复
- **WHEN** Runtime Audit 或 Browser Acceptance 发现 v20260629 新项目运行阻塞 bug
- **THEN** 项目核心 MAY 在本 change 内修复现有项目创建、资料查询、workspace 聚合、工作台或阶段推进逻辑
- **AND** 修复 MUST 复用现有资料状态、权限、附件、业务日志和阶段推进边界
- **AND** 修复 MUST NOT 新增业务规则、流程引擎、文件平台联动、数据库 migration 或旧项目迁移

#### Scenario: 立项主流程不回退
- **WHEN** v20260629 新项目处理 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 项目核心 MUST 继续使用现有在线表单、`1.2` 专用评价审批、精准返工和项目编号前置门禁
- **AND** 项目核心 MUST NOT 新增普通提交、普通审核或普通退回路径绕过立项专用规则

### Requirement: 立项阶段责任人与退回路径修正

项目核心能力 MUST 支持领导补充的立项阶段责任人与退回路径口径；项目 MUST 先创建再进入立项阶段，且本 change MUST NOT 改变 v20260629 / 71 项资料模板数量。

#### Scenario: 创建项目选择商务和技术负责人
- **WHEN** 用户创建新项目
- **THEN** 系统 MUST 支持选择商务负责人和技术负责人
- **AND** 商务负责人 MUST 是营销中心启用用户
- **AND** 技术负责人 MUST 是研发中心启用用户
- **AND** 项目创建成功后才进入项目详情和立项阶段

#### Scenario: 项目输入展示基础信息和负责人
- **WHEN** 用户查看立项阶段项目输入节点
- **THEN** 系统 MUST 展示项目名称、客户名称、客户联系人和电话、商务负责人、技术负责人
- **AND** 系统 MUST NOT 将项目输入理解为生成真实文件

#### Scenario: 1.1 和 1.2 默认绑定商务负责人
- **WHEN** 新项目进入项目市场调研或项目立项审批
- **THEN** `1.1 项目需求表` 的填写责任 MUST 默认绑定商务负责人
- **AND** `1.2 项目立项审批表` 的填写责任 MUST 默认绑定商务负责人
- **AND** 系统 MUST 继续使用现有在线表单和 `1.2` 专用评价审批主流程

#### Scenario: 商务评价拒绝退回项目市场调研
- **WHEN** 营销中心负责人处理商务评价审批并拒绝
- **THEN** 系统 MUST 将立项流程退回项目市场调研
- **AND** 系统 MUST 记录退回原因
- **AND** 系统 MUST 写入业务日志

#### Scenario: 技术评价拒绝退回项目市场调研
- **WHEN** 研发中心负责人处理技术评价审批并拒绝
- **THEN** 系统 MUST 将立项流程退回项目市场调研
- **AND** 系统 MUST 记录退回原因
- **AND** 系统 MUST 写入业务日志

#### Scenario: 总经理拒绝支持退回或结束
- **WHEN** 商务评价和技术评价都完成后总经理处理立项审批并拒绝
- **THEN** 系统 MUST 支持退回项目市场调研
- **AND** 系统 MUST 支持将项目结束

#### Scenario: 项目结束记录审计信息
- **WHEN** 总经理拒绝并选择“项目结束”
- **THEN** 系统 MUST 记录项目结束原因
- **AND** 系统 MUST 记录操作者
- **AND** 系统 MUST 记录操作时间
- **AND** 系统 MUST 写入业务日志

#### Scenario: 项目结束后阻止后续推进
- **WHEN** 项目因总经理拒绝进入项目结束状态
- **THEN** 系统 MUST 阻止继续推进立项通知
- **AND** 系统 MUST 阻止进入方案设计阶段
- **AND** 系统 MUST 阻止后续资料操作继续推进项目
- **AND** 相关待办 MUST NOT 继续作为可处理待办展示

#### Scenario: 项目结束状态可查询
- **WHEN** 用户查询项目总览、项目详情、我的工作台或阶段推进状态
- **THEN** 系统 MUST 返回项目已结束状态
- **AND** 系统 MUST 返回项目结束原因摘要或等价可展示信息
- **AND** 系统 MUST NOT 将已结束项目作为正常可推进项目返回

### Requirement: 立项在线表单真实模板 schema

项目核心能力 MUST 提供与真实模板对齐的 `1.1 项目需求表`、`1.2 项目立项审批表`、`1.3 项目立项通知` 在线表单 schema；本 change MUST NOT 新增资料项或改变 v20260629 / 71 项模板数量。

#### Scenario: 1.1 项目需求表 schema 对齐市场调研模板
- **WHEN** 系统返回 `1.1 项目需求表` 在线表单 schema
- **THEN** schema MUST 包含基础信息、环境要求、场地情况、工件描述、作业工艺、目标分组
- **AND** schema MUST 覆盖项目名称、客户名称、交流时间、交流次数、交流地点、交流方式、我方人员、甲方人员
- **AND** schema MUST 覆盖工作温度、储存温度、工作湿度、储存湿度、噪音、IP 防护等级、防腐等级、海拔高度、防爆要求
- **AND** schema MUST 覆盖可用场地尺寸、电源、气源、液压源、吊装设备
- **AND** schema MUST 覆盖工件外形尺寸、质量、材质、数量、是否有图纸 / 图纸提供说明
- **AND** schema MUST 覆盖作业工艺做什么、怎么做、是否有工艺文件 / 工艺文件提供说明
- **AND** schema MUST 覆盖自动化环节、节拍、人机交互模式、价格、工期

#### Scenario: 1.2 项目立项审批表 schema 对齐评分模板
- **WHEN** 系统返回 `1.2 项目立项审批表` 在线表单 schema
- **THEN** schema MUST 包含基础信息、商务模块、技术模块和三方意见展示区域
- **AND** 基础信息 MUST 覆盖项目名称、项目号、客户名称、项目联系人、客户联系方式、项目负责人、项目负责人联系方式
- **AND** 商务模块 MUST 包含甲方属性、甲方企业信息、身份角色、公司竞争优势、商务形式及背调、商务关系层级、项目情况 7 项
- **AND** 技术模块 MUST 包含特殊环境要求、行业门槛、技术成熟度、可借鉴案例 4 项
- **AND** 每项评分 MUST 支持条款内容、评价标准、分值 0-5、信息收集说明、责任人
- **AND** 每项评分 MUST 预置真实模板中的条款内容和评价标准文本
- **AND** 每项评分 MUST 显式保留信息收集说明字段；当前模板行内未填写说明文本的项，系统 MUST 保留空值或待补充占位，不得省略该列

#### Scenario: 1.2 商务模块评分项预置真实模板文本
- **WHEN** 系统返回 `1.2 项目立项审批表` 商务模块 schema
- **THEN** `甲方属性` MUST 预置条款内容“①包括央国企业、军工企业、上市公司、龙头企业。②在细分行业是否属于领头羊企业？”和评价标准“0分-以上要求均不满足；1分-龙头企业；2分-上市公司；3分-军工企业；4-5分-央国企业”
- **AND** `甲方企业信息` MUST 预置条款内容“注册资本、甲方的年销售额、甲方的人员数量、甲方的场地、硬件设施设备场地、历史风险，是否有被供应商起诉等？”和评价标准“0分-以上要求均不满足；1分-以上要求满足1条；2分-以上要求满足2条；3分-以上要求满足3条；4分-以上要求满足4条；5分-以上要求满足5条及以上”
- **AND** `身份角色` MUST 预置条款内容“①甲方对这个项目的投资意愿是否明确？②这个项目属于甲方的什么地位，比如说生产的关键要素，比如说只是辅助的一些条件。③我们属于什么身份?”和评价标准“0分-以上要求均不满足；1分-以上要求满足甲方明确愿意投资项目；2分-以上要求满足甲方交由总包方，我们以分包身份项目跟进；3分-以上要求满足甲方交由乙方项目跟进；4分-以上要求满足甲方属于辅助生产节点；5分-以上要求满足甲方属于生产关键节点”
- **AND** `公司竞争优势` MUST 预置条款内容“①项目优势主要体现在哪，公司技术？公司的影响力？②公司内部资源，包括资金，包括人脉，包括政府关系？”和评价标准“0分-以上要求均不满足；1分-以上要求满足技术能力满足；2分-以上要求满足公司影响力推动；3分-以上要求满足资金支持；4分-以上要求满足内部资源，人脉关系；5分-以上要求满足政府背景”
- **AND** `商务形式及背调` MUST 预置条款内容“①项目会采取什么样的商务过程，是邀标还是直接谈判？挂网，还是最低价中标？②总共几家参与？”和评价标准“0分-以上要求均不满足；1分-以上要求满足低价中标；2分-以上要求满足邀请招标；3分-以上要求满足公开招标；4分-以上要求满足挂网；5分-以上要求满足直接谈判”
- **AND** `商务关系层级` MUST 预置条款内容“①是否和项目决策人搭上关系？②是否和公司的老板搭上关系？③是否和技术决策人搭上关系？④对于居间人，可以提前签居间合同，保证他们的利益，同时知道甲方的商务情况及核心技术，信息不能提供或不清楚，一概拒绝，暂停合作。”和评价标准“0分-以上要求均不满足；1分-以上要求满足1条；2分-以上要求满足2条；3分-以上要求满足3条；4-5分-以上要求满足4条”
- **AND** `项目情况` MUST 预置条款内容“①项目体量大小？②预算多少？③项目的时间及周期?④地域位置?⑤整体性价比？⑥是否达成战略合作，并根据实际情况完成相应配合度？”和评价标准“0分-以上要求均不满足；1分-以上要求满足1条；2分-以上要求满足2条；3分-以上要求满足3条；4分-以上要求满足4条；5分-以上要求满足5-6条”

#### Scenario: 1.2 技术模块评分项预置真实模板文本
- **WHEN** 系统返回 `1.2 项目立项审批表` 技术模块 schema
- **THEN** `特殊环境要求` MUST 预置条款内容“特殊环境要求（防爆/高温/高湿/高压/高海拔/特殊防腐/低噪音）”和评价标准“0-以上要求5点及以上；1-以上要求4点；2-以上要求3点；3-以上要求2点；4-以上要求1点；5-以上要求均无”
- **AND** `行业门槛` MUST 预置条款内容“行业门槛”和评价标准“0-3体系+基本国标+行业标准+企业标准+特殊标准；1-3体系+基本国标+行业标准+企业标准；2-3体系+基本国标+行业标准；3-3体系+基本国标；4-只要求3体系；5-无行业门槛”
- **AND** `技术成熟度` MUST 预置条款内容“技术成熟度”和评价标准“0-无相关技术可查；1-只有技术概念；2-可以看到原型机；3-小范围用户使用；4-已经市场推广；5-本公司工程师工作经历相符”
- **AND** `可借鉴案例` MUST 预置条款内容“可借鉴案例”和评价标准“0-无相关案例；1-只有个别案例；2-市场上有少量相关案例；3-市场上有大量相关案例；4-合作供应商有相关案例；5-本公司有相关项目案例”

#### Scenario: 1.2 责任人口径保持商务负责人填写
- **WHEN** 新项目进入 `1.2 项目立项审批表` 填写
- **THEN** 系统 MUST 默认由商务负责人填写整张表
- **AND** 技术模块评分 MUST 仍由商务负责人填写
- **AND** 系统 MUST NOT 为技术负责人新增表单填写任务
- **AND** 系统 MUST 继续使用现有 `1.2` 商务评价、技术评价、总经理审批流生成三方意见

#### Scenario: 1.3 项目立项通知 schema 对齐通知模板
- **WHEN** 系统返回 `1.3 项目立项通知` 在线表单 schema
- **THEN** schema MUST 包含固定标题“关于确定项目名称及编号的通知”
- **AND** schema MUST 包含固定正文“各部门：”
- **AND** schema MUST 包含固定正文“为便于公司项目生产准备、事前申请、费用填报、成本归集、物资采购等工作开展。现将各项目的项目名称、项目编号确定如下：”
- **AND** schema MUST 包含固定正文“请各部门严格按照项目名称、项目编号进行生产准备、费用填报、事前申请、成本归集、物资采购等工作。”
- **AND** schema MUST 包含序号、项目编号、项目名称、客户单位、立项日期表格字段
- **AND** schema MUST 包含“重庆凯尔夫智能测控技术有限责任公司”和日期落款

### Requirement: 立项阶段项目编号门禁调整

项目核心能力 MUST 将项目编号门禁调整为 `1.2 总经理最终通过 -> 允许填写/生成项目编号 -> 1.3 自动带出项目编号并提交 -> 立项阶段齐套`。

#### Scenario: 1.2 最终通过前不能填写项目编号
- **WHEN** `1.2 项目立项审批表` 尚未被总经理最终通过
- **THEN** 系统 MUST NOT 允许填写或生成项目编号
- **AND** 系统 MUST NOT 允许通过项目编号绕过 `1.2` 审批

#### Scenario: 1.2 最终通过后允许填写项目编号
- **WHEN** `1.2 项目立项审批表` 已经被总经理最终通过
- **THEN** 系统 MUST 允许有权限用户填写或生成项目编号
- **AND** 项目编号保存后 MUST 成为 `1.3 项目立项通知` 的自动带出字段

#### Scenario: 1.3 提交前必须已有项目编号
- **WHEN** 用户提交 `1.3 项目立项通知`
- **THEN** 系统 MUST 校验项目已有项目编号
- **AND** 若项目编号为空，系统 MUST NOT 提交 `1.3`
- **AND** 若项目编号存在，系统 MUST 将项目编号带入在线通知内容

### Requirement: 立项项目主数据客户联系人

项目核心能力 MUST 支持新建项目客户联系人字段；客户联系人 MUST 作为项目主数据参与创建、查询、展示和在线表单自动带出。创建新项目输入 MUST 包含客户联系人，客户联系人为空时不得创建新项目；旧项目缺失客户联系人时允许为空返回。本能力 MUST NOT 新增资料项或改变 v20260629 / 71 项资料数量。

#### Scenario: 创建项目包含客户联系人
- **WHEN** 用户创建新项目
- **THEN** 项目创建输入 MUST 包含客户联系人
- **AND** 客户联系人字段 MUST 位于客户联系方式前
- **AND** 客户联系人为空时系统 MUST NOT 创建新项目

#### Scenario: 项目主数据返回客户联系人
- **WHEN** 系统返回项目详情、项目列表或项目总览数据
- **THEN** 响应 MUST 能包含客户联系人或等价字段
- **AND** 旧项目缺少客户联系人时 MUST 允许为空展示

#### Scenario: 在线表单自动带出客户联系人
- **WHEN** 系统生成或返回立项在线表单上下文
- **THEN** 系统 MUST 支持将客户联系人作为项目主数据自动带出字段
- **AND** 系统 MUST NOT 因客户联系人新增而迁移旧项目或补初始化旧资料

### Requirement: 1.2 项目编号前置到填写阶段
该既有口径 MUST 被新版模板流程取代：项目编号不再前置到 `1.2` 填写阶段，而是由 `1.3 项目立项通知` 提交时正式确定。

#### Scenario: 1.2 不再保存项目编号
- **WHEN** 用户保存或提交 `1.2`
- **THEN** 系统 MUST NOT 从 `1.2` 表单保存项目编号到项目主数据
- **AND** 系统 MUST NOT 要求商务负责人在 `1.2` 填写或确认项目编号

#### Scenario: 1.3 负责项目编号唯一性
- **WHEN** 用户提交 `1.3`
- **THEN** 系统 MUST 在 `1.3` 提交流程中校验项目编号必填和唯一
- **AND** 系统 MUST 在 `1.3` 提交流程中写入项目主数据

### Requirement: 1.2 商务技术协同填写门禁
项目核心能力 MUST 保持 `1.2` 商务/技术协同填写和双方完成后进入评价审批的门禁，但 MUST 按新版模板移除项目编号填写职责。

#### Scenario: 商务负责人填写新版商务模块
- **WHEN** 商务负责人打开 `1.2 项目立项审批表`
- **THEN** 系统 MUST 允许其填写新版商务模块和允许的表头字段
- **AND** 系统 MUST NOT 展示或校验项目编号字段

#### Scenario: 技术负责人填写新版技术模块
- **WHEN** 技术负责人打开 `1.2 项目立项审批表`
- **THEN** 系统 MUST 允许其填写新版技术模块
- **AND** 系统 MUST NOT 允许技术负责人修改商务模块

### Requirement: 立项在线表单后续模板文件产出

项目核心能力 MUST 将 `1.1 / 1.2 / 1.3` 在线表单提交后生成模板文件作为后续能力方向；本 change MUST NOT 生成 Excel、Word、PDF 或文件平台文件。

#### Scenario: 在线表单仍是填写入口
- **WHEN** 用户填写 `1.1`、`1.2` 或 `1.3`
- **THEN** 系统 MUST 继续将在线表单作为填写入口
- **AND** 系统 MUST NOT 将三项资料退回普通附件上传流程

#### Scenario: 后续生成模板文件
- **WHEN** 后续实现文件产出能力
- **THEN** `1.1` 提交后 SHOULD 生成 `项目需求表-模板.xlsx` 对应文件
- **AND** `1.2` 提交或审批完成后 SHOULD 生成 `项目立项审批表-模板.xlsx` 对应文件
- **AND** `1.3` 提交后 SHOULD 生成 `关于确定项目名称及编号的通知-模板.docx` 对应文件

#### Scenario: 本 change 不生成文件
- **WHEN** 本 change 完成实现
- **THEN** 系统 MUST NOT 生成 Excel、Word、PDF、普通附件或文件平台文件
- **AND** 系统 MUST NOT 将文件生成写成已完成能力

### Requirement: 立项在线表单模板文件生成方向

项目核心能力 MUST 支持将 `1.1 / 1.2 / 1.3` 在线表单结构化数据生成对应真实模板文件作为后续实现方向；本 planning change MUST NOT 直接生成 Excel、Word、PDF 或文件平台文件。文件生成能力 MUST 作为可复用能力设计，不能只针对立项阶段硬编码。

#### Scenario: 1.1 提交后生成项目需求表文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.1 项目需求表` 在线表单提交成功
- **THEN** 系统 SHOULD 基于 `项目需求表-模板.xlsx` 生成项目需求表文件
- **AND** 生成文件 MUST 归属于原 `1.1` 资料项

#### Scenario: 1.2 总经理最终通过后生成项目立项审批表文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.2 项目立项审批表` 总经理最终通过
- **THEN** 系统 SHOULD 基于 `项目立项审批表-模板.xlsx` 生成正式项目立项审批表文件
- **AND** 系统 MUST NOT 因生成文件绕过商务评价、技术评价或总经理审批

#### Scenario: 1.3 提交后生成项目立项通知文件
- **WHEN** 后续实现中文件生成能力启用
- **AND** `1.3 项目立项通知` 在线表单提交成功
- **THEN** 系统 SHOULD 基于 `关于确定项目名称及编号的通知-模板.docx` 生成项目立项通知文件
- **AND** 生成文件 MUST 归属于原 `1.3` 资料项

### Requirement: 立项模板文件生成时机与版本

项目核心能力 MUST 规划模板文件生成时机和版本策略；第一版 SHOULD 保留文件版本，不应静默覆盖旧文件。默认查看 SHOULD 指向最新有效版本。

#### Scenario: 重新填写后生成新版本
- **WHEN** 资料退回、返工或重新填写后再次达到生成条件
- **THEN** 系统 SHOULD 生成新版本文件或将旧版本标记为失效
- **AND** 系统 MUST 能区分最新有效版本和历史版本

#### Scenario: 文件状态可追踪
- **WHEN** 系统处理模板文件生成
- **THEN** 文件记录 MUST 能表达生成中、已生成、生成失败、已被替代或等价状态
- **AND** 文件生成失败 MUST 记录失败原因或可诊断信息

#### Scenario: 文件生成失败不得假装成功
- **WHEN** 模板文件生成失败
- **THEN** 系统 MUST NOT 将文件状态展示为已生成
- **AND** 系统 MUST 保留失败状态以供后续查看、排查或重试

#### Scenario: 文件生成失败不回滚 1.1 提交
- **WHEN** `1.1 项目需求表` 在线表单提交成功
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚在线表单提交结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 文件生成失败不回滚 1.2 审批
- **WHEN** `1.2 项目立项审批表` 总经理最终通过
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚商务评价、技术评价或总经理审批结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 文件生成失败不回滚 1.3 提交
- **WHEN** `1.3 项目立项通知` 在线表单提交成功
- **AND** 后续模板文件生成失败
- **THEN** 系统 MUST NOT 回滚在线表单提交结果
- **AND** 文件状态 MUST 为 failed 或等价失败状态

#### Scenario: 阶段推进门禁后续明确
- **WHEN** 文件生成失败但在线表单提交或审批状态已经成功
- **THEN** 本 planning change MUST NOT 承诺生成失败自动阻塞阶段推进
- **AND** 是否将文件生成成功作为阶段推进硬门禁 MUST 由后续实现 change 明确

### Requirement: 立项模板文件记录与权限

项目核心能力 MUST 为生成文件规划后端文件记录和权限检查；无资料查看权限的用户不得查看或下载生成文件。

#### Scenario: 文件记录包含关键元数据
- **WHEN** 后续实现文件记录持久化
- **THEN** 文件记录 SHOULD 包含项目、资料、在线表单、模板、版本、状态、文件名、存储路径、生成操作者、生成时间和失败原因等关键元数据
- **AND** 文件记录 SHOULD 包含源表单提交时间或版本、源表单数据 hash、不可变源快照引用、触发事件、审批快照、模板版本或模板 hash

#### Scenario: 历史文件可追溯生成时数据
- **WHEN** 用户查看历史生成文件元数据
- **THEN** 系统 SHOULD 能追溯到生成时的表单内容、审批意见和模板版本
- **AND** 系统 MUST NOT 只依赖会变化的当前 formId 来解释历史文件

#### Scenario: 重新填写后源快照变化
- **WHEN** 资料退回、返工或重新填写后再次生成文件
- **THEN** 新文件版本 SHOULD 关联新的源快照或源数据 hash
- **AND** 旧版本 SHOULD 保留其生成时的源快照或源数据 hash

#### Scenario: 1.2 记录审批快照
- **WHEN** `1.2 项目立项审批表` 总经理最终通过后生成文件
- **THEN** 文件记录 SHOULD 包含商务评价、技术评价、总经理审批意见、人员和时间的生成时快照

#### Scenario: 有权限用户查看生成文件
- **WHEN** 用户对项目和资料有查看权限
- **AND** 目标资料已有最新有效生成文件
- **THEN** 系统 SHOULD 允许用户查看或下载生成文件

#### Scenario: 无权限用户不得查看或下载
- **WHEN** 用户没有项目或资料查看权限
- **THEN** 系统 MUST NOT 允许用户查看或下载生成文件
- **AND** 系统 MUST NOT 通过文件接口泄露文件路径或元数据

### Requirement: 立项模板字段映射先行

项目核心能力 MUST 要求模板文件生成实现前先建立 `1.1 / 1.2 / 1.3` mapping manifest；mapping manifest MUST 与真实模板字段一致，不得依赖字段名猜测或扩展模板外字段。

#### Scenario: mapping manifest 包含关键映射信息
- **WHEN** 后续实现模板文件生成
- **THEN** 系统 MUST 为每个模板维护 mapping manifest
- **AND** mapping manifest MUST 包含 templateKey、templatePath、fileType、outputDocumentCode、目标位置、来源字段、必填字段、格式保留要求、生成触发事件和失败时应记录的映射错误

#### Scenario: 映射必须与真实模板一致
- **WHEN** 团队实现 `1.1 / 1.2 / 1.3` 文件生成
- **THEN** mapping manifest MUST 对齐真实模板字段、单元格、表格区域、Word 占位符或段落位置
- **AND** 系统 MUST NOT 为生成文件新增真实模板外字段

#### Scenario: 禁止字段名猜测填充
- **WHEN** 文件渲染器填充模板
- **THEN** 系统 MUST 使用 mapping manifest 指定的目标位置和来源字段
- **AND** 系统 MUST NOT 仅根据在线表单字段名自动猜测模板填充位置

### Requirement: 文件生成不改变资料项数量

项目核心能力 MUST 将生成文件视为原资料项的产出形态，而不是新增资料项；本能力 MUST NOT 改变 v20260629 / 71 项资料数量。

#### Scenario: 不新增资料项
- **WHEN** 系统为 `1.1 / 1.2 / 1.3` 生成模板文件
- **THEN** 系统 MUST NOT 新增 `项目需求表文件`、`立项审批表文件`、`立项通知文件` 或等价资料项
- **AND** 生成文件 MUST 作为原资料项的文件产出记录

#### Scenario: 71 项数量不变
- **WHEN** 系统初始化或校验 v20260629 项目资料模板
- **THEN** 资料数量 MUST 继续保持 71 项
- **AND** 文件生成能力 MUST NOT 改变原资料清单数量

### Requirement: 立项模板文件运行时生成
立项模板文件运行时生成能力 MUST 适配新版 `1.2` 审批模板和 `1.3` 累计通知清单。

#### Scenario: 1.2 使用新版审批模板生成
- **WHEN** `1.2` 总经理最终审批通过
- **THEN** 系统 MUST 使用新版 template version 生成审批表
- **AND** manifest MUST 显式映射新版表头、商务/技术评分项、意见区和项目开展模式
- **AND** 生成文件 MUST 根据 `1.2` 项目开展模式字段勾选模板中的自研模式或供应链模式
- **AND** manifest MUST NOT 映射项目编号

#### Scenario: 1.3 使用累计清单生成通知
- **WHEN** `1.3` 提交成功后生成通知
- **THEN** 生成文件 MUST 使用累计项目清单作为表格数据源
- **AND** 生成记录源快照 MUST 包含累计清单输入和当前项目 `1.3` 提交时间 cutoff

### Requirement: 立项模板文件记录与失败状态
项目核心能力 MUST 持久化生成文件记录、状态、版本、源数据快照/hash、模板 hash、触发事件和失败原因；生成失败 MUST NOT 回滚在线表单提交或审批通过结果。

#### Scenario: 文件记录包含审计字段
- **WHEN** 系统创建生成文件记录
- **THEN** 记录 MUST 包含项目、资料、在线表单、模板、文件类型、版本、状态、文件名、内部存储键、生成操作者、生成时间、失败原因、源表单 hash、源快照、触发事件和模板 hash
- **AND** 对包含在线表单图片的 `1.1` 生成文件，源快照和源 hash MUST include each rendered image content hash

#### Scenario: 生成失败不回滚业务状态
- **WHEN** 文件生成在 `1.1` 提交、`1.2` 总经理通过或 `1.3` 提交之后失败
- **THEN** 系统 MUST 保留已成功的在线表单或审批状态
- **AND** 生成文件记录 MUST 进入 `failed` 或等价失败状态
- **AND** 系统 MUST NOT 将失败状态展示或记录为 `generated`

#### Scenario: 重新生成保留版本
- **WHEN** 资料返工、退回或重新填写后再次达到生成条件
- **THEN** 系统 MUST 生成新版本或将旧版本标记为 `superseded`
- **AND** 系统 MUST NOT 静默覆盖旧文件和旧源快照

#### Scenario: 新版本失败不遮蔽旧有效文件
- **WHEN** 某资料已有成功生成的文件版本
- **AND** 后续重新生成产生 `failed` 状态
- **THEN** 状态接口 MUST 表达最新生成尝试失败
- **AND** 下载接口 MUST 继续指向最近一个可读取的 `generated` 文件版本
- **AND** 系统 MUST NOT 将失败版本展示为可下载成功文件

### Requirement: 立项模板文件权限与下载
项目核心能力 MUST 提供生成文件状态和下载接口，并 MUST 复用项目和资料查看权限；无权限用户不得查看文件元数据、下载文件或获知本地路径。

#### Scenario: 有权限用户查看下载
- **WHEN** 用户对项目和目标资料有查看权限
- **AND** 目标资料已有可下载生成文件
- **THEN** 系统 MUST 返回生成状态元数据并允许下载文件

#### Scenario: 下载业务错误
- **WHEN** 目标资料没有可下载生成文件或内部存储文件缺失
- **THEN** 系统 MUST 返回业务错误状态
- **AND** 系统 MUST NOT 将该错误处理为 500 系统错误

#### Scenario: 无权限用户不得查看下载
- **WHEN** 用户没有项目或资料查看权限
- **THEN** 系统 MUST 拒绝生成文件状态和下载请求
- **AND** 响应 MUST NOT 泄露模板绝对路径、内部存储路径或其他无权限元数据

### Requirement: 立项模板字段映射运行时约束
项目核心能力 MUST 使用后端 mapping manifest 填充模板；系统 MUST NOT 仅靠字段名猜测模板位置，也 MUST NOT 为生成文件新增真实模板外字段。

#### Scenario: 使用 mapping manifest
- **WHEN** 文件渲染器填充 `1.1 / 1.2 / 1.3` 模板
- **THEN** 系统 MUST 从 manifest 读取 templateKey、documentCode、fileType、目标位置、来源字段、必填字段、格式保留要求和触发事件
- **AND** 系统 MUST NOT 接受前端传入任意模板路径

#### Scenario: 禁止模板外字段
- **WHEN** 系统构建生成文件源数据
- **THEN** 系统 MUST 使用真实模板和现有在线表单/项目/审批字段
- **AND** 系统 MUST NOT 为生成文件新增资料项或在线表单模板外字段

#### Scenario: 1.1 三处图片嵌入项目需求表
- **WHEN** 用户在 `1.1 项目需求表` 的场地情况、工件描述或作业工艺区域上传 png/jpg/jpeg 图片
- **THEN** 图片 MUST 归属于当前 `1.1` 在线表单
- **AND** 每个区域 MUST allow at most 3 active images and reject the fourth active image with a business error
- **AND** 生成的项目需求表 `.xlsx` MUST 将图片按上传顺序嵌入 manifest 声明的 Excel 区域
- **AND** 生成时 MUST 在目标区域内等比缩放图片，MUST NOT 拉伸变形
- **AND** 图片区域 MUST NOT 覆盖同一模板区域内的文字内容；系统 MUST 将文字和图片写入互不重叠的可视子区域
- **AND** 生成记录的源快照 MUST include each image content hash so the generated file can be audited against the uploaded image bytes
- **AND** 图片 MUST NOT 新增资料项或改变 v20260629 / 71 项数量
- **AND** 系统 MUST NOT 嵌入非图片附件、OLE 对象、文件平台文件或 PDF

### Requirement: 1.2 协同填写前置 1.1 提交
项目核心能力 MUST 在 `1.1 项目需求表` 首次提交或完成之前阻止 `1.2 项目立项审批表` 商务/技术协同填写进入可处理状态。

#### Scenario: 1.1 未提交时 1.2 仅可查看不可编辑
- **WHEN** 有查看权限用户直接打开 `1.2` 在线表单
- **AND** 同项目 `1.1` 尚未提交或完成
- **THEN** 后端 MUST 返回 `canEdit=false` and `canSubmit=false`
- **AND** blockingReasons MUST include `请先提交 1.1 项目需求表`

#### Scenario: 1.1 未提交时 1.2 保存提交被拒绝
- **WHEN** 用户直接调用 `1.2` 在线表单保存或提交接口
- **AND** 同项目 `1.1` 尚未提交或完成
- **THEN** 后端 MUST reject the request with `INITIATION_REQUIREMENT_NOT_SUBMITTED`
- **AND** 系统 MUST NOT 只依赖前端隐藏入口

#### Scenario: 1.1 提交后 1.2 协同待办出现
- **WHEN** `1.1 项目需求表` 已提交或完成
- **AND** 不存在未清 `1.1` 返工
- **THEN** 商务负责人和技术负责人 SHOULD see their respective `1.2` collaboration todos until their own part is submitted

### Requirement: 1.2 项目立项审批表新版模板
项目核心能力 MUST 适配新版 `1.2 项目立项审批表` 模板；新版模板不包含项目号/项目编号字段，`1.2` MUST 只承载商务/技术评分协同填写和后续审批。

#### Scenario: 1.2 不要求项目编号
- **WHEN** 商务负责人或技术负责人保存或提交 `1.2 项目立项审批表`
- **THEN** 系统 MUST NOT 要求填写项目编号
- **AND** 系统 MUST NOT 因项目编号为空阻止 `1.2` 进入商务/技术评价或总经理审批
- **AND** 系统 MUST NOT 在 `1.2` 提交时写入 `projects.project_code`

#### Scenario: 1.2 使用新版评分项
- **WHEN** 系统返回或校验 `1.2` 在线表单
- **THEN** 商务模块 MUST 使用客户企业属性、项目来源、项目定位、商务竞争条件、项目预算、付款条件
- **AND** 技术模块 MUST 使用项目需求、特殊环境要求、行业门槛、技术成熟度、研发模式
- **AND** 系统 MUST 保持商务负责人填写商务模块、技术负责人填写技术模块、双方完成后进入评价审批

#### Scenario: 1.2 总经理通过后生成新版审批表
- **WHEN** `1.2` 总经理最终审批通过
- **THEN** 系统 MUST 使用新版 `项目立项审批表-模板.xlsx` 生成审批表
- **AND** 生成文件 MUST NOT 写入项目编号
- **AND** 生成文件 MUST 包含新版商务/技术评分项和营销中心、研发中心、总经理意见

#### Scenario: 项目开展模式必填且仅用于 1.2 产出文件
- **WHEN** 实现 `1.2` 新版模板映射
- **THEN** 系统 MUST 将项目开展模式作为商务负责人填写的 `1.2` 必填单选字段
- **AND** 选项 MUST 为自研模式和供应链模式
- **AND** 项目开展模式 MUST 只用于生成新版 `1.2 项目立项审批表`
- **AND** 系统 MUST NOT 将该字段写入 `projects.project_mode`
- **AND** 系统 MUST NOT 用该字段影响项目阶段、项目状态、项目筛选或其他业务逻辑

#### Scenario: 商务负责人未填项目开展模式不得提交
- **WHEN** 商务负责人提交 `1.2` 商务部分
- **AND** 项目开展模式为空
- **THEN** 系统 MUST 拒绝提交商务部分
- **AND** 系统 MUST 返回明确业务错误

### Requirement: 项目编号由 1.3 确定
项目核心能力 MUST 将项目编号正式确定点移动到 `1.3 项目立项通知`；`1.3` 提交时项目编号必填、唯一，并写入项目主数据。

#### Scenario: 1.3 提交前必须填写项目编号
- **WHEN** 营销中心负责人提交 `1.3 项目立项通知`
- **THEN** 系统 MUST 校验项目编号非空
- **AND** 若项目编号为空，系统 MUST 拒绝提交并返回明确业务错误

#### Scenario: 1.3 提交校验项目编号唯一
- **WHEN** `1.3` 提交携带项目编号
- **THEN** 系统 MUST 校验该项目编号在项目主数据中唯一
- **AND** 若与其他项目重复，系统 MUST 拒绝提交并返回明确业务错误
- **AND** 唯一性校验 MUST 具备并发防护，MUST NOT 只依赖普通查询校验

#### Scenario: 并发提交不得产生重复项目编号
- **WHEN** 两个项目并发提交 `1.3`
- **AND** 两个提交请求使用同一个新项目编号
- **THEN** 系统 MUST 只允许一个提交成功
- **AND** 另一个提交 MUST 以明确业务错误失败
- **AND** 数据库最终状态 MUST NOT 出现重复 `projects.project_code`

#### Scenario: 1.3 提交成功写入项目主数据
- **WHEN** `1.3` 提交通过项目编号校验
- **THEN** 系统 MUST 在同一业务事务中写入 `projects.project_code`
- **AND** 后续项目详情、列表、总览和生成文件 MUST 使用该项目编号

#### Scenario: 独立项目编号接口不得绕过 1.3
- **WHEN** 项目存在 `1.3 项目立项通知` 资料项
- **AND** 用户调用独立项目编号更新接口
- **THEN** 系统 MUST 拒绝该更新
- **AND** 系统 MUST 返回项目编号由 `1.3` 表单管理的明确业务错误
- **AND** 系统 MUST NOT 写入 `projects.project_code`

#### Scenario: 遗留写入路径必须共用并发保护
- **WHEN** 系统保留任何非 `1.3` 表单提交的项目编号写入路径
- **THEN** 该路径 MUST 使用与 `1.3` 提交相同或等价的并发保护策略
- **AND** 与 `1.3` 提交或其他项目编号写入路径并发时，数据库最终状态 MUST NOT 出现重复 `projects.project_code`

#### Scenario: 旧项目编号可带出但仍需校验
- **WHEN** 旧项目已经存在 `projects.project_code`
- **AND** 用户打开 `1.3`
- **THEN** 系统 MAY 默认带出该编号
- **AND** 用户按权限提交 `1.3` 时系统仍 MUST 执行唯一性校验

### Requirement: 1.3 项目立项通知累计清单
项目核心能力 MUST 在生成 `1.3 项目立项通知` 时输出已确定编号项目的累计清单，并 MUST 包含当前项目。

#### Scenario: 1.3 通知包含累计项目
- **WHEN** `1.3` 提交成功并触发通知生成
- **THEN** 生成通知 MUST 包含历史已确定编号项目和当前项目
- **AND** 当前项目 MUST 出现在清单中
- **AND** 累计清单 MUST 只包含 `1.3` 提交时间小于或等于当前项目 `1.3` 提交时间的项目

#### Scenario: 重试生成使用原提交时间 cutoff
- **WHEN** 当前项目 `1.3` 已提交但通知生成失败
- **AND** 后续已有更多项目提交 `1.3`
- **AND** 系统重试生成当前项目通知
- **THEN** 重试生成 MUST 使用当前项目原始 `1.3` 提交时间作为累计清单 cutoff
- **AND** 重试生成 MUST NOT 把后续才提交的项目写入当前项目通知

#### Scenario: 累计清单稳定排序
- **WHEN** 系统生成累计项目清单
- **THEN** 系统 MUST 使用稳定排序规则
- **AND** 第一版 SHOULD 按 `1.3` 提交时间升序、项目 id 升序排序

#### Scenario: 通知行字段
- **WHEN** 系统渲染累计清单
- **THEN** 每行 MUST 包含序号、项目编号、项目名称、客户单位、立项日期

#### Scenario: 删除未使用空白行
- **WHEN** 累计项目数量少于模板预置数据行数量
- **THEN** 生成通知 MUST 删除未使用空白行
- **AND** 空白行 MUST NOT 将落款日期挤到第二页

#### Scenario: 超出预置行数追加行
- **WHEN** 累计项目数量超过模板预置数据行数量
- **THEN** 系统 MUST 克隆数据行继续追加
- **AND** 系统 MUST NOT 截断累计项目清单
- **AND** 文档 MAY 因项目数量自然分页

### Requirement: 新版立项编号流程边界
项目核心能力 MUST 保持本修正的边界，不得因模板和编号流程调整引入无关能力。

#### Scenario: 不接文件平台或 PDF
- **WHEN** 实现新版 `1.2` 模板或 `1.3` 累计通知
- **THEN** 系统 MUST NOT 接入文件平台
- **AND** 系统 MUST NOT 生成 PDF

#### Scenario: 不改变资料项数量
- **WHEN** 实现新版 `1.2` 模板或 `1.3` 累计通知
- **THEN** 系统 MUST NOT 新增资料项
- **AND** 系统 MUST NOT 改变 v20260629 / 71 项资料数量

#### Scenario: 不迁移旧项目
- **WHEN** 实现新版 `1.2` 模板或 `1.3` 累计通知
- **THEN** 系统 MUST NOT 迁移或补填旧项目历史数据

### Requirement: 方案设计阶段内部流程状态机
系统 MUST 在既有“方案设计阶段”内提供内部节点状态机，并 MUST 保持 8 大阶段不变。

#### Scenario: 保留既有 8 大阶段
- **WHEN** 系统启用方案设计阶段内部流程
- **THEN** 系统 MUST 继续保留立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 大阶段
- **AND** 系统 MUST NOT 将方案设计准备、项目方案分析、方案设计、内部方案评审、客户方案评审、研发成本估算、制造成本估算、财务成本估算或报价/投标建模为新的大阶段

#### Scenario: 初始化方案设计内部节点顺序
- **WHEN** 项目进入方案设计阶段
- **THEN** 系统 MUST 按方案设计准备、项目方案分析、方案设计、内部方案评审、客户方案评审、研发成本估算、制造成本估算、财务成本估算、报价/投标的顺序建立内部节点
- **AND** 报价/投标通过后才能满足进入合同签订阶段的后端门禁

#### Scenario: 内部节点状态
- **WHEN** 系统返回方案设计阶段内部节点状态
- **THEN** 每个节点 MUST 至少能表达未开始、待提交、待审批、已退回、已通过、已跳过/不适用和已结束中的适用状态
- **AND** 状态 MUST 由后端根据业务数据和权限派生

#### Scenario: 已结束项目阻止后续推进
- **WHEN** 报价未被客户接受且商务负责人线下与总经理讨论后选择项目结束
- **THEN** 系统 MUST 标记项目为 ended 或等价结束状态
- **AND** 系统 MUST 阻止合同签订及后续阶段的所有业务操作
- **AND** 系统 MAY 保留历史记录和业务日志用于审计

### Requirement: 方案设计项目内角色分配
系统 MUST 在“方案设计准备”节点支持研发中心负责人分配方案设计阶段项目内流程角色。

#### Scenario: 研发中心负责人分配项目内角色
- **WHEN** 项目进入方案设计准备节点
- **THEN** 研发中心负责人 MUST 能分配项目经理、技术负责人、商务负责人、采购负责人、财务会计和财务负责人
- **AND** 系统 MUST 记录角色分配人、分配时间和角色变更历史

#### Scenario: 项目经理复用现有项目经理关联
- **WHEN** 研发中心负责人在方案设计准备节点分配或重新指定项目经理
- **THEN** 系统 MUST 复用并更新项目现有项目经理用户关联，例如 `projectManagerUserId` 或等价项目经理字段
- **AND** 系统 MUST 记录项目经理变更历史和业务日志
- **AND** 系统 MUST 同步影响项目经理工作台、项目详情展示、方案设计工作计划待办和后续项目经理相关权限
- **AND** 系统 MUST NOT 长期保存一套与项目现有项目经理字段冲突的方案设计专用项目经理

#### Scenario: 历史项目项目经理默认来源
- **WHEN** 历史项目缺少方案设计准备角色分配记录
- **THEN** 系统 MUST 使用项目现有项目经理关联作为默认项目经理来源
- **AND** 系统 MUST NOT 因缺少方案设计准备分配记录而创建第二套项目经理字段

#### Scenario: 项目内角色不是全局组织角色
- **WHEN** 系统保存方案设计项目内角色
- **THEN** 系统 MUST 将商务负责人、技术负责人、采购负责人、财务会计和财务负责人作为项目内流程角色处理
- **AND** 系统 MUST NOT 要求新增这些角色为全局组织角色

#### Scenario: 不分配主管工程师角色
- **WHEN** 系统展示或处理方案设计准备节点
- **THEN** 系统 MUST NOT 要求单独分配主管机械工程师、主管电气工程师或主管软件工程师
- **AND** 第一版方案设计 8 个产出 MUST 由技术负责人提交

#### Scenario: 方案设计工作计划提交
- **WHEN** 项目经理上传方案设计工作计划并提交成功
- **THEN** 系统 MUST 将方案设计准备节点推进到已通过或等价完成状态
- **AND** 系统 MUST 进入项目方案分析节点
- **AND** 系统 MUST NOT 将方案设计工作计划作为在线表单处理

### Requirement: 项目方案分析节点流程
系统 MUST 在项目方案分析节点管理项目方案分析表和产品功能框图，并由研发中心负责人审批该节点。

#### Scenario: 项目方案分析产出完成后进入审批
- **WHEN** 技术负责人提交项目方案分析表在线表单并上传产品功能框图
- **THEN** 系统 MUST 将项目方案分析节点置为待审批
- **AND** 项目方案分析表 MUST 使用 `项目方案分析表-模板.xlsx` 规划为在线表单并生成对应模板文件
- **AND** 产品功能框图 MUST 作为文件上传产出保留在项目方案分析节点

#### Scenario: 项目方案分析审批通过
- **WHEN** 研发中心负责人审批通过项目方案分析节点
- **THEN** 系统 MUST 将项目方案分析节点置为已通过
- **AND** 系统 MUST 进入方案设计节点

#### Scenario: 项目方案分析审批不通过
- **WHEN** 研发中心负责人审批不通过项目方案分析节点
- **THEN** 系统 MUST 停留或返回项目方案分析节点
- **AND** 项目方案分析表和产品功能框图 MUST 作为整体重新提交
- **AND** 系统 MUST NOT 要求精确打回到单个产出

### Requirement: 方案设计和方案评审节点流程
系统 MUST 在方案设计节点收集 8 个方案设计产出，并在内部方案评审和客户方案评审节点支持多次评审、审批和退回。

#### Scenario: 方案设计 8 个产出提交
- **WHEN** 技术负责人提交方案设计节点产出
- **THEN** 系统 MUST 要求工艺时序图、节拍表、布局图、3D模型、演示动画、电气功能框图、软件功能框图和项目方案PPT均完成
- **AND** 8 个产出全部完成后系统 MUST 进入内部方案评审节点
- **AND** 方案设计节点本身 MUST NOT 要求研发中心负责人审批

#### Scenario: 内部方案评审通过
- **WHEN** 技术负责人提交内部方案评审记录且研发中心负责人审批通过最新一次记录
- **THEN** 系统 MUST 将内部方案评审节点置为已通过
- **AND** 系统 MUST 进入客户方案评审节点
- **AND** C15 方案评审记录表（内部方案评审）MUST 使用 `方案评审记录表-模板.xlsx` 规划为在线表单并生成对应模板文件
- **AND** 系统 MUST NOT 将 C15 与 C16 合并为一个资料项

#### Scenario: 内部方案评审退回
- **WHEN** 研发中心负责人审批不通过内部方案评审记录
- **THEN** 系统 MUST 返回方案设计节点
- **AND** 方案设计 8 个文件 MUST 重新提交
- **AND** 系统 MUST 保留旧版本评审记录和审批历史

#### Scenario: 客户方案评审通过
- **WHEN** 技术负责人提交客户方案评审记录且研发中心负责人审批通过最新一次记录
- **THEN** 系统 MUST 将客户方案评审节点置为已通过
- **AND** 系统 MUST 进入研发成本估算节点
- **AND** 系统 MUST 通过评审类型或节点上下文区分内部方案评审和客户方案评审
- **AND** C16 方案评审记录表（客户方案评审）MUST 作为独立于 C15 的资料项存在并复用 `方案评审记录表-模板.xlsx`

#### Scenario: 客户方案评审退回
- **WHEN** 研发中心负责人审批不通过客户方案评审记录
- **THEN** 系统 MUST 返回方案设计节点
- **AND** 方案设计 8 个文件 MUST 重新提交
- **AND** 系统 MUST NOT 物理删除历史评审记录

### Requirement: 成本估算三段协作流程
系统 MUST 将 C17 成本估算表建模为一个主资料项下的研发、制造、财务/运营三段文件协作和审批流程。

#### Scenario: C17 仍为一个主产出
- **WHEN** 系统处理方案设计阶段成本估算
- **THEN** 系统 MUST 保持 C17 成本估算表为一个主资料项
- **AND** 系统 MUST NOT 新增研发成本估算表、制造成本估算表或财务成本估算表三个资料项

#### Scenario: 研发成本估算审批
- **WHEN** 技术负责人上传研发成本估算文件并提交
- **THEN** 系统 MUST 将研发成本估算节点置为待研发中心负责人审批
- **AND** 研发中心负责人审批通过后系统 MUST 进入制造成本估算节点
- **AND** 审批不通过时系统 MUST 返回研发成本估算节点重新提交

#### Scenario: 制造成本估算审批
- **WHEN** 采购负责人上传制造成本估算文件并提交
- **THEN** 系统 MUST 允许采购负责人下载研发成本估算文件作为制作基础
- **AND** 系统 MUST 将制造成本估算节点置为待制造中心负责人审批
- **AND** 制造中心负责人审批通过后系统 MUST 进入财务成本估算节点
- **AND** 审批不通过时系统 MUST 返回制造成本估算节点重新提交

#### Scenario: 财务成本估算两级审批
- **WHEN** 财务会计上传财务/运营成本估算文件并提交
- **THEN** 系统 MUST 允许财务会计下载研发成本估算文件和制造成本估算文件作为制作基础
- **AND** 系统 MUST 先由财务负责人审批
- **AND** 财务负责人审批通过后系统 MUST 进入总经理审批
- **AND** 财务负责人审批不通过时系统 MUST 返回财务成本估算节点重新提交

#### Scenario: 总经理退回财务成本估算
- **WHEN** 总经理审批不通过财务成本估算
- **THEN** 系统 MUST 返回研发成本估算节点
- **AND** 系统 MUST 要求重新走研发、制造和财务三段成本估算流程

#### Scenario: 总经理通过财务成本估算
- **WHEN** 总经理审批通过财务成本估算
- **THEN** 系统 MUST 进入报价/投标节点
- **AND** 报价/投标节点 MUST 处于未选择分支状态

### Requirement: 财务成本估算文件保密
系统 MUST 对财务/运营成本估算文件执行后端权限控制，不能只依赖前端隐藏。

#### Scenario: 授权人员查看财务文件
- **WHEN** 总经理或运营中心授权处理人请求查看或下载财务/运营成本估算文件
- **THEN** 系统 MUST 按项目权限和节点状态返回允许查看的文件元数据、预览或下载能力
- **AND** 运营中心授权处理人 MUST 至少包括本项目财务会计、财务负责人，以及后续规格明确授权的运营中心人员

#### Scenario: 非授权人员不能看到财务文件细节
- **WHEN** 研发中心负责人、技术负责人、项目经理、商务负责人、采购负责人、制造中心负责人、非授权运营中心人员、总经理助理、系统管理员或其他无关用户查看财务成本估算节点
- **THEN** 系统 MUST 允许其看到节点状态和审批结果
- **AND** 系统 MUST NOT 返回财务/运营成本估算文件名、附件明细、预览地址或下载入口

#### Scenario: 节点详情和资料接口统一保密
- **WHEN** 用户请求方案设计节点详情、阶段资料清单、附件列表、业务日志、预览或下载接口
- **THEN** 系统 MUST 对财务/运营成本估算文件统一执行保密过滤
- **AND** 非授权用户 MUST 只能看到节点状态和审批结果

#### Scenario: 下载接口强制保密
- **WHEN** 非授权人员直接请求财务/运营成本估算文件下载或预览接口
- **THEN** 系统 MUST 拒绝请求
- **AND** 系统 MUST NOT 因前端隐藏入口而放宽后端权限

### Requirement: 方案设计专用节点流程与普通资料审核边界
纳入方案设计内部状态机管理的资料项和上传槽，其完成状态 MUST 由专用节点状态机派生，普通阶段资料审核不得绕过或替代专用节点流程。

#### Scenario: 专用流程资料完成状态由节点派生
- **WHEN** 项目方案分析表、产品功能框图、C15 内部方案评审记录、C16 客户方案评审记录、C17 成本估算三段文件、报价单或投标书上传槽纳入方案设计内部状态机
- **THEN** 这些对象的完成状态 MUST 由专用节点状态机派生
- **AND** 阶段推进门禁 MUST 以方案设计内部节点最终状态和专用完成口径为准

#### Scenario: 普通审核不得绕过专用审批
- **WHEN** 用户尝试通过普通阶段资料提交、确认或退回接口处理专用流程对象
- **THEN** 系统 MUST 拒绝请求或返回必须使用方案设计专用节点流程的业务错误
- **AND** 普通接口 MUST NOT 替代项目方案分析节点审批、内部方案评审审批、客户方案评审审批、研发成本估算审批、制造成本估算审批、财务负责人审批、总经理财务成本估算审批、商务负责人报价结果处理或投标审批

#### Scenario: 不产生双状态冲突
- **WHEN** 系统计算方案设计阶段齐套、阶段推进或节点状态
- **THEN** 系统 MUST 避免出现普通资料确认已通过但节点仍未通过的双重完成口径
- **AND** 系统 MUST 避免出现节点已通过但普通资料未完成导致阶段阻塞的双重完成口径

#### Scenario: 待办不重复生成
- **WHEN** 系统为专用流程对象生成工作台待办
- **THEN** 待办 MUST 来源于方案设计专用节点状态
- **AND** 系统 MUST NOT 同时生成普通资料审核待办和专用节点审批待办

### Requirement: 报价投标分支流程
系统 MUST 将报价/投标建模为方案设计阶段内的一个节点，并支持报价流程、投标流程和项目结束路径。

#### Scenario: 总经理选择报价或投标
- **WHEN** 财务成本估算总经理审批通过后进入报价/投标节点
- **THEN** 总经理 MUST 能选择报价流程或投标流程
- **AND** 系统 MUST 记录分支选择和选择时间
- **AND** 系统 MUST 根据选择生成对应待办

#### Scenario: 报价流程被客户接受
- **WHEN** 商务负责人上传报价单并在系统中确认报价被客户接受
- **THEN** 系统 MUST 将报价/投标节点置为已通过
- **AND** 系统 MUST 返回 `permissions.canAdvanceToContract=true`
- **AND** 系统 MUST 记录 `solution_design.ready_for_contract` 门禁日志
- **AND** 本 change MUST NOT 直接实现合同签订阶段业务或真实阶段推进
- **AND** 报价单第一版 MUST 按文件上传处理

#### Scenario: 报价流程未被客户接受
- **WHEN** 客户不同意报价
- **THEN** 商务负责人 MUST 先线下与总经理讨论
- **AND** 商务负责人 MUST 在系统中选择退回研发成本估算或项目结束
- **AND** 选择退回研发成本估算时系统 MUST 重新走研发、制造、财务成本估算和报价/投标选择
- **AND** 选择项目结束时系统 MUST 标记项目已结束并阻止合同签订及后续阶段操作

#### Scenario: 投标流程审批通过
- **WHEN** 商务负责人上传投标商务标且技术负责人上传投标技术标
- **THEN** 系统 MUST 允许提交投标总经理审批
- **AND** 总经理审批通过后系统 MUST 将报价/投标节点置为已通过
- **AND** 系统 MUST 返回 `permissions.canAdvanceToContract=true`
- **AND** 系统 MUST 记录 `solution_design.ready_for_contract` 门禁日志
- **AND** 本 change MUST NOT 直接实现合同签订阶段业务或真实阶段推进
- **AND** 商务标和技术标 MUST 作为投标书产出下的两个必填上传槽处理

#### Scenario: 投标流程审批不通过
- **WHEN** 总经理审批不通过投标书
- **THEN** 系统 MUST 返回投标节点
- **AND** 商务标和技术标 MUST 重新提交
- **AND** 系统 MUST NOT 默认退回成本估算节点

### Requirement: 方案设计工作台待办派生
系统 MUST 基于后端状态和权限返回方案设计阶段个人工作台待办。

#### Scenario: 研发中心负责人待办
- **WHEN** 研发中心负责人查看个人工作台
- **THEN** 系统 MUST 返回其有权处理的方案设计准备角色分配、项目方案分析审批、内部方案评审审批、客户方案评审审批和研发成本估算审批待办

#### Scenario: 项目内角色待办
- **WHEN** 项目经理、技术负责人、采购负责人、财务会计或商务负责人查看个人工作台
- **THEN** 系统 MUST 按项目内角色返回其有权处理的方案设计工作计划、项目方案分析表、产品功能框图、方案设计 8 个产出、评审记录、研发成本估算、制造成本估算、财务/运营成本估算、报价单上传、报价结果处理、投标商务标或投标技术标待办

#### Scenario: 审批角色待办
- **WHEN** 制造中心负责人、财务负责人或总经理查看个人工作台
- **THEN** 系统 MUST 返回其有权处理的制造成本估算审批、财务/运营成本估算审批、财务成本估算最终审批、报价/投标分支选择或投标审批待办

#### Scenario: 前端不得硬猜待办
- **WHEN** 前端展示方案设计阶段个人待办
- **THEN** 待办 MUST 来自后端返回的权限和状态
- **AND** 前端 MUST NOT 仅凭当前用户部门、姓名或本地规则硬编码可处理入口

