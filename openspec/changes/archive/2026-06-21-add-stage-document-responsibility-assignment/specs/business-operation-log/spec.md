## MODIFIED Requirements

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

#### Scenario: 支持资料责任人变更动作

- **WHEN** 资料项责任人分配或清空成功
- **THEN** 系统必须记录 `action_type = document.responsible_changed` 且 `target_type = stage_document` 的业务日志

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

- **WHEN** 项目创建、资料状态操作、资料适用性操作、资料责任人分配或阶段推进失败
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

#### Scenario: 资料责任人变更详情

- **WHEN** 系统记录 `document.responsible_changed` 日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`fromResponsibleUserId` 和 `toResponsibleUserId`

#### Scenario: 阶段推进详情

- **WHEN** 系统记录 `stage.advanced` 日志
- **THEN** `details_json` 必须至少包含 `fromStageKey`、`fromStageName`、`toStageKey`、`toStageName` 和 `completenessSummary`

#### Scenario: 项目完成详情

- **WHEN** 系统记录 `project.completed` 日志
- **THEN** `details_json` 必须至少包含 `completedStageKey` 和 `completedStageName`

### Requirement: 业务日志事务一致性

系统 MUST 保证关键业务状态变更与对应业务操作日志在同一事务中提交。

#### Scenario: 项目创建日志同事务

- **WHEN** 已登录用户创建项目成功
- **THEN** 项目主数据保存、8 阶段初始化、资料清单初始化和 `project.created` 日志写入必须在同一事务中提交

#### Scenario: 资料操作日志同事务

- **WHEN** 已登录用户成功变更资料项状态或适用性
- **THEN** 资料项状态或适用性变更、追溯字段更新和业务日志写入必须在同一事务中提交

#### Scenario: 资料责任人日志同事务

- **WHEN** 已登录用户成功分配或清空资料项责任人
- **THEN** 资料项责任人变更、责任人追溯字段更新和 `document.responsible_changed` 业务日志写入必须在同一事务中提交

#### Scenario: 阶段推进日志同事务

- **WHEN** 已登录用户成功推进项目阶段
- **THEN** 阶段状态更新、项目完成状态更新和业务日志写入必须在同一事务中提交

#### Scenario: 日志写入失败回滚业务变更

- **WHEN** 业务动作状态变更已准备提交但业务日志写入失败
- **THEN** 系统必须回滚该业务动作，不得出现状态已改变但缺少业务日志的结果

### Requirement: 业务日志边界

业务操作日志 MUST 只记录第一版定义的项目关键业务状态变化，不得扩展为其他平台能力。

#### Scenario: 不实现日志分析能力

- **WHEN** 系统记录或查询业务操作日志
- **THEN** 系统不得在本能力中实现管理层看板、日志筛选导出、复杂分页或统计分析

#### Scenario: 不触发协同能力

- **WHEN** 系统记录业务操作日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办、执行审批流或执行额外责任人派发

#### Scenario: 不联动文件和表单

- **WHEN** 系统记录业务操作日志
- **THEN** 系统不得在本能力中上传文件、下载文件、调用文件管理平台、填写在线表单或生成表单归档文件
