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

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、当前 20260625 64 项项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入，并 MUST NOT 因 `projectCode` 为空拒绝创建。

#### Scenario: 成功创建项目
- **WHEN** 具备创建项目权限的已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化当前 20260625 64 项项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 创建项目允许项目编号为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空

#### Scenario: 创建信息不完整
- **WHEN** 具备创建项目权限的已登录用户缺少项目名称、客户、项目经理或其他必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息
- **AND** 系统 MUST NOT 因 `projectCode` 为空而拒绝创建

#### Scenario: 创建失败无副作用
- **WHEN** 项目创建因权限不足、字段校验失败、项目经理校验失败或其他创建前置校验失败
- **THEN** 系统不得插入项目主数据，不得生成项目阶段，不得生成项目级阶段资料，不得写入 `project.created` 或其他成功业务日志

#### Scenario: 后置项目编号触发点
- **WHEN** `1.2 项目立项审批表` 已按 `approval_required` 审核通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **THEN** 系统 MUST 允许具备项目维护权限、项目经理权限、管理员权限或等价既有权限边界的用户填写或生成 `projectCode`

#### Scenario: 后置项目编号不重建对象
- **WHEN** 项目创建后填写、生成或更新 `projectCode`
- **THEN** 系统 MUST 只更新项目编号及必要追溯字段
- **AND** 系统 MUST NOT 重新初始化项目阶段、阶段资料或附件

#### Scenario: 创建项目不触发文件平台联动
- **WHEN** 项目创建成功
- **THEN** 系统不能在本能力中调用文件管理平台创建目录、上传文件、下载文件、生成文件映射、同步文件平台用户、同步权限或判断下载权限

#### Scenario: 创建日志失败回滚项目创建
- **WHEN** 项目主数据、8 阶段初始化或项目级阶段资料清单初始化已经准备提交，但 `project.created` 业务操作日志写入失败
- **THEN** 系统必须回滚项目创建事务，不得留下没有对应创建日志的新项目

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

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化，并 MUST 只按当前阶段适用资料的 `completionMode`、基础状态、适用性和 `revision_required` 派生完成状态判断阶段推进门禁，不得统一要求所有适用资料均为 `confirmed`，也不得忽略精准返工标记。

#### Scenario: 只检查当前阶段
- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只检查项目当前阶段的适用资料完成情况，不得因其他阶段资料缺失而拒绝当前阶段推进

#### Scenario: 当前阶段资料清单必须已初始化
- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: revision_required 阻塞推进
- **WHEN** 当前阶段存在适用资料 `revision_required = true`
- **THEN** 系统 MUST 将该资料视为未完成或需返工
- **AND** 系统 MUST 拒绝阶段推进，即使该资料基础状态为 `submitted` 或 `confirmed`

#### Scenario: approval_required 重提后仍阻塞直到确认
- **WHEN** 当前阶段存在 `completionMode = approval_required` 且 `revision_required = true` 的适用资料
- **AND** 该资料已经返工重提并进入 `submitted`
- **THEN** 系统 MUST 仍拒绝阶段推进
- **AND** 直到该资料审核确认并清除 `revision_required` 后才可恢复推进判断

#### Scenario: submit_only submitted 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = submit_only`
- **AND** 该资料基础状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: approval_required submitted 不计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `submitted`
- **THEN** 系统 MUST 将该资料派生为待审核且未完成

#### Scenario: approval_required confirmed 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `confirmed`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: conditional_submit 复用适用性
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST 将该资料视为未触发或不适用
- **AND** 系统 MUST NOT 将该资料计入缺失资料或阶段推进阻塞项

#### Scenario: conditional_submit 触发后提交完成
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** `isApplicable = true`
- **AND** 该资料基础状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: 当前阶段完成允许推进
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为已完成且均无 `revision_required`
- **THEN** 系统必须视为当前阶段资料完成，并允许进入阶段推进状态更新

#### Scenario: 返回缺失资料列表
- **WHEN** 系统因缺失适用资料或需返工资料拒绝阶段推进
- **THEN** 响应必须包含可读错误和缺失适用资料列表
- **AND** 列表中每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode`、派生完成状态和返工标记

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

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份；当前内部资料闭环 MUST NOT 返回泛化阶段关口审批待办，且 MUST 将有责任人的精准返工资料纳入资料责任待办。

#### Scenario: 返回工作台待办类型
- **WHEN** 系统返回工作台待办
- **THEN** 每条待办的 `type` MUST 是 `document_responsibility`、`document_review` 或 `stage_advance` 之一
- **AND** 系统 MUST NOT 返回 `stage_gate_approval`

#### Scenario: 资料责任待办包含需返工资料
- **WHEN** 系统生成 `document_responsibility` 待办
- **THEN** 只允许包含当前用户负责、适用且未按 `completionMode` 与 `revision_required` 派生完成的资料项
- **AND** 系统 MUST 包含当前用户负责且 `revision_required = true` 的资料项
- **AND** 系统 MUST NOT 包含 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的资料项

#### Scenario: approval_required 返工重提前只进责任待办
- **WHEN** 系统生成待办
- **AND** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** 系统不能通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 将该资料作为责任人待办返回给责任人
- **AND** 系统 MUST NOT 将该资料作为 `document_review` 返回给审核人

#### Scenario: 资料审核待办只包含 approval_required submitted
- **WHEN** 系统生成 `document_review` 待办
- **THEN** 普通资料只允许包含 `completionMode = approval_required`、`status = submitted`、`revision_required` 不是 true 且当前用户具备资料审核权限的资料项
- **AND** `revision_required = true` 的资料只有在系统可通过 `revision_resubmitted_at` 或等价显式字段判断已返工重提后，才可纳入审核待办
- **AND** 系统 MUST NOT 用 `submittedAt` 与 `revision_requested_at` 的时间比较替代显式重提标记
- **AND** 系统 MUST NOT 仅因 `revision_required = true` 或仅因旧 `status = submitted` 将资料纳入审核待办
- **AND** 系统 MUST NOT 将 `submit_only` 或未触发的 `conditional_submit` 资料纳入审核待办

#### Scenario: approval_required 返工重提后进入审核待办
- **WHEN** 系统生成 `document_review` 待办
- **AND** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** `status = submitted`
- **AND** 系统可通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 将该资料返回给符合审核权限的审核人
- **AND** 系统 MUST 保持该资料未完成，直到审核确认清除 `revision_required`

#### Scenario: 阶段推进待办按 completionMode 返工门禁和权限
- **WHEN** 系统生成 `stage_advance` 待办
- **THEN** 只允许在当前阶段适用资料均按 `completionMode` 完成、没有 `revision_required` 且当前用户具备推进权限时返回
- **AND** 系统 MUST NOT 因 `approval_status` 生成或隐藏阶段推进待办

#### Scenario: targetRoute 不进入阶段关口审批页
- **WHEN** 系统返回工作台待办列表
- **THEN** 每条待办的 `targetRoute` MUST 指向资料项处理位置、受限任务视图或阶段推进位置
- **AND** `targetRoute` MUST NOT 指向阶段关口审批处理页、阶段审批通过页或阶段审批退回页

#### Scenario: 无责任人返工不进入个人工作台
- **WHEN** 资料项 `revision_required = true` 且没有责任人
- **THEN** 系统 MUST NOT 将其放入任意用户个人工作台
- **AND** 系统 MUST 继续通过项目详情资料清单返回该资料，供项目经理或有权限负责人先分配责任人

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

系统 MUST 支持项目创建初期没有正式项目编号，并 MUST 在 `1.2 项目立项审批表` 审核通过且 `1.3 项目立项通知` 提交或上传完成后填写或生成正式 `projectCode`。

#### Scenario: 创建项目允许 projectCode 为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST NOT 因 `projectCode` 为空拒绝创建

#### Scenario: 空项目编号仍初始化项目闭环对象
- **WHEN** 系统创建 `projectCode` 为空的项目
- **THEN** 系统 MUST 保存项目主数据
- **AND** 系统 MUST 初始化标准 8 阶段
- **AND** 系统 MUST 初始化当前 20260625 64 项项目级阶段资料清单
- **AND** 系统 MUST 记录 `project.created` 业务操作日志

#### Scenario: 非空 projectCode 唯一
- **WHEN** 系统填写、生成或更新非空 `projectCode`
- **THEN** 系统 MUST 校验该编号在项目主数据中唯一
- **AND** 系统 MUST 拒绝与已有非空项目编号重复的保存请求

#### Scenario: 空 projectCode 不参与唯一冲突
- **WHEN** 多个尚未立项的项目暂未生成 `projectCode`
- **THEN** 系统 MUST 允许这些项目同时保持空 `projectCode`

#### Scenario: 后置项目编号节点
- **WHEN** `1.2 项目立项审批表` 已按 `approval_required` 审核通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **THEN** 系统 MUST 允许填写或生成 `projectCode`
- **AND** 系统 MUST 沿用项目维护权限、项目经理、管理员或等价现有权限边界，不新增复杂权限模型

#### Scenario: 后置项目编号不重建项目对象
- **WHEN** 项目立项审批通过且项目立项通知提交后填写或生成 `projectCode`
- **THEN** 系统 MUST 只更新项目编号及必要追溯字段
- **AND** 系统 MUST NOT 重新初始化项目阶段、阶段资料或附件

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
