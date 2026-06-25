# 日报周报模块实施记录

## M0 仓库侦察结论

- 工作区为 `E:\Digital-transformation`，当前分支为 `daily-and-weekly`。
- 后端根目录为 `digital-platform-api`，技术栈为 Node.js ESM、Express 4、`mysql2/promise`。
- 后端入口为 `src/server.js`，应用组装在 `src/app.js`，现有路由挂载在 `/api/auth`、`/api/me`、`/api/users`、`/api/projects`。
- 后端启动命令为 `npm.cmd run dev`，生产启动命令为 `npm.cmd start`，当前检查命令为 `npm.cmd run check`。
- 前端根目录为 `digital-platform-web`，技术栈为 Vue 3 与 Vite。
- 前端使用自定义 hash router，路由解析在 `src/router.js`，页面分发在 `src/App.vue`，不是 Vue Router。
- 前端构建/检查命令为 `npm.cmd run check`。

## 鉴权与权限

- 当前登录态通过 Bearer token 读取 `auth_sessions`，鉴权中间件 `requireAuth` 将用户挂载到 `req.auth.user`。
- 当前只有 `requirePlatformAdmin` 平台管理员守卫，主要保护用户管理接口。
- 日报周报模块必须新增组织角色授权工具，不能只依赖前端菜单隐藏。
- 用户模型需补齐 `organization_role` 与 `job_title` 映射；后续 API 使用当前登录用户上下文，不信任前端传入的 `user_id`、`department` 或 `organization_role`。

## 数据库与迁移

- 当前迁移目录为 `digital-platform-api/migrations`，最后编号为 `009_stage_document_attachments.sql`。
- 现有迁移是手工 SQL 文件，没有统一 migration runner。
- M1 新增迁移编号从 `010` 到 `019`。
- `digital_platform.sql` 显示 `users` 已有 `department`、`organization_role`、`role`、`is_enabled`、`is_platform_admin`。
- 当前结构未发现 `daily_reports`、`weekly_reports`、`project_members`、`roles` 或 `departments`。
- 不执行 `docs/digital_platform.sql` 全量 dump；后续只新增安全迁移。

## 项目结构适配

- 真实库快照中的 `projects` 包含 `project_manager_user_id`，而当前代码迁移仍使用 `project_manager` 文本字段。
- 日报项目搜索需按真实库结构适配：优先使用 `projects.id`、`project_code`、`project_name`、`status` 与存在时的 `project_manager_user_id`；P0 范围仍为全部非 `completed` 项目加编号/名称搜索。
- 不创建 `project_members` 表。

## 文件、导出与任务

- 现有文件上传使用 Busboy，文件存储在本地目录，相关实现位于 `src/middleware/multipartFile.js` 与 `src/storage/stageDocumentAttachmentStorage.js`。
- 现有附件下载走鉴权端点 `res.download`，未将存储目录直接暴露为静态目录。
- 当前未发现 Excel 生成库、cron/scheduler 库；允许新增依赖，但新增依赖必须记录，服务器迁移以 lockfile 为准。

## Excel 模板状态

- 模板根目录 `E:\Digital-transformation\docs` 可读。
- 导出根目录 `E:\Digital-transformation\daily_and_weekly_files` 存在，可创建与删除临时文件。
- 三份模板均可被 `openpyxl 3.1.5` 读取。
- 三份模板均无公式、无图片、无冻结窗格；关键格式集中在合并区域、列宽、行高、打印设置和签字区。

| 模板 | SHA-256 | 工作表 | 有效区域 |
|---|---|---|---|
| `项目工作日报-陈芋如20260616.xlsx` | `0a074c93a754b12233f6bb200e6edcb08495166c428267ff265975baeabb8fba` | `项目管理工作日报汇总` | `A1:G21` |
| `部门工作日报-研发中心20260618.xlsx` | `990ff5cc9cb5b7978d614132e39ef1ed6b456210ec8b62e7678d61cb12e9ca37` | `项目管理工作日报汇总` | `A1:F59` |
| `周绩效考核表-研发中心陈芋如20260621.xlsx` | `2760d75d17422362c5113050e62b84631799f737d7711acee615c9a934008d69` | `Sheet1` | `A1:H24` |

## 已安装依赖基线

| 工程 | 已安装顶层依赖 |
|---|---|
| `digital-platform-api` | `busboy@1.6.0`、`dotenv@16.6.1`、`express@4.22.2`、`mysql2@3.22.3` |
| `digital-platform-web` | `vue@3.5.34`、`vite@6.4.2`、`@vitejs/plugin-vue@5.2.4` |

## M0 基线检查

- 后端 `npm.cmd run check` 通过。
- 前端 `npm.cmd run check` 通过。
- PowerShell 直接执行 `npm run check` 会被执行策略拦截 `npm.ps1`，本项目后续使用 `npm.cmd`。
