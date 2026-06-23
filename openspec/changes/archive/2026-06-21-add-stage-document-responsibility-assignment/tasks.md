## 1. 数据库与模型

- [x] 1.1 检查 `project_stage_documents.responsible_user_id` 是否已存在并可用于关联数字化平台用户
- [x] 1.2 新增或补齐 `responsibility_updated_by_user_id` 字段迁移
- [x] 1.3 新增或补齐 `responsibility_updated_at` 字段迁移
- [x] 1.4 确保既有资料项默认责任人和责任人变更追溯字段为空
- [x] 1.5 更新阶段资料项数据库映射和字段命名转换
- [x] 1.6 确认新增字段不影响既有资料状态、适用性、齐套摘要和阶段推进逻辑

## 2. 启用用户候选列表

- [x] 2.1 实现 `GET /api/users/responsibility-candidates` 责任人候选用户接口
- [x] 2.2 实现候选用户查询仓储方法，只返回 `is_enabled = 1` 的用户
- [x] 2.3 确保候选用户响应固定返回 `id`、`account`、`name`、`department`、`role`、`filePlatformUserId`
- [x] 2.4 确保候选用户响应不包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或密码内部字段
- [x] 2.5 为候选用户接口添加 `requireAuth`
- [x] 2.6 确保候选用户接口不要求 `requirePlatformAdmin`
- [x] 2.7 确保候选用户接口不提供用户新增、编辑、禁用、启用或重置密码能力
- [x] 2.8 确保 `GET /api/users/responsibility-candidates` 不被现有用户管理维护路由的 `requirePlatformAdmin` 中间件包住

## 3. 资料项责任人分配后端

- [x] 3.1 新增资料项责任人分配接口 `PUT /api/projects/:projectId/stage-documents/:documentId/responsible-user`
- [x] 3.2 为责任人分配接口添加 `requireAuth`
- [x] 3.3 校验 `projectId` 和 `documentId` 合法性
- [x] 3.4 校验资料项存在且属于当前项目
- [x] 3.5 支持请求体 `responsibleUserId` 为数字用户 ID 时分配责任人
- [x] 3.6 支持请求体 `responsibleUserId = null` 时清空责任人
- [x] 3.7 分配责任人时校验候选用户存在且 `isEnabled = true`
- [x] 3.8 分配不存在用户时返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 且不改变责任人、追溯字段或业务日志
- [x] 3.9 分配禁用用户时返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 且不改变责任人、追溯字段或业务日志
- [x] 3.10 非法 `responsibleUserId` 返回 `INVALID_RESPONSIBLE_USER_ID` 且不改变责任人、追溯字段或业务日志
- [x] 3.11 分配或清空成功时更新 `responsible_user_id`
- [x] 3.12 分配或清空成功时更新 `responsibility_updated_by_user_id`
- [x] 3.13 分配或清空成功时更新 `responsibility_updated_at`
- [x] 3.14 确保责任人变更不修改资料状态、适用性、齐套摘要口径或阶段推进门禁
- [x] 3.15 确保责任人分配不使用 `isPlatformAdmin`、复杂权限、角色权限或轻角色校验
- [x] 3.16 项目不存在时返回 `PROJECT_NOT_FOUND` 且不改变任何资料项责任人、追溯字段或业务日志
- [x] 3.17 资料项不存在或不属于当前项目时返回 `STAGE_DOCUMENT_NOT_FOUND` 且不改变任何资料项责任人、追溯字段或业务日志

## 4. 阶段资料清单返回

- [x] 4.1 在阶段资料清单查询中返回 `responsibleUserId`
- [x] 4.2 在阶段资料清单查询中返回 `responsibleUser`
- [x] 4.3 `responsibleUser` 固定返回 `id`、`account`、`name`、`department`、`role`、`isEnabled`、`filePlatformUserId`
- [x] 4.4 未分配责任人时返回空 `responsibleUserId` 和空 `responsibleUser`
- [x] 4.5 已分配责任人后来被禁用时仍返回责任人信息并标识 `isEnabled = false`
- [x] 4.6 在阶段资料清单查询中返回 `responsibilityUpdatedByUserId`
- [x] 4.7 在阶段资料清单查询中返回 `responsibilityUpdatedAt`
- [x] 4.8 确保清单返回的 `responsibleUser` 不暴露 `isPlatformAdmin`、`is_platform_admin` 或密码内部字段
- [x] 4.9 为阶段资料清单查询接口添加 `requireAuth`
- [x] 4.10 确保阶段资料清单查询不要求 `requirePlatformAdmin`、复杂权限、角色权限或轻角色校验

## 5. 业务操作日志

- [x] 5.1 扩展业务日志动作类型，支持 `document.responsible_changed`
- [x] 5.2 分配责任人成功后写入 `document.responsible_changed` 日志
- [x] 5.3 清空责任人成功后写入 `document.responsible_changed` 日志
- [x] 5.4 责任人变更日志 `target_type` 使用 `stage_document`
- [x] 5.5 责任人变更日志 `details_json` 包含 `documentId`、`documentCode`、`documentName`
- [x] 5.6 责任人变更日志 `details_json` 包含 `fromResponsibleUserId` 和 `toResponsibleUserId`
- [x] 5.7 责任人变更和日志写入在同一事务中提交
- [x] 5.8 日志写入失败时回滚责任人变更
- [x] 5.9 失败的责任人分配或清空操作不得写业务日志

## 6. 前端项目详情页

- [x] 6.1 封装 `GET /api/users/responsibility-candidates` API 客户端方法
- [x] 6.2 封装资料项责任人分配 API 客户端方法
- [x] 6.3 项目详情页加载责任人候选用户并处理加载失败状态
- [x] 6.4 阶段资料清单资料项展示当前责任人
- [x] 6.5 未分配责任人时展示未分配状态
- [x] 6.6 已分配责任人被禁用时展示禁用状态
- [x] 6.7 展示责任人最近一次变更追溯字段
- [x] 6.8 提供责任人选择控件，可选择启用用户
- [x] 6.9 提供清空责任人操作
- [x] 6.10 责任人分配或清空成功后刷新阶段资料清单
- [x] 6.11 责任人分配或清空成功后刷新业务日志
- [x] 6.12 责任人分配或清空失败时展示可读错误
- [x] 6.13 页面文案明确资料责任人是手工分配，不代表权限控制、个人待办或文件权限
- [x] 6.14 不新增复杂权限 UI、个人待办、通知、文件平台联动或在线表单入口
- [x] 6.15 为 `INVALID_RESPONSIBLE_USER_ID` 增加可读中文提示
- [x] 6.16 为 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 增加可读中文提示

## 7. README 文档

- [x] 7.1 更新 `digital-platform-api/README.md`，说明 `GET /api/users/responsibility-candidates` 责任人候选用户接口
- [x] 7.2 更新 `digital-platform-api/README.md`，说明资料项责任人分配和清空接口
- [x] 7.3 更新 `digital-platform-api/README.md`，说明责任人分配只要求 `requireAuth`，不使用平台管理员边界
- [x] 7.4 更新 `digital-platform-api/README.md`，说明责任人变更业务日志和事务一致性
- [x] 7.5 更新 `digital-platform-api/README.md`，说明不做复杂权限、个人待办、文件平台联动、在线表单和管理层看板
- [x] 7.6 更新 `digital-platform-web/README.md`，说明项目详情页支持资料责任人手工分配
- [x] 7.7 更新 `digital-platform-web/README.md`，说明责任人展示、选择、清空和禁用用户展示口径
- [x] 7.8 更新 `digital-platform-web/README.md`，说明不做权限控制、个人待办、文件权限或文件平台联动

## 8. 验证

- [x] 8.1 验证未登录调用责任人候选用户接口返回 401
- [x] 8.2 验证非平台管理员登录用户可调用责任人候选用户接口
- [x] 8.3 验证 `GET /api/users/responsibility-candidates` 只返回启用用户且不返回 `isPlatformAdmin`、`is_platform_admin` 或密码内部字段
- [x] 8.4 验证未登录调用资料项责任人分配接口返回 401
- [x] 8.5 验证已登录用户可为资料项分配启用用户
- [x] 8.6 验证已登录用户可清空资料项责任人
- [x] 8.7 验证分配不存在用户返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 且数据和业务日志不变
- [x] 8.8 验证分配禁用用户返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 且数据和业务日志不变
- [x] 8.9 验证操作不存在或不属于当前项目的资料项返回 `STAGE_DOCUMENT_NOT_FOUND` 且数据和业务日志不变
- [x] 8.10 验证非法 `responsibleUserId` 返回 `INVALID_RESPONSIBLE_USER_ID` 且数据和业务日志不变
- [x] 8.11 验证项目不存在时返回 `PROJECT_NOT_FOUND` 且数据和业务日志不变
- [x] 8.12 验证责任人分配不改变资料状态、适用性和齐套摘要
- [x] 8.13 验证阶段资料清单返回责任人和责任人变更追溯字段
- [x] 8.14 验证阶段资料清单 `responsibleUser` 不返回 `isPlatformAdmin`、`is_platform_admin` 或密码内部字段
- [x] 8.15 验证已分配责任人后来被禁用后清单仍展示该责任人且 `isEnabled = false`
- [x] 8.16 验证分配和清空责任人均写入 `document.responsible_changed` 业务日志
- [x] 8.17 验证失败的责任人分配操作不写业务日志
- [x] 8.18 验证日志写入失败时责任人变更回滚；如不便注入失败，说明未覆盖原因
- [x] 8.19 验证前端对 `INVALID_RESPONSIBLE_USER_ID` 和 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED` 展示可读中文提示
- [x] 8.20 运行后端 `npm.cmd run check`
- [x] 8.21 运行前端 `cmd /c npm.cmd run build`
- [x] 8.22 运行 `cmd /c openspec validate add-stage-document-responsibility-assignment --strict`
- [x] 8.23 运行 `cmd /c openspec validate --all --strict`
- [x] 8.24 运行 `cmd /c openspec list --json`
- [x] 8.25 验证未登录查询阶段资料清单返回 401
- [x] 8.26 验证已登录非平台管理员可查询阶段资料清单
