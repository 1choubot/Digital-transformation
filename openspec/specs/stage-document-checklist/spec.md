# stage-document-checklist Specification

## Purpose
TBD - created by archiving change add-stage-document-checklist. Update Purpose after archive.
## Requirements
### Requirement: 阶段资料项模板

系统 MUST 维护第一版阶段资料项模板，模板 MUST 以 `docs/9.1_8阶段流程与阶段定义表.md` 的 8 阶段和 `docs/9.2_阶段资料清单与责任角色表.md` 的资料项清单为来源。

#### Scenario: 模板字段完整

- **WHEN** 系统保存阶段资料项模板
- **THEN** 每个模板项必须包含阶段标识、阶段名称、资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、文件管理平台目标文件夹路径和可空 `targetFolderId`

#### Scenario: 使用标准 8 阶段

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 模板项必须归属到 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 之一

#### Scenario: 提交方式枚举

- **WHEN** 系统保存资料项提交方式
- **THEN** 提交方式必须使用在线表单、文件上传、混合或暂未确定之一

#### Scenario: 不凭空补资料项

- **WHEN** 系统初始化第一版模板
- **THEN** 系统不得添加 `docs/9.2_阶段资料清单与责任角色表.md` 之外的资料项

#### Scenario: 无法可靠解析资料文档

- **WHEN** 实现时无法可靠解析 `docs/9.2_阶段资料清单与责任角色表.md`
- **THEN** 必须暂停实现并说明原因，不得自行编造资料项

#### Scenario: 第一版目录 ID 为空

- **WHEN** 系统初始化第一版模板
- **THEN** 系统必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 能根据阶段资料项模板初始化项目资料项。

#### Scenario: 新项目初始化资料清单

- **WHEN** 项目创建成功
- **THEN** 系统必须按阶段资料项模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`

#### Scenario: 初始化资料项适用性

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项必须初始化为适用，并且不适用原因和不适用追溯字段必须为空

#### Scenario: 保存模板快照字段

- **WHEN** 系统生成项目级资料项
- **THEN** 项目级资料项必须保存资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath` 和可空 `targetFolderId` 等模板快照字段

#### Scenario: 第一版项目资料项目录 ID 为空

- **WHEN** 系统生成第一版项目级资料项
- **THEN** 项目级资料项必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

#### Scenario: 预留后续能力字段

- **WHEN** 系统保存项目级资料项
- **THEN** 系统必须预留可支持后续文件上传、在线表单、资料齐套率和阶段推进的关联字段或扩展字段

### Requirement: 历史项目补初始化

系统 MUST 支持对已有历史项目通过后端脚本或命令补初始化阶段资料清单，并 MUST 保持幂等。

#### Scenario: 历史项目补初始化

- **WHEN** 已有项目缺少项目级阶段资料清单
- **THEN** 后端脚本或命令必须能按当前阶段资料项模板为该项目补生成资料清单

#### Scenario: 补初始化不重复生成

- **WHEN** 已有项目已经存在部分或全部资料项
- **THEN** 系统必须只补齐缺失资料项，不得重复生成已存在资料项

#### Scenario: 不开放普通用户补初始化接口

- **WHEN** 第一版实现历史项目补初始化
- **THEN** 系统不得提供前端补初始化按钮，也不得开放给普通用户调用的补初始化接口

#### Scenario: 历史项目不影响项目基础状态读取

- **WHEN** 历史项目尚未补初始化资料清单
- **THEN** 系统仍必须允许读取项目列表和项目详情基础状态

### Requirement: 资料项基础状态

系统 MUST 保存和展示项目级资料项基础状态，第一版系统状态枚举只包括 `not_submitted`、`submitted`、`confirmed` 和 `returned`，并且状态变更 MUST 只能通过受控的手工状态操作接口完成。

#### Scenario: 基础状态枚举

- **WHEN** 系统保存资料项状态
- **THEN** 状态必须是 `not_submitted`、`submitted`、`confirmed` 或 `returned` 之一

#### Scenario: 状态显示口径

- **WHEN** 前端展示资料项状态
- **THEN** `not_submitted` 必须显示为“待提交”，`submitted` 必须显示为“已提交”，`confirmed` 必须显示为“已确认”，`returned` 必须显示为“已退回”

#### Scenario: 初始化状态显示

- **WHEN** 项目资料项初始化为 `not_submitted`
- **THEN** 前端必须显示为“待提交”

#### Scenario: 状态流转由专用接口控制

- **WHEN** 用户需要改变资料项状态
- **THEN** 系统必须通过资料项手工状态操作接口执行状态机校验和状态更新

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

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 在后端统一校验状态机和资料项适用性；状态流转成功后 MUST 记录项目业务操作日志。

#### Scenario: 标记待提交资料为已提交

- **WHEN** 已登录用户将状态为 `not_submitted` 且适用的项目级资料项标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，并记录 `submitted_by_user_id` 和 `submitted_at`

#### Scenario: 标记已退回资料为已提交

- **WHEN** 已登录用户将状态为 `returned` 且适用的项目级资料项重新标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，记录新的 `submitted_by_user_id` 和 `submitted_at`，并清空 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 确认已提交资料

- **WHEN** 已登录用户确认状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `confirmed`，并记录 `confirmed_by_user_id` 和 `confirmed_at`

#### Scenario: 退回已提交资料

- **WHEN** 已登录用户填写非空退回原因并退回状态为 `submitted` 且适用的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `returned`，并记录 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 不适用资料项不能状态流转

- **WHEN** 已登录用户请求提交、确认或退回已标记不适用的项目级资料项
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态、状态追溯字段或适用性字段

#### Scenario: 退回原因必填

- **WHEN** 已登录用户退回资料项但未提供非空退回原因
- **THEN** 系统必须拒绝退回，并且不得改变资料项状态或追溯字段

#### Scenario: 非法状态流转

- **WHEN** 用户请求未被允许的资料项状态流转
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态或追溯字段

#### Scenario: 状态操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项状态操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 状态操作不做角色权限

- **WHEN** 已登录用户请求资料项状态操作
- **THEN** 系统必须只校验登录态、状态机和资料项适用性，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项状态

#### Scenario: 标记提交成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项标记为 `submitted`
- **THEN** 系统必须在同一事务中记录 `action_type = document.submitted` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 确认成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项确认为 `confirmed`
- **THEN** 系统必须在同一事务中记录 `action_type = document.confirmed` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 退回成功记录业务日志

- **WHEN** 已登录用户成功将适用资料项退回为 `returned`
- **THEN** 系统必须在同一事务中记录 `action_type = document.returned` 且 `target_type = stage_document` 的项目业务操作日志，并在 `details_json` 中包含 `returnReason`

#### Scenario: 状态操作日志失败回滚状态变更

- **WHEN** 资料项状态和追溯字段已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚资料项状态流转，不得改变资料项状态或追溯字段

### Requirement: 手工状态流转边界

资料项手工状态流转 MUST 只更新数字化平台中的资料项状态、最小追溯字段和项目业务操作日志，不能表示真实文件上传、在线表单提交或文件平台归档。

#### Scenario: 标记提交不创建文件或表单记录

- **WHEN** 用户手工标记资料项为已提交
- **THEN** 除 `document.submitted` 项目业务操作日志外，系统不得创建文件上传记录、在线表单记录、归档文件或文件平台文件映射

#### Scenario: 状态操作不推进阶段或生成看板

- **WHEN** 用户手工变更资料项状态
- **THEN** 系统不得在状态操作接口中推进阶段或生成管理层看板指标；阶段资料齐套摘要只能在阶段资料清单查询结果中基于当前手工状态只读返回

#### Scenario: 退回资料不创建个人待办

- **WHEN** 用户手工退回资料项
- **THEN** 系统不得在本能力中创建个人待办、发送通知或分配责任人

### Requirement: 阶段资料齐套摘要

系统 MUST 在项目阶段资料清单查询结果中返回每个阶段的只读必填资料齐套摘要，并 MUST 基于项目级资料项的当前手工状态和适用性计算；项目阶段推进能力可以读取当前阶段摘要或使用等价口径作为推进门禁输入。

#### Scenario: 返回阶段齐套摘要字段

- **WHEN** 后端返回某项目阶段资料清单
- **THEN** 每个阶段必须包含 `completenessSummary`，且该摘要必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用且必填资料项

- **WHEN** 后端计算某阶段齐套摘要
- **THEN** `requiredTotal` 必须只统计 `is_required = true` 且适用的资料项，建议资料项和不适用资料项不得计入齐套摘要计数或百分比

#### Scenario: 已确认适用必填资料计为完成

- **WHEN** 适用必填资料项状态为 `confirmed`
- **THEN** 后端必须将该资料项计入 `confirmedRequiredCount`

#### Scenario: 非确认适用必填资料计为未完成

- **WHEN** 适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 后端必须将该资料项计入 `incompleteRequiredCount`，并在 `incompleteRequiredDocuments` 中返回该资料项

#### Scenario: 不适用资料项不进入缺失列表

- **WHEN** 必填资料项已标记为不适用
- **THEN** 后端不得将该资料项计入 `requiredTotal`、`confirmedRequiredCount` 或 `incompleteRequiredCount`，也不得将其返回到 `incompleteRequiredDocuments`

#### Scenario: 缺失必填资料项最小字段

- **WHEN** 后端在 `incompleteRequiredDocuments` 中返回缺失必填资料项
- **THEN** 每个缺失必填资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 建议资料继续展示但不影响齐套率

- **WHEN** 阶段包含 `is_required = false` 的建议资料项
- **THEN** 后端必须继续在阶段资料项列表中返回该资料项，但不得因该资料项状态或适用性影响 `completionPercent`

#### Scenario: 完成百分比计算规则

- **WHEN** 后端计算某阶段 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算，当 `requiredTotal = 0` 时必须返回 `100`，且第一版必须使用 0 到 100 的整数百分比

#### Scenario: 没有适用必填资料的阶段

- **WHEN** 某阶段 `requiredTotal = 0`
- **THEN** 后端必须返回 `completionPercent = 100`、`confirmedRequiredCount = 0`、`incompleteRequiredCount = 0` 和空的 `incompleteRequiredDocuments`

#### Scenario: 适用性变更后摘要使用最新状态

- **WHEN** 资料项适用性操作成功后前端重新查询阶段资料清单
- **THEN** 后端必须基于查询时的最新资料项状态和适用性返回阶段齐套摘要

#### Scenario: 阶段推进读取当前阶段摘要口径

- **WHEN** 项目阶段推进能力检查当前阶段齐套门禁
- **THEN** 系统必须使用本需求定义的适用必填资料齐套口径，并且缺失资料列表最小字段必须与 `incompleteRequiredDocuments` 一致

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统计算或返回阶段资料齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态和人工适用性判断，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交

### Requirement: 资料项适用性

系统 MUST 为项目级阶段资料项保存独立适用性，资料项默认适用，并 MUST 支持手工标记不适用和恢复适用；适用性操作成功后 MUST 记录项目业务操作日志。

#### Scenario: 新资料项默认适用

- **WHEN** 系统生成项目级阶段资料项
- **THEN** 资料项必须默认保存为适用状态

#### Scenario: 标记资料项不适用

- **WHEN** 已登录用户填写非空不适用原因并标记当前适用的项目级资料项不适用
- **THEN** 系统必须将该资料项保存为不适用，记录 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并清空 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 不适用原因必填

- **WHEN** 已登录用户标记资料项不适用但未提供非空不适用原因
- **THEN** 系统必须拒绝该操作，并且不得改变资料项适用性、`status` 或追溯字段

#### Scenario: 恢复资料项适用

- **WHEN** 已登录用户将不适用资料项恢复为适用
- **THEN** 系统必须将该资料项保存为适用，清空 `not_applicable_by_user_id`、`not_applicable_at` 和 `not_applicable_reason`，并记录 `restored_applicable_by_user_id` 和 `restored_applicable_at`

#### Scenario: 只有适用资料可标记不适用

- **WHEN** 已登录用户请求将已不适用资料项再次标记为不适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 只有不适用资料可恢复适用

- **WHEN** 已登录用户请求将当前适用资料项恢复适用
- **THEN** 系统必须拒绝该非法适用性流转，并且不得改变资料项适用性、`status` 或任何追溯字段

#### Scenario: 恢复适用不自动修改状态

- **WHEN** 系统恢复资料项适用
- **THEN** 系统必须保留该资料项原有 `status`，不得自动改为 `not_submitted`、`submitted`、`confirmed` 或 `returned`

#### Scenario: 适用性操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项适用性操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 适用性操作不做角色权限

- **WHEN** 已登录用户请求资料项适用性操作
- **THEN** 系统必须只校验登录态、资料项归属和操作规则，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项适用性
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项

#### Scenario: 标记不适用成功记录业务日志

- **WHEN** 已登录用户成功标记资料项不适用
- **THEN** 系统必须在同一事务中记录 `action_type = document.marked_not_applicable` 且 `target_type = stage_document` 的项目业务操作日志，并在 `details_json` 中包含 `notApplicableReason`

#### Scenario: 恢复适用成功记录业务日志

- **WHEN** 已登录用户成功恢复资料项适用
- **THEN** 系统必须在同一事务中记录 `action_type = document.restored_applicable` 且 `target_type = stage_document` 的项目业务操作日志

#### Scenario: 适用性日志失败回滚适用性变更

- **WHEN** 资料项适用性和追溯字段已经准备提交，但对应业务操作日志写入失败
- **THEN** 系统必须回滚资料项适用性操作，不得改变资料项适用性、`status` 或追溯字段

### Requirement: 适用性边界

资料项适用性 MUST 表示人工业务判断，不能表示资料已提交、已确认、已归档或已上传。

#### Scenario: 不适用不创建文件或表单记录

- **WHEN** 用户手工标记资料项不适用
- **THEN** 除 `document.marked_not_applicable` 项目业务操作日志外，系统不得创建文件上传记录、在线表单记录、归档文件或文件平台文件映射

#### Scenario: 不适用不推进阶段

- **WHEN** 用户手工标记资料项不适用或恢复适用
- **THEN** 系统不得推进阶段、生成阶段门禁结果、生成管理层看板指标、创建个人待办、发送通知或分配责任人

#### Scenario: 不适用不改变状态含义

- **WHEN** 资料项被标记为不适用
- **THEN** 系统不得把该资料项解释为已提交、已确认、已上传文件或已归档

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

### Requirement: 我的阶段资料任务查询接口

系统 MUST 提供 `GET /api/me/stage-document-tasks`，用于已登录用户查询分配给自己的项目级阶段资料项任务。

#### Scenario: 查询我的资料任务要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/me/stage-document-tasks`
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 查询我的资料任务不要求平台管理员

- **WHEN** 已登录用户请求 `GET /api/me/stage-document-tasks`
- **THEN** 系统必须只做 `requireAuth`，不得要求 `isPlatformAdmin`，不得实现复杂权限、项目成员权限、资料权限、角色权限或轻角色校验

#### Scenario: 只返回当前登录用户负责的资料项

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统必须只返回 `responsible_user_id = 当前登录用户 id` 的项目级阶段资料项，不得允许前端通过参数查询其他用户的资料任务

#### Scenario: 默认返回待办资料任务

- **WHEN** 已登录用户未提供 `status` 筛选时请求我的资料任务
- **THEN** 系统必须按 `status=pending` 处理，只返回状态为 `not_submitted`、`submitted` 或 `returned` 且适用的资料项

#### Scenario: 默认排除不适用资料

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统必须默认排除 `is_applicable = 0` 的资料项，并且不得把不适用资料作为待办返回

#### Scenario: 支持单一状态筛选

- **WHEN** 已登录用户使用 `status=not_submitted`、`status=submitted`、`status=returned` 或 `status=confirmed` 请求我的资料任务
- **THEN** 系统必须只返回当前登录用户负责、状态匹配且适用的资料项

#### Scenario: 支持 pending 状态筛选

- **WHEN** 已登录用户使用 `status=pending` 请求我的资料任务
- **THEN** 系统必须返回当前登录用户负责、状态为 `not_submitted`、`submitted` 或 `returned` 且适用的资料项

#### Scenario: 支持 all 状态筛选

- **WHEN** 已登录用户使用 `status=all` 请求我的资料任务
- **THEN** 系统必须返回当前登录用户负责、状态为 `not_submitted`、`submitted`、`returned` 或 `confirmed` 且适用的资料项

#### Scenario: 非法状态筛选

- **WHEN** 已登录用户使用不属于 `not_submitted`、`submitted`、`returned`、`confirmed`、`pending` 或 `all` 的 `status` 请求我的资料任务
- **THEN** 系统必须通过统一错误处理返回 `INVALID_STAGE_DOCUMENT_TASK_STATUS` 和明确 HTTP 状态，建议为 400，并且不得回退为默认查询

#### Scenario: 支持项目筛选

- **WHEN** 已登录用户提供合法 `projectId` 请求我的资料任务
- **THEN** 系统必须只返回当前登录用户负责、属于该项目且符合状态筛选和适用性口径的资料项

#### Scenario: 非法项目筛选

- **WHEN** 已登录用户提供非数字、空字符串、0、负数、小数或其他非正整数格式的 `projectId` 请求我的资料任务
- **THEN** 系统必须通过统一错误处理返回 `INVALID_PROJECT_ID` 和明确 HTTP 状态，建议为 400，并且不得回退为无项目筛选查询

#### Scenario: 合法项目筛选无匹配任务

- **WHEN** 已登录用户提供合法正整数 `projectId`，但不存在匹配当前登录用户、适用性和状态筛选条件的资料任务
- **THEN** 系统必须返回空列表，不得把该情况作为错误处理

#### Scenario: 项目和阶段状态不参与过滤

- **WHEN** 已登录用户请求我的资料任务
- **THEN** 系统不得按项目状态、阶段状态或阶段是否当前过滤结果；只要资料项分配给当前登录用户、适用且状态符合筛选条件，就必须按查询和排序规则返回

#### Scenario: 我的资料任务返回字段

- **WHEN** 系统返回我的资料任务列表
- **THEN** 每个任务必须至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`

#### Scenario: 我的资料任务稳定排序

- **WHEN** 系统返回我的资料任务列表
- **THEN** 系统必须按状态优先级 `returned`、`not_submitted`、`submitted`、`confirmed` 排序；同状态下按 `responsibilityUpdatedAt` 倒序且空值排后，再按 `projectCode` 升序、`stageOrder` 升序、`documentOrder` 升序和 `documentId` 升序排序

#### Scenario: 查询我的资料任务不写业务日志

- **WHEN** 已登录用户查询我的资料任务
- **THEN** 系统不得写入项目业务操作日志，不得改变资料状态、适用性、责任人、责任人追溯字段、阶段齐套摘要或阶段推进状态

### Requirement: 我的阶段资料任务边界

我的阶段资料任务 MUST 只表示分配给当前登录用户的阶段资料项查询视图，不得扩展为文件、表单、通知、权限或统计能力。

#### Scenario: 我的资料任务不代表文件或表单状态

- **WHEN** 系统返回或前端展示我的资料任务
- **THEN** 系统必须保持资料状态为当前手工标记状态，不得把任务状态解释为文件已上传、文件已归档或在线表单已填写

#### Scenario: 我的资料任务不创建协同动作

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得创建消息提醒、超期提醒、截止日期、个人待办实体、审批流或通知

#### Scenario: 我的资料任务不联动文件平台

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得上传文件、下载文件、调用文件管理平台、同步文件权限或判断文件权限

#### Scenario: 我的资料任务不提供批量操作

- **WHEN** 用户查询我的资料任务
- **THEN** 系统不得在本能力中提供批量提交、批量确认、批量退回、批量标记适用性或批量责任人变更能力

### Requirement: 项目总览当前阶段齐套摘要

系统 MUST 允许项目总览看板按既有阶段资料清单齐套口径，查询并返回每个项目当前阶段的适用必填资料齐套摘要。

#### Scenario: 项目总览只统计当前阶段

- **WHEN** 系统为项目总览看板计算某项目齐套摘要
- **THEN** 系统必须只计算该项目当前阶段的资料项，不得因其他阶段资料缺失或完成而影响当前阶段摘要

#### Scenario: 项目总览齐套摘要字段

- **WHEN** 项目当前阶段存在资料项记录
- **THEN** 项目总览中的 `currentStageCompletenessSummary` 必须包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 和 `completionPercent`

#### Scenario: 项目总览只统计适用必填资料

- **WHEN** 系统为项目总览计算当前阶段齐套摘要
- **THEN** `requiredTotal` 必须只统计 `is_required = true` 且 `is_applicable = 1` 的资料项，建议资料项和不适用资料项不得计入齐套摘要计数或百分比

#### Scenario: 项目总览已确认资料计为完成

- **WHEN** 当前阶段适用必填资料项状态为 `confirmed`
- **THEN** 项目总览必须将该资料项计入 `confirmedRequiredCount`

#### Scenario: 项目总览未确认资料计为未完成

- **WHEN** 当前阶段适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 项目总览必须将该资料项计入 `incompleteRequiredCount`，并在 `currentStageIncompleteRequiredDocuments` 中返回该资料项

#### Scenario: 项目总览不适用资料不进入缺失列表

- **WHEN** 当前阶段必填资料项已标记为不适用
- **THEN** 项目总览不得将该资料项计入 `requiredTotal`、`confirmedRequiredCount` 或 `incompleteRequiredCount`，也不得将其返回到 `currentStageIncompleteRequiredDocuments`

#### Scenario: 项目总览缺失资料最小字段

- **WHEN** 项目总览在 `currentStageIncompleteRequiredDocuments` 中返回缺失资料项
- **THEN** 每个缺失资料项必须至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 项目总览 requiredTotal 为零

- **WHEN** 当前阶段存在资料项记录，但适用必填资料数为 0
- **THEN** 项目总览必须返回 `completionPercent = 100`、`confirmedRequiredCount = 0`、`incompleteRequiredCount = 0` 和空的 `currentStageIncompleteRequiredDocuments`

#### Scenario: 项目总览当前阶段资料清单未初始化

- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 项目总览必须返回 `currentStageCompletenessSummary = null`、空的 `currentStageIncompleteRequiredDocuments` 和 `currentStageIssue = checklist_not_initialized`，不得自动初始化资料清单

#### Scenario: 项目总览齐套摘要不代表文件归档

- **WHEN** 系统计算或返回项目总览齐套摘要
- **THEN** 系统必须明确该摘要基于当前手工状态和人工适用性判断，不得把 `completionPercent` 表示为文件已上传、文件已归档或在线表单已提交

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

### Requirement: 阶段资料后端模块化保持行为
系统 MUST 允许对阶段资料相关后端仓储和 helper 做模块化拆分，但拆分后 MUST 保持阶段资料清单、资料状态、适用性、齐套摘要、责任人、我的资料任务和阶段资料附件能力的对外行为不变。

#### Scenario: 阶段资料清单查询行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户请求某项目阶段资料清单
- **THEN** 系统必须仍要求登录态，并按既有 8 阶段分组、资料项字段、责任人安全字段、状态追溯字段、适用性追溯字段、责任人变更追溯字段和阶段齐套摘要口径返回数据

#### Scenario: 阶段资料初始化行为保持
- **WHEN** 后端完成阶段资料模块拆分后，新项目创建或历史项目补初始化阶段资料清单
- **THEN** 系统必须仍按阶段资料模板生成项目级资料项，保持资料项模板快照字段、默认状态、默认适用性、目标文件夹字段和幂等补初始化规则不变

#### Scenario: 资料状态流转行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户执行资料提交、确认或退回
- **THEN** 系统必须保持既有状态机、适用性限制、退回原因校验、资料项归属校验、追溯字段更新、错误码、HTTP 状态码和业务日志事务规则不变

#### Scenario: 资料适用性行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户标记资料项不适用或恢复适用
- **THEN** 系统必须保持既有适用性规则、原因校验、追溯字段更新、状态不自动改变、齐套摘要重新查询口径和业务日志事务规则不变

#### Scenario: 阶段齐套摘要行为保持
- **WHEN** 后端完成阶段资料模块拆分后，系统计算阶段齐套摘要或阶段推进齐套门禁
- **THEN** 系统必须仍只统计适用必填资料，`confirmed` 计为完成，`not_submitted`、`submitted` 和 `returned` 计为未完成，建议资料和不适用资料不影响计数，`requiredTotal = 0` 时 `completionPercent = 100`

#### Scenario: 资料责任人行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户查询候选用户、分配责任人或清空责任人
- **THEN** 系统必须保持既有登录要求、非平台管理员边界、启用用户候选口径、责任人安全字段、禁用责任人展示、责任人追溯字段、错误码和 `document.responsible_changed` 日志事务规则不变

#### Scenario: 我的资料任务行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户请求 `GET /api/me/stage-document-tasks`
- **THEN** 系统必须保持只查询当前登录用户负责资料项、默认 pending、状态筛选、严格 `projectId` 校验、项目/阶段状态不过滤、默认排除不适用资料、返回字段、排序和只读边界不变

#### Scenario: 阶段资料附件行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户上传、查询、下载或删除阶段资料附件
- **THEN** 系统必须保持既有附件接口路径、登录边界、ID 校验优先级、文件参数校验、单 `file` 字段策略、不适用资料项上传限制、列表字段和排序、下载错误码、软删除、业务日志事务规则和不改变资料业务状态的边界不变

#### Scenario: 阶段资料数据库结构保持
- **WHEN** 实现阶段资料后端模块拆分
- **THEN** 系统不得新增阶段资料数据库迁移，不得修改阶段资料模板、项目级阶段资料、附件或业务日志相关表结构、字段、索引、默认值或历史数据

#### Scenario: 阶段资料不新增排除能力
- **WHEN** 实现阶段资料后端模块拆分
- **THEN** 系统不得因本次结构治理新增文件管理平台联动、在线表单、表单草稿、表单归档文件、附件预览、版本管理、病毒扫描、消息提醒、超期提醒、项目成员权限、资料责任人权限、复杂权限或批量资料操作

