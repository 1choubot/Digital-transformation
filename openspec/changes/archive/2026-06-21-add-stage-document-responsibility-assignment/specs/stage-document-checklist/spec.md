## ADDED Requirements

### Requirement: 资料项责任人分配

系统 MUST 支持已登录用户为项目级阶段资料项手工分配或清空一个数字化平台用户作为责任人，并 MUST 记录最近一次责任人变更追溯字段。

#### Scenario: 分配启用用户为资料责任人

- **WHEN** 已登录用户请求为某项目下存在且属于该项目的资料项分配 `responsibleUserId`，且该用户存在并且 `isEnabled = true`
- **THEN** 系统必须将该资料项的 `responsible_user_id` 更新为该用户 ID，并记录 `responsibility_updated_by_user_id` 和 `responsibility_updated_at`

#### Scenario: 清空资料责任人

- **WHEN** 已登录用户请求将某项目下存在且属于该项目的资料项 `responsibleUserId` 设置为 `null`
- **THEN** 系统必须清空该资料项的 `responsible_user_id`，并记录 `responsibility_updated_by_user_id` 和 `responsibility_updated_at`

#### Scenario: 责任人分配要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项责任人分配或清空接口
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 责任人分配不做平台管理员校验

- **WHEN** 已登录用户请求资料项责任人分配或清空接口
- **THEN** 系统必须只做 `requireAuth`、项目资料项归属和候选用户有效性校验，不得要求 `isPlatformAdmin`，不得在本能力中实现复杂权限、角色权限或轻角色校验

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项责任人
- **THEN** 系统必须返回 `STAGE_DOCUMENT_NOT_FOUND`，并且不得改变任何项目资料项的责任人、责任人追溯字段、其他业务字段或业务日志

#### Scenario: 项目不存在

- **WHEN** 已登录用户请求操作不存在项目下的资料项责任人
- **THEN** 系统必须返回 `PROJECT_NOT_FOUND`，并且不得改变任何项目资料项的责任人、责任人追溯字段、其他业务字段或业务日志

#### Scenario: 分配不存在用户

- **WHEN** 已登录用户请求将资料项责任人分配给不存在的用户
- **THEN** 系统必须返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`，且不得改变资料项责任人、责任人追溯字段或业务日志

#### Scenario: 分配禁用用户

- **WHEN** 已登录用户请求将资料项责任人分配给 `isEnabled = false` 的用户
- **THEN** 系统必须返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`，且不得改变资料项责任人、责任人追溯字段或业务日志

#### Scenario: 非法责任人 ID

- **WHEN** 已登录用户请求使用非法 `responsibleUserId` 类型或格式分配资料责任人
- **THEN** 系统必须返回 `INVALID_RESPONSIBLE_USER_ID`，且不得改变资料项责任人、责任人追溯字段或业务日志

#### Scenario: 责任人分配不改变资料状态

- **WHEN** 系统成功分配或清空资料项责任人
- **THEN** 系统不得改变该资料项 `status`、适用性字段、资料状态追溯字段、适用性追溯字段或阶段齐套摘要计算口径

#### Scenario: 新资料项默认未分配责任人

- **WHEN** 系统初始化项目级阶段资料项
- **THEN** 资料项责任人和责任人变更追溯字段必须为空，直到用户手工分配或清空责任人

### Requirement: 资料项责任人变更业务日志

系统 MUST 在资料项责任人分配或清空成功后记录项目业务操作日志，并 MUST 保证责任人变更和日志写入在同一事务中提交。

#### Scenario: 分配责任人成功记录业务日志

- **WHEN** 已登录用户成功为资料项分配责任人
- **THEN** 系统必须在同一事务中记录 `action_type = document.responsible_changed` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 清空责任人成功记录业务日志

- **WHEN** 已登录用户成功清空资料项责任人
- **THEN** 系统必须在同一事务中记录 `action_type = document.responsible_changed` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 责任人日志失败回滚变更

- **WHEN** 资料项责任人和责任人追溯字段已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚责任人变更，不得改变资料项责任人或责任人追溯字段

#### Scenario: 失败操作不记录责任人日志

- **WHEN** 资料项责任人分配或清空操作因登录态、项目资料项归属、候选用户或参数校验失败而被拒绝
- **THEN** 系统不得写入 `document.responsible_changed` 业务操作日志

### Requirement: 资料项责任人边界

资料项责任人分配 MUST 只表示人工指定的资料跟进人员，不得表示权限控制、个人待办、文件平台权限或资料状态。

#### Scenario: 责任人不代表权限

- **WHEN** 用户查看或系统处理资料项责任人
- **THEN** 系统不得把责任人解释为项目权限、资料权限、文件权限、按钮权限或角色权限

#### Scenario: 分配责任人不创建待办或通知

- **WHEN** 用户手工分配或清空资料项责任人
- **THEN** 除 `document.responsible_changed` 项目业务操作日志外，系统不得创建个人待办、发送通知或触发审批流

#### Scenario: 分配责任人不联动文件和表单

- **WHEN** 用户手工分配或清空资料项责任人
- **THEN** 系统不得上传文件、下载文件、调用文件管理平台、填写在线表单、创建表单草稿或生成表单归档文件

## MODIFIED Requirements

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 要求登录态，按阶段分组返回资料项、状态追溯字段、适用性追溯字段、责任人字段、责任人变更追溯字段和阶段资料齐套摘要。

#### Scenario: 查询项目阶段资料清单

- **WHEN** 已登录用户请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 查询阶段资料清单要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求阶段资料清单
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 阶段资料清单查询不做平台管理员校验

- **WHEN** 已登录用户请求阶段资料清单
- **THEN** 系统必须只做 `requireAuth` 和项目存在校验，不得要求 `isPlatformAdmin`，不得在本能力中实现复杂权限、角色权限或轻角色校验

#### Scenario: 按阶段分组返回

- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称、该阶段资料项列表和 `completenessSummary`

#### Scenario: 资料项字段返回

- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId`、基础状态、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt`、`returnReason`、`isApplicable`、`notApplicableByUserId`、`notApplicableAt`、`notApplicableReason`、`restoredApplicableByUserId`、`restoredApplicableAt`、`responsibleUserId`、`responsibleUser`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`

#### Scenario: 责任人安全用户字段返回

- **WHEN** 后端返回已分配责任人的资料项
- **THEN** `responsibleUser` 必须只返回 `id`、`account`、`name`、`department`、`role`、`isEnabled` 和可空 `filePlatformUserId`，且不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash` 或任何密码内部字段

#### Scenario: 未分配责任人字段为空

- **WHEN** 后端返回未分配责任人的资料项
- **THEN** `responsibleUserId` 和 `responsibleUser` 必须为空，并且不得因此阻止资料清单展示

#### Scenario: 已分配责任人后来被禁用

- **WHEN** 后端返回已分配责任人但该用户后来被禁用的资料项
- **THEN** 后端必须继续返回该责任人安全用户信息，并通过 `isEnabled = false` 表示该用户当前禁用状态

#### Scenario: 阶段齐套摘要字段返回

- **WHEN** 后端返回阶段分组数据
- **THEN** 每个阶段的 `completenessSummary` 必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 阶段齐套摘要缺失列表字段返回

- **WHEN** 每个阶段的 `completenessSummary` 包含非空 `incompleteRequiredDocuments`
- **THEN** `incompleteRequiredDocuments` 中的每个资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 项目不存在

- **WHEN** 请求不存在的项目阶段资料清单
- **THEN** 后端必须返回项目不存在错误

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转、资料项适用性、阶段资料齐套摘要、项目阶段推进门禁、资料项责任人分配和项目业务操作日志不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单、手工变更资料项状态、手工变更资料项适用性、手工分配或清空资料项责任人、计算阶段资料齐套摘要、检查阶段推进齐套门禁或记录项目业务操作日志
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 资料清单能力本身不推进阶段

- **WHEN** 用户查看或系统处理阶段资料清单、资料项手工状态操作、资料项适用性操作或资料项责任人分配操作
- **THEN** 阶段资料清单能力本身不得执行阶段推进；阶段推进只能由项目核心阶段推进接口按其规格执行，并可读取当前阶段齐套摘要作为门禁输入

#### Scenario: 不实现其他排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 除既有项目核心阶段推进接口读取当前阶段齐套摘要作为门禁输入、既有手工资料项适用性、既有只读阶段资料齐套摘要、项目业务操作日志能力定义的最小业务日志和本变更定义的手工资料项责任人分配外，系统不得实现在线表单填写、表单生成归档文件、管理层看板、复杂权限、角色权限、轻角色校验或个人待办
