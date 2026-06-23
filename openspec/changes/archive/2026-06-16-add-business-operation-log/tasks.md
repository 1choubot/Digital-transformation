## 1. 数据模型与迁移

- [x] 1.1 新增 `business_operation_logs` 数据库迁移，包含 `id`、`project_id`、`actor_user_id`、`action_type`、`target_type`、`target_id`、`summary`、`details_json`、`created_at`，其中 `actor_user_id` 第一版必须为 `NOT NULL`
- [x] 1.2 为项目日志倒序查询建立必要索引，至少支持按 `project_id`、`created_at` 和 `id` 进行 `created_at DESC, id DESC` 稳定排序
- [x] 1.3 确认日志模型只归属于项目，不引入全局审计日志、系统配置日志或登录日志
- [x] 1.4 确认本变更不回填历史业务日志，只记录实现后新发生的成功业务动作

## 2. 后端日志基础能力

- [x] 2.1 新增业务操作日志仓储或服务，支持在现有事务中写入日志
- [x] 2.2 写入日志时从当前登录态读取 `actor_user_id`，不得信任前端传入操作人，且不得写入空 `actor_user_id`
- [x] 2.3 统一生成第一版中文 `summary`，不引入复杂模板引擎
- [x] 2.4 统一写入 `details_json`，保留结构化字段供后续扩展
- [x] 2.5 确保日志写入失败时调用方事务回滚，避免业务状态已变更但日志缺失

## 3. 后端写入点

- [x] 3.1 项目创建成功后，在同一事务中记录 `project.created`
- [x] 3.2 资料标记提交成功后，在同一事务中记录 `document.submitted`
- [x] 3.3 资料确认成功后，在同一事务中记录 `document.confirmed`
- [x] 3.4 资料退回成功后，在同一事务中记录 `document.returned`，并在 `details_json` 中记录 `returnReason`
- [x] 3.5 资料标记不适用成功后，在同一事务中记录 `document.marked_not_applicable`，并在 `details_json` 中记录 `notApplicableReason`
- [x] 3.6 资料恢复适用成功后，在同一事务中记录 `document.restored_applicable`
- [x] 3.7 阶段推进成功后，确保 `POST /api/projects/:projectId/stages/advance` 从 `req.auth.user.id` 传入 `userId`，在同一事务中记录 `stage.advanced`，并在 `details_json` 中记录阶段前后值和 `completenessSummary`
- [x] 3.8 第 8 阶段推进完成项目时，在同一事务中额外记录 `project.completed`，并使用同一个 `userId` 作为 `actor_user_id`
- [x] 3.9 确认失败的项目创建、资料操作、适用性操作和阶段推进不写入业务日志

## 4. 后端查询接口

- [x] 4.1 新增 `GET /api/projects/:projectId/operation-logs`
- [x] 4.2 查询接口接入 `requireAuth`
- [x] 4.3 查询前校验项目存在，项目不存在时返回稳定错误
- [x] 4.4 按 `created_at DESC, id DESC` 稳定倒序返回该项目业务日志
- [x] 4.5 限制第一版返回数量，固定最近 100 条或支持受限 `limit`，且 `limit` 必须有最大值
- [x] 4.6 对非法 `limit` 做稳定校验，不允许一次性返回无限数据
- [x] 4.7 查询接口只做 `requireAuth` 和项目存在校验，不实现日志权限矩阵、复杂权限、角色权限或轻角色校验

## 5. 前端项目详情页

- [x] 5.1 在前端 API 客户端封装 `GET /api/projects/:projectId/operation-logs`
- [x] 5.2 项目详情页新增只读“业务日志”区域
- [x] 5.3 展示日志时间、操作人字段、`actionType` 或中文摘要、`summary`
- [x] 5.4 处理业务日志加载中、失败和空日志状态
- [x] 5.5 项目创建、资料状态、适用性和阶段推进相关操作成功后，按页面现有刷新策略刷新业务日志
- [x] 5.6 不新增日志筛选、导出、复杂分页、权限配置、通知、个人待办或责任人分配入口

## 6. README 文档

- [x] 6.1 更新 `digital-platform-api/README.md`，说明业务日志范围、表结构、写入动作、查询接口、事务一致性和不做范围
- [x] 6.2 更新 `digital-platform-web/README.md`，说明项目详情页只读业务日志展示、加载状态、空状态和不做范围

## 7. 验证

- [x] 7.1 在 `digital-platform-api` 下运行 `npm.cmd run check`
- [x] 7.2 在 `digital-platform-web` 下运行 `npm.cmd run build`
- [x] 7.3 验证项目创建成功后写入 `project.created`
- [x] 7.4 验证资料提交、确认、退回成功后分别写入对应 `document.*` 日志
- [x] 7.5 验证资料标记不适用和恢复适用成功后分别写入对应 `document.*` 日志
- [x] 7.6 验证阶段推进成功写入 `stage.advanced`，第 8 阶段完成项目时额外写入 `project.completed`，且两类日志均使用阶段推进请求当前登录用户作为 `actor_user_id`
- [x] 7.7 验证失败操作不写入业务日志
- [x] 7.8 验证日志写入失败时业务状态变更回滚
- [x] 7.9 验证未登录查询 `GET /api/projects/:projectId/operation-logs` 被拒绝
- [x] 7.10 验证日志查询按 `created_at DESC, id DESC` 稳定倒序并限制返回数量
- [x] 7.11 验证非法 `limit` 不会返回无限数据
- [x] 7.12 验证迁移或上线不会为历史项目和历史操作补写业务日志
- [x] 7.13 验证项目不存在且 `limit` 非法时，项目不存在错误优先于 `limit` 校验错误
- [x] 7.14 运行 `cmd /c openspec validate add-business-operation-log --strict`
