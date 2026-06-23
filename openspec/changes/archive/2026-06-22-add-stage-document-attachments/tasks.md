## 1. 数据库与存储

- [x] 1.1 新增阶段资料附件迁移，创建 `project_stage_document_attachments` 或等价表结构
- [x] 1.2 附件记录关联 `project_id` 和 `stage_document_id`，并保存原始文件名、存储标识、MIME 类型、文件大小、上传人、上传时间、删除人和删除时间
- [x] 1.3 为附件归属、有效附件查询和软删除查询增加必要索引
- [x] 1.4 更新全新环境建表或初始化逻辑，确保阶段资料附件表可在新环境创建
- [x] 1.5 设计并实现后端本地附件存储目录或等价内部存储路径，确保存储 key 由后端生成
- [x] 1.6 确认第一版不接入对象存储、S3、OSS、文件管理平台或病毒扫描服务
- [x] 1.7 设置第一版单文件大小上限为 50MB
- [x] 1.8 明确并实现拒绝 0 字节附件文件

## 2. 后端附件接口

- [x] 2.1 新增附件仓储或服务，封装附件创建、有效列表、下载定位和软删除逻辑
- [x] 2.2 实现 `POST /api/projects/:projectId/stage-documents/:documentId/attachments`
- [x] 2.3 实现 `GET /api/projects/:projectId/stage-documents/:documentId/attachments`
- [x] 2.4 实现 `GET /api/projects/:projectId/stage-documents/:documentId/attachments/:attachmentId/download`
- [x] 2.5 实现 `DELETE /api/projects/:projectId/stage-documents/:documentId/attachments/:attachmentId`
- [x] 2.6 所有附件接口必须使用 `requireAuth`
- [x] 2.7 确认附件接口不使用 `requirePlatformAdmin`
- [x] 2.8 确认附件接口不实现项目成员权限、资料责任人权限、复杂权限、角色权限或轻角色校验
- [x] 2.9 校验项目不存在时返回 `PROJECT_NOT_FOUND`
- [x] 2.10 校验资料项不存在或不属于当前项目时返回 `STAGE_DOCUMENT_NOT_FOUND`
- [x] 2.11 上传时校验不适用资料项并返回 `STAGE_DOCUMENT_NOT_APPLICABLE`
- [x] 2.12 上传时校验缺失或非法文件并返回 `INVALID_ATTACHMENT_FILE`
- [x] 2.13 下载或删除不存在、不属于当前资料项或已删除附件时返回 `ATTACHMENT_NOT_FOUND`
- [x] 2.14 下载时附件记录存在但文件丢失返回 `ATTACHMENT_FILE_MISSING`
- [x] 2.15 附件列表只返回未删除附件，且不得暴露后端绝对路径、内部存储目录或临时文件路径
- [x] 2.16 严格校验 `projectId` 为正整数，非法时返回 `INVALID_PROJECT_ID`
- [x] 2.17 严格校验 `documentId` 为正整数，非法时返回 `INVALID_STAGE_DOCUMENT_ID`
- [x] 2.18 严格校验 `attachmentId` 为正整数，非法时返回 `INVALID_ATTACHMENT_ID`
- [x] 2.19 固定校验优先级：登录态优先于业务参数校验，ID 格式校验优先于查库
- [x] 2.20 上传缺失文件、0 字节文件、超过 50MB 文件或其他文件参数非法时统一返回 `INVALID_ATTACHMENT_FILE`
- [x] 2.21 附件列表每项固定返回 `id`、`originalFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt` 和 `uploadedByUser`
- [x] 2.22 附件列表 `uploadedByUser` 至少返回 `id`、`account` 和 `name`
- [x] 2.23 附件列表不得返回密码字段、平台管理员字段、后端绝对路径、内部存储目录、临时文件路径、`storageKey` 或 `storedFileName`
- [x] 2.24 附件列表按 `uploadedAt DESC, id DESC` 排序
- [x] 2.25 资料项标记不适用后拒绝新增附件上传，但已有未删除附件仍可列表展示、下载和删除

## 3. 业务日志与事务

- [x] 3.1 扩展业务日志动作类型，支持 `document.attachment_uploaded`
- [x] 3.2 扩展业务日志动作类型，支持 `document.attachment_deleted`
- [x] 3.3 上传附件成功后写入 `target_type = stage_document` 的业务日志
- [x] 3.4 删除附件成功后写入 `target_type = stage_document` 的业务日志
- [x] 3.5 附件日志 `details_json` 至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`
- [x] 3.6 附件日志保存可读中文 `summary`
- [x] 3.7 附件记录变更和业务日志写入必须在同一事务中提交
- [x] 3.8 日志写入失败时回滚附件上传记录或删除标记
- [x] 3.9 附件下载不写项目业务操作日志、文件下载日志或全局审计日志
- [x] 3.10 失败的上传、下载或删除操作不得写附件业务日志
- [x] 3.11 文件写入失败时不得保存附件数据库记录或业务日志
- [x] 3.12 上传成功响应必须保证数据库附件记录对应文件可通过下载接口读取
- [x] 3.13 数据库事务失败时必须尽量清理已写入的临时文件或孤立文件
- [x] 3.14 通过代码路径审查确认不会出现数据库附件记录成功但业务日志缺失
- [x] 3.15 通过代码路径审查确认不会出现数据库附件记录成功但文件实际不可下载的成功结果

## 4. 业务边界保持

- [x] 4.1 验证附件上传不改变资料 `status`
- [x] 4.2 验证附件上传不改变资料状态追溯字段
- [x] 4.3 验证附件上传不改变资料适用性和适用性追溯字段
- [x] 4.4 验证附件上传不改变阶段齐套摘要计算口径
- [x] 4.5 验证附件上传不推进项目阶段
- [x] 4.6 验证附件删除不改变资料 `status`
- [x] 4.7 验证附件删除不改变资料状态追溯字段
- [x] 4.8 验证附件删除不改变资料适用性和适用性追溯字段
- [x] 4.9 验证附件删除不改变阶段齐套摘要计算口径
- [x] 4.10 验证附件删除不推进或回退项目阶段
- [x] 4.11 确认附件能力不调用文件管理平台 API、不回填 `targetFolderId`、不判断文件管理平台权限
- [x] 4.12 确认附件能力不创建在线表单、表单草稿或表单归档文件

## 5. 前端项目详情页

- [x] 5.1 新增或扩展前端 API 客户端方法，封装附件上传、列表、下载和删除接口
- [x] 5.2 在项目详情页阶段资料清单资料项中新增附件区域或附件入口
- [x] 5.3 展示附件文件名、文件大小、上传人和上传时间
- [x] 5.4 处理附件列表加载中、失败和空列表状态
- [x] 5.5 支持适用资料项上传附件，上传成功后刷新该资料项附件列表和业务日志
- [x] 5.6 不适用资料项展示第一版不能上传附件的可读提示
- [x] 5.7 支持下载有效附件
- [x] 5.8 支持删除有效附件，删除成功后刷新该资料项附件列表和业务日志
- [x] 5.9 附件操作失败时展示可读错误提示并保留当前项目详情页上下文
- [x] 5.10 页面文案说明附件上传只是资料项附件管理，不等于资料已确认
- [x] 5.11 页面文案说明附件上传不自动推进阶段
- [x] 5.12 页面文案说明附件上传不代表已经完成文件管理平台归档
- [x] 5.13 确认前端不新增文件管理平台同步、在线表单、附件预览、断点续传、多版本管理、复杂权限或跨项目附件统计入口
- [x] 5.14 不适用资料项禁用或隐藏上传入口，并展示“不适用资料项不能新增附件”的提示
- [x] 5.15 不适用资料项已有未删除附件仍在附件列表中展示
- [x] 5.16 不适用资料项已有未删除附件仍提供下载入口
- [x] 5.17 不适用资料项已有未删除附件仍提供删除入口

## 6. README

- [x] 6.1 更新 `digital-platform-api/README.md`，说明阶段资料附件上传、列表、下载和删除接口
- [x] 6.2 更新 `digital-platform-api/README.md`，说明附件接口登录态边界和不做复杂权限
- [x] 6.3 更新 `digital-platform-api/README.md`，说明不适用资料项拒绝上传附件
- [x] 6.4 更新 `digital-platform-api/README.md`，说明附件上传和删除业务日志以及下载不写日志
- [x] 6.5 更新 `digital-platform-api/README.md`，说明附件操作不改变资料状态、适用性、齐套摘要或阶段推进
- [x] 6.6 更新 `digital-platform-web/README.md`，说明项目详情页阶段资料附件区域能力
- [x] 6.7 更新 `digital-platform-web/README.md`，说明附件上传不等于资料确认、不自动推进阶段、不代表文件管理平台归档
- [x] 6.8 更新 `digital-platform-web/README.md`，说明第一版不做文件管理平台联动、在线表单、预览、断点续传、多版本和复杂权限
- [x] 6.9 更新 README，说明单文件大小上限为 50MB
- [x] 6.10 更新 README，说明 0 字节文件被拒绝且返回 `INVALID_ATTACHMENT_FILE`
- [x] 6.11 更新 README，说明 `INVALID_PROJECT_ID`、`INVALID_STAGE_DOCUMENT_ID` 和 `INVALID_ATTACHMENT_ID` 参数错误码
- [x] 6.12 更新 README，说明不适用资料项已有附件仍可展示、下载和删除
- [x] 6.13 更新 README，说明附件列表字段和 `uploadedAt DESC, id DESC` 排序
- [x] 6.14 更新 README，说明附件操作不改变资料状态、适用性、齐套摘要和阶段推进

## 7. 验证

- [x] 7.1 后端运行 `cmd /c npm.cmd run check`
- [x] 7.2 前端运行 `cmd /c npm.cmd run build`
- [x] 7.3 运行 `cmd /c openspec validate add-stage-document-attachments --strict`
- [x] 7.4 运行 `cmd /c openspec validate --all --strict`
- [x] 7.5 运行 `cmd /c openspec list --json`
- [x] 7.6 HTTP smoke：未登录上传附件返回 401
- [x] 7.7 HTTP smoke：未登录下载附件返回 401
- [x] 7.8 HTTP smoke：未登录删除附件返回 401
- [x] 7.9 HTTP smoke：资料项不存在时上传、列表、下载或删除返回明确错误
- [x] 7.10 HTTP smoke：不适用资料项上传附件返回 `STAGE_DOCUMENT_NOT_APPLICABLE`
- [x] 7.11 HTTP smoke：上传成功后附件列表可见
- [x] 7.12 HTTP smoke：下载存在附件成功
- [x] 7.13 HTTP smoke：删除后附件列表不再返回该附件
- [x] 7.14 HTTP smoke：删除不存在或已删除附件返回 `ATTACHMENT_NOT_FOUND`
- [x] 7.15 HTTP/MySQL smoke：上传附件写入 `document.attachment_uploaded` 业务日志
- [x] 7.16 HTTP/MySQL smoke：删除附件写入 `document.attachment_deleted` 业务日志
- [x] 7.17 HTTP/MySQL smoke：下载附件不写业务日志
- [x] 7.18 HTTP/MySQL smoke：失败附件操作不写业务日志
- [x] 7.19 HTTP/MySQL smoke：附件操作不改变资料状态
- [x] 7.20 HTTP/MySQL smoke：附件操作不改变适用性
- [x] 7.21 HTTP/MySQL smoke：附件操作不改变齐套摘要
- [x] 7.22 HTTP/MySQL smoke：附件操作不推进阶段
- [x] 7.23 前端轻量 smoke：项目详情页附件区域可见
- [x] 7.24 前端轻量 smoke：附件上传、下载、删除入口存在
- [x] 7.25 前端轻量 smoke：附件边界说明文案可见
- [x] 7.26 HTTP smoke：上传超过 50MB 的文件返回 `INVALID_ATTACHMENT_FILE`
- [x] 7.27 HTTP smoke：上传 0 字节文件返回 `INVALID_ATTACHMENT_FILE`
- [x] 7.28 HTTP smoke：非法 `projectId` 返回 `INVALID_PROJECT_ID`
- [x] 7.29 HTTP smoke：非法 `documentId` 返回 `INVALID_STAGE_DOCUMENT_ID`
- [x] 7.30 HTTP smoke：非法 `attachmentId` 返回 `INVALID_ATTACHMENT_ID`
- [x] 7.31 HTTP smoke：未登录且 ID 非法时优先返回 401 或既有未登录错误口径
- [x] 7.32 HTTP smoke：ID 格式非法时不回退为查库后的不存在错误
- [x] 7.33 HTTP smoke：合法 `projectId` 但项目不存在返回 `PROJECT_NOT_FOUND`
- [x] 7.34 HTTP smoke：合法 `documentId` 但资料项不存在或不属于项目返回 `STAGE_DOCUMENT_NOT_FOUND`
- [x] 7.35 HTTP smoke：合法 `attachmentId` 但附件不存在、已删除或不属于资料项返回 `ATTACHMENT_NOT_FOUND`
- [x] 7.36 HTTP/MySQL smoke：文件写入失败时不保存附件记录和业务日志；如不便真实注入失败，需通过代码路径审查说明
- [x] 7.37 HTTP/MySQL smoke：日志写入失败时回滚附件记录；如不便真实注入失败，需通过代码路径审查说明
- [x] 7.38 HTTP/MySQL smoke：数据库事务失败后尽量清理临时文件或孤立文件；如不便真实注入失败，需通过代码路径审查说明
- [x] 7.39 HTTP smoke：资料项被标记不适用后，新增附件上传返回 `STAGE_DOCUMENT_NOT_APPLICABLE`
- [x] 7.40 HTTP smoke：资料项被标记不适用后，已有未删除附件仍可列表展示
- [x] 7.41 HTTP smoke：资料项被标记不适用后，已有未删除附件仍可下载
- [x] 7.42 HTTP smoke：资料项被标记不适用后，已有未删除附件仍可删除
- [x] 7.43 HTTP smoke：附件列表每项包含固定字段和 `uploadedByUser.id/account/name`
- [x] 7.44 HTTP smoke：附件列表不包含密码字段、平台管理员字段、后端路径字段、`storageKey` 或 `storedFileName`
- [x] 7.45 HTTP smoke：附件列表按 `uploadedAt DESC, id DESC` 排序
- [x] 7.46 前端轻量 smoke：不适用资料项禁用或隐藏上传入口并显示不能新增附件提示
- [x] 7.47 前端轻量 smoke：不适用资料项已有附件仍展示下载和删除入口

## 8. 归档前上传解析与文件参数修复

- [x] 8.1 使用成熟 multipart 解析库替换手写 `body.split(boundary)` 解析，避免文件内容包含 boundary 字符串时被截断
- [x] 8.2 保持上传字段名为 `file`，并将 multipart 解析失败、缺失文件、字段名不是 `file` 或缺少文件名统一处理为 `INVALID_ATTACHMENT_FILE`
- [x] 8.3 第一版多个 `file` 字段直接返回 `INVALID_ATTACHMENT_FILE`，不保存附件记录、不写业务日志
- [x] 8.4 补充原始文件名清理后非空且不超过 255 字符的校验，非法时返回 `INVALID_ATTACHMENT_FILE`
- [x] 8.5 补充 MIME 类型为空时使用 `application/octet-stream`，非空时不超过 255 字符的校验，非法时返回 `INVALID_ATTACHMENT_FILE`
- [x] 8.6 更新 `digital-platform-api/README.md`，说明单 `file` 字段、多个文件拒绝、文件名和 MIME 类型参数规则
- [x] 8.7 后端运行 `cmd /c npm.cmd run check`
- [x] 8.8 前端运行 `cmd /c npm.cmd run build`
- [x] 8.9 运行 `cmd /c openspec validate add-stage-document-attachments --strict`
- [x] 8.10 运行 `cmd /c openspec validate --all --strict` 和 `cmd /c openspec list --json`
- [x] 8.11 HTTP/MySQL smoke：正常上传、列表、下载仍通过，且文件内容包含类似 boundary 字符串时下载内容与原始内容一致
- [x] 8.12 HTTP/MySQL smoke：0 字节、超过 50MB、缺失 `file` 字段、字段名不是 `file`、多个 `file` 字段均返回 `INVALID_ATTACHMENT_FILE`
- [x] 8.13 HTTP/MySQL smoke：超长文件名和超长 MIME 类型返回 `INVALID_ATTACHMENT_FILE`，不保存附件记录、不写业务日志
