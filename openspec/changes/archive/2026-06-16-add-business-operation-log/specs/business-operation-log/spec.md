## ADDED Requirements

### Requirement: 项目业务操作日志模型

系统 MUST 提供项目维度业务操作日志持久化模型，用于记录项目关键业务状态变化。

#### Scenario: 保存日志基础字段

- **WHEN** 系统记录业务操作日志
- **THEN** 日志必须至少保存 `id`、`project_id`、`actor_user_id`、`action_type`、`target_type`、`target_id`、`summary`、`details_json` 和 `created_at`

#### Scenario: 操作人字段必须非空

- **WHEN** 系统记录第一版业务操作日志
- **THEN** `actor_user_id` 必须为 `NOT NULL`，且必须来自当前登录用户

#### Scenario: 日志归属于项目

- **WHEN** 系统记录业务操作日志
- **THEN** 日志必须关联 `project_id`，并作为项目维度日志查询和展示

#### Scenario: 不记录全局审计日志

- **WHEN** 系统处理业务操作日志
- **THEN** 系统不得在本能力中实现全局审计日志、系统配置日志、登录日志、文件平台日志或文件下载日志

#### Scenario: 操作人来自登录态

- **WHEN** 已登录用户触发需要记录日志的业务动作
- **THEN** 系统必须使用当前登录用户作为 `actor_user_id`，不得信任前端提交的操作人字段

#### Scenario: 系统脚本不写业务日志

- **WHEN** 历史补初始化、模板初始化或其他没有登录态的系统脚本执行
- **THEN** 第一版不得为该脚本动作写入项目业务操作日志，不得使用空 `actor_user_id` 表示系统动作；如后续需要系统动作日志，必须另起 change 设计系统用户或空操作人策略

#### Scenario: 不回填历史业务日志

- **WHEN** 本能力上线或迁移执行
- **THEN** 系统不得为已存在项目、已发生的资料状态变更、适用性变更或阶段推进补写历史业务操作日志，只能记录本能力实现后新发生的成功业务动作

### Requirement: 业务日志动作和目标类型

系统 MUST 使用稳定的 `action_type` 和 `target_type` 表示第一版业务操作日志类型。

#### Scenario: 支持项目创建动作

- **WHEN** 项目创建成功
- **THEN** 系统必须记录 `action_type = project.created` 且 `target_type = project` 的业务日志

#### Scenario: 支持资料状态动作

- **WHEN** 资料项手工提交、确认或退回成功
- **THEN** 系统必须分别记录 `action_type = document.submitted`、`document.confirmed` 或 `document.returned`，且 `target_type = stage_document`

#### Scenario: 支持资料适用性动作

- **WHEN** 资料项标记不适用或恢复适用成功
- **THEN** 系统必须分别记录 `action_type = document.marked_not_applicable` 或 `document.restored_applicable`，且 `target_type = stage_document`

#### Scenario: 支持阶段推进动作

- **WHEN** 项目阶段手工推进成功
- **THEN** 系统必须记录 `action_type = stage.advanced` 且 `target_type = stage` 的业务日志

#### Scenario: 支持项目完成动作

- **WHEN** 第 8 阶段 `closeout` 推进成功并使项目完成
- **THEN** 系统必须额外记录 `action_type = project.completed` 且 `target_type = project` 的业务日志

#### Scenario: 阶段推进日志使用当前用户

- **WHEN** 已登录用户请求 `POST /api/projects/:projectId/stages/advance` 且阶段推进成功
- **THEN** 后端必须从 `req.auth.user.id` 传入 `userId`，并使用该 `userId` 作为 `stage.advanced` 和 `project.completed` 日志的 `actor_user_id`

#### Scenario: 失败操作不记录日志

- **WHEN** 项目创建、资料状态操作、资料适用性操作或阶段推进失败
- **THEN** 系统不得写入对应业务操作日志

### Requirement: 业务日志结构化详情

系统 MUST 在 `details_json` 中保存第一版业务动作所需的结构化上下文。

#### Scenario: 资料状态变更详情

- **WHEN** 系统记录资料项提交、确认或退回日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`fromStatus` 和 `toStatus`

#### Scenario: 资料退回详情

- **WHEN** 系统记录 `document.returned` 日志
- **THEN** `details_json` 必须额外包含 `returnReason`

#### Scenario: 资料适用性变更详情

- **WHEN** 系统记录资料项标记不适用或恢复适用日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`fromIsApplicable` 和 `toIsApplicable`

#### Scenario: 标记不适用详情

- **WHEN** 系统记录 `document.marked_not_applicable` 日志
- **THEN** `details_json` 必须额外包含 `notApplicableReason`

#### Scenario: 阶段推进详情

- **WHEN** 系统记录 `stage.advanced` 日志
- **THEN** `details_json` 必须至少包含 `fromStageKey`、`fromStageName`、`toStageKey`、`toStageName` 和 `completenessSummary`

#### Scenario: 项目完成详情

- **WHEN** 系统记录 `project.completed` 日志
- **THEN** `details_json` 必须至少包含 `completedStageKey` 和 `completedStageName`

### Requirement: 业务日志中文摘要

系统 MUST 为每条业务操作日志保存可读中文 `summary`，用于项目详情页直接展示。

#### Scenario: 保存可读摘要

- **WHEN** 系统写入业务操作日志
- **THEN** 系统必须保存可读中文 `summary`，并且摘要应能表达业务动作和主要目标

#### Scenario: 不要求复杂模板

- **WHEN** 系统生成业务日志 `summary`
- **THEN** 第一版不得要求复杂模板引擎、多语言模板或用户自定义模板

### Requirement: 业务日志事务一致性

系统 MUST 保证关键业务状态变更与对应业务操作日志在同一事务中提交。

#### Scenario: 项目创建日志同事务

- **WHEN** 已登录用户创建项目成功
- **THEN** 项目主数据保存、8 阶段初始化、资料清单初始化和 `project.created` 日志写入必须在同一事务中提交

#### Scenario: 资料操作日志同事务

- **WHEN** 已登录用户成功变更资料项状态或适用性
- **THEN** 资料项状态或适用性变更、追溯字段更新和业务日志写入必须在同一事务中提交

#### Scenario: 阶段推进日志同事务

- **WHEN** 已登录用户成功推进项目阶段
- **THEN** 阶段状态更新、项目完成状态更新和业务日志写入必须在同一事务中提交

#### Scenario: 日志写入失败回滚业务变更

- **WHEN** 业务动作状态变更已准备提交但业务日志写入失败
- **THEN** 系统必须回滚该业务动作，不得出现状态已改变但缺少业务日志的结果

### Requirement: 项目业务日志查询接口

系统 MUST 提供项目维度业务日志查询接口，并 MUST 返回该项目业务日志的倒序列表。

#### Scenario: 查询接口要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/projects/:projectId/operation-logs`
- **THEN** 系统必须拒绝请求，并提示需要登录

#### Scenario: 查询项目日志

- **WHEN** 已登录用户请求 `GET /api/projects/:projectId/operation-logs`
- **THEN** 系统必须返回该项目业务操作日志，并按 `created_at DESC, id DESC` 稳定倒序排列

#### Scenario: 项目不存在

- **WHEN** 已登录用户请求不存在项目的业务日志
- **THEN** 系统必须返回项目不存在错误

#### Scenario: 限制返回数量

- **WHEN** 已登录用户查询项目业务日志
- **THEN** 系统必须限制第一版返回数量，可固定最近 100 条或支持受限的 `limit` 参数，且 `limit` 必须有最大值

#### Scenario: 非法 limit 稳定校验

- **WHEN** 已登录用户使用非法 `limit` 查询项目业务日志
- **THEN** 系统必须返回稳定校验错误或使用明确默认值，不得一次性返回无限数据

#### Scenario: 查询不做复杂权限

- **WHEN** 已登录用户查询项目业务日志
- **THEN** 系统必须只做 `requireAuth` 和项目存在校验，不得在本能力中实现日志权限矩阵、复杂权限、角色权限或轻角色校验

### Requirement: 业务日志边界

业务操作日志 MUST 只记录第一版定义的项目关键业务状态变化，不得扩展为其他平台能力。

#### Scenario: 不实现日志分析能力

- **WHEN** 系统记录或查询业务操作日志
- **THEN** 系统不得在本能力中实现管理层看板、日志筛选导出、复杂分页或统计分析

#### Scenario: 不触发协同能力

- **WHEN** 系统记录业务操作日志
- **THEN** 系统不得在本能力中发送通知、创建个人待办或分配责任人

#### Scenario: 不联动文件和表单

- **WHEN** 系统记录业务操作日志
- **THEN** 系统不得在本能力中上传文件、下载文件、调用文件管理平台、填写在线表单或生成表单归档文件
