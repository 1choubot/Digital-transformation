## MODIFIED Requirements

### Requirement: 阶段资料附件上传接口

系统 MUST 提供阶段资料项附件上传接口，允许具备资料附件上传权限的已登录用户为适用的项目级阶段资料项上传附件，并 MUST 拒绝资料项不存在、不属于当前项目、已标记不适用或当前用户无上传权限的上传请求。

#### Scenario: 上传附件要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求上传阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 全量查看不授予上传权限

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理仅因全量查看口径可查看某资料项和附件
- **THEN** 系统 MUST NOT 仅因该查看权限允许其上传附件

#### Scenario: 上传权限仍按资料操作权限判断

- **WHEN** 已登录用户请求上传阶段资料附件
- **THEN** 系统 MUST 校验当前用户具备该资料项附件上传权限
- **AND** 系统 MUST NOT 用项目可见性、完整资料查看权或附件下载权替代上传权限

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

系统 MUST 提供阶段资料项附件列表接口，用于查询某资料项当前有效附件，并 MUST 只返回未软删除的附件展示字段；总经理、总经理助理、中心负责人、项目创建人和项目经理可对其可见项目中的完整资料清单查看已上传附件列表。

#### Scenario: 查询附件列表要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求查询阶段资料附件列表
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 全量查看角色查询已上传附件列表

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理查询其可见项目内资料项附件列表
- **THEN** 系统 MUST 允许其查看该资料项当前有效附件列表
- **AND** 系统 MUST NOT 因附件列表可见授予附件上传或删除权限

#### Scenario: 员工附件列表仍按资料范围过滤

- **WHEN** 普通员工仅因负责项目中部分资料而查询其他资料项附件列表
- **THEN** 系统 MUST 按资料项级查看权限过滤或拒绝，不得仅因项目基础可见返回全部附件列表

#### Scenario: 查询不存在资料项附件列表

- **WHEN** 已登录用户请求查询不存在或不属于当前项目的资料项附件列表
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_FOUND`，并且不得返回其他项目或其他资料项的附件

#### Scenario: 返回当前有效附件

- **WHEN** 已登录用户请求查询存在且属于当前项目且有权查看附件的资料项附件列表
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
- **THEN** 附件列表接口必须继续按附件查看权限返回这些未删除附件，不得因资料项不适用而隐藏已有附件

### Requirement: 阶段资料附件下载接口

系统 MUST 提供阶段资料项附件下载接口，允许具备附件下载权限的已登录用户下载存在、未删除且属于当前资料项的附件，并 MUST 对不存在、已删除、无权或文件丢失情况返回稳定错误。

#### Scenario: 下载附件要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求下载阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 全量查看角色可下载已上传附件

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理下载其可见项目内资料项的已上传附件
- **THEN** 系统 MUST 允许下载该存在且未删除的附件
- **AND** 系统 MUST NOT 因下载权限授予附件上传或删除权限

#### Scenario: 员工附件下载仍按资料范围过滤

- **WHEN** 普通员工仅因负责项目中部分资料而下载其他资料项附件
- **THEN** 系统 MUST 按资料项级下载权限过滤或拒绝，不得仅因项目基础可见允许下载

#### Scenario: 下载不存在资料项附件

- **WHEN** 已登录用户请求下载不存在项目下、资料项不存在或资料项不属于当前项目的附件
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND` 或 `STAGE_DOCUMENT_NOT_FOUND`，并且不得返回任何文件内容

#### Scenario: 下载不存在或已删除附件

- **WHEN** 已登录用户请求下载不存在、不属于当前资料项或已软删除的附件
- **THEN** 系统必须返回 `ATTACHMENT_NOT_FOUND`，并且不得返回任何文件内容

#### Scenario: 下载存在附件成功

- **WHEN** 已登录用户请求下载存在、未删除且属于当前资料项的附件，并且后端文件存在，且当前用户有权下载
- **THEN** 系统必须返回附件文件内容，并使用附件原始文件名作为可读下载文件名

#### Scenario: 不适用资料项已有附件仍可下载

- **WHEN** 资料项被标记为不适用后仍存在未删除的历史附件
- **THEN** 有附件下载权限的已登录用户必须仍可通过附件下载接口下载这些未删除附件

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

系统 MUST 提供阶段资料项附件删除接口，允许具备附件删除权限的已登录用户软删除存在、未删除且属于当前资料项的附件，并 MUST 在删除成功后从有效附件列表中隐藏该附件。

#### Scenario: 删除附件要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求删除阶段资料附件
- **THEN** 系统必须拒绝该请求，并返回 401 或既有未登录错误口径

#### Scenario: 全量查看不授予删除权限

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理仅因全量查看口径可查看某资料项和附件
- **THEN** 系统 MUST NOT 仅因该查看权限允许其删除附件

#### Scenario: 删除权限仍按资料操作权限判断

- **WHEN** 已登录用户请求删除阶段资料附件
- **THEN** 系统 MUST 校验当前用户具备该附件删除权限
- **AND** 系统 MUST NOT 用项目可见性、完整资料查看权或附件下载权替代删除权限

#### Scenario: 删除不存在资料项附件

- **WHEN** 已登录用户请求删除不存在项目下、资料项不存在或资料项不属于当前项目的附件
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND` 或 `STAGE_DOCUMENT_NOT_FOUND`，并且不得改变任何附件记录或业务日志

#### Scenario: 删除不存在或已删除附件被拒绝

- **WHEN** 已登录用户请求删除不存在、不属于当前资料项或已软删除的附件
- **THEN** 系统必须返回 `ATTACHMENT_NOT_FOUND`，并且不得改变任何其他附件记录或业务日志

#### Scenario: 删除附件成功

- **WHEN** 已登录用户删除存在、未删除且属于当前资料项且有权删除的附件成功
- **THEN** 系统必须记录 `deletedByUserId` 和 `deletedAt`，并使该附件不再出现在资料项当前有效附件列表中

#### Scenario: 不适用资料项已有附件仍按删除权限处理

- **WHEN** 资料项被标记为不适用后仍存在未删除的历史附件
- **THEN** 系统 MUST 继续要求附件删除权限，不得因不适用或全量查看口径放宽删除

#### Scenario: 删除不改变资料状态

- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变该资料项的 `status`、提交追溯字段、确认追溯字段、退回追溯字段或退回原因

#### Scenario: 删除不改变适用性

- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变该资料项的 `isApplicable`、不适用原因或适用性追溯字段

#### Scenario: 删除不改变齐套摘要或推进阶段

- **WHEN** 阶段资料附件删除成功
- **THEN** 系统不得改变阶段齐套摘要计算口径、不得自动标记资料未提交或未确认、不得推进或回退项目阶段

### Requirement: 资料确认退回审批边界

系统 MUST 保持资料确认/退回能力只用于需要审核的资料项，并 MUST 为资料级审核权限保留组织角色边界；精准返工和全量查看不得扩大资料审核人范围。

#### Scenario: 当前状态机继续存在

- **WHEN** 系统处理资料提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 基础状态机

#### Scenario: 资料确认退回只针对需要审核资料

- **WHEN** 用户调用资料确认或退回接口
- **THEN** 系统 MUST 仅允许对 `completionMode = approval_required` 或未来 `conditional_approval` 且状态为 `submitted` 的资料执行
- **AND** 普通 `approval_required + submitted` 资料可确认/退回的前提是 `revision_required` 不是 true
- **AND** 如果 `revision_required = true`，系统 MUST 仅在可通过 `revision_resubmitted_at` 或等价显式字段证明该资料已返工重提后，允许确认/退回
- **AND** 未返工重提前，确认/退回接口 MUST 拒绝该资料，不能只依赖工作台不展示审核入口兜底
- **AND** 系统 MUST NOT 要求 `submit_only` 资料进入确认/退回主流程

#### Scenario: 全量查看不授予资料审核

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理仅因全量查看口径可查看某资料项
- **THEN** 系统 MUST NOT 仅因该查看权限允许其确认、退回、精准返工退回或生成资料审核待办

#### Scenario: 精准返工不改变审核权限

- **WHEN** 用户对审批资料执行退回并指定返工目标
- **THEN** 系统 MUST 仍按该审批资料的资料级审核权限判断是否允许退回
- **AND** 被指定返工资料的责任人不得因此获得审批资料退回权限

#### Scenario: 项目经理默认不是资料审核人

- **WHEN** 项目经理仅因项目经理身份调用资料确认或退回接口
- **THEN** 系统必须拒绝，除非其同时具备资料级审核规则允许的审核身份

### Requirement: 阶段资料清单权限过滤

系统 MUST 支持按当前用户权限过滤阶段资料清单，并 MUST 区分完整项目资料视图和受限任务资料视图；总经理、总经理助理、中心负责人、项目创建人和项目经理对其可见项目 MUST 能查看完整 64 项阶段资料。

#### Scenario: 全量查看角色看到完整 64 项

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理查询其可见项目阶段资料清单
- **THEN** 系统 MUST 返回该项目完整 64 项阶段资料
- **AND** 返回范围 MUST 包含未分配责任人的资料和跨中心资料
- **AND** 系统 MUST NOT 因返回完整资料清单授予资料提交、审核、退回、精准返工、责任人分配、适用性管理、附件上传、附件删除或阶段推进权限

#### Scenario: 普通员工只看自己负责资料

- **WHEN** 普通员工仅因负责资料项而查询某项目阶段资料清单
- **THEN** 系统必须只返回该员工负责的资料项，不得返回其他人负责的资料项

#### Scenario: 资料审核人可看待审核资料

- **WHEN** 当前用户有权审核某资料项且该资料项处于待审核状态
- **THEN** 系统必须允许其查看该资料项及必要的审核上下文

#### Scenario: 资料级审核人按责任人部门确定

- **WHEN** 资料项 `status = submitted` 且已分配责任人
- **THEN** 第一版资料审核人必须是该责任人所属部门的中心负责人或后续结构化审核中心规则允许的审核人

#### Scenario: 项目经理不是资料级审核人

- **WHEN** 当前用户仅因 `projectManagerUserId = 当前用户 id` 访问资料项
- **THEN** 系统不得授予其资料审核权限或 `document_review` 待办

#### Scenario: 管理层全量查看不默认接收全部资料审核

- **WHEN** 资料项 `status = submitted`
- **THEN** 系统不得默认为总经理、总经理助理或中心负责人生成所有资料项的 `document_review` 待办
- **AND** 资料审核待办仍必须按资料级审核权限生成

#### Scenario: 未分配责任人资料不生成中心审核待办

- **WHEN** 资料项没有分配责任人且没有结构化审核中心规则可判断审核人
- **THEN** 系统不得根据项目参与部门或中文责任角色模糊生成中心负责人资料审核待办

#### Scenario: 项目经理可看自己项目完整资料

- **WHEN** 当前用户是项目经理并查询自己负责项目的资料清单
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 项目创建人可看自己创建项目完整资料

- **WHEN** 当前用户是项目创建人并查询自己创建项目的资料清单
- **THEN** 系统 MUST 允许返回完整阶段资料清单

#### Scenario: 总经理可看完整资料

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 总经理助理可看完整资料

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统 MUST 允许返回完整阶段资料清单

#### Scenario: 中心负责人可看完整资料

- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 系统 MUST 允许返回全部项目的完整阶段资料清单

#### Scenario: 未分配责任人资料可在完整视图中展示

- **WHEN** 资料项没有分配责任人且当前用户拥有该项目完整资料查看权
- **THEN** 系统 MUST 返回该资料项基础信息、适用性、完成状态和可查看附件权限字段

#### Scenario: 不使用中文字符串模糊判断审核中心

- **WHEN** 系统判断资料审核中心、资料操作权限或附件操作权限
- **THEN** 系统不得依赖中文 `confirmRole`、默认责任角色或资料名称的模糊匹配；如需模板审核中心映射，必须使用结构化字段

#### Scenario: 返回资料项权限字段

- **WHEN** 系统返回阶段资料清单或工作台资料项
- **THEN** 响应必须包含当前用户对资料项的权限字段，包括 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument` 和 `canReviewDocument`，或提供等价结构化权限结果
- **AND** 全量查看口径最多只能影响 `canViewAttachments` 和 `canDownloadAttachment`

#### Scenario: 受限资料清单仍保留阶段上下文

- **WHEN** 系统返回受限任务资料视图
- **THEN** 响应必须保留项目、阶段和资料项必要字段，使前端能展示任务所属项目和阶段

### Requirement: 阶段资料附件资料项级权限

阶段资料附件接口 MUST 在项目存在和资料项存在校验后执行资料项级权限判断；完整资料查看角色可查看和下载已上传附件，但上传、删除仍必须按独立操作权限判断，不能只用项目可见性作为附件操作依据。

#### Scenario: 附件查看下载可随完整资料查看放宽

- **WHEN** 用户是总经理、总经理助理、中心负责人、项目创建人或项目经理，并且该项目在其可见范围内
- **THEN** 系统 MUST 允许其查看和下载该项目完整资料清单中的已上传附件

#### Scenario: 附件操作不能只按项目可见性

- **WHEN** 用户对某资料项调用附件上传或删除接口
- **THEN** 系统必须校验当前用户是否有权执行该附件操作，不得仅因用户可见项目或可下载附件就允许操作

#### Scenario: buildStageDocumentPermissions 只放宽查看下载字段

- **WHEN** 系统构建阶段资料权限字段
- **THEN** 本 change 只允许因全量查看口径调整 `canViewAttachments` 和 `canDownloadAttachment`
- **AND** 系统 MUST NOT 因全量查看口径调整 `canUploadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility` 或 `canChangeApplicability`

#### Scenario: 项目经理删除附件边界

- **WHEN** 项目经理删除自己负责项目的附件
- **THEN** 第一版只允许其删除自己上传、当前仍有资料项附件删除权限且资料未按 `completionMode` 派生完成的附件

#### Scenario: 附件删除要求当前访问权

- **WHEN** 用户删除某资料项附件
- **THEN** 系统必须同时校验当前用户不是系统管理员或仅查看角色、当前用户仍有该资料项附件删除权限、当前用户是该附件上传人、且资料未按 `completionMode` 派生完成

#### Scenario: submit_only completed 不绕过删除规则

- **WHEN** 资料项 `completionMode = submit_only` 且 `status = submitted`
- **THEN** 系统 MUST 将其视为已完成资料处理附件删除边界，不得因 `status != confirmed` 允许绕开删除限制

### Requirement: 中心负责人按归属中心访问资料

系统 MUST 使用结构化归属中心判断中心负责人对资料分配、审核、适用性和附件操作权限；中心负责人对项目和资料的查看范围按本 change 放宽为全部业务项目和完整 64 项资料，但业务操作范围不得随查看范围放宽。

#### Scenario: 中心负责人查看全部项目完整资料

- **WHEN** 当前用户是中心负责人并查询任一业务项目阶段资料清单
- **THEN** 系统 MUST 允许其查看该项目完整 64 项阶段资料

#### Scenario: 中心负责人查看本中心未分配资料

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 或 `reviewDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其查看该资料项，即使该资料项尚未分配责任人

#### Scenario: 中心负责人分配本中心未分配资料

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其为该资料项分配或清空本中心责任人

#### Scenario: 中心负责人不能分配其他中心资料

- **WHEN** 当前用户是中心负责人但资料项 `ownerDepartment` 不等于本人部门
- **THEN** 系统 MUST 拒绝其分配该资料项责任人，除非其同时具备项目经理或其他既有允许身份

#### Scenario: 中心负责人按审核中心审核资料

- **WHEN** 当前用户是中心负责人、资料项 `reviewDepartment` 等于本人部门、资料项适用且状态为 `submitted`
- **THEN** 系统 MUST 允许其确认或退回该资料项

#### Scenario: 中心负责人不能因全量查看审核其他中心资料

- **WHEN** 当前用户是中心负责人但资料项 `reviewDepartment` 不等于本人部门且无其他审核授权
- **THEN** 系统 MUST 拒绝其确认、退回或精准返工退回该资料

#### Scenario: 中心负责人按归属中心管理资料适用性

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 或 `reviewDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其按既有适用性状态机标记该资料项不适用或恢复适用

#### Scenario: 中心负责人不能因全量查看管理其他中心适用性

- **WHEN** 当前用户是中心负责人但资料项 `ownerDepartment` 和 `reviewDepartment` 均不等于本人部门
- **THEN** 系统 MUST 拒绝其标记不适用、恢复适用、分配责任人或清空责任人，除非其同时具备其他既有允许身份

#### Scenario: 适用性管理旧数据 fallback

- **WHEN** 旧资料缺少 `ownerDepartment` 和 `reviewDepartment`
- **THEN** 系统 MAY 继续使用责任人部门或既有兼容规则判断中心负责人业务操作范围
