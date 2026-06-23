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

系统 MUST 提供项目创建能力。项目创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入。

#### Scenario: 成功创建项目

- **WHEN** 已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 未登录不能创建项目

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时提交项目创建请求
- **THEN** 系统必须拒绝创建，并返回需要登录的错误

#### Scenario: 创建信息不完整

- **WHEN** 已登录用户缺少项目编号、项目名称、客户或项目经理等必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息

#### Scenario: 创建人来自当前登录态

- **WHEN** 已登录用户创建项目
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

