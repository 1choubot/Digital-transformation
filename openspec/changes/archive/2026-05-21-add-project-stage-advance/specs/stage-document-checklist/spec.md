## MODIFIED Requirements

### Requirement: 阶段资料齐套摘要

系统 MUST 在项目阶段资料清单查询结果中返回每个阶段的只读必填资料齐套摘要，并 MUST 基于项目级资料项的当前手工状态和适用性计算；项目阶段推进能力可以读取当前阶段摘要或使用等价口径作为推进门禁输入。

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

#### Scenario: 阶段推进读取当前阶段摘要口径

- **WHEN** 项目阶段推进能力检查当前阶段齐套门禁
- **THEN** 系统必须使用本需求定义的适用必填资料齐套口径，并且缺失资料列表最小字段必须与 `incompleteRequiredDocuments` 一致

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统计算或返回阶段资料齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态和人工适用性判断，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转、资料项适用性、阶段资料齐套摘要和项目阶段推进门禁不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态、手工变更资料项适用性、计算阶段资料齐套摘要或检查阶段推进齐套门禁
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 资料清单能力本身不推进阶段

- **WHEN** 用户查看或系统处理阶段资料清单、资料项手工状态操作或资料项适用性操作
- **THEN** 阶段资料清单能力本身不得执行阶段推进；阶段推进只能由项目核心阶段推进接口按其规格执行，并可读取当前阶段齐套摘要作为门禁输入

#### Scenario: 不实现其他排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除本变更允许项目核心阶段推进接口读取当前阶段齐套摘要作为门禁输入、既有手工资料项适用性和既有只读阶段资料齐套摘要外，系统不得实现在线表单填写、表单生成归档文件、管理层看板、复杂权限、角色权限、轻角色校验、业务日志、责任人分配或个人待办
