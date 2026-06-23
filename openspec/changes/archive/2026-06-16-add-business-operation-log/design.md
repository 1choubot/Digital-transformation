## 背景

当前数字化管理平台已经具备基础登录、项目创建、项目详情、8 阶段初始化、阶段资料清单、资料手工状态流转、资料适用性、阶段齐套摘要和阶段手工推进。现有追溯字段主要保存“最后一次提交/确认/退回/不适用/恢复适用”的人和时间，不能形成连续业务时间线。

本变更建立第一版项目维度业务操作日志，覆盖项目创建、资料状态变化、资料适用性变化、阶段推进和项目完成。它只解决业务状态变化的项目内追溯，不承担登录审计、系统配置审计、文件平台日志或全局审计职责。

## 目标 / 非目标

**目标：**

- 新增项目维度业务操作日志持久化模型。
- 为已登录用户触发的关键业务动作记录 `actor_user_id`、`action_type`、`target_type`、`target_id`、`summary`、`details_json` 和 `created_at`。
- 覆盖 `project.created`、`document.submitted`、`document.confirmed`、`document.returned`、`document.marked_not_applicable`、`document.restored_applicable`、`stage.advanced` 和 `project.completed`。
- 对资料状态/适用性/阶段推进等已有事务操作，日志写入与业务状态变更同事务提交。
- 项目创建日志纳入项目创建事务；如果日志写入失败，项目创建整体回滚。
- 提供 `GET /api/projects/:projectId/operation-logs` 查询项目业务日志，第一版要求 `requireAuth`。
- 项目详情页新增只读“业务日志”区域，展示时间、操作人字段、`action_type` 或中文摘要、`summary`。
- 更新 API/Web README，说明日志范围、接口、写入动作和边界。

**非目标：**

- 不实现全局审计日志、系统配置日志、登录日志、文件平台日志或文件下载日志。
- 不实现管理层看板、日志筛选导出或复杂分页。
- 不实现日志权限矩阵、复杂权限、角色权限或轻角色校验；第一版日志查询只做 `requireAuth`。
- 不实现通知、个人待办、责任人分配。
- 不实现文件上传/下载、文件管理平台联动或在线表单。
- 不修改、完成或归档 `define-digital-platform-v1`。

## 设计决策

### 决策一：新增独立项目业务日志表

建议新增 `business_operation_logs` 表，字段为：

- `id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT`
- `project_id BIGINT UNSIGNED NOT NULL`
- `actor_user_id BIGINT UNSIGNED NOT NULL`
- `action_type VARCHAR(64) NOT NULL`
- `target_type VARCHAR(64) NOT NULL`
- `target_id BIGINT UNSIGNED NULL`
- `summary VARCHAR(500) NOT NULL`
- `details_json JSON NULL`
- `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

建议建立索引：

- `(project_id, created_at, id)` 用于项目日志按 `created_at DESC, id DESC` 稳定倒序查询。
- 可选 `(actor_user_id)` 用于后续按操作人扩展。

备选方案是把日志嵌入项目、阶段或资料项表。第一版不采用该方案，因为日志是连续事件流，独立表更适合按项目时间线查询，也避免污染业务主表。

### 决策二：日志只归属于项目

第一版所有日志必须有 `project_id`。即便目标是资料项或阶段，也必须归属于其项目。这样可以满足项目详情页时间线和后续项目内审计需求。

本变更不记录全局审计日志、系统配置日志或登录日志。登录/退出仍由基础认证能力负责，不在业务日志表中记录。

### 决策三：操作人来自登录态

日志写入点均使用当前登录用户作为 `actor_user_id`，不得信任前端提交的操作人字段。第一版只记录已登录用户触发的业务动作，因此 `actor_user_id` 必须为 `NOT NULL`：

- 项目创建已有 `requireAuth`，可记录 `project.created`。
- 资料状态/适用性操作已有 `requireAuth`，可记录资料相关日志。
- 阶段推进已有 `requireAuth`，后续实现时 `POST /api/projects/:projectId/stages/advance` 必须从 `req.auth.user.id` 传入 `userId`，并用该 `userId` 写入 `stage.advanced` 和必要时 `project.completed`。

历史补初始化、模板初始化等系统脚本场景第一版不写业务日志，也不得通过空 `actor_user_id` 伪造系统动作。如果后续需要记录系统动作，应另起变更设计系统用户或空操作人策略。

### 决策四：事务内同步写日志

已有业务动作大多在事务中修改状态。日志写入必须与业务状态变更同事务提交：

- 项目创建：保存项目、初始化阶段、初始化资料清单和写入 `project.created` 在同一事务中完成。
- 资料状态流转：状态更新、追溯字段更新和日志写入在同一事务中完成。
- 资料适用性：适用性更新、追溯字段更新和日志写入在同一事务中完成。
- 阶段推进：阶段状态更新、项目完成状态更新和日志写入在同一事务中完成。

如果日志写入失败，业务变更必须回滚。这样保证“状态变了但没有日志”的情况不会发生。失败操作不得写日志。

### 决策五：`details_json` 保存结构化上下文

`summary` 只保存可读中文摘要，`details_json` 保存后续扩展所需结构化数据：

- 资料状态变更：`documentId`、`documentCode`、`documentName`、`fromStatus`、`toStatus`，退回时包含 `returnReason`。
- 资料适用性变更：`documentId`、`documentCode`、`documentName`、`fromIsApplicable`、`toIsApplicable`，标记不适用时包含 `notApplicableReason`。
- 阶段推进：`fromStageKey`、`fromStageName`、`toStageKey`、`toStageName`、`completenessSummary`。
- 项目完成：`completedStageKey`、`completedStageName`。

第一版不引入复杂模板引擎。摘要由各写入点按固定中文句式生成。

### 决策六：日志查询接口要求登录

新增接口：

- `GET /api/projects/:projectId/operation-logs`

接口必须先校验登录态，再校验项目存在。返回该项目日志，按 `created_at DESC, id DESC` 稳定倒序。第一版可固定最近 100 条，也可支持简单 `limit` 参数；如果支持 `limit`，必须限制最大值，非法 `limit` 必须返回稳定校验错误或回退到明确默认值，避免一次性返回无限数据。

当前项目详情和资料清单查询存在未强制登录的历史行为，但业务日志包含更完整的操作轨迹，第一版查询必须 `requireAuth`。不做项目级角色权限或日志权限矩阵。

### 决策七：前端只做只读展示

项目详情页新增“业务日志”区域，调用 `GET /api/projects/:projectId/operation-logs`。展示字段：

- 操作时间 `createdAt`
- 操作人字段 `actorUserId` 或后端返回的操作人基础信息
- `actionType` 或中文摘要
- `summary`

页面必须处理加载中、失败和空日志状态。第一版不做筛选、导出、复杂分页、权限配置或看板。

## 风险 / 取舍

- [日志写入失败导致业务动作失败] -> 第一版选择强一致性，日志失败时回滚业务状态，避免关键状态缺少审计记录。
- [日志表增长] -> 第一版项目详情查询限制最近 100 条或限制 `limit` 最大值；归档/清理策略后续独立设计。
- [摘要字段后续需要多语言或模板] -> 第一版使用固定中文摘要，后续如需要再引入模板机制。
- [只做 `requireAuth` 可能让任意登录用户查看项目日志] -> 与当前第一版权限边界一致，日志权限矩阵后续独立变更。
- [系统脚本动作无日志] -> 第一版只记录已登录用户触发业务动作，避免引入系统用户策略。

## 迁移计划

1. 新增数据库迁移创建 `business_operation_logs` 表和索引。
2. 新增业务日志仓储或服务，提供事务内写入和项目日志查询。
3. 在项目创建、资料状态流转、资料适用性和阶段推进事务中写入日志。
4. 新增项目业务日志查询路由，并接入 `requireAuth`。
5. 更新前端项目详情页只读日志区域。
6. 更新 README 和验证用例。
7. 本变更不回填历史业务日志；已存在项目、已发生的资料状态变更、适用性变更和阶段推进不补写历史日志，只记录本能力实现后新发生的成功业务动作。
8. 如需回滚，应先移除写入点和前端查询入口，再保留或清理日志表；已有业务主表状态不依赖日志表回滚。

## 待确认问题

当前第一版没有待确认问题。日志查询采用 `requireAuth`；系统脚本和历史补初始化不写业务日志；`actor_user_id` 第一版必须为 `NOT NULL`。
