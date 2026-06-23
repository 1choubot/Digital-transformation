## Context

系统已经具备项目、8 阶段、阶段资料清单、资料状态流转、适用性、齐套摘要、阶段推进、业务日志、资料责任人分配、我的资料任务、项目总览和项目详情页模块化结构。阶段资料项目前仍缺少实际附件管理能力，导致“资料状态”只能表示手工标记，无法承载用户上传的资料文件。

本变更只设计数字化平台内部的阶段资料附件能力。第一版附件属于资料项的附属文件记录，不调用文件管理平台，不做文件权限判断，不做在线表单，不做自动提交或自动确认。

## Goals / Non-Goals

**Goals:**

- 为每个 `project_stage_document` 支持上传、查看、下载和删除附件。
- 附件接口均要求登录态，第一版不引入平台管理员、项目成员、资料责任人或复杂权限校验。
- 上传和删除附件成功后记录项目业务操作日志，并与附件记录变更保持事务一致。
- 项目详情页阶段资料清单展示附件区域，并支持附件上传、下载和删除。
- 保持附件操作与资料状态、适用性、齐套摘要、阶段推进解耦。

**Non-Goals:**

- 不做文件管理平台真实联动、文件夹同步、文件权限判断或归档回写。
- 不做在线表单、表单草稿、表单生成归档文件。
- 不做资料自动提交、自动确认或自动推进阶段。
- 不做复杂权限、项目成员权限、资料责任人权限或部门权限。
- 不做附件预览、断点续传、多版本管理、病毒扫描、对象存储、跨项目附件统计。
- 不修改、完成或归档 `define-digital-platform-v1`。

## Decisions

### 附件数据模型

新增阶段资料附件持久化结构，建议表名为 `project_stage_document_attachments`。每条附件必须关联到一个项目级阶段资料项，建议字段包括：

- `id`
- `project_id`
- `stage_document_id`
- `original_file_name`
- `stored_file_name` 或 `storage_key`
- `mime_type`
- `file_size`
- `uploaded_by_user_id`
- `uploaded_at`
- `deleted_by_user_id`
- `deleted_at`

`project_id` 用于项目维度日志和查询校验，`stage_document_id` 是附件归属的核心外键。第一版采用软删除，删除后保留记录和存储标识，列表默认只返回 `deleted_at IS NULL` 的有效附件。

### 文件存储策略

第一版使用数字化平台本地后端可控存储目录或等价内部存储，不接入对象存储、S3、OSS 或文件管理平台。`stored_file_name` 或 `storage_key` 必须由后端生成，不能直接信任前端文件名作为存储路径。下载时后端根据附件记录定位文件，并设置安全的下载文件名。

### 上传文件限制

第一版必须设置单文件大小上限，固定为 50MB。上传文件必须大于 0 字节，0 字节文件必须拒绝。缺失文件、0 字节文件、超过 50MB 的文件和其他文件参数非法情况统一返回 `INVALID_ATTACHMENT_FILE`，不新增 `FILE_TOO_LARGE`，避免第一版错误码分散。

### 接口路径

建议新增接口：

- `POST /api/projects/:projectId/stage-documents/:documentId/attachments`
- `GET /api/projects/:projectId/stage-documents/:documentId/attachments`
- `GET /api/projects/:projectId/stage-documents/:documentId/attachments/:attachmentId/download`
- `DELETE /api/projects/:projectId/stage-documents/:documentId/attachments/:attachmentId`

所有接口必须 `requireAuth`。第一版不得使用 `requirePlatformAdmin`，不得实现项目成员权限、资料责任人权限、角色权限或轻角色校验。

### ID 参数校验和错误优先级

`projectId`、`documentId` 和 `attachmentId` 必须使用严格正整数校验。非数字、空字符串、0、负数、小数和混合格式均为非法，不能用宽松 `parseInt` 放过 `1abc` 或 `1.5`。

稳定错误码固定为：

- `INVALID_PROJECT_ID`：`projectId` 格式非法。
- `INVALID_STAGE_DOCUMENT_ID`：`documentId` 格式非法。
- `INVALID_ATTACHMENT_ID`：`attachmentId` 格式非法。

校验优先级固定为：

1. 登录态优先于业务参数校验；未登录、登录态无效或过期时先返回 401 或既有未登录错误口径。
2. ID 格式校验优先于查库；ID 非法时不得查询项目、资料项或附件。
3. `projectId` 合法但项目不存在时返回 `PROJECT_NOT_FOUND`。
4. `documentId` 合法但资料项不存在或不属于该项目时返回 `STAGE_DOCUMENT_NOT_FOUND`。
5. `attachmentId` 合法但附件不存在、已删除或不属于该资料项时返回 `ATTACHMENT_NOT_FOUND`。

### 资料项和适用性校验

接口必须先校验项目存在、资料项存在且属于该项目。建议稳定错误码：

- `INVALID_PROJECT_ID`：`projectId` 格式非法。
- `INVALID_STAGE_DOCUMENT_ID`：`documentId` 格式非法。
- `INVALID_ATTACHMENT_ID`：`attachmentId` 格式非法。
- `PROJECT_NOT_FOUND`：项目不存在。
- `STAGE_DOCUMENT_NOT_FOUND`：资料项不存在或不属于该项目。
- `STAGE_DOCUMENT_NOT_APPLICABLE`：上传附件时资料项已标记不适用。
- `ATTACHMENT_NOT_FOUND`：附件不存在、不属于该资料项或已删除。
- `ATTACHMENT_FILE_MISSING`：附件记录存在但实际文件丢失，下载失败。
- `INVALID_ATTACHMENT_FILE`：上传文件缺失或文件参数非法。

第一版不适用资料项拒绝新增附件上传，避免“不需要该资料”与“继续补充附件”产生业务歧义。资料项被标记不适用前已存在且未删除的历史附件不会自动删除，仍可列表展示、下载和删除；前端必须禁用或隐藏上传入口并提示“不适用资料项不能新增附件”，但不能隐藏已有附件。

### 附件列表字段和排序

附件列表每项至少返回 `id`、`originalFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt` 和 `uploadedByUser`。`uploadedByUser` 至少包含 `id`、`account` 和 `name`。

附件列表不得返回 `passwordHash`、`password_hash`、`isPlatformAdmin`、`is_platform_admin`、后端绝对路径、内部存储目录、临时文件路径，或可绕过下载接口直接访问文件的 `storageKey` / `storedFileName`。

附件列表按 `uploadedAt DESC, id DESC` 稳定排序。

### 业务日志

附件上传成功后写入：

- `action_type = document.attachment_uploaded`
- `target_type = stage_document`
- `target_id = stageDocumentId`

附件删除成功后写入：

- `action_type = document.attachment_deleted`
- `target_type = stage_document`
- `target_id = stageDocumentId`

`details_json` 至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName`、`fileSize`。下载第一版不写业务日志，避免高频下载行为污染项目业务日志。

附件记录变更和业务日志写入必须在同一事务中提交。上传附件时不得出现“数据库附件记录成功但业务日志缺失”的结果，也不得出现“数据库附件记录成功但文件实际不可下载”的成功结果。文件写入失败时不得保存附件记录和业务日志。日志写入失败时必须回滚附件上传记录或删除标记。上传文件二进制写入与数据库事务无法完全原子时，实现在数据库事务失败后必须尽量清理已写入的临时文件或孤立文件，并确保数据库不出现成功附件记录。

### 前端交互

项目详情页阶段资料清单资料项中新增附件区域。页面可以在加载资料清单后按资料项加载附件列表，也可以在展开资料项附件区域时加载附件列表；上传或删除成功后必须刷新对应附件列表，并刷新业务日志。下载通过附件下载接口触发。

页面文案必须明确：附件上传只是资料项附件管理，不等于资料已确认，不自动推进阶段，不代表已经完成文件管理平台归档。

## Risks / Trade-offs

- 本地文件存储无法提供对象存储级别的可靠性和扩展能力。缓解：第一版只做最小闭环，使用 `storage_key` 抽象存储标识，为后续迁移对象存储或文件管理平台保留接口空间。
- 数据库事务和文件系统写入不能天然原子。缓解：先写临时文件或后端生成存储 key，事务失败后清理文件；下载以数据库记录为准并处理文件丢失错误。
- 不做复杂权限会让所有登录用户可操作附件。缓解：这是第一版明确边界，后续项目成员权限或资料责任人权限必须另起 change 设计。
- 附件上传不自动改变资料状态可能让用户误以为上传即完成。缓解：前端和 README 必须明确附件不等于提交、确认或归档。

## Migration Plan

- 新增迁移创建 `project_stage_document_attachments` 或等价表结构，不回填历史附件。
- 新增文件存储目录配置和运行时目录检查。
- 新增附件接口、日志动作和前端附件区域。
- 回滚时可隐藏前端附件入口并停止调用附件接口；已保存附件记录保留，不影响资料状态、适用性、齐套摘要和阶段推进。
