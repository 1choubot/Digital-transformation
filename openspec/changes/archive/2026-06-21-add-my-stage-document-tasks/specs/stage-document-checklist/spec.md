## ADDED Requirements

### Requirement: 我的阶段资料任务查询接口

系统 MUST 提供 `GET /api/me/stage-document-tasks`，用于已登录用户查询分配给自己的项目级阶段资料项任务。

#### Scenario: 查询我的资料任务要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/me/stage-document-tasks`
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 查询我的资料任务不要求平台管理员

- **WHEN** 已登录用户请求 `GET /api/me/stage-document-tasks`
- **THEN** 系统必须只做 `requireAuth`，不得要求 `isPlatformAdmin`，不得实现复杂权限、项目成员权限、资料权限、角色权限或轻角色校验

#### Scenario: 只返回当前登录用户负责的资料项

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统必须只返回 `responsible_user_id = 当前登录用户 id` 的项目级阶段资料项，不得允许前端通过参数查询其他用户的资料任务

#### Scenario: 默认返回待办资料任务

- **WHEN** 已登录用户未提供 `status` 筛选时请求我的资料任务
- **THEN** 系统必须按 `status=pending` 处理，只返回状态为 `not_submitted`、`submitted` 或 `returned` 且适用的资料项

#### Scenario: 默认排除不适用资料

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统必须默认排除 `is_applicable = 0` 的资料项，并且不得把不适用资料作为待办返回

#### Scenario: 支持单一状态筛选

- **WHEN** 已登录用户使用 `status=not_submitted`、`status=submitted`、`status=returned` 或 `status=confirmed` 请求我的资料任务
- **THEN** 系统必须只返回当前登录用户负责、状态匹配且适用的资料项

#### Scenario: 支持 pending 状态筛选

- **WHEN** 已登录用户使用 `status=pending` 请求我的资料任务
- **THEN** 系统必须返回当前登录用户负责、状态为 `not_submitted`、`submitted` 或 `returned` 且适用的资料项

#### Scenario: 支持 all 状态筛选

- **WHEN** 已登录用户使用 `status=all` 请求我的资料任务
- **THEN** 系统必须返回当前登录用户负责、状态为 `not_submitted`、`submitted`、`returned` 或 `confirmed` 且适用的资料项

#### Scenario: 非法状态筛选

- **WHEN** 已登录用户使用不属于 `not_submitted`、`submitted`、`returned`、`confirmed`、`pending` 或 `all` 的 `status` 请求我的资料任务
- **THEN** 系统必须通过统一错误处理返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS` 和明确 HTTP 状态，建议为 400，并且不得回退为默认查询

#### Scenario: 支持项目筛选

- **WHEN** 已登录用户提供合法 `projectId` 请求我的资料任务
- **THEN** 系统必须只返回当前登录用户负责、属于该项目且符合状态筛选和适用性口径的资料项

#### Scenario: 非法项目筛选

- **WHEN** 已登录用户提供非数字、空字符串、0、负数、小数或其他非正整数格式的 `projectId` 请求我的资料任务
- **THEN** 系统必须通过统一错误处理返回 `INVALID_PROJECT_ID` 和明确 HTTP 状态，建议为 400，并且不得回退为无项目筛选查询

#### Scenario: 合法项目筛选无匹配任务

- **WHEN** 已登录用户提供合法正整数 `projectId`，但不存在匹配当前登录用户、适用性和状态筛选条件的资料任务
- **THEN** 系统必须返回空列表，不得把该情况作为错误处理

#### Scenario: 项目和阶段状态不参与过滤

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统不得按项目状态、阶段状态或阶段是否当前过滤结果；只要资料项分配给当前登录用户、适用且状态符合筛选条件，就必须按查询和排序规则返回

#### Scenario: 我的资料任务返回字段

- **WHEN** 系统返回我的资料任务列表
- **THEN** 每个任务必须至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`

#### Scenario: 我的资料任务稳定排序

- **WHEN** 系统返回我的资料任务列表
- **THEN** 系统必须按状态优先级 `returned`、`not_submitted`、`submitted`、`confirmed` 排序；同状态下按 `responsibilityUpdatedAt` 倒序且空值排后，再按 `projectCode` 升序、`stageOrder` 升序、`documentOrder` 升序和 `documentId` 升序排序

#### Scenario: 查询我的资料任务不写业务日志

- **WHEN** 已登录用户查询我的资料任务
- **THEN** 系统不得写入项目业务操作日志，不得改变资料状态、适用性、责任人、责任人追溯字段、阶段齐套摘要或阶段推进状态

### Requirement: 我的阶段资料任务边界

我的阶段资料任务 MUST 只表示分配给当前登录用户的阶段资料项查询视图，不得扩展为文件、表单、通知、权限或统计能力。

#### Scenario: 我的资料任务不代表文件或表单状态

- **WHEN** 系统返回或前端展示我的资料任务
- **THEN** 系统必须保持资料状态为当前手工标记状态，不得把任务状态解释为文件已上传、文件已归档或在线表单已填写

#### Scenario: 我的资料任务不创建协同动作

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得创建消息提醒、超期提醒、截止日期、个人待办实体、审批流或通知

#### Scenario: 我的资料任务不联动文件平台

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得上传文件、下载文件、调用文件管理平台、同步文件权限或判断文件权限

#### Scenario: 我的资料任务不提供批量操作

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得在本能力中提供批量提交、批量确认、批量退回、批量标记适用性或批量责任人变更能力
