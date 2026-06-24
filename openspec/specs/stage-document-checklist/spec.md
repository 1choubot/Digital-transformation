# stage-document-checklist Specification

## Purpose
TBD - created by archiving change add-stage-document-checklist. Update Purpose after archive.
## Requirements
### Requirement: 阶段资料项模板

系统 MUST 维护 20260610 版阶段资料项模板，模板 MUST 以 `智能制造项目管理流程图20260610.pdf`、`docs/9.7_智能制造项目整体推进流程_20260610.md` 和 `docs/9.2_阶段资料清单与责任角色表_20260610.md` 为来源。

#### Scenario: 模板字段完整

- **WHEN** 系统保存阶段资料项模板
- **THEN** 每个模板项必须包含阶段标识、阶段名称、资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、文件管理平台目标文件夹路径 `targetFolderPath` 和可空 `targetFolderId`

#### Scenario: 使用标准 8 阶段

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 模板项必须归属到 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 之一

#### Scenario: 提交方式枚举

- **WHEN** 系统保存资料项提交方式
- **THEN** 提交方式必须使用在线表单、文件上传、混合或暂未确定之一

#### Scenario: 不凭空补资料项

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统不得添加 `docs/9.2_阶段资料清单与责任角色表_20260610.md` 之外的资料项

#### Scenario: 无法可靠解析资料文档

- **WHEN** 实现时无法可靠解析 `docs/9.2_阶段资料清单与责任角色表_20260610.md`
- **THEN** 必须暂停实现并说明原因，不得自行编造资料项

#### Scenario: 模板版本为 v20260610

- **WHEN** 系统保存 20260610 版阶段资料项模板
- **THEN** 模板版本必须使用 `v20260610`，不得继续使用旧版 `v1` 作为程序运行模板版本

#### Scenario: 旧 48 项模板废弃

- **WHEN** 系统初始化阶段资料项模板
- **THEN** 系统必须废弃旧版 48 项资料模板，不得继续以旧 48 项作为程序运行依据，也不得同时运行旧模板和 `v20260610` 模板

#### Scenario: 新版资料项数量校验

- **WHEN** 系统初始化或校验 20260610 版阶段资料项模板
- **THEN** `EXPECTED_STAGE_DOCUMENT_ITEM_COUNT` 必须按新版资料项实际数量设置；当前正式文档为 54 项

#### Scenario: 20260610 版目标目录字段

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统必须从正式资料清单的 `文件平台目标目录` 字段读取并保存 `targetFolderPath`

#### Scenario: 20260610 版目录 ID 为空

- **WHEN** 系统初始化 20260610 版模板
- **THEN** 系统必须保持 `targetFolderId` 为空

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 根据 20260610 版阶段资料项模板初始化项目资料项。

#### Scenario: 新项目初始化资料清单

- **WHEN** 项目创建成功
- **THEN** 系统必须按 `v20260610` 阶段资料项模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`

#### Scenario: 初始化资料项适用性

- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项必须初始化为适用，并且不适用原因和不适用追溯字段必须为空

#### Scenario: 保存模板快照字段

- **WHEN** 系统生成项目级资料项
- **THEN** 项目级资料项必须保存 20260610 版资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath` 和可空 `targetFolderId` 等模板快照字段

#### Scenario: 20260610 版项目资料项目录 ID 为空

- **WHEN** 系统生成 20260610 版项目级资料项
- **THEN** 项目级资料项必须保存 `targetFolderPath`，并保持 `targetFolderId` 为空

#### Scenario: 预留后续能力字段

- **WHEN** 系统保存项目级资料项
- **THEN** 系统必须预留可支持后续文件上传、在线表单、资料齐套率和阶段推进的关联字段或扩展字段

#### Scenario: 不兼容旧模拟项目资料

- **WHEN** 系统切换为 20260610 版阶段资料模板
- **THEN** 系统不得要求兼容旧模拟项目的旧资料项，也不得为旧资料项提供新旧模板映射或共存初始化逻辑

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

系统 MUST 为每个阶段分组返回适用必填资料齐套摘要，并 MUST 只基于 20260610 版项目级阶段资料项、当前手工状态和人工适用性判断计算。

#### Scenario: 返回阶段齐套摘要字段

- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个阶段分组必须返回 `completenessSummary`，包含 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用且必填资料项

- **WHEN** 系统计算阶段齐套摘要
- **THEN** 系统必须只统计 `isRequired = true` 且 `isApplicable = true` 的 20260610 版资料项

#### Scenario: 已确认适用必填资料计为完成

- **WHEN** 适用必填资料项状态为 `confirmed`
- **THEN** 系统必须将其计入 `confirmedRequiredCount`

#### Scenario: 非确认适用必填资料计为未完成

- **WHEN** 适用必填资料项状态为 `not_submitted`、`submitted` 或 `returned`
- **THEN** 系统必须将其计入 `incompleteRequiredCount`，并加入缺失必填资料列表

#### Scenario: 不适用资料项不进入缺失列表

- **WHEN** 必填资料项被标记为不适用
- **THEN** 系统不得将该资料项计入 `requiredTotal` 或 `incompleteRequiredDocuments`

#### Scenario: 缺失必填资料项最小字段

- **WHEN** `incompleteRequiredDocuments` 返回资料项
- **THEN** 每项至少包含 `id`、`documentCode`、`documentName` 和 `status`

#### Scenario: 非必需资料继续展示但不影响齐套率

- **WHEN** 20260610 版资料项为非必需或建议资料
- **THEN** 系统必须继续在资料清单中展示该资料项，但不得将其计入 `requiredTotal`、`confirmedRequiredCount`、`incompleteRequiredCount` 或阶段推进门禁

#### Scenario: 完成百分比计算规则

- **WHEN** 系统计算 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(confirmedRequiredCount / requiredTotal * 100)` 计算，并返回 0 到 100 的整数

#### Scenario: 没有适用必填资料的阶段

- **WHEN** 阶段 `requiredTotal = 0`
- **THEN** 系统必须返回 `completionPercent = 100`

#### Scenario: 适用性变更后摘要使用最新状态

- **WHEN** 资料项被标记不适用或恢复适用后用户重新查询阶段资料清单
- **THEN** 系统必须基于最新 `isApplicable` 状态重新计算 `completenessSummary`

#### Scenario: 阶段推进读取当前阶段摘要口径

- **WHEN** 系统执行阶段推进齐套门禁
- **THEN** 系统必须使用同一 20260610 版资料项齐套摘要口径判断当前阶段是否可推进

#### Scenario: 齐套摘要不代表文件归档

- **WHEN** 系统返回阶段齐套摘要
- **THEN** 系统不得把该摘要表示为文件已上传、文件已归档或在线表单已提交

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

### Requirement: 20260610 资料能力行为保持
系统 MUST 在替换为 20260610 版资料项模板后保持资料状态、适用性、责任人、附件、我的资料任务和项目总览的既有行为，只改变资料项模板数据。

#### Scenario: 资料状态机保持
- **WHEN** 已登录用户对 20260610 版资料项执行提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 状态机和既有错误口径

#### Scenario: 适用性规则保持
- **WHEN** 已登录用户对 20260610 版资料项标记不适用或恢复适用
- **THEN** 系统必须继续保持既有适用性规则、原因校验和状态不自动改变口径

#### Scenario: 责任人分配规则保持
- **WHEN** 已登录用户为 20260610 版资料项分配或清空责任人
- **THEN** 系统必须继续保持既有候选用户、责任人安全字段、责任人追溯和责任人不代表权限的口径

#### Scenario: 附件能力保持
- **WHEN** 已登录用户对 20260610 版资料项上传、查询、下载或删除附件
- **THEN** 系统必须继续保持既有附件接口路径、文件参数校验、软删除、业务日志和不改变资料业务状态的口径

#### Scenario: 我的资料任务使用新版资料项
- **WHEN** 当前登录用户查询我的资料任务
- **THEN** 系统必须按 20260610 版项目级资料项返回任务，并保持现有状态筛选、项目筛选、排序和只读边界

#### Scenario: 项目总览使用新版资料项
- **WHEN** 当前登录用户查询项目总览看板
- **THEN** 系统必须按 20260610 版当前阶段资料项计算齐套摘要和未完成适用必填资料，并保持现有筛选、排序和只读边界

### Requirement: 资料责任人与组织角色边界
系统 MUST 继续使用资料项级 `responsibleUserId` 表达资料责任人，并 MUST 明确资料责任人负责提交或整理资料但不代表审批权。

#### Scenario: 资料责任人继续使用现有字段
- **WHEN** 系统保存项目级阶段资料项责任人
- **THEN** 系统必须继续使用 `responsibleUserId` 表达资料责任人，不得新增技术负责人字段替代该能力

#### Scenario: 资料责任人负责提交整理
- **WHEN** 用户被分配为某资料项责任人
- **THEN** 系统必须将其视为该资料项提交、整理或协调责任人

#### Scenario: 资料责任人不代表审批权
- **WHEN** 用户仅因被分配为某资料项责任人
- **THEN** 系统不得自动授予该用户确认资料、退回资料或审批流程节点的权限

#### Scenario: 项目经理可以是资料责任人
- **WHEN** 某项目经理被分配为其项目内资料项责任人
- **THEN** 系统必须允许该分配，并仍按资料责任人规则处理资料任务

#### Scenario: 责任人候选用户只包含部门启用用户
- **WHEN** 系统返回资料责任人候选用户
- **THEN** 系统必须只返回 `isEnabled = true`、`organizationRole` 为 `center_manager` 或 `employee`、且 `department` 为四个业务部门之一的用户

#### Scenario: 责任人候选用户排除全局角色和内部字段
- **WHEN** 系统返回资料责任人候选用户
- **THEN** 响应不得返回总经理、系统管理员、总经理助理、禁用用户、密码字段或非展示必需的 `isPlatformAdmin` / `is_platform_admin` 内部字段

### Requirement: 技术负责人和项目参与人派生
系统 MUST 不单独建立技术负责人或项目参与人身份，技术负责人和项目参与人 MUST 从资料责任人关系表达或派生。

#### Scenario: 技术负责人由资料责任人表达
- **WHEN** 某技术资料需要技术负责人负责
- **THEN** 系统必须通过该资料项 `responsibleUserId` 表达技术负责人，不得新增技术负责人表

#### Scenario: 项目参与人由资料责任人派生
- **WHEN** 用户在某项目中负责至少一项资料
- **THEN** 系统必须将其派生视为该项目参与人

#### Scenario: 不新增项目参与人表
- **WHEN** 系统表达项目参与人
- **THEN** 系统不得在本 change 中新增项目参与人表、项目成员表或手工项目参与人维护入口

### Requirement: 资料确认退回审批边界
系统 MUST 保持当前资料确认/退回能力存在，并 MUST 为后续审批权限约束保留组织角色边界。

#### Scenario: 当前状态机继续存在
- **WHEN** 系统处理资料提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 状态机

#### Scenario: 后续确认退回应受审批身份约束
- **WHEN** 后续实现资料确认或退回权限约束
- **THEN** 系统应要求中心负责人、总经理等审批身份执行，而不得仅因用户是资料责任人或项目经理就允许审批

#### Scenario: 总经理助理不确认退回资料
- **WHEN** 用户 `organizationRole = general_manager_assistant`
- **THEN** 后端必须拒绝其直接调用资料确认或退回接口，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 系统管理员不确认退回资料
- **WHEN** 用户 `organizationRole = system_admin`
- **THEN** 后端必须拒绝其直接调用资料确认或退回接口，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 中心负责人不得跨中心确认退回资料
- **WHEN** 中心负责人直接调用非本中心相关资料确认或退回接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 总经理助理不分配资料责任人
- **WHEN** 用户 `organizationRole = general_manager_assistant` 直接调用资料责任人分配或清空接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 系统管理员不分配资料责任人
- **WHEN** 用户 `organizationRole = system_admin` 直接调用资料责任人分配或清空接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理不能仅凭项目身份确认退回资料
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认或退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备中心负责人、总经理或后续审批规则允许的审批身份

#### Scenario: 项目经理可分配自己负责项目的资料责任人
- **WHEN** 用户是该项目项目经理并直接调用资料责任人分配或清空接口
- **THEN** 后端可以允许其在责任人候选用户范围内分配或清空自己负责项目的资料责任人

#### Scenario: 中心负责人只能分配本中心相关资料
- **WHEN** 中心负责人直接调用资料责任人分配或清空接口
- **THEN** 后端必须要求资料属于本中心相关范围，且分配目标是本中心合法候选用户或项目允许范围内用户；跨中心操作必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 非授权用户不得分配资料责任人
- **WHEN** 用户不是该项目项目经理、不是中心负责人、也不是系统允许的其他角色，却直接调用资料责任人分配或清空接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 不适用操作必须受审批身份约束
- **WHEN** 用户直接调用资料标记不适用或恢复适用接口
- **THEN** 后端必须要求用户为总经理或本中心相关资料的中心负责人；总经理助理、系统管理员、无关普通员工和跨中心中心负责人必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 失败权限操作不改变资料
- **WHEN** 资料确认、退回、责任人分配、标记不适用或恢复适用因权限不足失败
- **THEN** 系统不得改变资料状态、适用性、责任人、追溯字段、阶段状态或业务日志

#### Scenario: 本 change 不实现完整审批流
- **WHEN** 系统规划资料审批边界
- **THEN** 本 change 不得实现阶段审批流引擎、自动通知或自动状态流转

### Requirement: 项目模式不改变阶段资料规则
系统 MUST 保持自研模式和供应链/外包模式使用同一阶段资料清单、齐套摘要和附件规则。

#### Scenario: 自研外包共用 54 项资料
- **WHEN** 系统初始化自研或外包项目的阶段资料
- **THEN** 两种项目模式都必须使用 20260610 版 54 项阶段资料

#### Scenario: 项目模式不改变资料责任人规则
- **WHEN** 项目为供应链/外包模式
- **THEN** 系统仍必须由公司员工作为资料责任人负责检查、整理成公司模板并提交

#### Scenario: 项目模式不改变齐套摘要
- **WHEN** 系统计算自研或外包项目阶段齐套摘要
- **THEN** 系统仍必须只统计适用必填资料，并以 `confirmed` 作为完成口径

#### Scenario: 项目模式不改变附件边界
- **WHEN** 用户为自研或外包项目资料上传、查询、下载或删除附件
- **THEN** 系统必须保持既有附件规则，且不得因项目模式联动文件管理平台

#### Scenario: 附件接口受项目可见性约束
- **WHEN** 已登录用户调用阶段资料附件上传、列表、下载或删除接口
- **THEN** 后端必须先校验当前用户可查看该项目；无权访问该项目时必须返回 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 附件无权上传不产生副作用
- **WHEN** 用户对无权项目直接调用附件上传接口
- **THEN** 系统不得读取或保存上传文件，不得新增附件记录，不得写业务日志

#### Scenario: 附件无权删除不产生副作用
- **WHEN** 用户对无权项目直接调用附件删除接口
- **THEN** 系统不得软删除附件，不得改变附件记录，不得写业务日志

### Requirement: 阶段资料与阶段审批流关系
系统 MUST 将阶段审批提交建立在当前阶段适用必填资料齐套基础上，并 MUST 保持资料状态机与审批状态机边界清晰。

#### Scenario: 必填资料未齐套不得提交阶段审批
- **WHEN** 当前阶段存在适用必填资料状态不是 `confirmed`
- **THEN** 系统必须拒绝提交该阶段审批，并返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`

#### Scenario: 确认资料计入审批提交条件
- **WHEN** 当前阶段适用必填资料全部为 `confirmed`
- **THEN** 系统可以允许有权项目经理提交阶段审批，但仍必须执行审批权限和状态机校验

#### Scenario: 资料被退回后不得通过阶段审批
- **WHEN** 当前阶段任一适用必填资料状态为 `returned`
- **THEN** 中心负责人或总经理不得将该阶段审批通过，系统必须返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`

#### Scenario: 资料责任人提交不等于审批通过
- **WHEN** 资料责任人将资料状态从 `not_submitted` 或 `returned` 标记为 `submitted`
- **THEN** 系统不得因此自动确认资料、自动提交阶段审批或自动通过审批

#### Scenario: 资料确认不等于阶段审批通过
- **WHEN** 所有适用必填资料被确认
- **THEN** 系统不得自动通过阶段审批，仍必须由项目经理提交审批并由有权审批人处理

#### Scenario: 附件存在不等于资料合格
- **WHEN** 阶段资料项存在附件
- **THEN** 系统不得把附件存在解释为资料已确认、阶段已齐套或审批已通过

#### Scenario: 适用性影响审批提交条件
- **WHEN** 必填资料被有权用户标记为不适用
- **THEN** 系统必须继续按既有齐套摘要口径将其排除出审批提交条件和阶段推进门禁

### Requirement: 资料确认退回与阶段审批权限关系
系统 MUST 保持资料确认/退回能力与阶段审批流的职责边界，并 MUST 不把资料责任人或项目经理身份自动视为审批身份。

#### Scenario: 资料责任人不是审批人
- **WHEN** 用户仅因负责某资料项而调用资料确认、资料退回或阶段审批接口
- **THEN** 系统必须按既有权限和审批规则校验，不得自动授予审批权

#### Scenario: 项目经理不是资料审批人
- **WHEN** 项目经理仅因项目经理身份调用资料确认或退回接口
- **THEN** 系统必须拒绝，除非其同时具备中心负责人或总经理审批身份

#### Scenario: 中心负责人审批本中心相关资料和节点
- **WHEN** 中心负责人处理资料确认、退回或阶段审批
- **THEN** 系统必须校验资料或审批节点属于其本中心相关范围

#### Scenario: 总经理助理不参与资料审批
- **WHEN** 总经理助理直接调用资料确认、资料退回、阶段审批通过或阶段审批退回接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 系统管理员不参与资料审批
- **WHEN** 系统管理员直接调用资料确认、资料退回、阶段审批通过或阶段审批退回接口
- **THEN** 系统必须返回 `PROJECT_APPROVAL_FORBIDDEN`

#### Scenario: 审批失败不改变资料状态
- **WHEN** 阶段审批因权限、状态或资料齐套校验失败
- **THEN** 系统不得改变资料状态、适用性、责任人、附件、阶段状态或业务日志

### Requirement: 阶段资料审批边界
阶段资料能力 MUST 为阶段审批流提供齐套和资料状态依据，但 MUST NOT 在资料附件、资料提交或资料责任人能力中自动驱动审批流。

#### Scenario: 资料附件不触发审批流
- **WHEN** 用户上传、下载或删除阶段资料附件
- **THEN** 系统不得自动提交阶段审批、自动通过审批或自动推进阶段

#### Scenario: 资料责任人变更不触发审批流
- **WHEN** 项目经理或中心负责人分配或清空资料责任人
- **THEN** 系统不得自动提交阶段审批、自动通过审批或自动推进阶段

#### Scenario: 标记不适用不自动通过审批
- **WHEN** 有权用户标记资料不适用后当前阶段齐套摘要变为完成
- **THEN** 系统不得自动提交阶段审批或自动通过审批

#### Scenario: 审批流不新增文件平台联动
- **WHEN** 系统根据阶段资料状态提交或处理审批
- **THEN** 系统不得调用文件管理平台、回填 `targetFolderId`、归档附件或判断文件平台权限

### Requirement: 资料级审核语义

系统 MUST 将资料项提交、确认和退回表达为资料级审核，并 MUST 与阶段关口审批保持概念边界。

#### Scenario: 资料级审核对象是单个资料项

- **WHEN** 用户提交、确认或退回资料项
- **THEN** 系统和页面必须将该动作表达为单个资料项的资料级审核，不得表达为整个阶段已经审批

#### Scenario: 资料项状态流转

- **WHEN** 系统展示或处理资料项状态
- **THEN** `not_submitted` 必须表示“待提交”，`submitted` 必须表示“已提交”，`confirmed` 必须表示“已确认”或“审核通过”，`returned` 必须表示“已退回”

#### Scenario: 责任人提交资料项

- **WHEN** 资料责任人完成资料准备并提交单个资料项
- **THEN** 系统必须将资料项从可提交状态流转到 `submitted`，并等待有权审核人确认或退回

#### Scenario: 审核人确认资料项

- **WHEN** 有权审核人确认单个资料项
- **THEN** 系统必须将该资料项状态流转为 `confirmed`，该动作只表示该资料项审核通过

#### Scenario: 审核人退回资料项

- **WHEN** 有权审核人退回单个资料项
- **THEN** 系统必须将该资料项状态流转为 `returned` 并记录退回原因，该动作不得改变阶段关口审批状态

#### Scenario: 资料项确认退回不是阶段审批

- **WHEN** 用户确认或退回某个资料项
- **THEN** 系统不得把该动作解释为阶段级审批通过、阶段级审批退回或阶段推进

### Requirement: 附件准备与资料提交边界

阶段资料附件 MUST 只表示资料项文件准备，不得等同于资料提交审核、资料审核通过或阶段关口审批通过。

#### Scenario: 上传附件不等于提交审核

- **WHEN** 责任人或有权用户上传阶段资料附件
- **THEN** 系统不得自动将资料项状态改为 `submitted`，不得自动提交资料审核，也不得自动提交阶段关口审批

#### Scenario: 删除附件不等于退回资料

- **WHEN** 用户删除阶段资料附件
- **THEN** 系统不得自动将资料项状态改为 `returned`、`not_submitted` 或其他状态

#### Scenario: 附件存在不等于资料合格

- **WHEN** 阶段资料项存在一个或多个附件
- **THEN** 系统仍必须以资料项状态是否为 `confirmed` 判断该资料项是否计入齐套完成，不得仅凭附件存在判断资料合格

#### Scenario: 页面避免误解附件动作

- **WHEN** 页面展示附件上传、附件列表、下载或删除操作
- **THEN** 页面文案必须避免让用户误解为上传文件后已提交审核、已审核通过或已满足阶段关口审批

### Requirement: 资料级审核与阶段关口审批关系

系统 MUST 使用资料级审核结果作为阶段齐套摘要和阶段关口审批提交条件，但阶段关口审批不得替代资料级审核。

#### Scenario: 齐套摘要只统计已确认适用必填资料

- **WHEN** 系统计算阶段资料齐套摘要
- **THEN** 系统必须只将状态为 `confirmed` 的适用必填资料计入已完成，不得将 `submitted`、`not_submitted`、`returned` 或仅有附件的资料计为完成

#### Scenario: 未确认资料阻止阶段关口审批提交

- **WHEN** 当前阶段存在适用必填资料状态不是 `confirmed`
- **THEN** 项目经理不得提交该阶段关口审批，系统必须按既有阶段审批规格返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`

#### Scenario: 资料全部确认不自动提交阶段关口审批

- **WHEN** 当前阶段适用必填资料全部状态为 `confirmed`
- **THEN** 系统不得自动提交阶段关口审批，仍必须由项目经理主动提交

#### Scenario: 阶段关口审批不替代资料级审核

- **WHEN** 阶段关口审批被提交、退回或通过
- **THEN** 系统不得因此自动确认、退回或提交单个资料项

#### Scenario: 页面文案避免首次审核误解

- **WHEN** 页面展示阶段齐套摘要或阶段关口审批入口
- **THEN** 页面必须避免让用户误解为“所有文件全部齐套后才第一次审核”，并应表达为“单个资料先审核，通过后进入阶段关口审批”

### Requirement: 阶段资料清单权限过滤

系统 MUST 支持按当前用户权限过滤阶段资料清单，并 MUST 区分完整项目资料视图和受限任务资料视图。

#### Scenario: 普通员工只看自己负责资料

- **WHEN** 普通员工仅因负责资料项而查询某项目阶段资料清单
- **THEN** 系统必须只返回该员工负责的资料项，不得返回其他人负责的资料项

#### Scenario: 资料审核人可看待审核资料

- **WHEN** 当前用户有权审核某资料项且该资料项处于待审核状态
- **THEN** 系统必须允许其查看该资料项及必要的审核上下文

#### Scenario: 资料级审核人按责任人部门确定

- **WHEN** 资料项 `status = submitted` 且已分配责任人
- **THEN** 第一版资料审核人必须是该责任人所属部门的中心负责人

#### Scenario: 项目经理不是资料级审核人

- **WHEN** 当前用户仅因 `projectManagerUserId = 当前用户 id` 访问资料项
- **THEN** 系统不得授予其资料审核权限或 `document_review` 待办

#### Scenario: 总经理不默认接收全部资料审核

- **WHEN** 资料项 `status = submitted`
- **THEN** 系统不得默认为总经理生成所有资料项的 `document_review` 待办；总经理主要处理阶段关口审批

#### Scenario: 未分配责任人资料不生成中心审核待办

- **WHEN** 资料项没有分配责任人
- **THEN** 系统不得根据项目参与部门或中文责任角色模糊生成中心负责人资料审核待办

#### Scenario: 项目经理可看自己项目完整资料

- **WHEN** 当前用户是项目经理并查询自己负责项目的资料清单
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 总经理可看完整资料

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 中心负责人资料范围收敛

- **WHEN** 当前用户是中心负责人并查询项目资料清单
- **THEN** 第一版应只返回本中心相关资料，除非后续设计明确允许中心负责人查看项目全量资料

#### Scenario: 本中心相关资料按责任人部门判断

- **WHEN** 系统判断某资料项是否属于中心负责人本中心相关资料
- **THEN** 第一版必须优先使用 `responsibleUser.department` 与中心负责人 `department` 是否一致判断

#### Scenario: 项目参与部门不放开全量资料

- **WHEN** 项目 `participatingDepartments` 包含某中心
- **THEN** 系统可以将其用于项目基础可见性，但不得因此允许该中心负责人查看项目全量资料或全量附件

#### Scenario: 未分配责任人资料默认不展示附件

- **WHEN** 资料项没有分配责任人且当前用户不是项目经理或总经理
- **THEN** 系统不得默认返回该资料项附件列表或附件操作权限

#### Scenario: 不使用中文字符串模糊判断审核中心

- **WHEN** 系统判断资料审核中心或附件访问中心
- **THEN** 系统不得依赖中文 `confirmRole`、默认责任角色或资料名称的模糊匹配；如需模板审核中心映射，必须另行设计结构化字段

#### Scenario: 返回资料项权限字段

- **WHEN** 系统返回阶段资料清单或工作台资料项
- **THEN** 响应必须包含当前用户对资料项的权限字段，包括 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument` 和 `canReviewDocument`，或提供等价结构化权限结果

#### Scenario: 受限资料清单仍保留阶段上下文

- **WHEN** 系统返回受限任务资料视图
- **THEN** 响应必须保留项目、阶段和资料项必要字段，使前端能展示任务所属项目和阶段

### Requirement: 资料审核待办来源

系统 MUST 将待当前用户审核的资料项作为工作台资料审核待办来源。

#### Scenario: 待审核资料状态

- **WHEN** 资料项适用、未删除、`status = submitted`，且当前用户符合资料审核人规则
- **THEN** 系统必须将该资料项纳入 `document_review` 待办

#### Scenario: 资料责任任务来源

- **WHEN** 资料项适用、未删除、`responsibleUserId = 当前用户 id`，且状态为 `not_submitted` 或 `returned`
- **THEN** 系统必须将该资料项纳入 `document_responsibility` 待办

#### Scenario: 已提交资料不是责任人处理待办

- **WHEN** 资料项 `responsibleUserId = 当前用户 id` 且状态为 `submitted`
- **THEN** 系统不得将其计入责任人待办处理数，只能作为已提交待审核状态信息展示

#### Scenario: 非待审核状态不进入审核待办

- **WHEN** 资料项状态为 `not_submitted`、`returned` 或 `confirmed`
- **THEN** 系统不得仅因用户有审核权限就将其纳入 `document_review` 待办

#### Scenario: 资料审核待办只读查询

- **WHEN** 系统查询资料审核待办
- **THEN** 系统不得改变资料状态、审批状态、附件、责任人或业务日志

### Requirement: 阶段资料附件资料项级权限

阶段资料附件接口 MUST 在项目存在和资料项存在校验后执行资料项级权限判断，不能只用项目可见性作为附件访问依据。

#### Scenario: 附件访问不能只按项目可见性

- **WHEN** 用户对某资料项调用附件列表、下载、上传或删除接口
- **THEN** 系统必须校验当前用户是否有权访问该资料项附件，不得仅因用户可见项目就允许操作

#### Scenario: 普通员工访问自己负责资料附件

- **WHEN** 普通员工是资料项 `responsibleUserId`
- **THEN** 系统可以允许其上传、查看和下载该资料项附件

#### Scenario: 普通员工不能访问别人资料附件

- **WHEN** 普通员工不是资料项责任人且不具备其他资料访问身份
- **THEN** 系统必须拒绝其查看、下载、上传或删除该资料项附件，并返回 `FORBIDDEN_OPERATION`

#### Scenario: 项目经理查看自己项目附件

- **WHEN** 当前用户是该项目项目经理
- **THEN** 系统可以允许其查看和下载该项目资料附件

#### Scenario: 附件上传只允许资料责任人

- **WHEN** 用户上传资料项附件
- **THEN** 第一版系统必须要求该资料项 `responsibleUserId` 等于当前用户 ID；项目经理、中心负责人、总经理默认不得代替责任人上传附件

#### Scenario: 上传权限不得复用宽泛提交权限

- **WHEN** 系统计算 `canUploadAttachment`
- **THEN** 系统不得直接复用现有宽泛 `canSubmitStageDocument` 或等价阶段资料提交权限；上传权限必须按资料项责任人本人单独判断

#### Scenario: 审核和统筹权限不产生代上传权限

- **GIVEN** 当前用户是项目经理、中心负责人或总经理
- **AND** 当前用户不是该资料项责任人
- **WHEN** 用户上传该资料项附件
- **THEN** 系统必须拒绝请求并返回 `FORBIDDEN_OPERATION`

#### Scenario: 项目经理删除附件边界

- **WHEN** 项目经理删除自己负责项目的附件
- **THEN** 第一版只允许其删除自己上传、当前仍有资料项附件访问权且资料尚未审核通过的附件

#### Scenario: 中心负责人访问本中心资料附件

- **WHEN** 当前用户是中心负责人且资料项属于本中心相关范围
- **THEN** 系统可以允许其查看、下载和审核该资料项附件

#### Scenario: 中心负责人默认不删除他人附件

- **WHEN** 中心负责人审核本中心资料附件
- **THEN** 系统默认不得允许其删除他人上传的附件，应通过退回资料让责任人处理附件问题

#### Scenario: 附件删除要求当前访问权

- **WHEN** 用户删除某资料项附件
- **THEN** 系统必须同时校验当前用户不是系统管理员或总经理助理、当前用户仍有该资料项附件访问权、当前用户是该附件上传人、且资料状态不是 `confirmed`

#### Scenario: 旧责任人不能删除已失权附件

- **WHEN** 用户曾是资料责任人并上传附件，但该资料项责任人后来变更为其他用户
- **THEN** 原责任人不得仅凭 `uploadedByUserId = 当前用户 id` 删除该附件，系统必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 中心负责人跨中心附件访问失败

- **WHEN** 中心负责人访问非本中心相关资料项附件
- **THEN** 系统必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 总经理访问全部附件

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统可以允许其查看和下载全部资料附件

#### Scenario: 总经理删除附件记录日志

- **WHEN** 系统允许总经理删除任意资料附件
- **THEN** 删除成功必须写入业务日志，且失败不得改变附件记录

#### Scenario: 系统管理员无默认附件访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份允许其访问业务资料附件

#### Scenario: 总经理助理无默认附件访问

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得允许其下载、上传或删除业务资料附件

#### Scenario: 无权附件上传无副作用

- **WHEN** 用户无权上传某资料项附件
- **THEN** 系统必须在解析或保存文件前拒绝请求，不得留下临时文件、不得保存上传文件、不得新增附件记录、不得写成功业务日志

#### Scenario: 无权附件删除无副作用

- **WHEN** 用户无权删除某资料项附件
- **THEN** 系统不得软删除附件、不得改变附件记录、不得写成功业务日志

#### Scenario: 上传附件仍不等于提交审核

- **WHEN** 用户成功上传附件
- **THEN** 系统仍不得自动提交资料审核、不得自动审核通过、不得自动提交阶段关口审批

