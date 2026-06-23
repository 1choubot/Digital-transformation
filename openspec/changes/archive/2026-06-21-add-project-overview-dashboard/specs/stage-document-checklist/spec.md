## ADDED Requirements

### Requirement: 项目总览当前阶段齐套摘要

系统 MUST 允许项目总览看板按既有阶段资料清单齐套口径，查询并返回每个项目当前阶段的适用必填资料齐套摘要。

#### Scenario: 项目总览只统计当前阶段

- **WHEN** 系统为项目总览看板计算某项目齐套摘要
- **THEN** 系统必须只计算该项目当前阶段的资料项，不得因其他阶段资料缺失或完成而影响当前阶段摘要

#### Scenario: 项目总览齐套摘要字段

- **WHEN** 项目当前阶段存在资料项记录
- **THEN** 项目总览中的 `currentStageCompletenessSummary` 必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 和 `completionPercent`

#### Scenario: 项目总览只统计适用必填资料

- **WHEN** 系统为项目总览计算当前阶段齐套摘要
- **THEN** `requiredTotal` 必须只统计 `is_required = true` 且 `is_applicable = 1` 的资料项，建议资料项和不适用资料项不得计入齐套摘要计数或百分比

#### Scenario: 项目总览已确认资料计为完成

- **WHEN** 当前阶段适用必填资料项状态为 `confirmed`
- **THEN** 项目总览必须将该资料项计入 `confirmedRequiredCount`

#### Scenario: 项目总览未确认资料计为未完成

- **WHEN** 当前阶段适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 项目总览必须将该资料项计入 `incompleteRequiredCount`，并在 `currentStageIncompleteRequiredDocuments` 中返回该资料项

#### Scenario: 项目总览不适用资料不进入缺失列表

- **WHEN** 当前阶段必填资料项已标记为不适用
- **THEN** 项目总览不得将该资料项计入 `requiredTotal`、`confirmedRequiredCount` 或 `incompleteRequiredCount`，也不得将其返回到 `currentStageIncompleteRequiredDocuments`

#### Scenario: 项目总览缺失资料最小字段

- **WHEN** 项目总览在 `currentStageIncompleteRequiredDocuments` 中返回缺失资料项
- **THEN** 每个缺失资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 项目总览 requiredTotal 为零

- **WHEN** 当前阶段存在资料项记录，但适用必填资料数为 0
- **THEN** 项目总览必须返回 `completionPercent = 100`、`confirmedRequiredCount = 0`、`incompleteRequiredCount = 0` 和空的 `currentStageIncompleteRequiredDocuments`

#### Scenario: 项目总览当前阶段资料清单未初始化

- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 项目总览必须返回 `currentStageCompletenessSummary = null`、空的 `currentStageIncompleteRequiredDocuments` 和 `currentStageIssue = checklist_not_initialized`，不得自动初始化资料清单

#### Scenario: 项目总览齐套摘要不代表文件归档

- **WHEN** 系统计算或返回项目总览齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态和人工适用性判断，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交
