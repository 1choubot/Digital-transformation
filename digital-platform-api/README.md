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
- 用户组织角色和部门枚举：`organizationRole` 区分总经理、系统管理员、总经理助理、中心负责人、员工；`role` 保留为岗位/职务文本
- `system_admin` 必须对应 `isPlatformAdmin = true`；初始化账号默认保存/恢复为启用系统管理员和平台管理员
- 用户管理操作至少保留一个同时满足 `isEnabled = true`、`organizationRole = system_admin`、`isPlatformAdmin = true` 的账号
- 项目创建要求登录，并记录 `createdByUserId`；项目编号 `projectCode` 可为空，第一版仅允许总经理和中心负责人创建项目，员工、总经理助理和系统管理员创建会返回 `FORBIDDEN_OPERATION`
- 项目模式：`self_developed` 自研模式、`outsourced` 供应链/外包模式，两者共用同一 8 阶段和当前默认 v20260629 71 项资料模板
- 项目经理用户关联：项目创建以 `projectManagerUserId` 为准，响应返回 `projectManagerUser`；旧 `projectManager` 文本仅为展示兼容
- 项目列表和详情返回创建人追溯字段、项目模式和项目经理用户字段，兼容历史项目创建人或项目经理用户为空
- 阶段资料项模板和项目级阶段资料清单；新建项目默认使用内置 v20260629 71 项模板快照并写入 `completionMode`
- 项目创建后自动初始化标准 8 阶段和 v20260629 71 项阶段资料清单；已有 20260625 64 项旧项目保持既有资料记录，不迁移、不补初始化
- 开发库如需重建模拟阶段资料，可执行 reset 兼容脚本清空模拟资料后再运行 `npm run init-stage-documents`；文件平台联动、旧项目迁移和兼容资料区删除不在本能力范围
- `GET /api/projects/:projectId/stage-document-checklist` 按 8 阶段分组查询资料清单
- 资料项手工状态流转按 `completionMode` 分流：`submit_only` 提交/上传后派生完成；`approval_required` 提交后待审核、审核通过后完成；`conditional_submit` 复用 `isApplicable` 表达未触发/已触发
- 资料项手工适用性标记：标记不适用、恢复适用，并记录不适用/恢复适用追溯字段
- 阶段资料清单查询返回基于 `completionMode` 派生完成状态和人工适用性判断的阶段适用门禁资料齐套摘要
- 阶段资料项责任人手工分配：候选用户仅包含启用的中心负责人或员工；项目经理、总经理以及本中心相关资料的中心负责人可按第一版权限边界分配/清空责任人
- 阶段资料附件：资料项附件上传、列表、下载和软删除均按资料项级权限判断，上传/删除写入业务日志；当前阶段附件保存在在线平台，不调用文件管理平台，不产生归档状态
- 我的工作台查询：登录用户可集中查看资料责任、资料审核和阶段推进三类待办；不返回 `stage_gate_approval`
- 项目总览看板：登录用户可只读查看跨项目汇总指标、当前阶段齐套摘要和未完成适用资料
- 项目编号后置填写：`1.2 项目立项审批表` 审核通过且 `1.3 项目立项通知` 提交/上传后，允许按既有权限填写或更新非空唯一项目编号
- 项目阶段手工推进接口：项目经理可在自己负责项目当前阶段适用资料按 `completionMode` 完成后推进；本中心相关项目的中心负责人或总经理也可推进；不要求阶段关口审批 `approved`
- 项目维度业务操作日志：记录项目创建、资料提交/完成、资料级审核状态流转、资料适用性变更、资料责任人变更、阶段推进和项目完成等成功业务动作

不包含日报周报、文件管理平台联动、自动通知、复杂 RBAC、项目成员表、技术负责人表、项目参与人表、完整审批流引擎、项目级审批单、审批节点配置器、项目类型模板、自动批量标记不适用、阶段回退、跳阶段、批量推进、在线表单填写、表单草稿、表单生成归档文件、文件管理平台上传/下载、附件预览、断点续传、多版本管理、病毒扫描、对象存储、全局审计日志、系统配置日志、登录日志、用户管理操作日志、文件平台日志、文件下载日志、管理层大屏图表、日志筛选导出、复杂分页、日志权限矩阵、基于文件上传/归档状态的齐套率、阶段推进操作人完整日志、复杂菜单权限、文件平台用户同步、权限同步、下载权限判断、部门权限继承、SSO 或细粒度按钮权限，也不读取、共用或迁移文件管理平台数据库。

后端项目和阶段资料仓储按能力拆分为更小模块。`src/repositories/projectRepository.js` 和 `src/repositories/stageDocumentRepository.js` 保留为兼容出口；项目基础、阶段推进、项目总览、阶段资料清单、状态流转、适用性、责任人、我的工作台和资料项级附件权限等实现位于对应子模块中。该拆分仅调整代码结构，不改变 API、数据库、权限、错误码或用户可见业务行为。

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

5. 初始化当前默认 v20260629 阶段资料清单模板：

```bash
npm run init-stage-documents
```

该命令会创建阶段资料模板表和项目级资料清单表，并 upsert 当前默认 v20260629 71 项 active 模板；后端运行不依赖部署包包含 `docs` 目录或固定 md 路径。v20260629 快照校验 `submit_only 35`、`approval_required 29`、`conditional_submit 7`、`conditional_approval 0`。已有 20260625 64 项旧项目不迁移、不补初始化、不改写资料状态、责任人或附件；项目已有阶段资料记录时，`init-stage-documents` 保持 no-op，不会重复生成 71 项。`3.3`、`5.4`、`LC33`、`LC54` 只属于旧项目 workspace 兼容输出，不进入新项目 71 项模板。非立项阶段默认仍走文件上传/附件上传，`1.1 / 1.2 / 1.3` 继续走在线表单和 `1.2` 专用评价审批。文件平台联动、旧项目迁移和兼容资料区删除不在本 change 范围。

如果正式资料清单发生变更，必须同步更新内置模板快照、`EXPECTED_STAGE_DOCUMENT_ITEM_COUNT` 和模板初始化验证用例。

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

该迁移会为 `users` 增加 `is_platform_admin TINYINT(1) NOT NULL DEFAULT 0`。执行后应继续执行 `010_organization_roles_project_governance.sql` 并重新运行 `npm run init-auth`，初始化账号会保存/恢复为 `organizationRole = system_admin`、`isPlatformAdmin = true` 且 `isEnabled = true`，避免升级后无人可管理。全新环境运行 `npm run init-auth` 时也会创建或补齐该字段。

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

12. 现有环境如已执行过 `009_stage_document_attachments.sql`，需要继续在 MySQL 中执行组织角色和项目治理迁移：

```bash
migrations/010_organization_roles_project_governance.sql
```

该迁移会为 `users` 增加 `organization_role`，允许总经理、系统管理员和总经理助理的 `department` 为空；为 `projects` 增加 `project_mode` 和 `project_manager_user_id`。执行后应重新运行 `npm run init-auth`，初始化账号会保存/恢复为 `organizationRole = system_admin`、`isPlatformAdmin = true`、`isEnabled = true`。

13. 现有环境如已执行过 `010_organization_roles_project_governance.sql`，需要继续在 MySQL 中执行阶段审批流迁移：

```bash
migrations/011_project_stage_approval_workflow.sql
```

该迁移会为 `project_stages` 增加 `approval_status`，默认 `not_submitted`；并创建 `project_stage_approval_history` 表保存阶段级审批历史。第一版审批历史的 `stage_id` 必须非空，审批历史按 `created_at ASC, id ASC` 查询。迁移不修改 8 阶段定义或阶段资料模板版本。

14. 现有环境如已执行过 `011_project_stage_approval_workflow.sql`，需要继续在 MySQL 中执行阶段资料归属中心迁移：

```bash
migrations/012_stage_document_ownership_departments.sql
```

该迁移只为阶段资料模板和项目级阶段资料快照新增 `owner_department`、`review_department` 列。执行后需要重新运行：

```bash
npm run init-stage-documents
```

原因是项目资料的 `owner_department` / `review_department` 写入依赖 `npm run init-stage-documents` 中的模板 upsert/backfill 逻辑；仅执行 012 只会新增空列，不会自动补齐既有项目资料归属中心。

15. 当前模拟库需要清空阶段资料并按默认模板重建时，先执行迁移，再使用历史命名的 reset 兼容脚本清空模拟资料，最后按当前默认模板初始化：

```bash
npm run migrate-online-platform-internal-flow
npm run reset-stage-documents-v20260625
npm run init-stage-documents
npm run check
```

`migrate-online-platform-internal-flow` 会补齐 nullable `project_code` 和 `completion_mode` 字段。`reset-stage-documents-v20260625` 是历史命名/兼容脚本名，脚本名未改不代表默认模板口径回退到旧模板；它会确认当前连接库是 `digital_platform`，然后清理模拟库阶段资料快照、阶段资料附件记录、附件物理文件、阶段资料/阶段推进相关业务日志和旧模板，并将项目状态重置为 `normal`、第 1 阶段重置为 current、其他阶段重置为 not_started。附件物理文件清理使用 `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR` 指定的目录；未配置时清理默认的 `storage/stage-document-attachments`。reset 会清空该目录，且仅面向当前模拟数据；正式或非模拟环境不得执行。reset 后执行 `npm run init-stage-documents` 会按当前默认 v20260629 71 项模板初始化模拟项目资料。

16. 启动服务：

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
- `INITIAL_USER_DEPARTMENT`: 初始化用户部门；系统管理员初始化时会强制为空
- `INITIAL_USER_ROLE`: 初始化用户岗位/职务文本，默认 `系统管理员`
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
当前用户信息包含 `id`、`account`、`name`、`department`、`organizationRole`、`role`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId`。

### Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

返回当前登录用户基础信息，包含 `organizationRole`、`department`、`role` 和 `isPlatformAdmin`。姓名响应字段沿用安全用户模型 `name`。

### User Management

所有用户管理维护接口必须携带登录态，并要求当前用户同时满足 `organizationRole = system_admin` 和 `isPlatformAdmin = true`。系统管理员只默认管理账号、组织和基础配置，不扩展为项目审批、资料审批、阶段推进、文件权限或复杂 RBAC。中心负责人管理本中心员工的用户维护能力本 change 暂不实现，仍作为后续单独能力处理。

用户管理响应使用安全用户模型，包含 `id`、`account`、`name`、`department`、`organizationRole`、`role`、`isEnabled`、`isPlatformAdmin`、`filePlatformUserId`，不返回 `password_hash`、`passwordHash` 或其他密码内部字段。新增和编辑请求使用 `displayName`，数据库字段仍为 `display_name`，响应字段为 `name`。`role` 是岗位/职务展示文本，不是组织角色。`organizationRole` 是系统权限角色；普通业务页面应以姓名作为主文本、部门和岗位作为辅助文本，组织角色只用于用户管理、权限说明或必要的审批角色上下文。

组织角色枚举为 `general_manager`、`system_admin`、`general_manager_assistant`、`center_manager`、`employee`。业务部门枚举为 `operations_center`、`marketing_center`、`manufacturing_center`、`rd_center`。总经理、系统管理员、总经理助理的 `department` 必须为空；中心负责人和员工必须隶属于四个业务部门之一。`system_admin` 必须同时 `isPlatformAdmin = true`，且 `isPlatformAdmin = true` 只能用于系统管理员组织角色。

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
  "department": "rd_center",
  "organizationRole": "employee",
  "role": "软件工程师",
  "password": "Initial@123",
  "isEnabled": true,
  "isPlatformAdmin": false,
  "filePlatformUserId": null
}
```

新增用户时 `account`、`displayName`、`organizationRole`、`role`、`password` 必填，部门是否必填取决于组织角色；`account` 必须唯一；`isEnabled` 默认 `true`，`isPlatformAdmin` 默认 `false`，`filePlatformUserId` 可为空且不会调用文件管理平台校验。

```http
PATCH /api/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "张三",
  "department": "rd_center",
  "organizationRole": "employee",
  "role": "软件工程师",
  "isEnabled": true,
  "isPlatformAdmin": false,
  "filePlatformUserId": null
}
```

普通编辑只允许修改 `displayName`、`department`、`organizationRole`、`role`、`isEnabled`、`isPlatformAdmin`、`filePlatformUserId`。不得通过普通编辑接口修改 `account`、`password`、`passwordHash` 或 `password_hash`，否则返回稳定错误。

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

启用/禁用用户和重置密码都只由系统管理员执行。禁用用户不能建立新登录态；当前已登录用户被禁用后的会话处理沿用现有 `requireAuth` / `isEnabled` 校验，不新增强制踢下线能力。

禁用用户、取消 `isPlatformAdmin`、编辑 `organizationRole` / `isEnabled` / `isPlatformAdmin` 时，系统必须至少保留一个同时满足 `isEnabled = true`、`organizationRole = system_admin`、`isPlatformAdmin = true` 的用户；如果操作会导致 0 个启用系统管理员，返回 `LAST_ENABLED_SYSTEM_ADMIN_REQUIRED` 且不保存本次修改。

### Responsibility Candidates

```http
GET /api/users/responsibility-candidates
Authorization: Bearer <token>
```

返回资料项责任人选择用的启用用户候选列表。该接口只要求登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，也不得被用户管理维护路由的平台管理员中间件包住。

候选用户只返回启用用户，且 `organizationRole` 必须是 `center_manager` 或 `employee`，`department` 必须是四个业务部门之一。总经理、系统管理员、总经理助理和禁用用户不会进入候选列表。

候选用户只包含 `id`、`account`、`name`、`department`、`organizationRole`、`role` 和可空 `filePlatformUserId`。响应不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

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
  "projectCode": null,
  "projectName": "示例项目",
  "customerName": "示例客户",
  "projectMode": "self_developed",
  "projectManagerUserId": 123,
  "participatingDepartments": ["rd_center", "manufacturing_center"],
  "plannedStartDate": "2026-05-17",
  "plannedEndDate": "2026-12-31",
  "remark": "首批项目核心能力验证"
}
```

成功后返回项目主数据和初始化后的 8 个阶段。创建人由后端根据登录态写入 `createdByUserId`，不会信任前端提交的创建人字段。创建成功后会在同一事务中写入 `project.created` 项目业务操作日志；如果业务日志写入失败，项目创建会整体回滚。

`projectCode` 创建时允许省略、传 `null` 或传空字符串，后端会保存为空。正式项目编号在 `1.2 项目立项审批表` 已按 `approval_required` 审核通过，且 `1.3 项目立项通知` 已按 `submit_only` 提交或上传后填写或生成；非空编号必须唯一，多个空编号允许共存。

创建项目是业务权限操作，第一版仅允许 `organizationRole = general_manager` 或 `center_manager`。`employee`、`general_manager_assistant` 和 `system_admin` 直接调用会返回 `FORBIDDEN_OPERATION`，HTTP 403；失败时不得插入项目、阶段、阶段资料或成功业务日志。

`projectMode` 只允许 `self_developed` 或 `outsourced`，非法值返回 `INVALID_PROJECT_MODE`。两种模式共用同一 8 阶段和当前默认 v20260629 71 项资料模板，不改变 `completionMode`、适用性、附件规则或阶段推进门禁；已有 20260625 64 项旧项目仍按其项目级资料记录运行。

`participatingDepartments` 是四个业务部门稳定枚举数组，只允许 `operations_center`、`marketing_center`、`manufacturing_center`、`rd_center`。空值或空数组表示未配置参与部门，重复值会去重；中文部门名、未知值、非数组非空值返回 `INVALID_PARTICIPATING_DEPARTMENT`，HTTP 状态为 400。该字段不是中文展示文本，中心负责人项目可见范围会使用该枚举数组或本中心责任人资料判断本中心相关项目。

`projectManagerUserId` 是项目经理权威字段。非法 ID 返回 `INVALID_PROJECT_MANAGER_USER_ID`，用户不存在或已禁用返回 `PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED`，总经理、系统管理员、总经理助理等全局角色或无合法业务部门的用户返回 `PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED`。旧 `projectManager` 文本不得作为权限判断依据；如响应中保留该文本，只从 `projectManagerUser.name` 派生。

### List Projects

```http
GET /api/projects
```

该接口必须携带登录态，只做 `requireAuth`，并按当前用户过滤可见项目。总经理和总经理助理可查看全部项目；系统管理员不因系统管理身份自动获得业务项目查看权限；项目经理可查看自己负责项目；资料责任人可查看自己至少负责一项资料的项目；中心负责人可查看本中心相关项目；普通员工只能查看自己负责资料或自己作为项目经理的项目。返回项目编号、项目名称、客户、项目模式、项目经理用户、项目经理展示文本、状态、计划时间、当前阶段和创建人追溯字段；`projectCode` 可为空，前端应显示“待生成”或等价文案。

### Project Overview Dashboard

```http
GET /api/projects/overview-dashboard?status=normal&currentStageOrder=1&keyword=KRF
Authorization: Bearer <token>
```

查询项目总览看板。该接口必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，并按当前用户过滤可见项目；可见范围与项目列表一致。路由为 `/api/projects` 下的静态路由，必须先于 `/:projectId` 动态项目详情路由注册，避免 `overview-dashboard` 被当作项目 ID。

响应顶层包含 `summary` 和 `projects`。`summary` 包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`。前三个项目数量和 `riskProjects` 基于当前项目筛选后的结果统计，`riskProjects` 统计 `status = risk` 或 `status = delayed` 的项目；`myPendingStageDocumentTasks` 使用当前登录用户 ID，按资料责任人、`is_applicable = 1` 和 `completionMode` 派生完成状态统计当前用户全局待处理资料数量，已完成的 `submit_only + submitted` 不计入责任人处理数。

`projects` 每项至少包含 `projectId`、`projectCode`、`projectName`、`customerName`、`projectMode`、`projectManagerUserId`、`projectManagerUser`、`projectManager`、`status`、`currentStageId`、`currentStageName`、`currentStageOrder`、`currentStageStatus`、`currentStageCompletenessSummary`、`currentStageIncompleteRequiredDocuments`、`currentStageIssue`、`createdBy`、`plannedStartDate` 和 `plannedEndDate`。已完成项目允许当前阶段字段和齐套摘要为空；未完成项目缺失当前阶段时返回 `currentStageIssue = missing_current_stage`，存在多个当前阶段时返回 `multiple_current_stages`。当前阶段存在但该阶段没有任何项目级资料项记录时，返回 `currentStageCompletenessSummary = null`、`currentStageIncompleteRequiredDocuments = []` 和 `currentStageIssue = checklist_not_initialized`，接口不会自动初始化资料清单，也不会修复异常阶段数据。

当前阶段齐套摘要复用阶段资料清单口径，统计当前阶段所有 `isApplicable = true` 且参与推进门禁的适用资料项。完成状态按 `completionMode` 派生：`submit_only + submitted`、`approval_required + confirmed`、`conditional_submit + isApplicable=true + submitted` 计为完成；`approval_required + submitted`、`returned` 和其他未达到完成点的适用资料计为未完成；`conditional_submit + isApplicable=false` 不计入缺失或阻塞项。`requiredTotal` 字段名为兼容旧前端保留，当前语义是适用门禁资料总数。缺失资料项至少返回 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态。

筛选参数均为可选。`status` 只能是 `normal`、`risk`、`paused`、`delayed` 或 `completed`，非法值、空字符串或多值返回 `INVALID_PROJECT_STATUS_FILTER`，HTTP 状态为 400。`currentStageOrder` 必须是 1 到 8 的整数，非数字、空字符串、0、负数、小数、超过 8 或混合格式返回 `INVALID_STAGE_ORDER`，HTTP 状态为 400。`keyword` trim 后为空等同未提供，非空时按 `projectCode`、`projectName` 或 `customerName` 模糊筛选。合法筛选无匹配项目时返回空项目列表。

第一版不分页，项目列表按 `projectCode ASC, projectId ASC` 稳定排序，并兼容空项目编号。该接口是只读查询，不写业务操作日志，不改变项目状态、阶段状态、资料状态、适用性、责任人、齐套摘要或阶段推进状态。齐套率基于 `completionMode` 派生完成状态和人工适用性判断，不代表文件平台归档；本能力不做文件平台联动、在线表单、消息提醒、超期提醒、大屏图表、导出或批量操作。

### Project Detail

```http
GET /api/projects/{projectId}
```

该接口必须携带登录态，只做 `requireAuth`，并按当前用户校验项目可见性。无权访问具体项目时返回 `FORBIDDEN_OPERATION`，不伪装成项目不存在；项目确实不存在时仍返回 `PROJECT_NOT_FOUND`。返回项目基础信息、全部 8 个阶段、当前阶段和创建人追溯字段；`projectCode` 可为空。当前资料闭环不使用 `approvalStatus` 作为阶段推进门禁。第 8 阶段推进完成后，项目 `status` 为 `completed`，当前阶段为空。

### Legacy Stage Approval Workflow

这些阶段级审批接口属于旧实现兼容能力。当前在线平台内部资料闭环不再把泛化阶段关口审批作为项目推进前置，也不要求 `project_stages.approval_status = approved` 后才能推进。资料级 `approval_required` 审核仍通过阶段资料接口处理。

固定接口：

```http
POST /api/projects/{projectId}/stages/{stageId}/approval/submit
POST /api/projects/{projectId}/stages/{stageId}/approval/approve
POST /api/projects/{projectId}/stages/{stageId}/approval/return
POST /api/projects/{projectId}/stages/{stageId}/approval/resubmit
GET /api/projects/{projectId}/stages/{stageId}/approval/history
Authorization: Bearer <token>
```

如果后端为了历史数据仍保留这些接口，`PROJECT_APPROVAL_NOT_APPROVED`、`PROJECT_APPROVAL_NOT_SUBMITTABLE`、`PROJECT_APPROVAL_NOT_PENDING`、`PROJECT_APPROVAL_FORBIDDEN` 等错误码只作为兼容提示；当前正常流程和前端主入口不得引导用户提交、通过或退回阶段关口审批。

### Advance Current Project Stage

```http
POST /api/projects/{projectId}/stages/advance
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工推进项目当前阶段。该接口必须携带登录态，只做 `requireAuth`，并执行第一版权限边界：项目经理只能推进自己负责项目；中心负责人只能推进本中心相关项目；总经理可推进项目；总经理助理、系统管理员和普通非项目经理员工直接调用会返回 `FORBIDDEN_OPERATION`。

接口不接收、不信任目标阶段、目标阶段顺序或目标阶段标识。服务端只根据当前阶段自动推进到下一顺序阶段，不支持跳阶段、回退、批量推进或自由指定阶段。

推进前检查当前阶段适用资料 `completionMode` 齐套门禁，不检查泛化阶段关口审批状态。当前阶段必须已经存在项目级阶段资料项记录；如果当前阶段没有任何资料项记录，系统会认为阶段资料清单尚未初始化并拒绝推进。开发库项目可先执行 `npm run init-stage-documents` 初始化当前默认 v20260629 资料清单；旧项目资料不做兼容迁移。

- 统计当前阶段所有 `isApplicable = true` 且参与推进门禁的适用资料项
- `submit_only + submitted` 计为完成
- `approval_required + confirmed` 计为完成，`approval_required + submitted` 计为待审核且未完成
- `conditional_submit + isApplicable=false` 不计入缺失或阻塞项，`isApplicable=true` 后提交/上传才完成
- `returned` 始终计为未完成
- 只有当前阶段资料项记录存在、但适用门禁资料数为 0 时，`requiredTotal = 0` 才视为齐套
- `incompleteRequiredCount = 0` 时允许推进
- `incompleteRequiredCount > 0` 时拒绝推进，并返回缺失适用资料列表，每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

推进成功后在事务中更新阶段状态。非第 8 阶段时，当前阶段更新为 `completed`、`isCurrent = false` 并记录 `completedAt`，下一阶段必须存在、顺序为当前阶段加一、`stageStatus = not_started`、`isCurrent = false`，然后更新为 `current`、`isCurrent = true` 并记录 `startedAt`。第 8 阶段 `closeout` 推进成功后，项目 `status` 更新为 `completed`，且不再有当前阶段。

推进成功后会在同一事务中写入 `stage.advanced` 项目业务操作日志。第 8 阶段推进完成项目时，会额外写入 `project.completed`。两类日志都使用当前登录用户作为 `actorUserId`；如果业务日志写入失败，阶段推进会回滚。

只要项目 `status = completed`，接口必须拒绝继续推进；即使异常数据中仍存在当前阶段，也不得修改项目状态或任何阶段状态。阶段推进失败时事务回滚，不改变项目状态或任何阶段状态。

齐套门禁只基于当前资料状态、`completionMode` 和人工适用性判断，不代表文件平台归档或在线表单已提交。

### Stage Document Checklist

```http
GET /api/projects/{projectId}/stage-document-checklist
```

按 8 阶段顺序分组返回项目阶段资料清单，并按当前用户资料项权限过滤。后端运行使用内置 v20260629 71 项模板快照，新建项目初始化 71 项资料项，不在运行时依赖 docs 目录或 md 路径。已有 20260625 64 项旧项目继续返回其已有项目级资料记录，不迁移、不补初始化、不改写状态、责任人或附件。`3.3`、`5.4`、`LC33`、`LC54` 只作为旧项目 workspace 兼容输出，不进入新项目 71 项模板；旧 48 项模板、`v20260610` 54 项模板和 20260624 旧口径已废弃。

该接口必须携带登录态，只做 `requireAuth`，不使用 `requirePlatformAdmin`，并按当前用户校验项目可见性；无权访问具体项目时返回 `FORBIDDEN_OPERATION`。该限制用于保护清单中返回的资料责任人信息，避免未登录用户或无关用户绕过项目详情接口读取 `responsibleUser`。

每个资料项包含资料编号、资料项名称、是否必填、默认责任角色、确认角色、`ownerDepartment`、`reviewDepartment`、提交方式、`completionMode`、基础状态、派生完成状态和适用性。当前阶段不做文件管理平台真实联动，不要求 `targetFolderPath`、`targetFolderId` 或 folder mapping；如兼容返回这些字段，也不得触发文件平台调用。响应同时返回 `permissions`，包含 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument` 等后端计算的资料项权限字段。

查询结果同时返回资料项状态追溯字段：`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt` 和 `returnReason`。

查询结果同时返回资料项适用性字段和追溯字段：`isApplicable`、`notApplicableByUserId`、`notApplicableAt`、`notApplicableReason`、`restoredApplicableByUserId` 和 `restoredApplicableAt`。

查询结果同时返回资料项责任人字段和最近一次责任人变更追溯字段：`responsibleUserId`、`responsibleUser`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`。未分配责任人时 `responsibleUserId` 和 `responsibleUser` 为空。已分配责任人后来被禁用时，清单仍返回该责任人信息，并通过 `responsibleUser.isEnabled = false` 标识。

`responsibleUser` 只包含 `id`、`account`、`name`、`department`、`organizationRole`、`role`、`isEnabled` 和可空 `filePlatformUserId`，不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段。

每个阶段分组同时包含 `completenessSummary`，表示基于 `completionMode` 派生完成状态和人工适用性判断的阶段适用门禁资料齐套摘要。字段包括：

- `requiredTotal`: 兼容字段名，当前语义为该阶段适用门禁资料总数，统计 `isApplicable = true` 且参与推进门禁的资料项
- `completedRequiredCount`: 按 `completionMode` 派生为已完成的适用门禁资料数量
- `confirmedRequiredCount`: 兼容字段；如返回，其含义等同 `completedRequiredCount`，不得只统计 `status = confirmed`
- `incompleteRequiredCount`: 未按 `completionMode` 完成的适用门禁资料数量
- `completionPercent`: 当 `requiredTotal > 0` 时按 `round(completedRequiredCount / requiredTotal * 100)` 计算；当 `requiredTotal = 0` 时返回 `100`；第一版使用 0 到 100 的整数百分比
- `incompleteRequiredDocuments`: 未完成适用资料项列表，每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

`conditional_submit + isApplicable=false` 不计入 `completenessSummary` 的计数或百分比，但仍继续在资料清单中展示为未触发/不适用。该摘要只基于当前资料状态、完成规则和人工适用性判断，不代表文件平台归档或在线表单已提交。

### Stage Document Attachments

阶段资料附件接口均必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，并先按当前用户校验项目可见性，再按资料项级权限校验附件列表、下载、上传和删除。无权访问该项目或资料项附件时返回 `FORBIDDEN_OPERATION`，不得上传文件、不得新增附件记录、不得软删除附件、不得写成功业务日志。附件只属于数字化平台内部资料项附件管理，不调用文件管理平台，不回填 `targetFolderId`，不判断文件平台权限。

ID 参数必须严格为正整数。非法 `projectId` 返回 `INVALID_PROJECT_ID`，非法 `documentId` 返回 `INVALID_STAGE_DOCUMENT_ID`，非法 `attachmentId` 返回 `INVALID_ATTACHMENT_ID`。未登录时优先返回未登录错误；ID 格式校验优先于查库。合法项目不存在返回 `PROJECT_NOT_FOUND`，合法资料项不存在或不属于项目返回 `STAGE_DOCUMENT_NOT_FOUND`，合法附件不存在、已删除或不属于资料项返回 `ATTACHMENT_NOT_FOUND`。

上传接口使用 `multipart/form-data`，第一版只接受一个名为 `file` 的文件字段，多个 `file` 字段直接拒绝，避免一次请求对应多份附件的语义歧义。单文件大小上限固定为 50MB，0 字节文件会被拒绝。缺失 `file` 字段、文件字段名不是 `file`、缺少文件名、清理路径后的文件名为空、文件名超过 255 字符、MIME 类型超过 255 字符、0 字节、超过 50MB、multipart 解析失败或其他文件参数非法均统一返回 `INVALID_ATTACHMENT_FILE`；MIME 类型为空时按 `application/octet-stream` 保存。不适用资料项拒绝新增上传并返回 `STAGE_DOCUMENT_NOT_APPLICABLE`。第一版附件上传只允许该资料项 `responsibleUserId = 当前用户 id`，`canUploadAttachment` 不复用宽泛 `canSubmitStageDocument`；项目经理、中心负责人和总经理可以按权限查看、下载、审核或退回，但默认不能代上传。资料项被标记不适用前已有且未删除的附件仍可按权限列表展示、下载和删除。

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

返回当前未删除且当前用户有权查看的附件，按 `uploadedAt DESC, id DESC` 排序。每项包含 `id`、`originalFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt`、`uploadedByUser` 和附件操作权限；`uploadedByUser` 至少包含 `id`、`account` 和 `name`。响应不返回 `passwordHash`、`password_hash`、`isPlatformAdmin`、`is_platform_admin`、后端绝对路径、内部存储目录、临时文件路径、`storageKey` 或 `storedFileName`。

```http
GET /api/projects/{projectId}/stage-documents/{documentId}/attachments/{attachmentId}/download
Authorization: Bearer <token>
```

下载存在、未删除且属于当前资料项的附件，使用 `originalFileName` 作为可读下载名。附件记录存在但实际文件丢失时返回 `ATTACHMENT_FILE_MISSING`。下载不写项目业务日志、文件下载日志或全局审计日志。

```http
DELETE /api/projects/{projectId}/stage-documents/{documentId}/attachments/{attachmentId}
Authorization: Bearer <token>
```

删除使用软删除，写入 `deletedByUserId` 和 `deletedAt`，删除后列表不再返回该附件。删除必须同时满足：当前用户不是系统管理员或总经理助理、当前用户当前仍有该资料项附件访问权、当前用户是该附件上传人、资料未按 `completionMode` 派生完成。如果资料责任人已变更，旧责任人不能仅凭历史上传人身份删除当前无权附件。删除成功会在同一事务中写入 `document.attachment_deleted` 项目业务日志；删除失败不写日志。

附件上传、下载和删除均不改变资料 `status`、状态追溯字段、适用性、适用性追溯字段、阶段齐套摘要计算口径或项目阶段推进状态。上传附件不自动推进阶段，也不代表已经完成文件管理平台归档；资料是否完成以后端返回的 `completionMode` 派生完成状态为准。

### My Workbench

```http
GET /api/me/workbench
Authorization: Bearer <token>
```

查询当前登录用户的我的工作台。接口只使用当前登录态用户，不接收也不信任前端传入的用户 ID、责任人 ID、审核人 ID 或审批人 ID。响应包含 `summary` 和 `items`；`summary.byType` 只按 `document_responsibility`、`document_review`、`stage_advance` 统计数量，`summary.total` 为总待办数；当前阶段不返回 `stage_gate_approval`。

`document_responsibility` 只包含当前用户负责、适用且未按 `completionMode` 派生完成的资料项；`submit_only + submitted` 不计入责任人待办。`document_review` 只包含 `completionMode = approval_required` 且 `status = submitted` 并且当前用户具备资料级审核权限的资料项；项目经理不因项目经理身份获得资料级审核待办，总经理不默认接收全部资料审核待办。`stage_advance` 只包含当前阶段适用资料已按 `completionMode` 完成、项目未完成、非第 8 阶段且当前用户有推进权限的阶段；不因 `approval_status` 生成或隐藏。

每条待办至少包含 `type`、项目、阶段、可空资料项、`status`、`actionText`、`createdAt` 或 `updatedAt`、`targetRoute`。资料类待办同时返回后端计算的资料项权限字段，前端不得用 `organizationRole` 硬猜按钮权限。普通员工资料待办的 `targetRoute` 会进入携带 `taskMode` 和 `documentId` 的受限项目详情。

```http
GET /api/me/stage-document-tasks?status=pending&projectId=123
Authorization: Bearer <token>
```

查询当前登录用户负责的阶段资料项任务。该接口必须携带登录态，只做 `requireAuth`，不要求 `requirePlatformAdmin`，不引入复杂权限、项目成员权限、资料权限、角色权限或轻角色校验；服务端只使用当前登录态中的用户 ID，不接收或信任前端传入责任人 ID。

接口只返回 `responsible_user_id = 当前登录用户 id` 且 `is_applicable = 1` 的资料项。默认 `status=pending`，只包含未按 `completionMode` 派生完成的责任资料；也支持 `status=not_submitted`、`status=submitted`、`status=returned`、`status=confirmed`、`status=pending` 和 `status=all`。`status=submitted` 需要结合 `completionMode` 解读：`submit_only + submitted` 是已完成，`approval_required + submitted` 是待审核。非法 `status` 返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS`，HTTP 状态为 400。

`projectId` 为可选筛选参数；如果提供，必须是严格正整数，非数字、空字符串、0、负数、小数或 `1abc` 这类混合格式会返回 `INVALID_PROJECT_ID`，HTTP 状态为 400。合法 `projectId` 只作为过滤条件使用，不额外校验项目是否存在；没有匹配任务时返回空列表。

第一版不按项目状态、阶段状态或阶段是否当前过滤任务。只要资料项分配给当前登录用户、适用且状态符合筛选条件，就会进入结果；已完成项目或非当前阶段中的匹配资料项也按同一规则返回。

返回字段至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`completionMode`、`isComplete` 或 `completionStatus`、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`。

排序固定在后端：先按派生完成状态和基础状态排序，避免已完成的 `submit_only + submitted` 混入 pending；同状态下按 `responsibilityUpdatedAt DESC` 且空值排后，再按 `projectCode ASC`、`stageOrder ASC`、`documentOrder ASC`、`documentId ASC` 稳定排序。

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

手工将需审核资料项确认通过。仅允许 `completionMode = approval_required` 或未来 `conditional_approval` 且状态为 `submitted` 的资料流转为 `confirmed`。该接口只记录确认人和确认时间，不推进阶段、不生成管理层看板，也不基于文件上传或归档状态计算齐套率；阶段资料齐套摘要由清单查询接口基于 `completionMode` 派生完成状态只读返回。确认成功后会在同一事务中写入 `document.confirmed` 项目业务操作日志。

确认资料第一版仅允许资料责任人所属部门的中心负责人执行。跨中心中心负责人、总经理、总经理助理、系统管理员、普通员工以及仅因项目经理身份访问项目的用户直接调用会返回 `FORBIDDEN_OPERATION`。

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

退回资料第一版仅允许资料责任人所属部门的中心负责人执行。跨中心中心负责人、总经理、总经理助理、系统管理员、普通员工以及仅因项目经理身份访问项目的用户直接调用会返回 `FORBIDDEN_OPERATION`。

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

标记不适用第一版仅允许总经理或本中心相关资料的中心负责人执行。总经理助理、系统管理员、无关普通员工和跨中心中心负责人直接调用会返回 `FORBIDDEN_OPERATION`。权限拒绝时不得改变资料适用性、追溯字段、齐套摘要、阶段推进门禁或业务日志。

### Restore Stage Document Applicable

```http
POST /api/projects/{projectId}/stage-documents/{documentId}/restore-applicable
Authorization: Bearer <token>
Content-Type: application/json

{}
```

手工将当前不适用资料项恢复为适用。成功后清空 `notApplicableByUserId`、`notApplicableAt` 和 `notApplicableReason`，并写入 `restoredApplicableByUserId` 和 `restoredApplicableAt`。恢复适用不会自动修改资料项原有 `status`。当前适用资料项不能重复恢复适用。

恢复适用成功后会在同一事务中写入 `document.restored_applicable` 项目业务操作日志。

恢复适用第一版仅允许总经理或本中心相关资料的中心负责人执行。总经理助理、系统管理员、无关普通员工和跨中心中心负责人直接调用会返回 `FORBIDDEN_OPERATION`。权限拒绝时不得改变资料适用性、追溯字段、齐套摘要、阶段推进门禁或业务日志。

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

该接口必须携带登录态，只做 `requireAuth`，并执行第一版权限边界：项目经理可以分配或清空自己负责项目的资料责任人；中心负责人只能管理本中心相关资料，并且分配目标必须是本中心合法候选用户；总经理可分配合法候选用户；跨中心中心负责人、非该项目项目经理、普通员工、系统管理员和总经理助理直接调用会返回 `FORBIDDEN_OPERATION`。平台管理员标识仍只保护用户管理，不扩展为项目、资料或文件权限。

分配责任人时，`responsibleUserId` 必须是启用的中心负责人或员工，且必须隶属于四个业务部门之一；清空责任人时允许为 `null`。项目不存在返回 `PROJECT_NOT_FOUND`，资料项不存在或不属于当前项目返回 `STAGE_DOCUMENT_NOT_FOUND`，`responsibleUserId` 类型或格式非法返回 `INVALID_RESPONSIBLE_USER_ID`，分配用户不存在、已禁用或不是合法责任人候选返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`。失败时不得改变资料项责任人、责任人追溯字段、资料状态、适用性或业务日志。

成功时更新 `responsibleUserId`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`，并在同一事务中写入 `document.responsible_changed` 项目业务操作日志。`detailsJson` 至少包含 `documentId`、`documentCode`、`documentName`、`fromResponsibleUserId` 和 `toResponsibleUserId`。日志写入失败时责任人变更回滚。

资料责任人是人工业务分配，不代表权限控制、个人待办、通知或文件权限，不触发文件管理平台联动、在线表单或管理层看板。

### Project Operation Logs

```http
GET /api/projects/{projectId}/operation-logs
Authorization: Bearer <token>
```

查询项目维度业务操作日志。该接口必须携带登录态，只做 `requireAuth`，并按当前用户校验完整项目审计权限；第一版仅项目经理可查看自己负责项目的完整业务日志，总经理可查看全部项目完整业务日志。普通员工仅因负责资料项可见项目时不得读取整项目业务日志，直接调用返回 `FORBIDDEN_OPERATION`。该接口不做复杂权限、日志权限矩阵或轻角色配置。

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

第一版当前流程记录的 `actionType` 包括 `project.created`、`document.submitted`、`document.confirmed`、`document.returned`、`document.marked_not_applicable`、`document.restored_applicable`、`document.responsible_changed`、`document.attachment_uploaded`、`document.attachment_deleted`、`stage.advanced` 和 `project.completed`。历史库或 legacy 阶段审批兼容能力可能保留 `approval.*` 日志类型，但当前内部资料闭环不以阶段关口审批日志作为推进前置。所有日志必须归属于项目，操作人来自当前登录态，不信任前端提交的操作人。

业务日志写入与项目创建、资料状态/适用性操作、阶段推进等业务状态变更在同一事务中提交；日志写入失败时业务状态变更回滚。失败操作和历史兼容审批查询不记录成功日志。历史补初始化、模板初始化、系统脚本动作和本能力上线前已发生的业务动作不补写历史日志。
