## ADDED Requirements

### Requirement: 资料项适用性

系统 MUST 为项目级阶段资料项保存独立适用性，资料项默认适用，并 MUST 支持手工标记不适用和恢复适用。

#### Scenario: 新资料项默认适用

- **WHEN** 系统生成项目级阶段资料项
- **THEN** 资料项必须默认保存为适用状态

#### Scenario: 标记资料项不适用

- **WHEN** 已登录用户填写非空不适用原因并标记当前适用的项目级资料项不适用
- **THEN** 系统必须将该资料项保存为不适用，记录 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并清空 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 不适用原因必填

- **WHEN** 已登录用户标记资料项不适用但未提供非空不适用原因
- **THEN** 系统必须拒绝该操作，并且不得改变资料项适用性、`status` 或追溯字段

#### Scenario: 恢复资料项适用

- **WHEN** 已登录用户将不适用资料项恢复为适用
- **THEN** 系统必须将该资料项保存为适用，清空 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并记录 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 只有适用资料可标记不适用

- **WHEN** 已登录用户请求将已不适用资料项再次标记为不适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 只有不适用资料可恢复适用

- **WHEN** 已登录用户请求将当前适用资料项恢复适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 恢复适用不自动修改状态

- **WHEN** 系统恢复资料项适用
- **THEN** 系统必须保留该资料项原有 `status`，不得自动改为 `not_submitted`、`submitted`、`confirmed` 或 `returned`

#### Scenario: 适用性操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项适用性操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 适用性操作不做角色权限

- **WHEN** 已登录用户请求资料项适用性操作
- **THEN** 系统必须只校验登录态、资料项归属和操作规则，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项适用性
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项

### Requirement: 适用性边界

资料项适用性 MUST 表示人工业务判断，不能表示资料已提交、已确认、已归档或已上传。

#### Scenario: 不适用不创建文件或表单记录

- **WHEN** 用户手工标记资料项不适用
- **THEN** 系统不得创建文件上传记录、在线表单记录、归档文件、文件平台文件映射或业务日志

#### Scenario: 不适用不推进阶段

- **WHEN** 用户手工标记资料项不适用或恢复适用
- **THEN** 系统不得推进阶段、生成阶段门禁结果、生成管理层看板指标、创建个人待办、发送通知或分配责任人

#### Scenario: 不适用不改变状态含义

- **WHEN** 资料项被标记为不适用
- **THEN** 系统不得把该资料项解释为已提交、已确认、已上传文件或已归档

## MODIFIED Requirements

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 能根据阶段资料项模板初始化项目资料项。

#### Scenario: 新项目初始化资料清单

- **WHEN** 项目创建成功
- **THEN** 系统必须按阶段资料项模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`

#### Scenario: 初始化资料项适用性

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项必须初始化为适用，并且不适用原因和不适用追溯字段必须为空

#### Scenario: 保存模板快照字段

- **WHEN** 系统生成项目级资料项
- **THEN** 项目级资料项必须保存资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath` 和可空 `targetFolderId` 等模板快照字段

#### Scenario: 第一版项目资料项目录 ID 为空

- **WHEN** 系统生成第一版项目级资料项
- **THEN** 项目级资料项必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

#### Scenario: 预留后续能力字段

- **WHEN** 系统保存项目级资料项
- **THEN** 系统必须预留可支持后续文件上传、在线表单、资料齐套率和阶段推进的关联字段或扩展字段

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 按阶段分组返回资料项、状态追溯字段、适用性追溯字段和阶段资料齐套摘要。

#### Scenario: 查询项目阶段资料清单

- **WHEN** 前端请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回

- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称、该阶段资料项列表和 `completenessSummary`

#### Scenario: 资料项字段返回

- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId`、基础状态、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt`、`returnReason`、`isApplicable`、`notApplicableByUserId`、`notApplicableAt`、`notApplicableReason`、`restoredApplicableByUserId` 和 `restoredApplicableAt`

#### Scenario: 阶段齐套摘要字段返回

- **WHEN** 后端返回阶段分组数据
- **THEN** 每个阶段的 `completenessSummary` 必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 阶段齐套摘要缺失列表字段返回

- **WHEN** 每个阶段的 `completenessSummary` 包含非空 `incompleteRequiredDocuments`
- **THEN** `incompleteRequiredDocuments` 中的每个资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 项目不存在

- **WHEN** 请求不存在的项目阶段资料清单
- **THEN** 后端必须返回项目不存在错误

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 在后端统一校验状态机和资料项适用性。

#### Scenario: 标记待提交资料为已提交

- **WHEN** 已登录用户将状态为 `not_submitted` 且适用的项目级资料项标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，并记录 `submitted_by_user_id` 和 `submitted_at`

#### Scenario: 标记已退回资料为已提交

- **WHEN** 已登录用户将状态为 `returned` 且适用的项目级资料项重新标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，记录新的 `submitted_by_user_id` 和 `submitted_at`，并清空 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 确认已提交资料

- **WHEN** 已登录用户确认状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `confirmed`，并记录 `confirmed_by_user_id` 和 `confirmed_at`

#### Scenario: 退回已提交资料

- **WHEN** 已登录用户填写非空退回原因并退回状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `returned`，并记录 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 不适用资料项不能状态流转

- **WHEN** 已登录用户请求提交、确认或退回已标记不适用的项目级资料项
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态、状态追溯字段或适用性字段

#### Scenario: 退回原因必填

- **WHEN** 已登录用户退回资料项但未提供非空退回原因
- **THEN** 系统必须拒绝退回，并且不得改变资料项状态或追溯字段

#### Scenario: 非法状态流转

- **WHEN** 用户请求未被允许的资料项状态流转
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态或追溯字段

#### Scenario: 状态操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项状态操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 状态操作不做角色权限

- **WHEN** 已登录用户请求资料项状态操作
- **THEN** 系统必须只校验登录态、状态机和资料项适用性，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项状态

### Requirement: 阶段资料齐套摘要

系统 MUST 在项目阶段资料清单查询结果中返回每个阶段的只读必填资料齐套摘要，并 MUST 基于项目级资料项的当前手工状态和适用性计算。

#### Scenario: 返回阶段齐套摘要字段

- **WHEN** 后端返回某项目阶段资料清单
- **THEN** 每个阶段必须包含 `completenessSummary`，且该摘要必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用且必填资料项

- **WHEN** 后端计算某阶段齐套摘要
- **THEN** `requiredTotal` 必须只统计 `is_required = true` 且适用的资料项，建议资料项和不适用资料项不得计入齐套摘要计数或百分比

#### Scenario: 已确认适用必填资料计为完成

- **WHEN** 适用必填资料项状态为 `confirmed`
- **THEN** 后端必须将该资料项计入 `confirmedRequiredCount`

#### Scenario: 非确认适用必填资料计为未完成

- **WHEN** 适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 后端必须将该资料项计入 `incompleteRequiredCount`，并在 `incompleteRequiredDocuments` 中返回该资料项

#### Scenario: 不适用资料项不进入缺失列表

- **WHEN** 必填资料项已标记为不适用
- **THEN** 后端不得将该资料项计入 `requiredTotal`、`confirmedRequiredCount` 或 `incompleteRequiredCount`，也不得将其返回到 `incompleteRequiredDocuments`

#### Scenario: 缺失必填资料项最小字段

- **WHEN** 后端在 `incompleteRequiredDocuments` 中返回缺失必填资料项
- **THEN** 每个缺失必填资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 建议资料继续展示但不影响齐套率

- **WHEN** 阶段包含 `is_required = false` 的建议资料项
- **THEN** 后端必须继续在阶段资料项列表中返回该资料项，但不得因该资料项状态或适用性影响 `completionPercent`

#### Scenario: 完成百分比计算规则

- **WHEN** 后端计算某阶段 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算，当 `requiredTotal = 0` 时必须返回 `100`，且第一版必须使用 0 到 100 的整数百分比

#### Scenario: 没有适用必填资料的阶段

- **WHEN** 某阶段 `requiredTotal = 0`
- **THEN** 后端必须返回 `completionPercent = 100`、`confirmedRequiredCount = 0`、`incompleteRequiredCount = 0` 和空的 `incompleteRequiredDocuments`

#### Scenario: 适用性变更后摘要使用最新状态

- **WHEN** 资料项适用性操作成功后前端重新查询阶段资料清单
- **THEN** 后端必须基于查询时的最新资料项状态和适用性返回阶段齐套摘要

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统计算或返回阶段资料齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态和人工适用性判断，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转、资料项适用性和阶段资料齐套摘要不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态、手工变更资料项适用性或计算阶段资料齐套摘要
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 不实现排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除本变更定义的手工资料项适用性和既有只读阶段资料齐套摘要外，系统不得实现在线表单填写、表单生成归档文件、阶段推进、管理层看板、复杂权限、角色权限、轻角色校验、业务日志、责任人分配或个人待办
