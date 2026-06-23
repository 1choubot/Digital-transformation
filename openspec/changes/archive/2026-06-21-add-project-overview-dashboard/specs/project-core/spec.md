## ADDED Requirements

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
