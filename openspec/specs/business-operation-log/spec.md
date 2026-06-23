# business-operation-log Specification

## Purpose
TBD - created by archiving change add-business-operation-log. Update Purpose after archive.
## Requirements
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

#### Scenario: 资料责任人日志同事务

- **WHEN** 已登录用户成功分配或清空资料项责任人
- **THEN** 资料项责任人变更、责任人追溯字段更新和 `document.responsible_changed` 业务日志写入必须在同一事务中提交

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
- **THEN** 系统不得因日志写入发送通知、创建个人待办、执行审批流或执行额外责任人派发

#### Scenario: 不联动文件和表单

- **WHEN** 系统记录业务操作日志
- **THEN** 系统不得在本能力中上传文件、下载文件、调用文件管理平台、填写在线表单或生成表单归档文件

### Requirement: 阶段资料附件业务日志动作
系统 MUST 支持阶段资料附件上传和删除的项目业务操作日志动作，并 MUST 明确下载附件第一版不写业务日志。

#### Scenario: 支持附件上传动作
- **WHEN** 阶段资料附件上传成功
- **THEN** 系统必须记录 `action_type = document.attachment_uploaded` 且 `target_type = stage_document` 的业务日志

#### Scenario: 支持附件删除动作
- **WHEN** 阶段资料附件删除成功
- **THEN** 系统必须记录 `action_type = document.attachment_deleted` 且 `target_type = stage_document` 的业务日志

#### Scenario: 附件下载不写日志
- **WHEN** 用户下载阶段资料附件
- **THEN** 系统第一版不得写入文件下载日志、全局审计日志或项目业务操作日志

#### Scenario: 附件失败操作不记录日志
- **WHEN** 阶段资料附件上传、下载或删除失败
- **THEN** 系统不得写入 `document.attachment_uploaded` 或 `document.attachment_deleted` 业务日志

### Requirement: 阶段资料附件日志详情
系统 MUST 在阶段资料附件上传和删除日志中保存可读摘要和结构化详情，供项目详情页业务日志展示。

#### Scenario: 附件上传日志详情
- **WHEN** 系统记录 `document.attachment_uploaded` 日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`

#### Scenario: 附件删除日志详情
- **WHEN** 系统记录 `document.attachment_deleted` 日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`

#### Scenario: 附件日志中文摘要
- **WHEN** 系统记录阶段资料附件上传或删除日志
- **THEN** 系统必须保存可读中文 `summary`，并且摘要应能表达附件上传或删除动作、资料项和附件名称

### Requirement: 阶段资料附件日志事务一致性
系统 MUST 保证阶段资料附件上传或删除与对应业务操作日志在同一事务中提交。

#### Scenario: 附件上传日志同事务
- **WHEN** 已登录用户成功上传阶段资料附件
- **THEN** 附件记录保存和 `document.attachment_uploaded` 日志写入必须在同一事务中提交

#### Scenario: 附件删除日志同事务
- **WHEN** 已登录用户成功删除阶段资料附件
- **THEN** 附件软删除标记和 `document.attachment_deleted` 日志写入必须在同一事务中提交

#### Scenario: 附件日志失败回滚附件变更
- **WHEN** 附件上传记录或删除标记已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚附件记录变更，不得出现附件变更成功但缺少业务日志的结果

#### Scenario: 附件日志不触发其他能力
- **WHEN** 系统记录阶段资料附件上传或删除日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办、执行审批流、调用文件管理平台或改变资料状态

### Requirement: 业务日志后端调用边界保持行为
系统 MUST 允许项目、阶段资料和附件相关后端模块在重构后调整业务日志模块的 import 或调用位置，但 MUST 保持业务日志动作、结构化详情、中文摘要、事务一致性、查询口径和失败不写日志规则不变。

#### Scenario: 项目创建日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功创建项目
- **THEN** 系统必须仍在同一事务中写入 `project.created` 业务日志，并在日志写入失败时回滚项目创建

#### Scenario: 资料操作日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功执行资料状态、适用性或责任人变更操作
- **THEN** 系统必须仍按既有动作类型、目标类型、结构化详情和中文摘要写入业务日志，并与对应资料变更在同一事务中提交

#### Scenario: 阶段推进日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功推进项目阶段或完成第 8 阶段
- **THEN** 系统必须仍写入 `stage.advanced`，并在完成项目时额外写入 `project.completed`，两类日志必须使用当前登录用户作为操作人并与阶段状态变更同事务提交

#### Scenario: 附件日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功上传或删除阶段资料附件
- **THEN** 系统必须仍写入 `document.attachment_uploaded` 或 `document.attachment_deleted` 业务日志，下载附件仍不得写项目业务日志、文件下载日志或全局审计日志

#### Scenario: 日志失败回滚行为保持
- **WHEN** 拆分后的任一业务模块已经准备提交状态变更或附件变更，但对应业务日志写入失败
- **THEN** 系统必须回滚该业务变更，不得出现业务状态已改变但缺少对应业务日志的结果

#### Scenario: 失败操作不记录日志行为保持
- **WHEN** 拆分后的任一业务模块因登录态、参数、项目归属、资料项归属、状态机、适用性、责任人、附件归属或文件参数校验失败而拒绝请求
- **THEN** 系统不得写入对应项目业务操作日志

#### Scenario: 业务日志查询行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户请求项目业务日志列表
- **THEN** 系统必须保持既有登录要求、项目存在校验、排序、返回字段、数量限制、非法 limit 口径和不做复杂权限的边界不变

#### Scenario: 日志模块不新增排除能力
- **WHEN** 实现业务日志调用边界相关重构
- **THEN** 系统不得因日志模块拆分或 import 调整新增全局审计日志、系统配置日志、登录日志、文件平台日志、文件下载日志、通知、个人待办、审批流、统计分析或导出能力

