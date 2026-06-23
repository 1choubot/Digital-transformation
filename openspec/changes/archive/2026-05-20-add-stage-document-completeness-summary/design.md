## 背景

当前平台已有项目级阶段资料清单、资料项状态枚举和资料项手工状态流转。项目详情页可以查看资料项并手工标记 `submitted`、`confirmed`、`returned` 等状态，但用户仍需要逐项判断每个阶段的必填资料是否齐套。

本变更增加的是项目详情页内的只读阶段资料齐套摘要。该摘要只基于 `project_stage_documents` 中的当前手工状态计算，不读取文件管理平台，不判断真实文件是否上传或归档，也不推进项目阶段。

## 目标 / 非目标

**目标：**

- 在阶段资料清单查询结果中为每个阶段返回必填资料齐套摘要。
- 统一使用当前手工状态作为统计来源。
- 明确 `confirmed` 为已完成，其余状态均为未完成。
- 在项目详情页每个阶段分组上展示齐套摘要和缺失必填资料项。
- 资料项状态操作成功后，前端刷新清单时同步刷新齐套摘要。
- 页面文案明确说明齐套情况基于“当前手工状态”，不代表文件已上传或已归档。

**非目标：**

- 不实现阶段推进或阶段门禁。
- 不实现管理层看板、跨项目统计或项目列表页齐套指标。
- 不实现文件上传、文件下载或文件管理平台联动。
- 不实现在线表单填写、表单草稿或表单生成归档文件。
- 不实现业务日志、责任人分配、个人待办或通知。
- 不实现复杂权限、角色权限或轻角色校验。

## 设计决策

### 决策一：在阶段资料清单查询中返回每阶段 `completenessSummary`

后端在 `GET /api/projects/:projectId/stage-document-checklist` 的阶段分组结果中，为每个阶段增加 `completenessSummary` 对象。建议结构为：

- `requiredTotal`
- `confirmedRequiredCount`
- `incompleteRequiredCount`
- `completionPercent`
- `incompleteRequiredDocuments`

`incompleteRequiredDocuments` 只需要返回缺失必填资料项的最小展示信息，例如资料项 ID、资料项编号、资料项名称和当前状态。完整资料项仍由阶段资料清单原有 `documents` 列表返回。

备选方案是新增独立统计接口。第一版选择放在现有查询结果中，是因为页面已经以阶段分组加载资料清单，摘要和清单需要同时刷新，新增独立接口会增加前后端一致性处理成本。

### 决策二：只统计必填资料项，建议资料项不计入比例

齐套摘要只统计 `is_required = true` 的资料项。建议资料项仍继续展示在清单中，但不影响 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 或 `completionPercent`。

这样可以把“阶段必填资料是否齐套”与“建议资料是否补充”分开，避免建议资料拉低必填齐套率。

### 决策三：只把 `confirmed` 视为完成

统计口径为：

- `confirmed` 计为已完成。
- `not_submitted`、`submitted`、`returned` 均计为未完成。

`submitted` 只是手工标记已提交，尚未确认；`returned` 明确表示资料被退回；`not_submitted` 表示仍未提交。因此第一版只用 `confirmed` 作为必填资料完成状态。

### 决策四：`requiredTotal = 0` 时 `completionPercent = 100`

`completionPercent` 按以下规则计算：

- 当 `requiredTotal > 0` 时，`completionPercent = round(confirmedRequiredCount / requiredTotal * 100)`。
- 当 `requiredTotal = 0` 时，`completionPercent = 100`，`confirmedRequiredCount = 0`，`incompleteRequiredCount = 0`，`incompleteRequiredDocuments = []`。

原因是没有必填资料的阶段不存在缺失必填资料，展示为 100% 比展示为 0% 更符合“必填项已无缺失”的业务含义。第一版使用 0 到 100 的整数百分比；如后续需要保留小数，可在单独变更中调整展示口径。

### 决策五：摘要基于查询时的当前状态即时计算

第一版不新增统计表，也不把齐套摘要持久化。后端查询阶段资料清单时，基于 `project_stage_documents` 当前状态即时计算每个阶段的摘要。

资料项手工状态操作接口不需要额外维护统计字段。前端状态操作成功后沿用现有刷新阶段资料清单的流程，刷新后的响应自然包含最新齐套摘要。

## 风险 / 取舍

- [用户误解为真实文件齐套] -> 页面文案必须说明统计基于当前手工状态，不代表文件已上传或归档。
- [只读摘要被误用为阶段推进依据] -> 本变更明确不实现阶段推进、阶段门禁或管理看板。
- [建议资料不计入比例可能被误解] -> 展示文案应强调统计口径为“必填资料”。
- [实时计算随资料项数量增长带来查询开销] -> 第一版只在单项目详情页查询时计算，范围可控；跨项目统计留到后续看板能力。
- [旧前端或客户端不识别新增字段] -> 新字段作为阶段分组的附加对象返回，不改变现有资料项字段含义。

## 迁移计划

本变更不需要数据库迁移。实现时复用已有 `project_stage_documents` 表、`is_required` 字段和资料项状态字段。

如果后续需要跨项目看板或缓存统计结果，应另起变更评估是否新增汇总表、定时任务或事件驱动更新机制。

## 待确认问题

当前第一版没有待确认问题。`requiredTotal = 0` 的阶段按 100% 展示，缺失必填资料列表为空。
