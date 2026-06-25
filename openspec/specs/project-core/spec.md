# project-core Specification

## Purpose
TBD - created by archiving change add-project-core. Update Purpose after archive.
## Requirements
### Requirement: 项目主数据

系统 MUST 以数字化管理平台保存项目主数据。项目主数据至少包括项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划开始时间、计划完成时间、备注和可空 `createdByUserId`。

#### Scenario: 创建项目主数据

- **WHEN** 已登录用户提交项目编号、项目名称、客户和项目经理等创建项目所需基础信息
- **THEN** 系统必须在数字化管理平台创建项目主数据记录，并记录 `createdByUserId`

#### Scenario: 历史项目创建人可为空

- **WHEN** 系统读取本变更之前已创建且没有创建人记录的项目
- **THEN** 系统必须允许 `createdByUserId` 为空，并不得因此阻止项目列表或项目详情读取

#### Scenario: 项目编号唯一

- **WHEN** 用户使用已经存在的项目编号创建项目
- **THEN** 系统必须拒绝创建，并提示项目编号已存在

#### Scenario: 项目初始状态

- **WHEN** 项目创建成功
- **THEN** 系统必须将项目状态初始化为正常，除非创建请求明确提供其他允许的基础状态

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、`v20260624` 64 项项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入。

#### Scenario: 成功创建项目

- **WHEN** 具备创建项目权限的已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化 `v20260624` 64 项项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 未登录不能创建项目

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时提交项目创建请求
- **THEN** 系统必须拒绝创建，并返回需要登录的错误

#### Scenario: 总经理可以创建项目

- **WHEN** 当前登录用户 `organizationRole = general_manager` 且提交有效项目创建信息
- **THEN** 系统必须允许创建项目，并继续执行项目主数据保存、8 阶段初始化、64 项 `v20260624` 资料初始化和 `project.created` 业务日志写入

#### Scenario: 中心负责人可以创建项目

- **WHEN** 当前登录用户 `organizationRole = center_manager` 且提交有效项目创建信息
- **THEN** 系统必须允许创建项目，并继续执行项目主数据保存、8 阶段初始化、64 项 `v20260624` 资料初始化和 `project.created` 业务日志写入

#### Scenario: 普通员工不能创建项目

- **WHEN** 当前登录用户 `organizationRole = employee` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 总经理助理不能创建项目

- **WHEN** 当前登录用户 `organizationRole = general_manager_assistant` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 系统管理员不能创建项目

- **WHEN** 当前登录用户 `organizationRole = system_admin` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 创建失败无副作用

- **WHEN** 项目创建因权限不足、字段校验失败、项目经理校验失败或其他创建前置校验失败
- **THEN** 系统不得插入项目主数据，不得生成项目阶段，不得生成项目级阶段资料，不得写入 `project.created` 或其他成功业务日志

#### Scenario: 创建信息不完整

- **WHEN** 具备创建项目权限的已登录用户缺少项目编号、项目名称、客户或项目经理等必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息

#### Scenario: 创建人来自当前登录态

- **WHEN** 具备创建项目权限的已登录用户创建项目
- **THEN** 系统必须根据当前登录态识别创建人，不得信任前端提交的创建人字段

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

系统 MUST 提供项目列表，用于查看项目基础信息、项目状态、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目列表

- **WHEN** 用户打开项目列表
- **THEN** 系统必须展示项目编号、项目名称、客户、项目经理、项目状态、当前阶段、计划开始时间、计划完成时间和创建人基础信息或创建人字段

#### Scenario: 已完成项目当前阶段为空

- **WHEN** 项目 `status` 为 `completed` 且所有 8 个阶段均已完成
- **THEN** 系统必须允许项目列表中的当前阶段为空或展示为已完成状态，并不得因此阻止列表读取

#### Scenario: 历史项目列表创建人为空

- **WHEN** 项目列表包含 `createdByUserId` 为空的历史项目
- **THEN** 系统必须允许创建人基础信息为空，并继续返回该项目

#### Scenario: 从列表进入项目详情

- **WHEN** 用户在项目列表中选择某个项目
- **THEN** 系统必须打开该项目的项目详情基础状态页

#### Scenario: 列表不展示看板指标

- **WHEN** 用户打开项目列表
- **THEN** 系统不能在本能力中展示管理层看板指标、资料齐套率、资料缺失统计或文件归档状态

### Requirement: 项目详情基础状态

系统 MUST 提供项目详情基础状态，用于查看项目主数据、标准 8 阶段、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目基础信息

- **WHEN** 用户打开项目详情
- **THEN** 系统必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段

#### Scenario: 查看历史项目详情

- **WHEN** 用户打开 `createdByUserId` 为空的历史项目详情
- **THEN** 系统必须允许创建人基础信息为空，并继续展示项目基础状态

#### Scenario: 查看 8 阶段基础进度

- **WHEN** 用户打开项目详情
- **THEN** 系统必须展示该项目的全部 8 个阶段、阶段顺序、阶段名称、阶段状态和当前阶段标记

#### Scenario: 已完成项目没有当前阶段

- **WHEN** 用户打开 `status` 为 `completed` 且所有 8 个阶段均已完成的项目详情
- **THEN** 系统必须允许当前阶段为空，并继续展示项目基础状态和 8 阶段完成状态

#### Scenario: 详情页不展示资料和文件能力

- **WHEN** 用户打开项目详情基础状态页
- **THEN** 系统不能在本能力中展示在线表单、文件上传、文件下载、文件平台同步状态、业务日志、资料齐套率或阶段资料清单

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

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化和适用必填资料齐套情况，只有当前阶段资料项记录存在且没有缺失适用必填资料时才允许推进。

#### Scenario: 只检查当前阶段

- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只检查项目当前阶段的适用必填资料齐套情况，不得因其他阶段资料缺失而拒绝当前阶段推进

#### Scenario: 当前阶段齐套允许推进

- **WHEN** 当前阶段的 `incompleteRequiredCount = 0`
- **THEN** 系统必须视为当前阶段适用必填资料齐套，并允许进入阶段推进状态更新

#### Scenario: 当前阶段资料清单必须已初始化

- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 没有适用必填资料允许推进

- **WHEN** 当前阶段已经存在项目级阶段资料项记录，且当前阶段的 `requiredTotal = 0`
- **THEN** 系统必须视为当前阶段适用必填资料齐套，并允许进入阶段推进状态更新

#### Scenario: 缺失适用必填资料拒绝推进

- **WHEN** 当前阶段的 `incompleteRequiredCount > 0`
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 返回缺失资料列表

- **WHEN** 系统因缺失适用必填资料拒绝阶段推进
- **THEN** 响应必须包含可读错误和缺失适用必填资料列表，列表中每项至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 齐套门禁基于手工状态和适用性

- **WHEN** 系统检查阶段推进齐套门禁
- **THEN** 系统必须按当前资料项手工状态和人工适用性判断计算，且不得把门禁结果表示为文件已上传、文件已归档或在线表单已提交

### Requirement: 项目总览看板查询接口

系统 MUST 提供 `GET /api/projects/overview-dashboard`，用于已登录用户查询跨项目总览数据和汇总指标。

#### Scenario: 项目总览要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/projects/overview-dashboard`
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 项目总览静态路由优先匹配

- **WHEN** 已登录用户请求 `GET /api/projects/overview-dashboard`
- **THEN** 系统必须命中项目总览看板接口，不得被 `/:projectId` 动态项目详情路由当作项目 ID 处理，也不得返回项目 ID 校验错误

#### Scenario: 项目总览不要求平台管理员

- **WHEN** 已登录用户请求项目总览看板接口
- **THEN** 系统必须只做 `requireAuth`，不得要求 `isPlatformAdmin`，不得实现项目成员权限、项目经理权限、复杂权限、角色权限或轻角色校验

#### Scenario: 第一版返回所有项目总览

- **WHEN** 已登录用户请求项目总览看板接口
- **THEN** 系统必须按筛选条件返回所有匹配项目的总览数据，不得按当前用户、平台管理员标识、项目经理或项目成员关系限制项目范围

#### Scenario: 返回项目总览汇总指标

- **WHEN** 系统返回项目总览看板数据
- **THEN** 响应必须包含 `summary`，且至少包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`

#### Scenario: 汇总项目数量

- **WHEN** 系统计算项目总览汇总指标
- **THEN** `totalProjects` 必须统计筛选后项目总数，`activeProjects` 必须统计筛选后 `status != completed` 的项目数量，`completedProjects` 必须统计筛选后 `status = completed` 的项目数量

#### Scenario: 汇总风险延期项目

- **WHEN** 系统计算 `riskProjects`
- **THEN** 系统必须统计筛选后 `status = risk` 或 `status = delayed` 的项目数量，并且不得把其他状态计入该指标

#### Scenario: 汇总我的待办资料任务

- **WHEN** 系统计算 `myPendingStageDocumentTasks`
- **THEN** 系统必须使用当前登录用户 ID，按 `responsible_user_id = 当前登录用户 id`、`is_applicable = 1`、`status in not_submitted, submitted, returned` 的口径统计待办资料任务数量

#### Scenario: 我的待办资料指标不受项目筛选影响

- **WHEN** 用户使用 `status`、`currentStageOrder` 或 `keyword` 筛选项目总览
- **THEN** `myPendingStageDocumentTasks` 必须仍表示当前登录用户全局 pending 资料任务数量，不得因项目总览筛选而改变口径

#### Scenario: 返回项目总览卡片字段

- **WHEN** 系统返回项目总览项目列表
- **THEN** 每个项目必须至少包含 `projectId`、`projectCode`、`projectName`、`customerName`、`projectManager`、`status`、`currentStageId`、`currentStageName`、`currentStageOrder`、`currentStageStatus`、`currentStageCompletenessSummary`、`currentStageIncompleteRequiredDocuments`、`currentStageIssue`、`createdBy`、`plannedStartDate` 和 `plannedEndDate`

#### Scenario: 已完成项目当前阶段为空

- **WHEN** 项目 `status = completed`
- **THEN** 系统必须允许该项目的 `currentStageId`、`currentStageName`、`currentStageOrder`、`currentStageStatus` 和 `currentStageCompletenessSummary` 为空，并不得因此阻止看板返回

#### Scenario: 未完成项目缺失当前阶段

- **WHEN** 项目 `status != completed` 且没有当前阶段
- **THEN** 系统必须返回该项目总览卡片，当前阶段字段为空，并设置 `currentStageIssue = missing_current_stage`，不得让接口崩溃

#### Scenario: 未完成项目存在多个当前阶段

- **WHEN** 项目 `status != completed` 且存在多个当前阶段
- **THEN** 系统必须返回该项目总览卡片，当前阶段字段为空或使用稳定方式置空，并设置 `currentStageIssue = multiple_current_stages`，不得在本接口中修复异常数据

#### Scenario: 当前阶段资料清单未初始化

- **WHEN** 项目存在唯一当前阶段，但当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 系统必须返回 `currentStageCompletenessSummary = null`、`currentStageIncompleteRequiredDocuments = []` 和 `currentStageIssue = checklist_not_initialized`，不得自动初始化资料清单

#### Scenario: 当前阶段正常返回齐套摘要

- **WHEN** 项目存在唯一当前阶段且当前阶段存在资料项记录
- **THEN** 系统必须返回该当前阶段的 `currentStageCompletenessSummary`，且至少包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 和 `completionPercent`

#### Scenario: 当前阶段缺失资料列表字段

- **WHEN** 当前阶段存在未完成适用必填资料
- **THEN** `currentStageIncompleteRequiredDocuments` 中每个资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

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
系统 MUST 对项目列表、项目详情和项目总览看板按当前用户过滤可见项目，并 MUST 使用后端校验作为安全边界。

#### Scenario: 项目列表必须登录
- **WHEN** 未登录用户请求 `GET /api/projects`
- **THEN** 系统必须返回未登录错误，不得返回项目列表

#### Scenario: 项目详情必须登录
- **WHEN** 未登录用户请求 `GET /api/projects/:projectId`
- **THEN** 系统必须返回未登录错误，不得返回项目详情

#### Scenario: 管理层全局查看
- **WHEN** 当前用户 `organizationRole` 为 `general_manager` 或 `general_manager_assistant`
- **THEN** 项目列表、项目详情和项目总览看板可返回全部项目

#### Scenario: 系统管理员无默认业务项目权限
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理身份返回全部业务项目或授予项目详情查看权限

#### Scenario: 项目经理和资料责任人可见
- **WHEN** 当前用户是某项目 `projectManagerUserId` 或在该项目中至少负责一项资料
- **THEN** 系统必须允许该用户查看该项目列表项、详情和总览卡片

#### Scenario: 中心负责人只能查看本中心相关项目
- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 系统只能返回本中心相关项目；本中心相关按 `participating_departments` 包含其部门，或项目中存在本中心责任人资料判断

#### Scenario: 普通员工只能查看自己相关项目
- **WHEN** 当前用户 `organizationRole = employee`
- **THEN** 系统只能返回该用户负责资料或作为项目经理的项目

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

#### Scenario: 参与部门用于中心负责人可见范围
- **WHEN** 系统判断中心负责人是否可见某项目
- **THEN** 系统只能基于合法 `participatingDepartments` 枚举数组或项目中本中心责任人资料判断本中心相关项目

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
系统 MUST 明确项目经理在项目内负责推进、任务分配、催办和全量进度查看，但不得因此改变资料审批身份。

#### Scenario: 项目经理查看项目全量进度
- **WHEN** 项目经理查看其负责项目
- **THEN** 系统必须允许其查看该项目阶段、资料、齐套摘要、责任人和附件等全量进度信息

#### Scenario: 项目经理分配或调整资料责任人
- **WHEN** 项目经理在其负责项目中分配或调整资料责任人
- **THEN** 第一版可将可选范围限制在项目参与部门内或符合资料责任人候选规则的部门用户

#### Scenario: 非项目经理不得仅凭员工身份分配资料责任人
- **WHEN** 用户不是该项目项目经理、不是中心负责人、也不是系统允许的其他角色，却直接调用该项目资料责任人分配或清空接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理催办资料
- **WHEN** 后续实现催办能力
- **THEN** 项目经理可对其负责项目的资料责任人发起催办，但本 change 不实现自动通知

#### Scenario: 项目经理齐套后推进阶段
- **WHEN** 当前阶段适用必填资料全部 `confirmed`
- **THEN** 项目经理可推进其负责项目当前阶段，且阶段推进仍必须基于齐套门禁

#### Scenario: 非项目经理不得推进不属于自己的项目
- **WHEN** 普通员工不是该项目项目经理却直接调用该项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 总经理助理不得推进任何项目
- **WHEN** 总经理助理直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 系统管理员不得推进业务项目
- **WHEN** 系统管理员直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 中心负责人不得跨中心推进
- **WHEN** 中心负责人直接调用非本中心相关项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理不因项目身份获得资料审批权
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认或退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备中心负责人、总经理或后续审批规则允许的审批身份

### Requirement: 项目参与人派生
系统 MUST 从项目资料责任人派生项目参与人，不得在第一版新增项目成员表或项目参与人表。

#### Scenario: 项目参与人由资料责任人派生
- **WHEN** 用户在某项目中至少负责一项资料
- **THEN** 系统必须将该用户视为该项目参与人

#### Scenario: 不新增项目参与人表
- **WHEN** 系统表达项目参与人
- **THEN** 系统不得在本 change 中新增项目参与人表或手工维护项目参与人清单

#### Scenario: 不新增项目成员表
- **WHEN** 系统表达项目内协作关系
- **THEN** 系统不得在本 change 中新增项目成员表

#### Scenario: 项目参与人不改变阶段推进门禁
- **WHEN** 系统判断阶段是否可推进
- **THEN** 项目参与人派生规则不得改变当前阶段适用必填资料全部 `confirmed` 的门禁口径

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

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核、阶段关口审批和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份。

#### Scenario: 查询我的工作台

- **WHEN** 已登录用户请求 `GET /api/me/workbench`
- **THEN** 系统必须返回当前用户的工作台摘要和待办列表

#### Scenario: 工作台要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/me/workbench`
- **THEN** 系统必须拒绝请求，并返回需要登录的错误

#### Scenario: 工作台不信任前端用户参数

- **WHEN** 前端在查询工作台时尝试传入用户 ID、责任人 ID、审核人 ID 或审批人 ID
- **THEN** 系统必须忽略或拒绝该参数，并只使用当前登录态中的用户 ID 和组织角色

#### Scenario: 返回工作台待办类型

- **WHEN** 系统返回工作台待办
- **THEN** 每条待办的 `type` 必须是 `document_responsibility`、`document_review`、`stage_gate_approval` 或 `stage_advance` 之一

#### Scenario: 返回工作台待办字段

- **WHEN** 系统返回工作台待办列表
- **THEN** 每条待办至少必须包含 `type`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageOrder`、`stageName`、可空 `documentId`、可空 `documentCode`、可空 `documentName`、`status`、`actionText`、`createdAt` 或 `updatedAt`、以及 `targetRoute`

#### Scenario: 普通员工资料待办进入受限路由

- **WHEN** 系统为普通员工返回 `document_responsibility` 待办
- **THEN** `targetRoute` 必须指向受限任务视图或携带 `documentId` / `taskMode` 的受限详情，不得直接指向完整项目详情

#### Scenario: 返回工作台汇总计数

- **WHEN** 系统返回工作台数据
- **THEN** 响应必须包含按待办类型分组的数量和总待办数量

#### Scenario: 资料责任待办只包含需处理状态

- **WHEN** 系统生成 `document_responsibility` 待办
- **THEN** 只允许包含当前用户负责且状态为 `not_submitted` 或 `returned` 的适用资料项

#### Scenario: 已提交资料不计入责任待办处理数

- **WHEN** 当前用户负责的资料项状态为 `submitted`
- **THEN** 系统不得将其计入 `document_responsibility` 可处理待办数量；如需展示，只能作为“已提交待审核”的状态信息

#### Scenario: 资料审核待办只包含 submitted

- **WHEN** 系统生成 `document_review` 待办
- **THEN** 只允许包含 `status = submitted` 且当前用户具备资料审核权限的资料项

#### Scenario: 工作台查询只读

- **WHEN** 用户查询我的工作台
- **THEN** 系统不得改变项目状态、阶段状态、阶段审批状态、资料状态、资料适用性、责任人、附件或业务日志

### Requirement: 项目基础可见与资料访问分离

系统 MUST 区分项目基础信息可见性和项目资料/附件访问权限，不得因用户可见某项目基础信息就自动授予完整资料清单或附件访问权。

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
- **THEN** 系统必须允许其查看该项目完整资料清单和附件信息，用于统筹项目

#### Scenario: 总经理查看完整项目资料

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统必须允许其查看全部项目和完整项目资料

#### Scenario: 系统管理员无默认业务资料访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份授予业务项目资料或附件访问权限

#### Scenario: 总经理助理无默认附件下载权限

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得仅因总经理助理身份授予业务资料附件下载、上传或删除权限

#### Scenario: 项目列表仍展示有权基础项目

- **WHEN** 用户查询项目列表或项目总览
- **THEN** 系统可以继续返回该用户有权看到的项目基础信息，但不得通过列表或总览泄露无权资料附件内容

#### Scenario: 员工直接打开项目详情仍受资料过滤

- **WHEN** 普通员工直接打开项目详情地址或直接调用资料清单 API
- **THEN** 后端仍必须只返回该员工有权访问的资料项，不得因绕过工作台入口返回完整资料清单

### Requirement: 工作台阶段关口审批和阶段推进待办

系统 MUST 将待当前用户处理的阶段关口审批和可推进阶段纳入我的工作台。

#### Scenario: 中心负责人阶段关口审批待办

- **WHEN** 当前阶段审批状态为 `pending_center_manager` 且当前用户是匹配审批中心的中心负责人
- **THEN** 工作台必须返回 `stage_gate_approval` 待办

#### Scenario: 总经理阶段关口审批待办

- **WHEN** 当前阶段审批状态为 `pending_general_manager` 且当前用户 `organizationRole = general_manager`
- **THEN** 工作台必须返回 `stage_gate_approval` 待办

#### Scenario: 项目经理阶段推进待办

- **WHEN** 当前用户是项目经理、当前阶段关口审批状态为 `approved`、且当前阶段适用必填资料齐套
- **THEN** 工作台必须返回 `stage_advance` 待办

#### Scenario: 阶段推进待办要求仍然齐套

- **WHEN** 当前阶段关口审批状态为 `approved` 但当前阶段适用必填资料不再齐套
- **THEN** 工作台不得返回该阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段不生成普通推进待办

- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台不得错误生成普通 `stage_advance` 待办；如后续需要“项目结题完成”动作，必须另起 change 定义

#### Scenario: 无权用户无阶段审批待办

- **WHEN** 用户不是当前阶段关口审批节点的处理人
- **THEN** 工作台不得返回该阶段的 `stage_gate_approval` 待办

#### Scenario: 总经理助理无业务处理待办

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 工作台不得返回需要其提交、审核、审批或推进的业务处理待办

#### Scenario: 系统管理员无业务处理待办

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 工作台不得返回需要其提交、审核、审批或推进的业务处理待办

### Requirement: 整项目审计信息访问控制

系统 MUST 将项目基础可见性与整项目业务日志、阶段关口审批历史访问权限分开，不能只因为用户可见项目基础信息就返回整项目审计信息。

#### Scenario: 项目经理查看自己项目审计信息

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统可以允许其查看该项目完整业务日志和阶段关口审批历史

#### Scenario: 总经理查看完整审计信息

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统可以允许其查看全部项目的完整业务日志和阶段关口审批历史

#### Scenario: 普通员工不得查看整项目业务日志

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整业务日志，并返回无权错误

#### Scenario: 普通员工不得查看整项目审批历史

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整阶段关口审批历史，并返回无权错误

#### Scenario: 项目可见性不等于审计可见性

- **WHEN** 用户只有项目基础可见权限但没有完整项目资料或审计权限
- **THEN** 系统不得通过业务日志或阶段关口审批历史接口泄露其他资料项、附件、审批意见或项目级操作上下文

### Requirement: 项目可见性按结构化归属中心识别

系统 MUST 在中心负责人项目可见性判断中使用结构化阶段资料归属中心，并 MUST 保持普通员工、系统管理员和总经理助理既有项目可见边界。

#### Scenario: 中心负责人本中心相关项目

- **WHEN** 当前用户是中心负责人且系统判断其是否可见某项目
- **THEN** 系统 MUST 在 `participatingDepartments` 包含本人部门、项目中存在 `ownerDepartment = 本人部门` 的阶段资料、或项目中存在 `reviewDepartment = 本人部门` 的阶段资料时，将该项目视为本中心相关项目

#### Scenario: 责任人部门仅作为旧数据 fallback

- **WHEN** 项目阶段资料已保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 系统 MUST 优先使用 `ownerDepartment` 和 `reviewDepartment` 判断中心负责人项目可见范围，不得再无条件使用 `responsibleUser.department`

#### Scenario: 旧资料缺少归属中心时兼容责任人部门

- **WHEN** 某项目阶段资料的 `ownerDepartment` 和 `reviewDepartment` 都为空
- **THEN** 系统 MAY 继续使用该资料责任人的部门作为旧数据兼容判断

### Requirement: 阶段推进按结构化归属中心识别本中心项目

系统 MUST 使用结构化归属中心判断中心负责人是否可推进本中心相关项目阶段，并 MUST 保持阶段审批状态和齐套门禁不变。

#### Scenario: 中心负责人推进本中心相关项目

- **WHEN** 当前用户是中心负责人且项目属于其本中心相关项目
- **AND** 当前阶段关口审批状态为 `approved`
- **AND** 当前阶段适用必填资料齐套
- **THEN** 系统 MAY 允许其推进当前阶段

#### Scenario: 中心负责人不得跨中心推进

- **WHEN** 当前用户是中心负责人但项目不属于其本中心相关项目
- **THEN** 系统 MUST 拒绝其推进阶段，除非该用户同时具备项目经理或总经理等其他允许身份

#### Scenario: 阶段推进归属判断优先级

- **WHEN** 系统判断中心负责人是否可推进某项目阶段
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门

### Requirement: 工作台阶段推进待办按结构化归属中心识别

系统 MUST 使用结构化归属中心生成中心负责人 `stage_advance` 工作台待办，并 MUST 保持既有阶段推进前置条件。

#### Scenario: 中心负责人因归属中心获得阶段推进待办

- **WHEN** 当前用户是中心负责人且项目中存在 `ownerDepartment = 本人部门` 或 `reviewDepartment = 本人部门` 的阶段资料
- **AND** 当前阶段关口审批状态为 `approved`
- **AND** 当前阶段适用必填资料齐套
- **AND** 当前阶段不是第 8 阶段
- **THEN** 工作台 MAY 返回该项目当前阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段仍不生成普通推进待办

- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台 MUST NOT 生成普通 `stage_advance` 待办

#### Scenario: 阶段推进待办限制不变

- **WHEN** 当前阶段关口审批状态不是 `approved`，或当前阶段适用必填资料未齐套，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

#### Scenario: 阶段推进待办归属判断优先级

- **WHEN** 系统判断中心负责人是否应获得 `stage_advance` 待办
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门

### Requirement: 20260624 项目流程依据

系统 MUST 以 `智能制造项目管理流程图20260624.pdf`、20260624 版项目管理流程和 `docs/9.10_v20260624阶段资料模板规划_20260624.md` 作为当前阶段资料和项目推进规划依据。

#### Scenario: 使用 20260624 流程作为主流程依据
- **WHEN** 系统说明或实现项目主流程、阶段推进和阶段资料归属口径
- **THEN** 系统必须以 `智能制造项目管理流程图20260624.pdf`、20260624 流程和 `v20260624` 64 项普通阶段资料模板为依据

#### Scenario: 保持 8 阶段主干不变
- **WHEN** 系统初始化或展示项目阶段
- **THEN** 系统必须继续按顺序使用立项阶段、方案设计阶段、合同签订阶段、详细设计阶段、生产制作阶段、预验收阶段、终验收阶段和结题阶段

#### Scenario: 阶段标识保持不变
- **WHEN** 系统保存标准 8 阶段
- **THEN** 系统必须继续使用 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 作为稳定阶段标识

### Requirement: 简单阶段推进边界

系统 MUST 继续使用当前阶段资料齐套门禁和阶段关口审批推进项目阶段，并 MUST 不因 20260624 资料模板引入跳阶段、回退、自动阶段流转或复杂工作流引擎。

#### Scenario: 阶段推进继续基于当前阶段齐套门禁
- **WHEN** 已登录且有推进权限的用户请求推进项目当前阶段
- **THEN** 系统必须继续只检查当前阶段适用必填资料齐套情况，并在满足门禁和审批状态后按 8 阶段顺序推进

#### Scenario: 阶段推进要求当前阶段审批通过
- **WHEN** 用户请求推进项目当前阶段且当前阶段审批状态不是 `approved`
- **THEN** 系统必须返回 `PROJECT_APPROVAL_NOT_APPROVED`，并不得修改项目或阶段状态

#### Scenario: 不新增跳阶段或回退
- **WHEN** 系统按 20260624 流程和阶段审批状态推进项目阶段
- **THEN** 系统不得新增跳阶段、阶段回退、任意选择目标阶段或自由调整阶段顺序能力

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统实现阶段资料收集、资料审核或阶段审批
- **THEN** 系统不得新增可视化流程编排、任意节点配置器、合同审批流、采购审批流、付款流、设计变更流程引擎、自动通知、日报周报或资料服务器核查流程

### Requirement: 第一版简单资料闭环

系统 MUST 将第一版业务闭环限定为阶段资料收集、资料审核、归档到文件管理平台和阶段推进。

#### Scenario: 项目创建初始化闭环对象
- **WHEN** 项目创建成功
- **THEN** 系统必须初始化标准 8 阶段和 `v20260624` 64 项阶段资料，作为资料收集和阶段推进依据

#### Scenario: 资料审核通过后计入齐套
- **WHEN** 当前阶段资料项适用、必填且状态为 `confirmed`
- **THEN** 系统必须将该资料项计入当前阶段齐套

#### Scenario: 未审核通过不计入齐套
- **WHEN** 当前阶段资料项未提交、待审核或被退回
- **THEN** 系统不得将该资料项计入已完成适用必填资料

#### Scenario: 文件平台只负责文件职责
- **WHEN** 后续文件管理平台联动归档资料附件
- **THEN** 文件管理平台职责必须限定为文件夹、归档存储、文件列表、下载权限和文件日志，不得承担项目阶段状态机或资料审核状态机

### Requirement: 20260625 项目流程依据

系统 MUST 在后续规划中将 `智能制造项目管理流程图20260625.pdf` 作为项目流程、项目编号和阶段资料完成规则的规划依据，并 SHOULD 继续以 `docs/9.10_v20260624阶段资料模板规划_20260624.md` 的 64 项普通产出文件作为资料清单基线。

#### Scenario: 使用 20260625 流程作为后续规划依据
- **WHEN** 系统后续说明或实现项目主流程、项目编号生成、阶段资料完成规则和阶段推进门禁
- **THEN** 系统 SHOULD 以 `智能制造项目管理流程图20260625.pdf` 作为规划依据
- **AND** 普通阶段资料项数量 MUST 继续按 64 项核对

#### Scenario: 排除非普通资料过程节点
- **WHEN** 系统后续维护普通阶段资料模板
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 计入普通 64 项资料模板，除非后续正式确认它们形成独立文件

#### Scenario: 保持 8 阶段主干
- **WHEN** 系统后续初始化或展示项目阶段
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

