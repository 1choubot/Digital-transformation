# Digital Platform API

数字化管理平台第一版后端服务，使用 Node.js + Express + MySQL。

## Scope

当前已实现：

- 后端工程骨架和 MySQL 连接配置
- 项目主数据、项目阶段 SQL 模型
- 项目创建、项目列表、项目详情基础 API
- 基础用户表、登录态表和初始化用户
- `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/me`
- 基础用户管理：平台管理员可查看、新增、编辑、启用/禁用用户和重置密码
- `users.is_platform_admin` 最小平台管理员开关，只保护用户管理 API
- 初始化账号默认保存/恢复为启用平台管理员，用户管理操作至少保留一个启用平台管理员
- 项目创建要求登录，并记录 `createdByUserId`
- 项目列表和详情返回创建人追溯字段，兼容历史项目创建人为空
- 阶段资料项模板和项目级阶段资料清单
- 项目创建后自动初始化 8 阶段资料清单
- 历史项目可通过后端命令幂等补初始化资料清单
- `GET /api/projects/:projectId/stage-document-checklist` 按 8 阶段分组查询资料清单
- 资料项手工状态流转：标记提交、确认、退回，并记录提交/确认/退回追溯字段
- 资料项手工适用性标记：标记不适用、恢复适用，并记录不适用/恢复适用追溯字段
- 阶段资料清单查询返回基于当前手工状态和人工适用性判断的阶段必填资料齐套摘要
- 阶段资料项责任人手工分配：启用用户候选列表、资料项责任人分配/清空、责任人变更追溯和责任人变更业务日志
- 阶段资料附件：资料项附件上传、列表、下载和软删除，上传/删除写入业务日志
- 我的资料任务查询：登录用户可集中查看分配给自己的适用阶段资料项
- 项目总览看板：登录用户可只读查看跨项目汇总指标、当前阶段齐套摘要和未完成适用必填资料
- 项目阶段手工推进接口：基于当前阶段适用必填资料齐套门禁，按 8 阶段顺序推进当前阶段
- 项目维度业务操作日志：记录项目创建、资料状态流转、资料适用性变更、资料责任人变更、阶段推进和项目完成等成功业务动作

不包含项目成员管理、项目经理账号绑定、责任人权限校验、个人待办、项目类型模板、自动批量标记不适用、阶段回退、跳阶段、批量推进、阶段推进审批流、项目经理角色权限校验、在线表单填写、表单草稿、表单生成归档文件、文件管理平台联动、文件管理平台上传/下载、附件预览、断点续传、多版本管理、病毒扫描、对象存储、全局审计日志、系统配置日志、登录日志、用户管理操作日志、文件平台日志、文件下载日志、管理层大屏图表、日志筛选导出、复杂分页、日志权限矩阵、基于文件上传/归档状态的齐套率、阶段推进操作人完整日志、通知、复杂菜单权限、复杂权限/角色权限/轻角色校验、项目权限、资料权限、文件下载权限、文件平台用户同步、权限同步、下载权限判断、部门权限继承、SSO、细粒度按钮权限，也不读取、共用或迁移文件管理平台数据库。

后端项目和阶段资料仓储按能力拆分为更小模块。`src/repositories/projectRepository.js` 和 `src/repositories/stageDocumentRepository.js` 保留为兼容出口；项目基础、阶段推进、项目总览、阶段资料清单、状态流转、适用性、责任人和我的资料任务等实现位于对应子模块中。该拆分仅调整代码结构，不改变 API、数据库、权限、错误码或用户可见业务行为。

## Setup

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```bash
copy .env.example .env
```

3. 在 MySQL 中执行项目核心迁移：

```bash
migrations/001_project_core.sql
```

4. 初始化基础认证表、项目创建人字段和首个用户：

```bash
npm run init-auth
```

5. 初始化阶段资料清单模板，并为历史项目补初始化资料清单：

```bash
npm run init-stage-documents
```

该命令会创建阶段资料模板表和项目级资料清单表，模板数据来自 `docs/9.2_阶段资料清单与责任角色表.md`，共 48 项。重复执行不会为已有项目重复生成资料项。

6. 现有环境如已执行过 `003_stage_document_checklist.sql`，需要继续在 MySQL 中执行资料状态流转迁移：

```bash
migrations/004_document_status_workflow.sql
```

该迁移会为 `project_stage_documents` 补充 `returned_by_user_id` 和 `return_reason`。全新环境可直接使用更新后的初始化逻辑创建完整字段。

7. 现有环境如已执行过 `004_document_status_workflow.sql`，需要继续在 MySQL 中执行资料适用性迁移：

```bash
migrations/005_stage_document_applicability.sql
```

该迁移会为 `project_stage_documents` 补充 `is_applicable`、`not_applicable_by_user_id`、`not_applicable_at`、`not_applicable_reason`、`restored_applicable_by_user_id` 和 `restored_applicable_at`。现有资料项默认适用，原有 `status` 和状态追溯字段保持不变。

8. 现有环境如已执行过 `005_stage_document_applicability.sql`，需要继续在 MySQL 中执行业务操作日志迁移：

```bash
migrations/006_business_operation_logs.sql
```

该迁移会创建 `business_operation_logs` 表，字段包括 `id`、`project_id`、`actor_user_id`、`action_type`、`target_type`、`target_id`、`summary`、`details_json` 和 `created_at`。`actor_user_id` 第一版为必填，并建立支持按 `project_id`、`created_at DESC`、`id DESC` 查询的索引。迁移不回填历史项目或历史业务动作日志，只记录本能力实现后新发生的成功业务动作。

9. 现有环境如已执行过 `006_business_operation_logs.sql`，需要继续在 MySQL 中执行基础用户管理迁移：

```bash
migrations/007_basic_user_management.sql
```

该迁移会为 `users` 增加 `is_platform_admin TINYINT(1) NOT NULL DEFAULT 0`。执行后应重新运行 `npm run init-auth`，初始化账号会默认保存/恢复为 `isPlatformAdmin = true` 且 `isEnabled = true`，避免升级后无人可管理。全新环境运行 `npm run init-auth` 时也会创建或补齐该字段。

10. 现有环境如已执行过 `007_basic_user_management.sql`，需要继续在 MySQL 中执行阶段资料责任人分配迁移：

```bash
migrations/008_stage_document_responsibility_assignment.sql
```

该迁移会确认或补齐 `project_stage_documents.responsible_user_id`，并新增 `responsibility_updated_by_user_id` 和 `responsibility_updated_at`。既有资料项默认未分配责任人，责任人变更追溯字段为空，不回填历史责任人变更日志。

11. 现有环境如已执行过 `008_stage_document_responsibility_assignment.sql`，需要继续在 MySQL 中执行阶段资料附件迁移：

```bash
migrations/009_stage_document_attachments.sql
```

该迁移会创建 `project_stage_document_attachments` 表，用于保存资料项附件记录、上传追溯和软删除追溯。迁移不回填历史附件。全新环境可直接使用更新后的初始化逻辑创建附件表。

12. 启动服务：

```bash
npm run dev
```

## Environment

- `PORT`: API 服务端口，默认 `3001`
- `DB_HOST`: MySQL 主机
- `DB_PORT`: MySQL 端口
- `DB_USER`: MySQL 用户
- `DB_PASSWORD`: MySQL 密码
- `DB_NAME`: 数字化平台独立数据库名
- `DB_CONNECTION_LIMIT`: MySQL 连接池大小
- `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR`: 阶段资料附件本地存储目录；未配置时默认使用后端进程工作目录下的 `storage/stage-document-attachments`
- `AUTH_SESSION_TTL_HOURS`: 登录态有效小时数，默认 `12`
- `INITIAL_USER_ACCOUNT`: 初始化用户账号，默认 `admin`
- `INITIAL_USER_PASSWORD`: 初始化用户密码，默认 `Admin@123456`
- `INITIAL_USER_DISPLAY_NAME`: 初始化用户姓名
- `INITIAL_USER_DEPARTMENT`: 初始化用户部门
- `INITIAL_USER_ROLE`: 初始化用户角色
- `INITIAL_USER_FILE_PLATFORM_USER_ID`: 可选文件平台用户映射 ID，可为空

部署或长期试用前应在 `.env` 中设置初始化用户密码。

## API

### Health

```http
GET /health
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "account": "admin",
  "password": "Admin@123456"
}
```

成功后返回 `token` 和当前用户信息。响应不包含密码或密码哈希。
当前用户信息包含 `id`、`account`、`name`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId`。

### Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

返回当前登录用户基础信息，包含 `isPlatformAdmin`。姓名响应字段沿用安全用户模型 `name`。

### User Management

所有用户管理接口必须携带登录态，并要求当前用户 `isPlatformAdmin = true`。该管理员开关只保护用户管理 API，不扩展为项目权限、资料权限、阶段权限、文件权限或复杂 RBAC。

用户管理响应使用安全用户模型，包含 `id`、`account`、`name`、`department`、`role`、`isEnabled`、`isPlatformAdmin`、`filePlatformUserId`，不返回 `password_hash`、`passwordHash` 或其他密码内部字段。新增和编辑请求使用 `displayName`，数据库字段仍为 `display_name`，响应字段为 `name`。

```http
GET /api/users
Authorization: Bearer <token>
```

返回用户列表。

```http
GET /api/users/{userId}
Authorization: Bearer <token>
```

返回单个用户。用户不存在返回 `USER_NOT_FOUND`。

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "account": "zhangsan",
  "displayName": "张三",
  "department": "研发中心",
  "role": "engineer",
  "password": "Initial@123",
  "isEnabled": true,
  "isPlatformAdmin": false,
  "filePlatformUserId": null
}
```

新增用户时 `account`、`displayName`、`department`、`role`、`password` 必填，`account` 必须唯一；`isEnabled` 默认 `true`，`isPlatformAdmin` 默认 `false`，`filePlatformUserId` 可为空且不会调用文件管理平台校验。

```http
PATCH /api/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "张三",
  "department": "研发中心",
  "role": "engineer",
  "isEnabled": true,
  "isPlatformAdmin": false,
  "filePlatformUserId": null
}
```

普通编辑只允许修改 `displayName`、`department`、`role`、`isEnabled`、`isPlatformAdmin`、`filePlatformUserId`。不得通过普通编辑接口修改 `account`、`password`、`passwordHash` 或 `password_hash`，否则返回稳定错误。

```http
POST /api/users/{userId}/enable
POST /api/users/{userId}/disable
POST /api/users/{userId}/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "NewPassword@123"
}
```

启用/禁用用户和重置密码都只由平台管理员执行。禁用用户不能建立新登录态；当前已登录用户被禁用后的会话处理沿用现有 `requireAuth` / `isEnabled` 校验，不新增强制踢下线能力。

禁用用户、取消 `isPlatformAdmin`、编辑 `isEnabled` / `isPlatformAdmin` 时，系统必须至少保留一个 `isEnabled = true` 且 `isPlatformAdmin = true` 的用户；如果操作会导致 0 个启用平台管理员，返回 `LAST_ENABLED_PLATFORM_ADMIN_REQUIRED` 且不保存本次修改。

### Responsibility Candidates

```http
GET /api/users/responsibility-candidates
Authorization: Bearer <token>
```

返回资料项责任人选择用的启用用户候选列表。该接口只要求登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，也不得被用户管理维护路由的平台管理员中间件包住。

候选用户只包含 `id`、`account`、`name`、`department`、`role` 和可空 `filePlatformUserId`。响应不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

该接口只用于资料责任人选择，不提供用户新增、编辑、启用、禁用或重置密码能力，不读取文件管理平台用户表，也不做文件平台权限判断。

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

退出后原登录态不能继续访问 `GET /api/auth/me`。

### Create Project

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectCode": "KRF26001",
  "projectName": "示例项目",
  "customerName": "示例客户",
  "projectManager": "张三",
  "participatingDepartments": ["研发中心", "制造中心"],
  "plannedStartDate": "2026-05-17",
  "plannedEndDate": "2026-12-31",
  "remark": "首批项目核心能力验证"
}
```

成功后返回项目主数据和初始化后的 8 个阶段。创建人由后端根据登录态写入 `createdByUserId`，不会信任前端提交的创建人字段。创建成功后会在同一事务中写入 `project.created` 项目业务操作日志；如果业务日志写入失败，项目创建会整体回滚。

### List Projects

```http
GET /api/projects
```

返回项目编号、项目名称、客户、项目经理、状态、计划时间、当前阶段和创建人追溯字段。

### Project Overview Dashboard

```http
GET /api/projects/overview-dashboard?status=normal&currentStageOrder=1&keyword=KRF
Authorization: Bearer <token>
```

查询项目总览看板。该接口必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，不做项目成员权限、项目经理权限、角色权限、复杂权限或轻角色校验。路由为 `/api/projects` 下的静态路由，必须先于 `/:projectId` 动态项目详情路由注册，避免 `overview-dashboard` 被当作项目 ID。

响应顶层包含 `summary` 和 `projects`。`summary` 包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`。前三个项目数量和 `riskProjects` 基于当前项目筛选后的结果统计，`riskProjects` 统计 `status = risk` 或 `status = delayed` 的项目；`myPendingStageDocumentTasks` 使用当前登录用户 ID，按 `responsible_user_id = 当前用户 id`、`is_applicable = 1`、`status in not_submitted, submitted, returned` 统计当前用户全局待办资料数量，不受 `status`、`currentStageOrder` 或 `keyword` 项目总览筛选影响。

`projects` 每项至少包含 `projectId`、`projectCode`、`projectName`、`customerName`、`projectManager`、`status`、`currentStageId`、`currentStageName`、`currentStageOrder`、`currentStageStatus`、`currentStageCompletenessSummary`、`currentStageIncompleteRequiredDocuments`、`currentStageIssue`、`createdBy`、`plannedStartDate` 和 `plannedEndDate`。已完成项目允许当前阶段字段和齐套摘要为空；未完成项目缺失当前阶段时返回 `currentStageIssue = missing_current_stage`，存在多个当前阶段时返回 `multiple_current_stages`。当前阶段存在但该阶段没有任何项目级资料项记录时，返回 `currentStageCompletenessSummary = null`、`currentStageIncompleteRequiredDocuments = []` 和 `currentStageIssue = checklist_not_initialized`，接口不会自动初始化资料清单，也不会修复异常阶段数据。

当前阶段齐套摘要复用阶段资料清单口径，只统计当前阶段 `isRequired = true` 且 `isApplicable = true` 的资料项；`confirmed` 计为已完成，`not_submitted`、`submitted` 和 `returned` 计为未完成；建议资料项和不适用资料项不计入 `requiredTotal`，也不进入 `currentStageIncompleteRequiredDocuments`。`requiredTotal = 0` 时 `completionPercent = 100`。缺失资料项至少返回 `id`、`documentCode`、`documentName` 和 `status`。

筛选参数均为可选。`status` 只能是 `normal`、`risk`、`paused`、`delayed` 或 `completed`，非法值、空字符串或多值返回 `INVALID_PROJECT_STATUS_FILTER`，HTTP 状态为 400。`currentStageOrder` 必须是 1 到 8 的整数，非数字、空字符串、0、负数、小数、超过 8 或混合格式返回 `INVALID_STAGE_ORDER`，HTTP 状态为 400。`keyword` trim 后为空等同未提供，非空时按 `projectCode`、`projectName` 或 `customerName` 模糊筛选。合法筛选无匹配项目时返回空项目列表。

第一版不分页，项目列表按 `projectCode ASC, projectId ASC` 稳定排序。该接口是只读查询，不写业务操作日志，不改变项目状态、阶段状态、资料状态、适用性、责任人、齐套摘要或阶段推进状态。齐套率基于当前手工状态和人工适用性判断，不代表文件已上传、文件已归档或在线表单已填写；本能力不做文件平台联动、在线表单、消息提醒、超期提醒、大屏图表、导出或批量操作。

### Project Detail

```http
GET /api/projects/{projectId}
```

返回项目基础信息、全部 8 个阶段、当前阶段和创建人追溯字段。第 8 阶段推进完成后，项目 `status` 为 `completed`，当前阶段为空。

### Advance Current Project Stage

```http
POST /api/projects/{projectId}/stages/advance
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工推进项目当前阶段。该接口必须携带登录态，只做 `requireAuth`，不做项目经理角色权限、复杂权限、角色权限或轻角色校验。

接口不接收、不信任目标阶段、目标阶段顺序或目标阶段标识。服务端只根据当前阶段自动推进到下一顺序阶段，不支持跳阶段、回退、批量推进或自由指定阶段。

推进前只检查当前阶段适用必填资料齐套门禁。当前阶段必须已经存在项目级阶段资料项记录；如果当前阶段没有任何资料项记录，系统会认为阶段资料清单尚未初始化并拒绝推进，历史项目应先执行资料清单补初始化。

- 只统计 `isRequired = true` 且 `isApplicable = true` 的资料项
- `confirmed` 计为完成
- `not_submitted`、`submitted` 和 `returned` 计为未完成
- 建议资料项和不适用资料项不计入门禁
- 只有当前阶段资料项记录存在、但适用必填资料数为 0 时，`requiredTotal = 0` 才视为齐套
- `incompleteRequiredCount = 0` 时允许推进
- `incompleteRequiredCount > 0` 时拒绝推进，并返回缺失适用必填资料列表，每项至少包含 `id`、`documentCode`、`documentName` 和 `status`

推进成功后在事务中更新阶段状态。非第 8 阶段时，当前阶段更新为 `completed`、`isCurrent = false` 并记录 `completedAt`，下一阶段必须存在、顺序为当前阶段加一、`stageStatus = not_started`、`isCurrent = false`，然后更新为 `current`、`isCurrent = true` 并记录 `startedAt`。第 8 阶段 `closeout` 推进成功后，项目 `status` 更新为 `completed`，且不再有当前阶段。

推进成功后会在同一事务中写入 `stage.advanced` 项目业务操作日志。第 8 阶段推进完成项目时，会额外写入 `project.completed`。两类日志都使用当前登录用户作为 `actorUserId`；如果业务日志写入失败，阶段推进会回滚。

只要项目 `status = completed`，接口必须拒绝继续推进；即使异常数据中仍存在当前阶段，也不得修改项目状态或任何阶段状态。阶段推进失败时事务回滚，不改变项目状态或任何阶段状态。

齐套门禁只基于当前手工状态和人工适用性判断，不代表文件已上传、文件已归档或在线表单已提交。

### Stage Document Checklist

```http
GET /api/projects/{projectId}/stage-document-checklist
```

按 8 阶段顺序分组返回项目阶段资料清单。模板来源为 `docs/9.2_阶段资料清单与责任角色表.md`，第一版共 48 项资料项。

该接口必须携带登录态，只做 `requireAuth`，不使用 `requirePlatformAdmin`，不做项目权限、资料权限、角色权限、复杂权限或轻角色校验。该限制用于保护清单中返回的资料责任人信息，避免未登录用户绕过责任人候选用户接口读取 `responsibleUser`。

每个资料项包含资料编号、资料项名称、是否必填、默认责任角色、确认角色、提交方式、`targetFolderPath`、`targetFolderId`、基础状态和适用性。第一版只保存 `targetFolderPath`，`targetFolderId` 保持为空，待后续文件管理平台真实联动时再回填目录 ID。

查询结果同时返回资料项状态追溯字段：`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt` 和 `returnReason`。

查询结果同时返回资料项适用性字段和追溯字段：`isApplicable`、`notApplicableByUserId`、`notApplicableAt`、`notApplicableReason`、`restoredApplicableByUserId` 和 `restoredApplicableAt`。

查询结果同时返回资料项责任人字段和最近一次责任人变更追溯字段：`responsibleUserId`、`responsibleUser`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`。未分配责任人时 `responsibleUserId` 和 `responsibleUser` 为空。已分配责任人后来被禁用时，清单仍返回该责任人信息，并通过 `responsibleUser.isEnabled = false` 标识。

`responsibleUser` 只包含 `id`、`account`、`name`、`department`、`role`、`isEnabled` 和可空 `filePlatformUserId`，不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

每个阶段分组同时包含 `completenessSummary`，表示基于当前手工状态和人工适用性判断的阶段必填资料齐套摘要。字段包括：

- `requiredTotal`: 该阶段适用必填资料项总数，只统计 `isRequired = true` 且 `isApplicable = true`
- `confirmedRequiredCount`: 状态为 `confirmed` 的适用必填资料项数量
- `incompleteRequiredCount`: 状态为 `not_submitted`、`submitted` 或 `returned` 的适用必填资料项数量
- `completionPercent`: 当 `requiredTotal > 0` 时按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算；当 `requiredTotal = 0` 时返回 `100`；第一版使用 0 到 100 的整数百分比
- `incompleteRequiredDocuments`: 未完成适用必填资料项列表，每项至少包含 `id`、`documentCode`、`documentName` 和 `status`

建议资料项和不适用资料项不计入 `completenessSummary` 的计数或百分比，但仍继续在资料清单中展示。该摘要只基于当前手工状态和人工适用性判断，不代表文件已上传、文件已归档或在线表单已提交。

### Stage Document Attachments

阶段资料附件接口均必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，不做项目成员权限、资料责任人权限、角色权限、复杂权限或轻角色校验。附件只属于数字化平台内部资料项附件管理，不调用文件管理平台，不回填 `targetFolderId`，不判断文件平台权限。

ID 参数必须严格为正整数。非法 `projectId` 返回 `INVALID_PROJECT_ID`，非法 `documentId` 返回 `INVALID_STAGE_DOCUMENT_ID`，非法 `attachmentId` 返回 `INVALID_ATTACHMENT_ID`。未登录时优先返回未登录错误；ID 格式校验优先于查库。合法项目不存在返回 `PROJECT_NOT_FOUND`，合法资料项不存在或不属于项目返回 `STAGE_DOCUMENT_NOT_FOUND`，合法附件不存在、已删除或不属于资料项返回 `ATTACHMENT_NOT_FOUND`。

上传接口使用 `multipart/form-data`，第一版只接受一个名为 `file` 的文件字段，多个 `file` 字段直接拒绝，避免一次请求对应多份附件的语义歧义。单文件大小上限固定为 50MB，0 字节文件会被拒绝。缺失 `file` 字段、文件字段名不是 `file`、缺少文件名、清理路径后的文件名为空、文件名超过 255 字符、MIME 类型超过 255 字符、0 字节、超过 50MB、multipart 解析失败或其他文件参数非法均统一返回 `INVALID_ATTACHMENT_FILE`；MIME 类型为空时按 `application/octet-stream` 保存。不适用资料项拒绝新增上传并返回 `STAGE_DOCUMENT_NOT_APPLICABLE`；资料项被标记不适用前已有且未删除的附件仍可列表展示、下载和删除。

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary>
```

上传成功后返回附件展示字段，并在同一事务中写入 `document.attachment_uploaded` 项目业务日志。日志详情包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`。文件写入失败不会保存附件记录或业务日志；日志写入失败会回滚附件记录，并尽量清理临时文件或孤立文件。

```http
GET /api/projects/{projectId}/stage-documents/{documentId}/attachments
Authorization: Bearer <token>
```

返回当前未删除附件，按 `uploadedAt DESC, id DESC` 排序。每项包含 `id`、`originalFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt` 和 `uploadedByUser`；`uploadedByUser` 至少包含 `id`、`account` 和 `name`。响应不返回 `passwordHash`、`password_hash`、`isPlatformAdmin`、`is_platform_admin`、后端绝对路径、内部存储目录、临时文件路径、`storageKey` 或 `storedFileName`。

```http
GET /api/projects/{projectId}/stage-documents/{documentId}/attachments/{attachmentId}/download
Authorization: Bearer <token>
```

下载存在、未删除且属于当前资料项的附件，使用 `originalFileName` 作为可读下载名。附件记录存在但实际文件丢失时返回 `ATTACHMENT_FILE_MISSING`。下载不写项目业务日志、文件下载日志或全局审计日志。

```http
DELETE /api/projects/{projectId}/stage-documents/{documentId}/attachments/{attachmentId}
Authorization: Bearer <token>
```

删除使用软删除，写入 `deletedByUserId` 和 `deletedAt`，删除后列表不再返回该附件。删除成功会在同一事务中写入 `document.attachment_deleted` 项目业务日志；删除失败不写日志。

附件上传、下载和删除均不改变资料 `status`、状态追溯字段、适用性、适用性追溯字段、阶段齐套摘要计算口径或项目阶段推进状态。上传附件不等于资料已提交或已确认，不自动推进阶段，也不代表已经完成文件管理平台归档。

### My Stage Document Tasks

```http
GET /api/me/stage-document-tasks?status=pending&projectId=123
Authorization: Bearer <token>
```

查询当前登录用户负责的阶段资料项任务。该接口必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，不引入复杂权限、项目成员权限、资料权限、角色权限或轻角色校验；服务端只使用当前登录态中的用户 ID，不接收或信任前端传入责任人 ID。

接口只返回 `responsible_user_id = 当前登录用户 id` 且 `is_applicable = 1` 的资料项。默认 `status=pending`，包含 `not_submitted`、`submitted` 和 `returned`；也支持 `status=not_submitted`、`status=submitted`、`status=returned`、`status=confirmed`、`status=pending` 和 `status=all`。非法 `status` 返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`，HTTP 状态为 400。

`projectId` 为可选筛选参数；如果提供，必须是严格正整数，非数字、空字符串、0、负数、小数或 `1abc` 这类混合格式会返回 `INVALID_PROJECT_ID`，HTTP 状态为 400。合法 `projectId` 只作为过滤条件使用，不额外校验项目是否存在；没有匹配任务时返回空列表。

第一版不按项目状态、阶段状态或阶段是否当前过滤任务。只要资料项分配给当前登录用户、适用且状态符合筛选条件，就会进入结果；已完成项目或非当前阶段中的匹配资料项也按同一规则返回。

返回字段至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`。

排序固定在后端：先按状态优先级 `returned`、`not_submitted`、`submitted`、`confirmed`，同状态下按 `responsibilityUpdatedAt DESC` 且空值排后，再按 `projectCode ASC`、`stageOrder ASC`、`documentOrder ASC`、`documentId ASC` 稳定排序。

该接口是只读查询，不写项目业务操作日志，不改变资料状态、适用性、责任人、责任人追溯、齐套摘要、项目阶段或阶段推进状态。资料状态仍为手工标记状态，不代表文件已上传、文件已归档或在线表单已填写。

### Mark Stage Document Submitted

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/submit
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工将资料项标记为已提交。仅允许 `not_submitted` 或 `returned` 流转为 `submitted`。重新提交已退回资料项时会清空本次 `returnedByUserId`、`returnedAt` 和 `returnReason`。该接口只代表手工标记状态，不创建文件上传记录、在线表单记录或归档文件；成功后会在同一事务中写入 `document.submitted` 项目业务操作日志。

### Confirm Stage Document

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/confirm
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工将资料项确认通过。仅允许 `submitted` 流转为 `confirmed`。该接口只记录确认人和确认时间，不推进阶段、不生成管理层看板，也不基于文件上传或归档状态计算齐套率；阶段必填资料齐套摘要由清单查询接口基于当前手工状态只读返回。确认成功后会在同一事务中写入 `document.confirmed` 项目业务操作日志。

### Return Stage Document

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/return
Authorization: Bearer <token>
Content-Type: application/json

{
  "returnReason": "资料内容不完整，请补充后重新提交"
}
```

手工退回资料项。仅允许 `submitted` 流转为 `returned`，`returnReason` 必填且不能为空。该接口只记录退回人、退回时间和退回原因，不创建个人待办、不发送通知、不分配责任人。退回成功后会在同一事务中写入 `document.returned` 项目业务操作日志，`detailsJson` 包含 `returnReason`。

### Mark Stage Document Not Applicable

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/mark-not-applicable
Authorization: Bearer <token>
Content-Type: application/json

{
  "notApplicableReason": "合同范围不含软件部分"
}
```

手工将当前适用资料项标记为不适用，`notApplicableReason` 必填且不能为空。成功后写入 `notApplicableByUserId`、`notApplicableAt` 和 `notApplicableReason`，并清空 `restoredApplicableByUserId` 和 `restoredApplicableAt`。已不适用资料项不能重复标记不适用。

不适用是人工业务判断，用于说明该项目不需要该资料，不代表资料已提交、已确认、已上传或已归档。不适用资料项不能执行提交、确认或退回操作。

标记不适用成功后会在同一事务中写入 `document.marked_not_applicable` 项目业务操作日志，`detailsJson` 包含 `notApplicableReason`。

### Restore Stage Document Applicable

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/restore-applicable
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工将当前不适用资料项恢复为适用。成功后清空 `notApplicableByUserId`、`notApplicableAt` 和 `notApplicableReason`，并写入 `restoredApplicableByUserId` 和 `restoredApplicableAt`。恢复适用不会自动修改资料项原有 `status`。当前适用资料项不能重复恢复适用。

恢复适用成功后会在同一事务中写入 `document.restored_applicable` 项目业务操作日志。

### Assign Stage Document Responsible User

```http
PUT /api/projects/{projectId}/stage-documents/{documentId}/responsible-user
Authorization: Bearer <token>
Content-Type: application/json

{
  "responsibleUserId": 123
}
```

手工为项目级阶段资料项分配责任人。清空责任人时提交：

```json
{
  "responsibleUserId": null
}
```

该接口必须携带登录态，只做 `requireAuth`，不使用平台管理员边界，不做复杂权限、角色权限或轻角色校验。平台管理员标识仍只保护用户管理，不扩展为项目、资料或文件权限。

分配责任人时，`responsibleUserId` 必须是启用的数字化平台用户 ID；清空责任人时允许为 `null`。项目不存在返回 `PROJECT_NOT_FOUND`，资料项不存在或不属于当前项目返回 `STAGE_DOCUMENT_NOT_FOUND`，`responsibleUserId` 类型或格式非法返回 `INVALID_RESPONSIBLE_USER_ID`，分配用户不存在或已禁用返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`。失败时不得改变资料项责任人、责任人追溯字段、资料状态、适用性或业务日志。

成功时更新 `responsibleUserId`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`，并在同一事务中写入 `document.responsible_changed` 项目业务操作日志。`detailsJson` 至少包含 `documentId`、`documentCode`、`documentName`、`fromResponsibleUserId` 和 `toResponsibleUserId`。日志写入失败时责任人变更回滚。

资料责任人是人工业务分配，不代表权限控制、个人待办、通知或文件权限，不触发文件管理平台联动、在线表单或管理层看板。

### Project Operation Logs

```http
GET /api/projects/{projectId}/operation-logs
Authorization: Bearer <token>
```

查询项目维度业务操作日志。该接口必须携带登录态，只做 `requireAuth` 和项目存在校验，不做复杂权限、角色权限或轻角色校验。

返回该项目最近业务日志，按 `createdAt DESC, id DESC` 稳定倒序排列。第一版固定最大返回 100 条，并支持受限 `limit` 参数；非法 `limit` 会返回稳定校验错误，不允许一次性返回无限数据。

每条日志包含：

- `id`
- `projectId`
- `actorUserId`
- `actorUser`
- `actionType`
- `targetType`
- `targetId`
- `summary`
- `detailsJson`
- `createdAt`

第一版记录的 `actionType` 包括 `project.created`、`document.submitted`、`document.confirmed`、`document.returned`、`document.marked_not_applicable`、`document.restored_applicable`、`document.responsible_changed`、`document.attachment_uploaded`、`document.attachment_deleted`、`stage.advanced` 和 `project.completed`。所有日志必须归属于项目，操作人来自当前登录态，不信任前端提交的操作人。

业务日志写入与项目创建、资料状态/适用性操作、阶段推进等业务状态变更在同一事务中提交；日志写入失败时业务状态变更回滚。失败操作不记录日志。历史补初始化、模板初始化、系统脚本动作和本能力上线前已发生的业务动作不补写历史日志。
