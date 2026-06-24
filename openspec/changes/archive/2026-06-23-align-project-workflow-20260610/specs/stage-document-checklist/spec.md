## MODIFIED Requirements

### Requirement: 阶段资料项模板

系统 MUST 维护 20260610 版阶段资料项模板，模板 MUST 以 `智能制造项目管理流程图20260610.pdf`、`docs/9.7_智能制造项目整体推进流程_20260610.md` 和 `docs/9.2_阶段资料清单与责任角色表_20260610.md` 为来源。

#### Scenario: 模板字段完整

- **WHEN** 系统保存阶段资料项模板
- **THEN** 每个模板项必须包含阶段标识、阶段名称、资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、文件管理平台目标文件夹路径 `targetFolderPath` 和可空 `targetFolderId`

#### Scenario: 使用标准 8 阶段

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 模板项必须归属到 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 之一

#### Scenario: 提交方式枚举

- **WHEN** 系统保存资料项提交方式
- **THEN** 提交方式必须使用在线表单、文件上传、混合或暂未确定之一

#### Scenario: 不凭空补资料项

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统不得添加 `docs/9.2_阶段资料清单与责任角色表_20260610.md` 之外的资料项

#### Scenario: 无法可靠解析资料文档

- **WHEN** 实现时无法可靠解析 `docs/9.2_阶段资料清单与责任角色表_20260610.md`
- **THEN** 必须暂停实现并说明原因，不得自行编造资料项

#### Scenario: 模板版本为 v20260610

- **WHEN** 系统保存 20260610 版阶段资料项模板
- **THEN** 模板版本必须使用 `v20260610`，不得继续使用旧版 `v1` 作为程序运行模板版本

#### Scenario: 旧 48 项模板废弃

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 系统必须废弃旧版 48 项资料模板，不得继续以旧 48 项作为程序运行依据，也不得同时运行旧模板和 `v20260610` 模板

#### Scenario: 新版资料项数量校验

- **WHEN** 系统初始化或校验 20260610 版阶段资料项模板
- **THEN** `EXPECTED_STAGE_DOCUMENT_ITEM_COUNT` 必须按新版资料项实际数量设置；当前正式文档为 54 项

#### Scenario: 20260610 版目标目录字段

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统必须从正式资料清单的 `文件平台目标目录` 字段读取并保存 `targetFolderPath`

#### Scenario: 20260610 版目录 ID 为空

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统必须保持 `targetFolderId` 为空

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 根据 20260610 版阶段资料项模板初始化项目资料项。

#### Scenario: 新项目初始化资料清单

- **WHEN** 项目创建成功
- **THEN** 系统必须按 `v20260610` 阶段资料项模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`

#### Scenario: 初始化资料项适用性

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项必须初始化为适用，并且不适用原因和不适用追溯字段必须为空

#### Scenario: 保存模板快照字段

- **WHEN** 系统生成项目级资料项
- **THEN** 项目级资料项必须保存 20260610 版资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath` 和可空 `targetFolderId` 等模板快照字段

#### Scenario: 20260610 版项目资料项目录 ID 为空

- **WHEN** 系统生成 20260610 版项目级资料项
- **THEN** 项目级资料项必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

#### Scenario: 预留后续能力字段

- **WHEN** 系统保存项目级资料项
- **THEN** 系统必须预留可支持后续文件上传、在线表单、资料齐套率和阶段推进的关联字段或扩展字段

#### Scenario: 不兼容旧模拟项目资料

- **WHEN** 系统切换为 20260610 版阶段资料模板
- **THEN** 系统不得要求兼容旧模拟项目的旧资料项，也不得为旧资料项提供新旧模板映射或共存初始化逻辑

### Requirement: 阶段资料齐套摘要

系统 MUST 为每个阶段分组返回适用必填资料齐套摘要，并 MUST 只基于 20260610 版项目级阶段资料项、当前手工状态和人工适用性判断计算。

#### Scenario: 返回阶段齐套摘要字段

- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个阶段分组必须返回 `completenessSummary`，包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用且必填资料项

- **WHEN** 系统计算阶段齐套摘要
- **THEN** 系统必须只统计 `isRequired = true` 且 `isApplicable = true` 的 20260610 版资料项

#### Scenario: 已确认适用必填资料计为完成

- **WHEN** 适用必填资料项状态为 `confirmed`
- **THEN** 系统必须将其计入 `confirmedRequiredCount`

#### Scenario: 非确认适用必填资料计为未完成

- **WHEN** 适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 系统必须将其计入 `incompleteRequiredCount`，并加入缺失必填资料列表

#### Scenario: 不适用资料项不进入缺失列表

- **WHEN** 必填资料项被标记为不适用
- **THEN** 系统不得将该资料项计入 `requiredTotal` 或 `incompleteRequiredDocuments`

#### Scenario: 缺失必填资料项最小字段

- **WHEN** `incompleteRequiredDocuments` 返回资料项
- **THEN** 每项至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 非必需资料继续展示但不影响齐套率

- **WHEN** 20260610 版资料项为非必需或建议资料
- **THEN** 系统必须继续在资料清单中展示该资料项，但不得将其计入 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 或阶段推进门禁

#### Scenario: 完成百分比计算规则

- **WHEN** 系统计算 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算，并返回 0 到 100 的整数

#### Scenario: 没有适用必填资料的阶段

- **WHEN** 阶段 `requiredTotal = 0`
- **THEN** 系统必须返回 `completionPercent = 100`

#### Scenario: 适用性变更后摘要使用最新状态

- **WHEN** 资料项被标记不适用或恢复适用后用户重新查询阶段资料清单
- **THEN** 系统必须基于最新 `isApplicable` 状态重新计算 `completenessSummary`

#### Scenario: 阶段推进读取当前阶段摘要口径

- **WHEN** 系统执行阶段推进齐套门禁
- **THEN** 系统必须使用同一 20260610 版资料项齐套摘要口径判断当前阶段是否可推进

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统返回阶段齐套摘要
- **THEN** 系统不得把该摘要表示为文件已上传、文件已归档或在线表单已提交

## ADDED Requirements

### Requirement: 20260610 资料能力行为保持
系统 MUST 在替换为 20260610 版资料项模板后保持资料状态、适用性、责任人、附件、我的资料任务和项目总览的既有行为，只改变资料项模板数据。

#### Scenario: 资料状态机保持
- **WHEN** 已登录用户对 20260610 版资料项执行提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 状态机和既有错误口径

#### Scenario: 适用性规则保持
- **WHEN** 已登录用户对 20260610 版资料项标记不适用或恢复适用
- **THEN** 系统必须继续保持既有适用性规则、原因校验和状态不自动改变口径

#### Scenario: 责任人分配规则保持
- **WHEN** 已登录用户为 20260610 版资料项分配或清空责任人
- **THEN** 系统必须继续保持既有候选用户、责任人安全字段、责任人追溯和责任人不代表权限的口径

#### Scenario: 附件能力保持
- **WHEN** 已登录用户对 20260610 版资料项上传、查询、下载或删除附件
- **THEN** 系统必须继续保持既有附件接口路径、文件参数校验、软删除、业务日志和不改变资料业务状态的口径

#### Scenario: 我的资料任务使用新版资料项
- **WHEN** 当前登录用户查询我的资料任务
- **THEN** 系统必须按 20260610 版项目级资料项返回任务，并保持现有状态筛选、项目筛选、排序和只读边界

#### Scenario: 项目总览使用新版资料项
- **WHEN** 当前登录用户查询项目总览看板
- **THEN** 系统必须按 20260610 版当前阶段资料项计算齐套摘要和未完成适用必填资料，并保持现有筛选、排序和只读边界

## REMOVED Requirements

### Requirement: 历史项目补初始化
**Reason**: 当前项目仍是开发阶段模拟数据，切换 20260610 版资料模板时旧 48 项模板直接废弃，不再支持旧项目或旧资料项补初始化。

**Migration**: 不提供历史项目迁移或补初始化；旧模拟项目数据不兼容新版资料模板。
