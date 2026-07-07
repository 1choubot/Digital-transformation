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

系统 MUST 使用稳定的 `action_type` 和 `target_type` 表示第一版业务操作日志类型，并 MUST 为精准返工请求、返工完成、立项在线表单和 `1.2 项目立项审批表` 评价/最终审批增加稳定日志动作。

#### Scenario: 支持立项在线表单动作

- **WHEN** 用户保存或提交 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 在线表单
- **THEN** 系统 MUST 记录稳定 `action_type` 的项目业务操作日志
- **AND** `target_type` MUST 能区分在线表单、阶段资料或等价业务目标

#### Scenario: 支持 1.2 评价和审批动作

- **WHEN** 营销中心负责人提交营销评价、研发中心负责人提交研发评价、总经理审批通过或总经理审批不通过
- **THEN** 系统 MUST 记录稳定 `action_type` 的项目业务操作日志
- **AND** `target_type` SHOULD 使用 `initiation_review`、`stage_document`、`online_form` 或等价可区分 `1.2` 评价/审批的目标类型

#### Scenario: 支持 1.2 建议动作类型

- **WHEN** 系统记录 `1.2 项目立项审批表` 评价/审批日志
- **THEN** 日志动作类型 MAY 使用 `initiation.evaluation.submitted`
- **AND** 日志动作类型 MAY 使用 `initiation.approval.approved`
- **AND** 日志动作类型 MAY 使用 `initiation.approval.returned`
- **AND** 日志动作类型 MAY 使用 `initiation.completed`
- **AND** 日志动作类型 MAY 使用 `document.revision_requested` 表达总经理不通过触发的 `1.1` 返工

#### Scenario: 1.2 失败操作不写成功日志

- **WHEN** `1.2` 表单提交、评价提交、总经理审批、返工请求或最终完成因权限、状态、参数、返工门禁或业务校验失败
- **THEN** 系统不得写入对应成功业务操作日志

### Requirement: 业务日志结构化详情

系统 MUST 在 `details_json` 中保存第一版业务动作所需的结构化上下文，并 MUST 为精准返工日志和 `1.2` 评价/审批日志保存来源资料、评价/审批动作、原因、操作人和时间等可审计信息。

#### Scenario: 在线表单日志详情

- **WHEN** 系统记录立项阶段在线表单保存或提交日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`formKey`、`fromStatus`、`toStatus`、`actorUserId` 和 `operatedAt`

#### Scenario: 1.2 评价详情

- **WHEN** 系统记录营销评价或研发评价日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`evaluationType`、`evaluatorUserId`、`evaluationText` 和 `evaluatedAt`
- **AND** `evaluationType` MUST 能区分营销评价和研发评价

#### Scenario: 1.2 总经理审批详情

- **WHEN** 系统记录总经理最终审批通过或不通过日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`approvalResult`、`approverUserId`、`approvalOpinion` 和 `approvedAt`
- **AND** 审批不通过日志 MUST 能关联 `1.1 项目需求表` 返工目标和 `1.2` 需重新填写状态

#### Scenario: 1.2 触发精准返工日志关联

- **WHEN** `1.2` 总经理审批不通过触发 `1.1 项目需求表` 精准返工
- **THEN** `initiation.approval.returned` 或等价审批不通过日志 MUST 能关联来源 `1.2` 审批资料
- **AND** `document.revision_requested` 日志 MUST 能关联目标 `1.1` 返工资料
- **AND** 两类日志 MUST 能共同审计退回原因、返工原因、操作人和时间

### Requirement: 业务日志中文摘要

系统 MUST 为每条业务操作日志保存可读中文 `summary`，用于项目详情页直接展示。

#### Scenario: 保存可读摘要

- **WHEN** 系统写入业务操作日志
- **THEN** 系统必须保存可读中文 `summary`，并且摘要应能表达业务动作和主要目标

#### Scenario: 不要求复杂模板

- **WHEN** 系统生成业务日志 `summary`
- **THEN** 第一版不得要求复杂模板引擎、多语言模板或用户自定义模板

### Requirement: 业务日志事务一致性

系统 MUST 保证关键业务状态变更与对应业务操作日志在同一事务中提交；`1.2` 多节点审批状态、精准返工字段和业务日志也 MUST 保持事务一致。

#### Scenario: 1.2 多节点激活和审批日志同事务

- **WHEN** 普通 `1.2 项目立项审批表` 资料提交触发多节点激活、节点通过、节点退回或返工清除后的节点恢复成功
- **THEN** 节点状态变更和对应业务日志写入 MUST 在同一事务中提交

#### Scenario: 1.2 退回返工日志同事务

- **WHEN** `1.2` 节点退回成功并标记 `1.1 revision_required = true`
- **THEN** 节点退回状态、`1.1` 返工字段和 `document.revision_requested` 业务日志 MUST 在同一事务中提交
- **AND** 任一日志写入失败 MUST 回滚节点状态和返工字段变更

#### Scenario: 1.2 最终完成日志同事务

- **WHEN** `1.2` 商务评价、技术评价和总经理审批均最终通过并满足无返工门禁
- **THEN** 系统 MUST 在同一事务中记录 `initiation_review.completed` 或等价最终完成日志

### Requirement: 项目业务日志查询接口

系统 MUST 提供项目维度业务日志查询接口，并 MUST 只允许具备该项目业务日志查看权的用户返回该项目业务日志倒序列表。

#### Scenario: 查询接口要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/projects/:projectId/operation-logs`
- **THEN** 系统必须拒绝请求，并提示需要登录

#### Scenario: 管理层查询全部项目日志

- **WHEN** 总经理、总经理助理或中心负责人请求任一项目业务日志
- **THEN** 系统 MUST 允许其查看该项目业务操作日志，并按 `created_at DESC, id DESC` 稳定倒序排列

#### Scenario: 项目创建人查询自己创建项目日志

- **WHEN** 当前用户是项目 `createdByUserId` 且请求该项目业务日志
- **THEN** 系统 MUST 允许其查看该项目业务操作日志，并按 `created_at DESC, id DESC` 稳定倒序排列

#### Scenario: 项目经理查询自己负责项目日志

- **WHEN** 当前用户是项目 `projectManagerUserId` 且请求该项目业务日志
- **THEN** 系统 MUST 允许其查看该项目业务操作日志，并按 `created_at DESC, id DESC` 稳定倒序排列

#### Scenario: 普通员工不默认查询完整项目日志

- **WHEN** 普通员工仅因负责项目中某个资料项而请求该项目完整业务日志
- **THEN** 系统 MUST 拒绝完整业务日志查询，并返回无权错误

#### Scenario: 系统管理员不默认查询业务日志

- **WHEN** 当前用户 `organizationRole = system_admin` 且无其他业务查看身份
- **THEN** 系统 MUST 拒绝项目业务日志查询，不得仅因系统管理员身份返回业务日志

#### Scenario: 项目不存在

- **WHEN** 已登录用户请求不存在项目的业务日志
- **THEN** 系统必须返回项目不存在错误

#### Scenario: 限制返回数量

- **WHEN** 已登录用户查询项目业务日志
- **THEN** 系统必须限制第一版返回数量，可固定最近 100 条或支持受限的 `limit` 参数，且 `limit` 必须有最大值

#### Scenario: 非法 limit 稳定校验

- **WHEN** 已登录用户使用非法 `limit` 查询项目业务日志
- **THEN** 系统必须返回稳定校验错误或使用明确默认值，不得一次性返回无限数据

#### Scenario: 日志查看不放宽业务操作

- **WHEN** 用户具备项目业务日志查看权
- **THEN** 系统 MUST NOT 因日志查看权授予资料提交、资料审核、资料退回、精准返工退回、责任人分配、适用性管理、附件上传、附件删除、阶段推进、项目编号填写或 `1.2` 多节点审批权限

### Requirement: 业务日志边界

业务操作日志 MUST 只记录和展示第一版定义的项目关键业务状态变化和精准返工状态变化；本 change 只调整业务日志查看范围，不得扩展为其他平台能力。

#### Scenario: 不实现日志分析能力

- **WHEN** 系统记录或查询业务操作日志
- **THEN** 系统不得在本能力中实现管理层看板、日志筛选导出、复杂分页或统计分析

#### Scenario: 不新增日志导出

- **WHEN** 系统按全量查看口径允许管理层、项目创建人或项目经理查看业务日志
- **THEN** 系统 MUST NOT 因本 change 新增日志导出、批量下载或报表生成能力

#### Scenario: 不新增用户管理日志或系统日志

- **WHEN** 系统实现项目业务日志查看范围调整
- **THEN** 系统 MUST NOT 新增用户管理操作日志、登录审计、平台系统日志或文件平台日志

#### Scenario: 不触发协同能力

- **WHEN** 系统记录业务操作日志或精准返工日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办实体、执行审批流或执行额外责任人派发

#### Scenario: 不联动文件和表单

- **WHEN** 系统记录业务操作日志或精准返工日志
- **THEN** 系统不得在本能力中上传文件、下载文件、调用文件管理平台、填写在线表单或生成表单归档文件

#### Scenario: 业务日志查看不等于操作授权

- **WHEN** 用户可以查看某项目业务日志
- **THEN** 系统 MUST NOT 允许调用方把日志查看结果或日志查看权限作为任何业务操作授权依据

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

### Requirement: 阶段审批流业务日志动作
系统 MUST 在阶段审批流成功动作后记录项目业务操作日志，并 MUST 使用稳定的 `action_type` 和 `target_type`。

#### Scenario: 提交审批记录业务日志
- **WHEN** 项目经理成功提交阶段审批
- **THEN** 系统必须记录 `action_type = approval.submitted` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 中心负责人审批通过记录业务日志
- **WHEN** 中心负责人成功通过阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.center_approved` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 中心负责人审批退回记录业务日志
- **WHEN** 中心负责人成功退回阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.center_returned` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 总经理审批通过记录业务日志
- **WHEN** 总经理成功通过阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.general_approved` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 总经理审批退回记录业务日志
- **WHEN** 总经理成功退回阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.general_returned` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 重新提交审批记录业务日志
- **WHEN** 项目经理成功重新提交已退回阶段审批
- **THEN** 系统必须记录 `action_type = approval.resubmitted` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 审批历史查询不写业务日志
- **WHEN** 用户查询阶段审批历史
- **THEN** 系统不得写入项目业务操作日志

#### Scenario: 审批失败不写成功日志
- **WHEN** 审批提交、审批通过、审批退回或重新提交因权限、状态、参数或齐套校验失败
- **THEN** 系统不得写入对应审批成功业务操作日志

### Requirement: 阶段审批流日志详情
系统 MUST 在审批流业务日志 `details_json` 中保存审批动作所需的结构化上下文。

#### Scenario: 审批提交日志详情
- **WHEN** 系统记录 `approval.submitted` 或 `approval.resubmitted`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`fromApprovalStatus`、`toApprovalStatus` 和 `completenessSummary`

#### Scenario: 审批通过日志详情
- **WHEN** 系统记录 `approval.center_approved` 或 `approval.general_approved`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`approvalRole`、`fromApprovalStatus`、`toApprovalStatus` 和 `comment`

#### Scenario: 审批退回日志详情
- **WHEN** 系统记录 `approval.center_returned` 或 `approval.general_returned`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`approvalRole`、`fromApprovalStatus`、`toApprovalStatus` 和 `returnReason`

#### Scenario: 审批节点来自当前阶段规则
- **WHEN** 系统记录阶段审批业务日志
- **THEN** `details_json.approvalNode` 必须是当前阶段第一版审批节点规则确定的审批节点

#### Scenario: 审批日志中文摘要
- **WHEN** 系统记录阶段审批流业务日志
- **THEN** 系统必须保存可读中文 `summary`，并表达审批节点、审批动作和主要目标

### Requirement: 阶段审批流日志事务一致性
系统 MUST 保证审批状态变更、审批记录写入和对应业务操作日志在同一事务中提交。

#### Scenario: 审批提交日志同事务
- **WHEN** 项目经理成功提交或重新提交审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批通过日志同事务
- **WHEN** 中心负责人或总经理成功通过审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批退回日志同事务
- **WHEN** 中心负责人或总经理成功退回审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批日志失败回滚审批变更
- **WHEN** 审批状态变更或审批记录已经准备提交但业务日志写入失败
- **THEN** 系统必须回滚审批状态变更和审批记录，不得出现审批成功但缺少业务日志的结果

#### Scenario: 审批记录和业务日志同事务
- **WHEN** 阶段审批成功动作写入审批历史记录
- **THEN** 审批历史记录和对应项目业务操作日志必须在同一事务中提交

#### Scenario: 审批日志不触发其他能力
- **WHEN** 系统记录阶段审批流业务日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办、调用文件管理平台、填写在线表单、生成日报周报或自动推进阶段

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

### Requirement: 1.2 多节点审批业务日志

系统 MUST 为 `1.2 项目立项审批表` 的营销评价、研发评价和总经理最终审批提供结构化、可追溯的项目业务操作日志。

#### Scenario: 营销评价日志

- **WHEN** 营销中心负责人提交营销评价文本
- **THEN** 系统 MUST 记录营销评价动作、评价人、评价文本和时间
- **AND** 系统 MUST NOT 将营销评价记录为审批通过或审批退回

#### Scenario: 研发评价日志

- **WHEN** 研发中心负责人提交研发评价文本
- **THEN** 系统 MUST 记录研发评价动作、评价人、评价文本和时间
- **AND** 系统 MUST NOT 将研发评价记录为审批通过或审批退回

#### Scenario: 总经理审批通过日志

- **WHEN** 总经理最终审批通过 `1.2 项目立项审批表`
- **THEN** 系统 MUST 记录总经理审批通过动作、审批人、审批意见和时间

#### Scenario: 总经理审批不通过日志

- **WHEN** 总经理最终审批不通过 `1.2 项目立项审批表`
- **THEN** 系统 MUST 记录总经理审批不通过动作、审批人、审批意见和时间
- **AND** 系统 MUST 记录其触发 `1.1` 返工和 `1.2` 重新填写的上下文

#### Scenario: 最终完成日志

- **WHEN** `1.2` 在线表单已提交、营销评价完成、研发评价完成、总经理审批通过且相关返工清除
- **THEN** 系统 MUST 记录 `1.2` 最终完成日志

#### Scenario: 不做通知推送

- **WHEN** 系统记录 `1.2` 评价/审批业务日志
- **THEN** 系统 MUST NOT 因该日志动作发送推送通知、站内信、短信或邮件

### Requirement: 项目工作区和立项在线表单业务日志

系统 MUST 为项目轻量创建、立项阶段在线表单提交、`1.2` 评价/审批和 `1.3` 提交保留结构化业务日志能力；节点视图本身作为导航和展示入口时不要求写入查看日志。

#### Scenario: 轻量创建日志
- **WHEN** 用户成功创建只包含项目名称、客户和客户联系方式的项目
- **THEN** 系统 MUST 记录 `project.created` 或等价项目创建日志
- **AND** 日志 MUST 能表达创建时项目编号、项目经理、项目模式、参与中心、计划时间和立项日期可以为空

#### Scenario: 节点查看不强制记日志
- **WHEN** 用户仅在项目工作区切换阶段或蓝色节点查看状态
- **THEN** 系统 MAY 不记录 `stage_node.view` 或等价查看日志
- **AND** 系统 MUST NOT 因查看节点而改变任何业务状态

#### Scenario: 在线表单更新和提交日志
- **WHEN** 用户保存、更新或提交 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 系统 MUST 记录 `form.updated`、`form.submitted` 或等价稳定业务日志动作
- **AND** 日志 MUST 能关联项目、阶段、资料项、表单、操作人和操作时间

#### Scenario: 日志不放宽操作权限
- **WHEN** 系统记录项目工作区、在线表单、评价或审批日志
- **THEN** 系统 MUST NOT 因日志查看权或节点查看权放宽资料提交、评价、审批、阶段推进或项目编号填写权限

