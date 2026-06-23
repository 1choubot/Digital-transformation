## Context

当前平台已经完成项目基础、标准 8 阶段、阶段资料清单、资料状态流转、适用性、阶段齐套摘要、阶段推进、业务日志、用户管理、资料责任人分配和我的资料任务。项目进展信息分散在项目列表、项目详情、阶段资料清单和我的资料任务页面中，缺少跨项目的只读总览入口。

“项目总览看板”第一版只聚合现有数据并提供筛选展示，不创建看板实体表，不写业务日志，不改变项目、阶段或资料状态。它面向管理者和项目负责人，但第一版不做复杂权限；所有已登录用户可查看所有项目总览数据。

## Goals / Non-Goals

**Goals:**

- 提供 `GET /api/projects/overview-dashboard` 查询接口。
- 返回跨项目汇总指标和项目总览卡片/列表数据。
- 基于当前登录用户返回 `myPendingStageDocumentTasks` 指标。
- 复用当前阶段适用必填资料齐套口径，展示当前阶段齐套摘要和未完成适用必填资料。
- 对已完成项目、当前阶段缺失、当前阶段资料清单未初始化等情况返回稳定结构和可读 issue 字段。
- 支持 `status`、`currentStageOrder`、`keyword` 基础筛选。
- 前端新增项目总览页面和主导航入口，展示指标、项目卡片/列表、筛选和项目详情跳转。
- README 说明接口、筛选规则、页面能力和边界。

**Non-Goals:**

- 不实现文件上传/下载、文件管理平台联动或在线表单。
- 不实现消息提醒、超期提醒、截止日期、大屏图表、跨部门权限、项目成员权限、复杂权限、项目经理权限或轻角色校验。
- 不实现分页、导出、批量操作或跨项目统计钻取。
- 不新增业务日志；本变更只查询和展示。
- 不修改阶段推进规则，不自动初始化历史项目资料清单，不修复异常项目阶段数据。
- 不新增看板持久化表，不复制阶段资料项数据。

## Decisions

### 使用 `/api/projects/overview-dashboard` 作为项目域只读入口

第一版接口固定为 `GET /api/projects/overview-dashboard`。看板数据以项目为核心聚合，放在项目 API 命名空间下能复用现有项目基础、阶段和资料齐套查询口径。

该路径是 `/api/projects` 下的静态路由，后端实现时必须注册在 `/:projectId` 动态项目详情路由之前，避免 `overview-dashboard` 被动态路由当作 `projectId` 匹配并返回项目 ID 校验错误。

替代方案是在 `/api/dashboard/projects` 下建立独立看板域，但第一版没有独立看板实体或跨系统指标，单独 capability 会放大范围。

### 只做 requireAuth，不做平台管理员或复杂权限

接口必须要求登录态，但不要求 `isPlatformAdmin`。`isPlatformAdmin` 仍只保护用户管理，不扩展为项目、资料或看板权限。第一版返回所有项目总览数据，不引入项目成员、项目经理、部门或角色权限。

这样与现有项目列表、项目详情和阶段资料业务权限边界保持一致。后续如需要项目可见范围、项目成员权限或管理者角色，应单独设计 change。

### 汇总指标在同一个查询响应中返回

响应顶层包含 `summary` 和 `projects`。`summary` 包含：

- `totalProjects`: 当前筛选结果或全量口径下的项目总数，第一版采用与项目列表同一筛选条件后的结果口径。
- `activeProjects`: `status != completed` 的项目数量。
- `completedProjects`: `status = completed` 的项目数量。
- `riskProjects`: `status = risk` 或 `status = delayed` 的项目数量。当前项目状态枚举包含 `delayed`，因此第一版同时统计风险和延期。
- `myPendingStageDocumentTasks`: 当前登录用户的 pending 资料任务数量，口径复用我的资料任务默认待办：`responsible_user_id = 当前用户 id`、`is_applicable = 1`、`status in not_submitted/submitted/returned`。该指标不受项目总览筛选影响，表示当前用户全局待办资料数量。

选择在同一接口返回 summary 和 projects，是为了减少前端首屏请求数量并保证筛选结果与项目列表一致。`myPendingStageDocumentTasks` 保持全局口径，避免用户因看板筛选误解自己的全部待办数量。

### 当前阶段和异常数据以 issue 字段表达

如果项目 `status = completed`，`currentStageId`、`currentStageName`、`currentStageOrder`、`currentStageStatus`、`currentStageCompletenessSummary` 和 `currentStageIncompleteRequiredDocuments` 可以为空或空数组，`currentStageIssue` 为空。

如果项目未完成但没有唯一当前阶段，接口不得崩溃。第一版返回当前阶段字段为空，并设置 `currentStageIssue = missing_current_stage` 或 `multiple_current_stages`。本 change 不修复异常数据。

如果当前阶段存在但该阶段没有任何 `project_stage_documents` 记录，返回 `currentStageCompletenessSummary = null`、`currentStageIncompleteRequiredDocuments = []`，并设置 `currentStageIssue = checklist_not_initialized`。本 change 不自动初始化历史项目资料清单。

### 齐套摘要复用阶段资料清单口径

项目总览只计算当前阶段齐套摘要。摘要口径与阶段资料清单一致：

- 只统计 `is_required = true` 且 `is_applicable = 1` 的资料项。
- `confirmed` 计为已完成。
- `not_submitted`、`submitted`、`returned` 计为未完成。
- 不适用资料和建议资料不计入 `requiredTotal`，不进入缺失列表。
- `requiredTotal = 0` 时 `completionPercent = 100`。

看板不把齐套率解释为文件已上传、文件已归档或在线表单已填写。

### 筛选和排序固定在后端

`status` 可选，必须是现有项目状态枚举之一：`normal`、`risk`、`paused`、`delayed`、`completed`。非法值、空字符串或多值必须返回 `INVALID_PROJECT_STATUS_FILTER`，建议 HTTP 400。

`currentStageOrder` 可选，必须是 1 到 8 的正整数。非数字、空字符串、0、负数、小数、超过 8 或混合格式必须返回 `INVALID_STAGE_ORDER`，建议 HTTP 400。已完成项目当前阶段为空，因此在提供 `currentStageOrder` 时不会匹配已完成项目。

`keyword` 可选，trim 后为空时等同未提供；非空时按 `projectCode`、`projectName`、`customerName` 模糊筛选。第一版不对 keyword 单独返回错误。

第一版不做分页。后端按 `project_code ASC, id ASC` 稳定排序。选择项目编号排序，是为了让看板展示和截图稳定；如后续需要按风险、齐套率或更新时间排序，应单独扩展。

### 前端使用总览页面，不改造项目列表页

前端新增“项目总览”页面和主导航入口，保留现有项目列表页语义。页面顶部展示 summary 指标，项目区域展示当前阶段、齐套率、未完成适用必填资料数量和缺失列表。点击项目进入项目详情页，点击“我的待办资料”指标进入我的资料任务页。

选择独立页面，是为了避免把项目列表页改成看板，并保持项目列表的台账属性。

## Risks / Trade-offs

- [Risk] 所有登录用户可查看所有项目总览数据，后续可能需要项目可见范围。→ 第一版明确不做复杂权限；如需要权限矩阵单独设计。
- [Risk] 不分页在项目数量很大时性能和页面渲染压力较高。→ 第一版面向最小闭环；查询需使用有限字段和稳定排序，后续可增加分页。
- [Risk] `myPendingStageDocumentTasks` 不受看板筛选影响可能与当前列表数量不同。→ 页面文案说明该指标是当前登录用户全局待办资料数量。
- [Risk] 异常阶段或未初始化资料清单会降低看板完整性。→ 使用 `currentStageIssue` 展示问题，不在本 change 自动修复数据。
- [Risk] 用户可能误解齐套率为真实文件或表单完成度。→ 页面和 README 必须明确齐套率基于手工状态和适用性，不代表文件已上传或在线表单已填写。

## Migration Plan

本变更不需要数据库迁移。部署顺序建议为先发布后端查询接口，再发布前端项目总览页面入口。回滚时可先隐藏前端入口，再回滚后端接口；不会影响既有项目列表、项目详情、阶段资料清单、资料状态流转、责任人分配、我的资料任务、阶段推进或业务日志。

## Open Questions

无。第一版固定为只读跨项目总览，不设计权限矩阵、分页、大屏图表、通知、文件联动或在线表单。
