## Why

当前项目详情页已经能展示阶段资料清单并手工流转资料项状态，但项目成员还不能直接看到每个阶段必填资料是否齐套、哪些必填资料仍缺失。需要在不引入文件上传、在线表单、阶段推进或管理看板的前提下，先提供一个基于当前手工状态的只读阶段资料齐套摘要。

## What Changes

- 在阶段资料清单查询结果中，为每个阶段增加只读齐套摘要。
- 齐套摘要只统计 `is_required = true` 的必填资料项。
- `confirmed` 视为已完成，`not_submitted`、`submitted`、`returned` 视为未完成。
- 建议资料项不计入齐套率，但仍继续展示在阶段资料清单中。
- 每个阶段摘要返回 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`。
- 项目详情页在每个阶段资料清单分组上展示齐套摘要和缺失必填资料项列表。
- 资料项手工状态操作成功并刷新清单后，齐套摘要也必须随最新状态刷新。
- 页面文案必须明确该齐套情况基于“当前手工状态”，不代表文件已上传或已归档。
- 本变更不实现阶段推进、管理层看板、文件上传/下载、文件管理平台联动、在线表单、业务日志、责任人分配、个人待办或复杂权限。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `stage-document-checklist`: 扩展阶段资料清单查询结果，增加每阶段必填资料齐套摘要和缺失必填资料列表。
- `project-core-frontend`: 扩展项目详情页阶段资料清单展示，增加基于当前手工状态的阶段齐套摘要、缺失必填资料列表和边界说明。

## Impact

- 后端影响 `digital-platform-api` 的项目阶段资料清单查询聚合逻辑和响应结构；不需要新增数据库表或迁移。
- 前端影响 `digital-platform-web` 的项目详情页阶段资料清单分组展示、状态操作成功后的刷新结果展示和边界文案。
- 现有资料项手工状态流转保持不变；本变更只基于已有状态读取并计算摘要。
- 不引入文件存储、文件平台 API、在线表单、阶段推进、业务日志或权限体系变更。
