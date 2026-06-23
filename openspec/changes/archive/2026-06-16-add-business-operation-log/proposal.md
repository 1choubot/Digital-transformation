## 为什么

当前平台已经具备项目创建、资料手工状态流转、资料适用性和阶段推进等关键业务动作，但现有字段只能追溯部分最后一次操作人/时间，缺少连续业务日志。需要建立第一版项目维度业务操作日志，为后续责任人、待办、文件归档、表单提交等能力提供统一审计基础。

## 变更内容

- 新增项目维度业务操作日志持久化模型，字段至少包括 `id`、`project_id`、`actor_user_id`、`action_type`、`target_type`、`target_id`、`summary`、`details_json` 和 `created_at`。
- 第一版只记录归属于项目的业务日志，不做全局审计日志、系统配置日志、登录日志或文件平台日志。
- 日志操作人使用当前登录用户作为 `actor_user_id`，字段第一版必须为 `NOT NULL`，不信任前端传入操作人；第一版只记录已登录用户触发的业务动作。
- 历史补初始化、模板初始化、系统脚本动作第一版不写业务日志；如果后续需要系统动作日志，应另起 change 设计系统用户或空操作人策略。
- `action_type` 第一版覆盖 `project.created`、`document.submitted`、`document.confirmed`、`document.returned`、`document.marked_not_applicable`、`document.restored_applicable`、`stage.advanced` 和 `project.completed`。
- `target_type` 第一版覆盖 `project`、`stage` 和 `stage_document`。
- `details_json` 保存结构化细节：资料状态变更记录资料、状态和退回原因；资料适用性变更记录适用性前后值和不适用原因；阶段推进记录阶段前后值和 `completenessSummary`；项目完成记录完成阶段。
- `summary` 保存可读中文摘要，供前端项目详情页直接展示，不引入复杂模板引擎。
- 后端新增 `GET /api/projects/:projectId/operation-logs` 查询接口，按 `created_at DESC, id DESC` 稳定倒序返回该项目最近日志，必须校验项目存在，第一版要求 `requireAuth`。
- 查询第一版固定最近 100 条，或支持受限 `limit` 且必须设置最大值；非法 `limit` 必须稳定校验，不允许一次性返回无限数据。
- 成功业务动作写入日志：项目创建、资料提交、资料确认、资料退回、资料标记不适用、资料恢复适用、阶段推进和第 8 阶段推进完成项目；失败操作不记录日志。
- 资料状态/适用性/阶段推进等已有事务操作中，日志写入必须与业务状态变更同事务提交；日志写入失败时业务变更回滚。项目创建日志也应纳入项目创建事务。
- 阶段推进实现时，`POST /api/projects/:projectId/stages/advance` 必须从 `req.auth.user.id` 传入 `userId`，`stage.advanced` 和 `project.completed` 日志都必须使用该用户作为 `actor_user_id`。
- 本变更不回填历史业务日志；已存在项目、已发生的资料状态变更、适用性变更和阶段推进不补写历史日志，只记录本能力实现后新发生的成功业务动作。
- 前端项目详情页新增只读“业务日志”区域，展示时间、操作人字段、`action_type` 或中文摘要、`summary`，并处理加载中、失败和空日志状态。
- README 更新说明业务日志范围、接口、记录动作、事务一致性和明确不做范围。
- 本变更不实现全局审计日志、系统配置日志、登录日志、文件平台日志、文件下载日志、管理层看板、日志筛选导出、复杂分页、日志权限矩阵、通知、个人待办、责任人分配、文件上传/下载、文件管理平台联动或在线表单。

## 能力范围

### 新增能力

- `business-operation-log`: 定义项目维度业务操作日志的数据模型、写入规则、事务一致性、查询接口和边界。

### 修改能力

- `project-core`: 项目创建、阶段推进和项目完成需要写入项目业务日志，并调整既有“不生成业务日志”边界为不生成完整推进日志或其他越界能力。
- `stage-document-checklist`: 资料手工状态流转和资料适用性操作成功后需要写入项目业务日志，并调整既有边界为允许最小业务日志但不创建文件/表单/待办等能力。
- `project-core-frontend`: 项目详情页新增只读业务日志区域，并调整既有详情页排除能力边界。

## 影响

- 后端影响 `digital-platform-api` 的数据库迁移、项目创建事务、资料状态/适用性事务、阶段推进事务、业务日志仓储、项目日志查询路由和错误处理。
- 前端影响 `digital-platform-web` 的项目 API 客户端、项目详情页和错误/空状态展示。
- 文档影响 `digital-platform-api/README.md`、`digital-platform-web/README.md` 和相关 OpenSpec 正式 specs。
- 不引入文件平台 API、登录审计、全局审计、权限矩阵、通知、待办、看板或导出依赖。
