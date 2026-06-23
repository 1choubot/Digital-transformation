## ADDED Requirements

### Requirement: 阶段资料附件模型
系统 MUST 为项目级阶段资料项维护附件记录，附件 MUST 关联到具体 `project_stage_document`，并 MUST 保存文件展示、存储和上传追溯所需的最小字段。

#### Scenario: 附件字段完整
- **WHEN** 系统保存阶段资料附件记录
- **THEN** 附件记录必须至少包含 `id`、`projectId`、`stageDocumentId`、`originalFileName`、`storageKey` 或 `storedFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt`、可空 `deletedByUserId` 和可空 `deletedAt`

#### Scenario: 附件归属资料项
- **WHEN** 系统保存阶段资料附件记录
- **THEN** 附件必须关联到存在的项目级阶段资料项，并且 `projectId` 必须与该资料项所属项目一致

#### Scenario: 新资料项默认无附件
- **WHEN** 系统初始化项目级阶段资料项
- **THEN** 该资料项默认不得生成任何附件记录

#### Scenario: 附件软删除
- **WHEN** 用户删除阶段资料附件成功
- **THEN** 系统必须记录 `deletedByUserId` 和 `deletedAt`，并在有效附件列表中排除该附件

### Requirement: 阶段资料附件参数校验
系统 MUST 对阶段资料附件接口中的 `projectId`、`documentId` 和 `attachmentId` 做严格正整数校验，并 MUST 使用稳定错误码和固定校验优先级。

#### Scenario: 登录态优先于业务参数校验
- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求任一阶段资料附件接口，即使 URL 中 ID 参数非法
- **THEN** 系统必须优先拒绝登录态并返回 401 或既有未登录错误口径，不得先返回业务参数错误

#### Scenario: 非法项目 ID
- **WHEN** 已登录用户请求阶段资料附件接口且 `projectId` 为非数字、空字符串、0、负数、小数或混合格式
- **THEN** 系统必须返回 `INVALID_PROJECT_ID`，并且不得查询项目、资料项或附件

#### Scenario: 非法资料项 ID
- **WHEN** 已登录用户请求阶段资料附件接口且 `projectId` 合法但 `documentId` 为非数字、空字符串、0、负数、小数或混合格式
- **THEN** 系统必须返回 `INVALID_STAGE_DOCUMENT_ID`，并且不得查询资料项或附件

#### Scenario: 非法附件 ID
- **WHEN** 已登录用户请求附件下载或删除接口且 `projectId`、`documentId` 合法但 `attachmentId` 为非数字、空字符串、0、负数、小数或混合格式
- **THEN** 系统必须返回 `INVALID_ATTACHMENT_ID`，并且不得查询附件

#### Scenario: 合法项目 ID 但项目不存在
- **WHEN** 已登录用户请求阶段资料附件接口且 `projectId` 格式合法但项目不存在
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND`

#### Scenario: 合法资料项 ID 但资料项不存在或不属于项目
- **WHEN** 已登录用户请求阶段资料附件接口且 `projectId` 和 `documentId` 格式合法，但资料项不存在或不属于当前项目
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_FOUND`

#### Scenario: 合法附件 ID 但附件不可用
- **WHEN** 已登录用户请求附件下载或删除接口且 `attachmentId` 格式合法，但附件不存在、已删除或不属于当前资料项
- **THEN** 系统必须返回 `ATTACHMENT_NOT_FOUND`

### Requirement: 阶段资料附件上传接口
系统 MUST 提供阶段资料项附件上传接口，允许已登录用户为适用的项目级阶段资料项上传附件，并 MUST 拒绝资料项不存在、不属于当前项目或已标记不适用的上传请求。

#### Scenario: 上传附件要求登录
- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求上传阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 上传接口不做复杂权限
- **WHEN** 已登录用户请求上传阶段资料附件
- **THEN** 系统必须只做 `requireAuth`、项目存在、资料项归属、资料项适用性和文件参数校验，不得要求 `isPlatformAdmin`，不得实现项目成员权限、资料责任人权限、角色权限或轻角色校验

#### Scenario: 上传到不存在项目
- **WHEN** 已登录用户请求向不存在项目上传阶段资料附件
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND`，并且不得保存附件记录、文件或业务日志

#### Scenario: 上传到不存在资料项
- **WHEN** 已登录用户请求向不存在或不属于当前项目的资料项上传附件
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_FOUND`，并且不得保存附件记录、文件或业务日志

#### Scenario: 不适用资料项上传被拒绝
- **WHEN** 已登录用户请求向 `isApplicable = false` 的资料项上传附件
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_APPLICABLE`，并且不得保存附件记录、文件或业务日志

#### Scenario: 上传文件参数非法
- **WHEN** 已登录用户上传附件但未提供有效文件、文件参数非法、文件大小为 0 字节或超过 50MB
- **THEN** 系统必须返回 `INVALID_ATTACHMENT_FILE`，并且不得保存附件记录、文件或业务日志

#### Scenario: 上传文件大小上限
- **WHEN** 已登录用户上传单个附件且文件大小超过 50MB
- **THEN** 系统必须返回 `INVALID_ATTACHMENT_FILE`，并且不得保存附件记录、文件或业务日志

#### Scenario: 上传 0 字节文件被拒绝
- **WHEN** 已登录用户上传单个附件且文件大小为 0 字节
- **THEN** 系统必须返回 `INVALID_ATTACHMENT_FILE`，并且不得保存附件记录、文件或业务日志

#### Scenario: 上传成功后附件列表可见
- **WHEN** 已登录用户向存在、属于当前项目且适用的资料项上传有效附件成功
- **THEN** 系统必须保存附件记录和文件存储标识，并且该附件必须在该资料项有效附件列表中可见

#### Scenario: 上传不改变资料状态
- **WHEN** 阶段资料附件上传成功
- **THEN** 系统不得改变该资料项的 `status`、提交追溯字段、确认追溯字段、退回追溯字段或退回原因

#### Scenario: 上传不改变适用性
- **WHEN** 阶段资料附件上传成功
- **THEN** 系统不得改变该资料项的 `isApplicable`、不适用原因或适用性追溯字段

#### Scenario: 上传不改变齐套摘要或推进阶段
- **WHEN** 阶段资料附件上传成功
- **THEN** 系统不得改变阶段齐套摘要计算口径、不得自动标记资料提交或确认、不得推进项目阶段

### Requirement: 阶段资料附件列表接口
系统 MUST 提供阶段资料项附件列表接口，用于查询某资料项当前有效附件，并 MUST 只返回未软删除的附件展示字段。

#### Scenario: 查询附件列表要求登录
- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求查询阶段资料附件列表
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 查询不存在资料项附件列表
- **WHEN** 已登录用户请求查询不存在或不属于当前项目的资料项附件列表
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_FOUND`，并且不得返回其他项目或其他资料项的附件

#### Scenario: 返回当前有效附件
- **WHEN** 已登录用户请求查询存在且属于当前项目的资料项附件列表
- **THEN** 系统必须返回该资料项 `deletedAt` 为空的附件列表，每个附件至少包含 `id`、`originalFileName`、`mimeType`、`fileSize`、`uploadedByUserId`、`uploadedAt` 和 `uploadedByUser`

#### Scenario: 上传人安全字段
- **WHEN** 系统返回阶段资料附件列表中的 `uploadedByUser`
- **THEN** `uploadedByUser` 至少包含 `id`、`account` 和 `name`，且不得包含 `passwordHash`、`password_hash`、`isPlatformAdmin`、`is_platform_admin` 或任何密码内部字段

#### Scenario: 不返回存储内部字段
- **WHEN** 系统返回阶段资料附件列表
- **THEN** 响应不得暴露后端本地绝对路径、内部存储目录、临时文件路径或可绕过下载接口直接访问文件的 `storageKey`、`storedFileName` 或其他敏感存储信息

#### Scenario: 附件列表稳定排序
- **WHEN** 系统返回阶段资料附件列表
- **THEN** 附件必须按 `uploadedAt DESC, id DESC` 稳定排序

#### Scenario: 删除后列表不再返回
- **WHEN** 某阶段资料附件已被软删除
- **THEN** 该附件不得出现在资料项当前有效附件列表中

#### Scenario: 不适用资料项已有附件仍可展示
- **WHEN** 资料项被标记为不适用后仍存在未删除的历史附件
- **THEN** 附件列表接口必须继续返回这些未删除附件，不得因资料项不适用而隐藏已有附件

### Requirement: 阶段资料附件下载接口
系统 MUST 提供阶段资料项附件下载接口，允许已登录用户下载存在、未删除且属于当前资料项的附件，并 MUST 对不存在、已删除或文件丢失情况返回稳定错误。

#### Scenario: 下载附件要求登录
- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求下载阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 下载不存在资料项附件
- **WHEN** 已登录用户请求下载不存在项目下、资料项不存在或资料项不属于当前项目的附件
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND` 或 `STAGE_DOCUMENT_NOT_FOUND`，并且不得返回任何文件内容

#### Scenario: 下载不存在或已删除附件
- **WHEN** 已登录用户请求下载不存在、不属于当前资料项或已软删除的附件
- **THEN** 系统必须返回 `ATTACHMENT_NOT_FOUND`，并且不得返回任何文件内容

#### Scenario: 下载存在附件成功
- **WHEN** 已登录用户请求下载存在、未删除且属于当前资料项的附件，并且后端文件存在
- **THEN** 系统必须返回附件文件内容，并使用附件原始文件名作为可读下载文件名

#### Scenario: 不适用资料项已有附件仍可下载
- **WHEN** 资料项被标记为不适用后仍存在未删除的历史附件
- **THEN** 已登录用户必须仍可通过附件下载接口下载这些未删除附件

#### Scenario: 附件文件丢失
- **WHEN** 附件记录存在且未删除，但后端无法读取对应存储文件
- **THEN** 系统必须返回 `ATTACHMENT_FILE_MISSING`，并且不得伪造空文件或错误文件

#### Scenario: 下载不写业务日志
- **WHEN** 已登录用户成功或失败下载阶段资料附件
- **THEN** 系统第一版不得写入项目业务操作日志，避免高频下载行为污染业务日志

#### Scenario: 下载不改变业务状态
- **WHEN** 已登录用户下载阶段资料附件
- **THEN** 系统不得改变资料状态、适用性、附件删除状态、齐套摘要或阶段推进状态

### Requirement: 阶段资料附件删除接口
系统 MUST 提供阶段资料项附件删除接口，允许已登录用户软删除存在、未删除且属于当前资料项的附件，并 MUST 在删除成功后从有效附件列表中隐藏该附件。

#### Scenario: 删除附件要求登录
- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求删除阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 删除接口不做复杂权限
- **WHEN** 已登录用户请求删除阶段资料附件
- **THEN** 系统必须只做 `requireAuth`、项目存在、资料项归属和附件归属校验，不得要求 `isPlatformAdmin`，不得实现项目成员权限、资料责任人权限、角色权限或轻角色校验

#### Scenario: 删除不存在资料项附件
- **WHEN** 已登录用户请求删除不存在项目下、资料项不存在或资料项不属于当前项目的附件
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND` 或 `STAGE_DOCUMENT_NOT_FOUND`，并且不得改变任何附件记录或业务日志

#### Scenario: 删除不存在或已删除附件被拒绝
- **WHEN** 已登录用户请求删除不存在、不属于当前资料项或已软删除的附件
- **THEN** 系统必须返回 `ATTACHMENT_NOT_FOUND`，并且不得改变任何其他附件记录或业务日志

#### Scenario: 删除附件成功
- **WHEN** 已登录用户删除存在、未删除且属于当前资料项的附件成功
- **THEN** 系统必须记录 `deletedByUserId` 和 `deletedAt`，并使该附件不再出现在资料项当前有效附件列表中

#### Scenario: 不适用资料项已有附件仍可删除
- **WHEN** 资料项被标记为不适用后仍存在未删除的历史附件
- **THEN** 已登录用户必须仍可软删除这些未删除附件，并使其不再出现在有效附件列表中

#### Scenario: 删除不改变资料状态
- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变该资料项的 `status`、提交追溯字段、确认追溯字段、退回追溯字段或退回原因

#### Scenario: 删除不改变适用性
- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变该资料项的 `isApplicable`、不适用原因或适用性追溯字段

#### Scenario: 删除不改变齐套摘要或推进阶段
- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变阶段齐套摘要计算口径、不得自动标记资料未提交或未确认、不得推进或回退项目阶段

### Requirement: 阶段资料附件业务日志
系统 MUST 在阶段资料附件上传或删除成功后记录项目业务操作日志，并 MUST 保证附件记录变更和日志写入在同一事务中提交。

#### Scenario: 上传附件成功记录业务日志
- **WHEN** 已登录用户成功上传阶段资料附件
- **THEN** 系统必须记录 `action_type = document.attachment_uploaded` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 删除附件成功记录业务日志
- **WHEN** 已登录用户成功删除阶段资料附件
- **THEN** 系统必须记录 `action_type = document.attachment_deleted` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 附件日志详情
- **WHEN** 系统记录附件上传或删除日志
- **THEN** `details_json` 必须至少包含 `documentId`、`documentCode`、`documentName`、`attachmentId`、`originalFileName` 和 `fileSize`

#### Scenario: 附件日志失败回滚变更
- **WHEN** 附件上传记录或删除标记已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚附件记录变更，不得出现附件变更成功但缺少业务日志的结果

#### Scenario: 文件写入失败不保存记录
- **WHEN** 阶段资料附件上传过程中后端文件写入失败
- **THEN** 系统不得保存附件数据库记录，不得写入 `document.attachment_uploaded` 业务日志，并必须返回上传失败错误

#### Scenario: 上传成功结果必须可下载
- **WHEN** 系统向客户端返回阶段资料附件上传成功
- **THEN** 系统必须保证数据库附件记录对应的文件实际可通过下载接口读取，不得出现数据库附件记录成功但文件实际不可下载的成功结果

#### Scenario: 数据库事务失败清理孤立文件
- **WHEN** 阶段资料附件上传过程中数据库事务失败，但文件或临时文件已经写入
- **THEN** 系统必须尽量清理已写入的临时文件或孤立文件，并不得保留成功附件记录或业务日志

#### Scenario: 失败附件操作不写日志
- **WHEN** 附件上传、下载或删除操作因登录态、项目资料项归属、适用性、文件参数、附件归属或文件丢失校验失败而被拒绝
- **THEN** 系统不得写入 `document.attachment_uploaded` 或 `document.attachment_deleted` 业务操作日志

### Requirement: 阶段资料附件边界
阶段资料附件 MUST 只表示数字化平台内资料项附属文件，不得被解释为资料状态、文件管理平台归档、在线表单提交或阶段推进依据。

#### Scenario: 附件不代表资料提交或确认
- **WHEN** 用户上传、查看、下载或删除阶段资料附件
- **THEN** 系统不得把附件存在与否解释为资料已提交、已确认、已退回或待提交

#### Scenario: 附件不联动文件管理平台
- **WHEN** 用户上传、查看、下载或删除阶段资料附件
- **THEN** 系统不得调用文件管理平台 API、同步文件夹、回填 `targetFolderId`、判断文件平台权限或生成文件平台归档记录

#### Scenario: 附件不联动在线表单
- **WHEN** 用户上传、查看、下载或删除阶段资料附件
- **THEN** 系统不得创建在线表单、表单草稿、表单提交记录或表单生成归档文件

#### Scenario: 附件不触发协同和统计扩展
- **WHEN** 用户上传、查看、下载或删除阶段资料附件
- **THEN** 系统不得创建消息提醒、超期提醒、截止日期、跨项目附件统计、审批流或个人待办实体

## MODIFIED Requirements

### Requirement: 文件平台边界
阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空；手工状态流转、资料项适用性、阶段资料齐套摘要、项目阶段推进门禁、资料项责任人分配、阶段资料附件和项目业务操作日志不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力
- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态、手工变更资料项适用性、手工分配或清空资料项责任人、上传/查看/下载/删除阶段资料附件、计算阶段资料齐套摘要、检查阶段推进齐套门禁或记录项目业务操作日志
- **THEN** 系统不得调用文件管理平台 API、创建文件管理平台文件夹、向文件管理平台上传文件、从文件管理平台下载文件或判断文件管理平台权限

#### Scenario: 目录 ID 后续回填
- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 资料清单能力本身不推进阶段
- **WHEN** 用户查看或系统处理阶段资料清单、资料项手工状态操作、资料项适用性操作、资料项责任人分配操作或阶段资料附件操作
- **THEN** 阶段资料清单能力本身不得执行阶段推进；阶段推进只能由项目核心阶段推进接口按其规格执行，并可读取当前阶段齐套摘要作为门禁输入

#### Scenario: 不实现其他排除能力
- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除既有项目核心阶段推进接口读取当前阶段齐套摘要作为门禁输入、既有手工资料项适用性、既有只读阶段资料齐套摘要、项目业务操作日志能力定义的最小业务日志、既有手工资料项责任人分配和本变更定义的阶段资料附件上传/查看/下载/删除外，系统不得实现在线表单填写、表单生成归档文件、复杂文件管理平台联动、复杂权限、角色权限、轻角色校验或不在本变更范围内的管理层看板能力
