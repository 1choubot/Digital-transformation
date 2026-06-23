## ADDED Requirements

### Requirement: 阶段资料齐套摘要

系统 MUST 在项目阶段资料清单查询结果中返回每个阶段的只读必填资料齐套摘要，并 MUST 基于项目级资料项的当前手工状态计算。

#### Scenario: 返回阶段齐套摘要字段

- **WHEN** 后端返回某项目阶段资料清单
- **THEN** 每个阶段必须包含 `completenessSummary`，且该摘要必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计必填资料项

- **WHEN** 后端计算某阶段齐套摘要
- **THEN** `requiredTotal` 必须只统计 `is_required = true` 的资料项，建议资料项不得计入齐套摘要计数或百分比

#### Scenario: 已确认必填资料计为完成

- **WHEN** 必填资料项状态为 `confirmed`
- **THEN** 后端必须将该资料项计入 `confirmedRequiredCount`

#### Scenario: 非确认必填资料计为未完成

- **WHEN** 必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 后端必须将该资料项计入 `incompleteRequiredCount`，并在 `incompleteRequiredDocuments` 中返回该资料项

#### Scenario: 缺失必填资料项最小字段

- **WHEN** 后端在 `incompleteRequiredDocuments` 中返回缺失必填资料项
- **THEN** 每个缺失必填资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 建议资料继续展示但不影响齐套率

- **WHEN** 阶段包含 `is_required = false` 的建议资料项
- **THEN** 后端必须继续在阶段资料项列表中返回该资料项，但不得因该资料项状态影响 `completionPercent`

#### Scenario: 完成百分比计算规则

- **WHEN** 后端计算某阶段 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算，当 `requiredTotal = 0` 时必须返回 `100`，且第一版必须使用 0 到 100 的整数百分比

#### Scenario: 没有必填资料的阶段

- **WHEN** 某阶段 `requiredTotal = 0`
- **THEN** 后端必须返回 `completionPercent = 100`、`confirmedRequiredCount = 0`、`incompleteRequiredCount = 0` 和空的 `incompleteRequiredDocuments`

#### Scenario: 状态变更后摘要使用最新状态

- **WHEN** 资料项手工状态操作成功后前端重新查询阶段资料清单
- **THEN** 后端必须基于查询时的最新资料项状态返回阶段齐套摘要

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统计算或返回阶段资料齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交

## MODIFIED Requirements

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 按阶段分组返回资料项、状态追溯字段和阶段资料齐套摘要。

#### Scenario: 查询项目阶段资料清单

- **WHEN** 前端请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回

- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称、该阶段资料项列表和 `completenessSummary`

#### Scenario: 资料项字段返回

- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId`、基础状态、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt` 和 `returnReason`

#### Scenario: 阶段齐套摘要字段返回

- **WHEN** 后端返回阶段分组数据
- **THEN** 每个阶段的 `completenessSummary` 必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 阶段齐套摘要缺失列表字段返回

- **WHEN** 每个阶段的 `completenessSummary` 包含非空 `incompleteRequiredDocuments`
- **THEN** `incompleteRequiredDocuments` 中的每个资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 项目不存在

- **WHEN** 请求不存在的项目阶段资料清单
- **THEN** 后端必须返回项目不存在错误

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转和阶段资料齐套摘要不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态或计算阶段资料齐套摘要
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 不实现排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除本变更定义的只读阶段资料齐套摘要外，系统不得实现在线表单填写、表单生成归档文件、阶段推进、管理层看板、复杂权限、角色权限、轻角色校验、业务日志、责任人分配或个人待办

### Requirement: 手工状态流转边界

资料项手工状态流转 MUST 只更新数字化平台中的资料项状态和最小追溯字段，不能表示真实文件上传、在线表单提交或文件平台归档。

#### Scenario: 标记提交不创建文件或表单记录

- **WHEN** 用户手工标记资料项为已提交
- **THEN** 系统不得创建文件上传记录、在线表单记录、归档文件、文件平台文件映射或业务日志

#### Scenario: 状态操作不推进阶段或生成看板

- **WHEN** 用户手工变更资料项状态
- **THEN** 系统不得在状态操作接口中推进阶段、生成管理层看板指标或创建业务日志；阶段资料齐套摘要只能在阶段资料清单查询结果中基于当前手工状态只读返回

#### Scenario: 退回资料不创建个人待办

- **WHEN** 用户手工退回资料项
- **THEN** 系统不得在本能力中创建个人待办、发送通知或分配责任人
