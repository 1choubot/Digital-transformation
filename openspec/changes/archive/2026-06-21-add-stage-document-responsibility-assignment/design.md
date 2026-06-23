## Context

当前系统已经具备数字化平台用户、登录态、平台管理员边界、项目阶段资料清单、资料项状态流转、资料项适用性、阶段齐套摘要、阶段推进和项目业务操作日志。`project_stage_documents` 中已预留 `responsible_user_id`，但尚未形成可操作、可展示、可追溯的责任人分配闭环。

责任人分配的第一版目标是把资料项与一个启用的数字化平台用户建立手工关联，为后续“我的待办”、在线表单、文件上传和文件权限联动提供数据基础。本变更不把责任人解释为权限控制，不自动生成待办，不调用文件管理平台。

## Goals / Non-Goals

**Goals:**

- 支持已登录用户为项目级阶段资料项分配一个启用用户作为责任人。
- 支持已登录用户清空资料项责任人。
- 提供 `GET /api/users/responsibility-candidates` 启用用户候选列表，用于责任人选择；该接口只要求登录态，不要求平台管理员。
- 阶段资料清单查询返回责任人、安全用户信息和最近一次责任人变更追溯字段。
- 分配或清空责任人时记录 `responsibility_updated_by_user_id` 和 `responsibility_updated_at`。
- 分配或清空责任人成功后，在同一事务中写入 `document.responsible_changed` 项目业务操作日志。
- 项目详情页展示责任人、提供选择和清空操作，并在成功后刷新资料清单和业务日志。
- 更新 API 和 Web README，说明接口、页面能力和边界。

**Non-Goals:**

- 不实现文件上传、文件下载或文件管理平台联动。
- 不实现在线表单、表单草稿或表单生成归档文件。
- 不实现个人待办、通知、责任人权限校验或项目经理账号绑定。
- 不实现部门权限、角色权限矩阵、复杂 RBAC、文件权限判断或管理层看板。
- 不使用 `isPlatformAdmin` 保护资料项责任人分配；平台管理员仍只保护用户管理。
- 不记录完整责任人变更历史表；连续历史由项目业务操作日志承担。

## Decisions

### 责任人分配接口使用同一个 PUT 接口

第一版使用 `PUT /api/projects/:projectId/stage-documents/:documentId/responsible-user` 处理分配和清空。请求体中 `responsibleUserId` 为数字用户 ID 时表示分配，为 `null` 时表示清空。

选择该方式是因为分配和清空都属于“设置资料项当前责任人”的同一业务动作，后端可以共用项目资料项归属校验、用户有效性校验、追溯字段更新和日志写入逻辑。替代方案是拆成 assign 和 clear 两个接口，但会增加前后端分支和重复校验，第一版收益不高。

### 候选用户接口路径和返回字段固定

责任人候选列表固定为 `GET /api/users/responsibility-candidates`，只用于资料责任人选择。该接口必须要求 `requireAuth`，但不得要求 `requirePlatformAdmin`，也不得被现有用户管理维护路由的 `requirePlatformAdmin` 中间件包住。实现时应将该路由放在只需要登录态的用户辅助查询路由中，或在用户管理维护路由应用平台管理员中间件之前独立注册。

候选用户响应字段固定为 `id`、`account`、`name`、`department`、`role`、`filePlatformUserId`。响应不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

选择只返回启用用户，是为了避免新分配到已禁用账号。已分配责任人后如果该用户后来被禁用，阶段资料清单仍应展示该用户，并通过 `isEnabled` 表示状态，避免历史分配关系丢失。

阶段资料清单中的 `responsibleUser` 字段固定为 `id`、`account`、`name`、`department`、`role`、`isEnabled`、`filePlatformUserId`。该字段用于展示已分配责任人，必须允许返回后来被禁用的责任人，但同样不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

### 责任人字段不参与齐套摘要和阶段推进门禁

责任人分配只描述资料项跟进人员，不改变资料状态、适用性、齐套摘要或阶段推进门禁。阶段齐套仍只基于“适用且必填资料项”和手工状态计算。

选择该边界是为了避免把责任人分配扩展为权限、待办或阶段管控规则。后续如需要“未分配责任人不能推进”或“责任人待办”，应单独设计 change。

### 最近一次追溯字段保存在资料项上

资料项保存 `responsibility_updated_by_user_id` 和 `responsibility_updated_at` 作为最近一次责任人变更追溯。分配和清空责任人均更新这两个字段。

选择最近一次追溯字段，是为了让阶段资料清单可以快速展示当前责任人最后由谁调整、何时调整。完整历史不在资料项表重复保存，而是通过项目业务操作日志记录。

### 责任人变更日志必须同事务写入

责任人分配或清空成功后必须写入项目业务操作日志 `document.responsible_changed`，`target_type = stage_document`。`details_json` 至少包含 `documentId`、`documentCode`、`documentName`、`fromResponsibleUserId` 和 `toResponsibleUserId`。资料项更新和日志写入必须在同一事务中提交；日志写入失败时回滚责任人变更。

选择同事务策略是为了保持当前状态与项目业务日志一致，避免出现责任人已经变化但日志缺失的审计断点。

### 错误码保持稳定

后端 MUST 为责任人分配失败场景返回固定稳定错误码。`responsibleUserId` 类型或格式非法时返回 `INVALID_RESPONSIBLE_USER_ID`；分配的用户不存在或已禁用时返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`；项目不存在时复用 `PROJECT_NOT_FOUND`；资料项不存在或不属于当前项目时复用 `STAGE_DOCUMENT_NOT_FOUND`。

以上失败场景均不得改变任何资料项责任人、责任人追溯字段或其他业务字段，也不得写入 `document.responsible_changed` 业务日志。前端需要为 `INVALID_RESPONSIBLE_USER_ID` 和 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 增加可读中文提示。

## Risks / Trade-offs

- [Risk] 已分配责任人后来被禁用，候选列表不再返回该用户，但资料清单仍需要展示历史关联。 → 清单查询责任人信息不限定启用用户，并返回 `isEnabled` 供前端展示状态。
- [Risk] 用户可能误解“责任人”为权限控制或待办。 → 前端和 README 必须明确责任人是手工分配，不代表权限控制、个人待办或文件权限。
- [Risk] 责任人频繁变化导致资料项表只能看到最近一次变更。 → 连续历史由 `document.responsible_changed` 业务日志承担，第一版不新增责任人变更历史表。
- [Risk] 候选用户接口可能被误用为用户管理接口。 → 候选接口固定为 `GET /api/users/responsibility-candidates`，只返回启用用户和最小安全字段，不提供新增、编辑、禁用、启用或重置密码能力，也不返回平台管理员标识。

## Migration Plan

数据库迁移应确认 `project_stage_documents.responsible_user_id` 可用，并补充 `responsibility_updated_by_user_id`、`responsibility_updated_at` 字段。已有资料项默认未分配责任人，追溯字段为空，不回填责任人和责任人变更日志。

部署顺序建议为先执行数据库迁移，再发布后端接口和日志写入逻辑，最后发布前端责任人展示和选择控件。回滚时应先回滚前端入口，再回滚后端接口；保留新增字段不会影响既有资料清单状态流转、适用性、齐套摘要和阶段推进。

## Open Questions

无。本变更第一版固定为单责任人手工分配，不设计多责任人、责任人角色、自动派发或待办规则。
