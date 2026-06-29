## MODIFIED Requirements

### Requirement: 业务日志动作和目标类型

系统 MUST 使用稳定的 `action_type` 和 `target_type` 表示第一版业务操作日志类型，并 MUST 为精准返工请求和返工完成增加稳定日志动作。

#### Scenario: 支持项目创建动作
- **WHEN** 项目创建成功
- **THEN** 系统必须记录 `action_type = project.created` 且 `target_type = project` 的业务日志

#### Scenario: 支持资料状态动作
- **WHEN** 资料项手工提交、确认或退回成功
- **THEN** 系统必须分别记录 `action_type = document.submitted`、`document.confirmed` 或 `document.returned`，且 `target_type = stage_document`

#### Scenario: 支持精准返工请求动作
- **WHEN** 审批资料退回并成功标记一个或多个返工目标
- **THEN** 系统必须记录 `action_type = document.revision_requested` 且 `target_type = stage_document` 的业务日志

#### Scenario: A 类返工请求写日志
- **WHEN** A 类审批资料退回并通过 `revisionTargetDocumentIds` 成功标记返工目标
- **THEN** 系统必须为被标记目标记录 `document.revision_requested`

#### Scenario: C 类设计变更触发写日志
- **WHEN** `5.12` 退回并通过 `designChangeTargetDocumentIds` 成功触发 `5.13-5.16` 设计变更资料
- **THEN** 系统必须为被触发目标记录 `document.revision_requested`

#### Scenario: 支持精准返工完成动作
- **WHEN** 资料返工完成并成功清除 `revision_required`
- **THEN** 系统必须记录 `action_type = document.revision_completed` 且 `target_type = stage_document` 的业务日志

#### Scenario: submit_only 和 conditional_submit 完成返工写日志
- **WHEN** `submit_only` 或 `conditional_submit` 资料明确完成返工并清除 `revision_required`
- **THEN** 系统必须记录 `document.revision_completed`

#### Scenario: approval_required 审核确认清除返工写日志
- **WHEN** `approval_required` 返工资料经审核确认并清除 `revision_required`
- **THEN** 系统必须记录 `document.revision_completed`

#### Scenario: 支持资料适用性动作
- **WHEN** 资料项标记不适用或恢复适用成功
- **THEN** 系统必须分别记录 `action_type = document.marked_not_applicable` 或 `document.restored_applicable`，且 `target_type = stage_document`

#### Scenario: 支持资料责任人变更动作
- **WHEN** 资料项责任人分配或清空成功
- **THEN** 系统必须记录 `action_type = document.responsible_changed` 且 `target_type = stage_document` 的业务日志

#### Scenario: 支持阶段推进动作
- **WHEN** 项目阶段手工推进成功
- **THEN** 系统必须记录 `action_type = stage.advanced` 且 `target_type = stage` 的业务日志

#### Scenario: 失败操作不记录日志
- **WHEN** 项目创建、资料状态操作、精准返工请求、精准返工完成、资料适用性操作、资料责任人分配或阶段推进失败
- **THEN** 系统不得写入对应业务操作日志

### Requirement: 业务日志结构化详情

系统 MUST 在 `details_json` 中保存第一版业务动作所需的结构化上下文，并 MUST 为精准返工日志保存来源审批资料、返工目标、原因、操作人和时间等可审计信息。

#### Scenario: 资料状态变更详情
- **WHEN** 系统记录资料项提交、确认或退回日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`fromStatus` 和 `toStatus`

#### Scenario: 资料退回详情
- **WHEN** 系统记录 `document.returned` 日志
- **THEN** `details_json` 必须额外包含 `returnReason`

#### Scenario: 返工请求详情
- **WHEN** 系统记录 `document.revision_requested` 日志
- **THEN** `details_json` MUST 至少包含来源审批资料 `sourceDocumentId`、`sourceDocumentCode`、`sourceDocumentName`、被要求返工资料 `targetDocumentId`、`targetDocumentCode`、`targetDocumentName`、`revisionReason`、`requestedByUserId` 和 `requestedAt`
- **AND** C 类 `5.12` 设计变更触发日志 MUST 能表达请求字段来源为 `designChangeTargetDocumentIds` 或等价 C 类上下文

#### Scenario: 多目标返工请求详情
- **WHEN** 一次审批退回请求标记多个返工目标
- **THEN** 系统 MAY 为每个目标资料分别写入 `document.revision_requested` 日志
- **OR** 系统 MAY 写入一条日志并在 `details_json` 中包含 `targetDocuments` 数组
- **AND** 无论采用哪种方式，日志 MUST 能审计每个被要求返工资料

#### Scenario: 返工完成详情
- **WHEN** 系统记录 `document.revision_completed` 日志
- **THEN** `details_json` MUST 至少包含来源审批资料 `sourceDocumentId`、被返工资料 `targetDocumentId`、`targetDocumentCode`、`targetDocumentName`、`revisionReason`、`completedByUserId` 和 `completedAt`
- **AND** 对 `approval_required` 资料，日志 MUST 能表达返工完成发生在审核确认并清除 `revision_required` 之后

#### Scenario: 精准返工日志摘要
- **WHEN** 系统记录 `document.revision_requested` 或 `document.revision_completed`
- **THEN** 系统 MUST 保存可读中文 `summary`
- **AND** 摘要应能表达来源审批资料、返工目标资料和返工原因或完成动作

### Requirement: 业务日志边界

业务操作日志 MUST 只记录第一版定义的项目关键业务状态变化和精准返工状态变化，不得扩展为其他平台能力。

#### Scenario: 不实现日志分析能力
- **WHEN** 系统记录或查询业务操作日志
- **THEN** 系统不得在本能力中实现管理层看板、日志筛选导出、复杂分页或统计分析

#### Scenario: 不触发协同能力
- **WHEN** 系统记录业务操作日志或精准返工日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办实体、执行审批流或执行额外责任人派发

#### Scenario: 不联动文件和表单
- **WHEN** 系统记录业务操作日志或精准返工日志
- **THEN** 系统不得在本能力中上传文件、下载文件、调用文件管理平台、填写在线表单或生成表单归档文件

### Requirement: 业务日志后端调用边界保持行为

系统 MUST 允许项目、阶段资料、精准返工和附件相关后端模块在重构后调整业务日志模块的 import 或调用位置，但 MUST 保持业务日志动作、结构化详情、中文摘要、事务一致性、查询口径和失败不写日志规则不变。

#### Scenario: 项目创建日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功创建项目
- **THEN** 系统必须仍在同一事务中写入 `project.created` 业务日志，并在日志写入失败时回滚项目创建

#### Scenario: 资料操作日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功执行资料状态、适用性或责任人变更操作
- **THEN** 系统必须仍按既有动作类型、目标类型、结构化详情和中文摘要写入业务日志，并与对应资料变更在同一事务中提交

#### Scenario: 精准返工日志事务一致性
- **WHEN** 后端成功请求返工或完成返工
- **THEN** 返工字段变更和 `document.revision_requested` 或 `document.revision_completed` 日志写入必须在同一事务中提交
- **AND** 如果日志写入失败，系统 MUST 回滚对应返工字段变更

#### Scenario: 阶段推进日志行为保持
- **WHEN** 后端完成项目和阶段资料相关模块拆分后，已登录用户成功推进项目阶段或完成第 8 阶段
- **THEN** 系统必须仍写入 `stage.advanced`，并在完成项目时额外写入 `project.completed`，两类日志必须使用当前登录用户作为操作人并与阶段状态变更同事务提交

## ADDED Requirements

### Requirement: 精准返工业务日志动作

系统 MUST 为精准返工请求和返工完成提供可审计业务日志。

#### Scenario: 返工请求日志必填上下文
- **WHEN** 系统成功标记 `revision_required = true`
- **THEN** 系统 MUST 记录来源审批资料、被要求返工资料、退回原因或返工原因、操作人和时间
- **AND** A 类 `revisionTargetDocumentIds` 与 C 类 `designChangeTargetDocumentIds` 触发的返工目标均 MUST 适用该日志要求

#### Scenario: 返工完成日志必填上下文
- **WHEN** 系统成功清除 `revision_required`
- **THEN** 系统 MUST 记录来源审批资料、被完成返工资料、返工原因、操作人和时间

#### Scenario: 当前不做通知推送
- **WHEN** 系统记录精准返工日志
- **THEN** 系统 MUST NOT 因日志动作发送推送通知、站内信、短信或邮件
