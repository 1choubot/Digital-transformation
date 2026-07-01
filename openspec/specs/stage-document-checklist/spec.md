# stage-document-checklist Specification

## Purpose
TBD - created by archiving change add-stage-document-checklist. Update Purpose after archive.
## Requirements
### Requirement: 阶段资料项模板

系统 MUST 维护当前 20260625 active 阶段资料项模板，模板 MUST 以 `docs/9.11_20260625项目流程资料审批口径规划.md` 和 `docs/9.12_在线平台内部资料闭环规划_20260625.md` 为当前口径来源，并 MUST 包含 `completionMode`。

#### Scenario: 模板字段完整
- **WHEN** 系统保存阶段资料项模板
- **THEN** 每个模板项必须包含阶段标识、阶段名称、资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式和 `completionMode`
- **AND** `completionMode` MUST 为 `submit_only`、`approval_required`、`conditional_submit` 或 `conditional_approval`

#### Scenario: 当前模板不依赖文件平台字段
- **WHEN** 系统初始化当前 20260625 active 阶段资料模板
- **THEN** `targetFolderPath` 和 `targetFolderId` 不得作为当前文件平台联动必需字段
- **AND** 如保留这些字段，只能作为未来兼容或预留字段，MUST NOT 触发文件平台联动

#### Scenario: 当前资料项数量和统计
- **WHEN** 系统初始化或校验当前 active 阶段资料项模板
- **THEN** 普通资料项数量 MUST 为 64 项
- **AND** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

#### Scenario: 20260624 不再作为当前模板依据
- **WHEN** 系统保存或说明当前 active 阶段资料项模板
- **THEN** 系统 MUST NOT 将 `v20260624` 或 20260624 PDF 写作当前正式运行模板依据

### Requirement: 项目级阶段资料清单初始化

系统 MUST 为项目维护项目级阶段资料清单，并 MUST 根据当前 20260625 active 阶段资料模板初始化 64 项项目资料项。

#### Scenario: 新项目初始化资料清单
- **WHEN** 项目创建成功
- **THEN** 系统必须按当前 20260625 64 项阶段资料模板为该项目生成项目级阶段资料清单

#### Scenario: 初始化资料项基础状态和适用性
- **WHEN** 系统生成项目级资料项
- **THEN** 每个资料项状态必须初始化为 `not_submitted`
- **AND** 每个资料项必须初始化为适用，除非后续明确由 `isApplicable` 表达条件未触发或不适用

#### Scenario: 保存 completionMode 快照
- **WHEN** 系统生成项目级资料项
- **THEN** 每个项目级资料项必须保存模板中的 `completionMode` 快照

#### Scenario: conditional_submit 适用性表达
- **WHEN** 项目级资料项 `completionMode = conditional_submit`
- **THEN** 后续触发/未触发 MUST 使用现有 `isApplicable` 机制表达：`false` 表示未触发或不适用，`true` 表示已触发

#### Scenario: 不兼容旧模拟项目资料
- **WHEN** 系统切换到当前 20260625 模板
- **THEN** 系统不得要求兼容旧模拟项目的旧资料项，也不得为旧资料项提供新旧模板映射或共存初始化逻辑

### Requirement: 资料项基础状态

系统 MUST 保存项目级资料项基础状态，并 MUST 区分基础状态、业务完成状态、精准返工标记和 `1.2 项目立项审批表` 专用评价/审批状态；业务完成状态 MUST 由 `completionMode`、`status`、`isApplicable`、`revision_required` 和特殊资料规则派生。

#### Scenario: 1.2 基础 confirmed 不等于最终完成

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `confirmed`
- **AND** 营销评价、研发评价或总经理最终审批尚未全部满足
- **THEN** 系统 MUST 将该资料业务完成状态派生为未完成或待处理
- **AND** 系统 MUST NOT 将其计入阶段齐套完成

#### Scenario: 1.2 未提交时不进入评价

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `not_submitted`
- **THEN** 系统 MUST NOT 将其纳入营销评价、研发评价或总经理审批待办
- **AND** 系统 MUST 将其表达为等待责任人填写或提交在线表单

#### Scenario: 1.2 普通提交后进入评价

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 责任人提交在线表单使其基础状态达到 `submitted` 或等价已提交状态
- **THEN** 系统 MUST 激活营销评价和研发评价
- **AND** 系统 MUST 继续保持总经理最终审批等待两项评价完成

#### Scenario: 1.2 returned 重新提交前不进入评价

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `returned`
- **THEN** 系统 MUST 等待责任人重新提交普通 `1.2` 在线表单
- **AND** 系统 MUST NOT 在重新提交前将营销评价或研发评价纳入待办

#### Scenario: 1.2 相关阻塞覆盖完成状态

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** `1.1 项目需求表` 存在由 `1.2` 总经理审批不通过触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 业务完成状态派生为未完成或需重新填写
- **AND** `1.2` 自身 MUST 通过专用状态表达待评价、待审批、审批不通过或需重填，不得作为 `1.1` 返工目标的替代字段

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 要求登录态，按阶段分组返回资料项、状态追溯字段、适用性追溯字段、责任人字段、责任人变更追溯字段、`completionMode`、精准返工字段、派生完成状态和阶段资料齐套摘要。

#### Scenario: 查询项目阶段资料清单
- **WHEN** 已登录用户请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回
- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称、该阶段资料项列表和 `completenessSummary`

#### Scenario: 资料项字段返回
- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、基础状态、`completionMode`、`isComplete` 或 `completionStatus` 等派生完成状态字段、`revision_required` 或等价返工标记、`revision_reason`、`revision_source_document_id`、返工请求、返工重提和完成追溯字段、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt`、`returnReason`、`isApplicable`、适用性追溯字段、`responsibleUserId`、`responsibleUser`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`

#### Scenario: 审批资料返回可选返工候选
- **WHEN** 后端返回当前用户可退回的 A 类审批资料详情或资料清单操作上下文
- **THEN** 响应 MUST 包含该审批资料固定范围内、当前项目存在且 `isApplicable !== false` 的可选返工候选列表
- **AND** 候选列表 MUST 包含资料编号、资料名称、责任人、当前状态、完成规则和适用性

#### Scenario: submit_only submitted 返回已完成
- **WHEN** 后端返回 `completionMode = submit_only` 且基础状态为 `submitted` 的资料项
- **AND** `revision_required` 不是 true
- **THEN** 该资料项派生完成状态 MUST 为 `completed` 或等价已完成状态
- **AND** `isComplete` MUST 为 true

#### Scenario: revision_required 返回未完成
- **WHEN** 后端返回 `revision_required = true` 的资料项
- **THEN** 该资料项派生完成状态 MUST 表示需返工或未完成
- **AND** `isComplete` MUST 为 false

#### Scenario: 阶段齐套摘要字段返回
- **WHEN** 后端返回阶段分组数据
- **THEN** 每个阶段的 `completenessSummary` 必须包含 `requiredTotal`、`completedRequiredCount` 或等价已完成数量、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`
- **AND** 如果为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 与按 `completionMode` 和 `revision_required` 派生的已完成数量一致，不得仅统计 `status = confirmed`

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

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 按 `completionMode` 限定提交、确认和退回动作；`1.1 项目需求表`、`1.2 项目立项审批表` 和 `1.3 项目立项通知` 的普通资料提交和普通返工完成接口不得替代在线表单提交，`1.2 项目立项审批表` 的普通资料确认/退回接口不得承载评价或最终审批，必须使用 `1.2` 专用评价/审批能力。

#### Scenario: 1.1/1.2/1.3 普通提交接口必须拒绝

- **WHEN** 用户通过普通资料提交接口对 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 执行提交
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 提示调用方使用对应在线表单提交能力
- **AND** 系统 MUST NOT 将该资料基础状态改为 `submitted`
- **AND** 系统 MUST NOT 激活 `1.2` 营销评价、研发评价或总经理审批

#### Scenario: 1.2 普通确认接口必须拒绝

- **WHEN** 用户通过普通资料确认接口对 `1.2 项目立项审批表` 执行确认
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 提示调用方使用 `1.2` 专用评价/审批能力
- **AND** 系统 MUST NOT 将 `1.2` 派生为最终完成

#### Scenario: 1.2 普通退回接口必须拒绝

- **WHEN** 用户通过普通资料退回接口对 `1.2 项目立项审批表` 执行退回
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 提示调用方使用 `1.2` 专用评价/审批能力
- **AND** 系统 MUST NOT 通过普通资料退回接口触发 `1.1 revision_required`

#### Scenario: 总经理不通过触发固定 1.1 返工

- **WHEN** `1.2 项目立项审批表` 的总经理最终审批不通过
- **THEN** 系统 MUST 要求非空审批意见或退回原因
- **AND** 系统 MUST 只将 `1.1 项目需求表` 标记为 `revision_required`
- **AND** 系统 MUST NOT 整阶段退回或自动退回全部前置资料

#### Scenario: 总经理不通过要求 1.2 重新填写

- **WHEN** `1.2 项目立项审批表` 的总经理最终审批不通过
- **THEN** 系统 MUST 将 `1.2` 表达为需要原责任人重新填写
- **AND** 系统 MUST NOT 因审批不通过自动清空或重新分配 `1.2` 责任人

#### Scenario: 1.1 返工未清除前不得重新完成 1.2

- **WHEN** `1.2` 总经理审批不通过后已标记 `1.1 revision_required = true`
- **AND** `1.1 revision_required` 尚未清除
- **THEN** 系统 MUST 拒绝将 `1.2` 派生为最终完成
- **AND** 系统 MUST 拒绝第 1 阶段推进和项目编号门禁通过

#### Scenario: 1.1 返工清除后仍需 1.2 重新填写和审批

- **WHEN** `1.1 revision_required` 已清除
- **AND** `1.2` 因总经理审批不通过处于需重新填写状态
- **THEN** 系统 MUST 要求 `1.2` 原责任人重新填写并提交
- **AND** 系统 MUST 要求营销评价、研发评价和总经理最终审批按规则重新满足
- **AND** 系统 MUST NOT 仅因 `1.1` 返工清除就直接将 `1.2` 视为通过

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

系统 MUST 为每个阶段分组返回适用资料齐套摘要，并 MUST 只基于当前项目级阶段资料项、`completionMode`、基础状态、现有 `isApplicable` 适用性、`revision_required` 返工标记和特殊资料完成规则判断计算。

#### Scenario: 1.2 按评价和最终审批计入齐套

- **WHEN** 系统计算第 1 阶段齐套摘要
- **AND** 当前阶段包含适用的 `1.2 项目立项审批表`
- **THEN** 系统 MUST 只有在 `1.2` 在线表单已提交、营销评价完成、研发评价完成、总经理最终审批通过且 `1.1` 不存在由 `1.2` 审批不通过触发且未清除的 `revision_required` 后，才将 `1.2` 计入已完成数量

#### Scenario: 1.2 未最终通过进入缺失列表

- **WHEN** `1.2 项目立项审批表` 未完成营销评价、研发评价或总经理最终审批通过
- **THEN** 系统 MUST 将 `1.2` 计入 `incompleteRequiredDocuments` 或等价未完成资料列表
- **AND** 列表项 MUST 能表达未完成原因是 `1.2` 评价/审批未最终完成

#### Scenario: 两项评价未全完成不完成

- **WHEN** 营销评价或研发评价任一项未完成
- **THEN** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 系统 MUST NOT 因另一项评价已完成而将 `1.2` 计入齐套完成

#### Scenario: 总经理未通过不完成

- **WHEN** 营销评价和研发评价均已完成
- **AND** 总经理最终审批尚未通过
- **THEN** 系统 MUST 将 `1.2` 派生为未完成

#### Scenario: 1.2 返工未清除进入缺失列表

- **WHEN** `1.2` 总经理审批不通过触发的 `1.1` 精准返工尚未清除
- **THEN** 系统 MUST 将相关阻塞原因返回到第 1 阶段齐套摘要或缺失资料列表
- **AND** 前端 MUST 能展示为需返工阻塞，而不是普通未提交

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

系统 MUST 提供 `GET /api/me/stage-document-tasks`，用于已登录用户查询分配给自己的项目级阶段资料项任务，并 MUST 使用 `completionMode`、`revision_required` 和派生完成状态过滤和展示任务。

#### Scenario: 默认 pending 包含需返工资料
- **WHEN** 已登录用户未提供 `status` 筛选时请求我的资料任务
- **THEN** 系统必须按 `status=pending` 处理，返回当前登录用户负责、适用且未按 `completionMode` 和 `revision_required` 派生完成的资料项
- **AND** 系统 MUST 包含当前用户负责且 `revision_required = true` 的资料项

#### Scenario: 默认 pending 排除已完成 submit_only
- **WHEN** 已登录用户未提供 `status` 筛选时请求我的资料任务
- **THEN** 系统 MUST NOT 返回 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料

#### Scenario: 我的资料任务返回字段
- **WHEN** 系统返回我的资料任务列表
- **THEN** 每个任务必须至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`completionMode`、`isComplete` 或 `completionStatus`、`revision_required` 或等价返工标记、返工原因、来源审批资料、返工重提追溯字段、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`

#### Scenario: 无责任人返工资料不丢失
- **WHEN** 资料项 `revision_required = true` 且没有责任人
- **THEN** 该资料项不得出现在任何个人责任人工作台中
- **AND** 系统 MUST 在项目详情阶段资料清单中继续返回该资料项及“需返工但未分配责任人”所需字段

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

系统 MUST 允许项目总览看板按当前 `completionMode` 阶段资料清单齐套口径，查询并返回每个项目当前阶段的适用资料齐套摘要。

#### Scenario: 项目总览只统计当前阶段
- **WHEN** 系统为项目总览看板计算某项目齐套摘要
- **THEN** 系统必须只计算该项目当前阶段的资料项，不得因其他阶段资料缺失或完成而影响当前阶段摘要

#### Scenario: 项目总览齐套摘要字段
- **WHEN** 项目当前阶段存在资料项记录
- **THEN** 项目总览中的 `currentStageCompletenessSummary` 必须包含 `requiredTotal`、`completedRequiredCount` 或等价已完成数量、`incompleteRequiredCount` 和 `completionPercent`

#### Scenario: 项目总览按 completionMode 计完成
- **WHEN** 系统为项目总览计算当前阶段齐套摘要
- **THEN** `submit_only + submitted`、`approval_required + confirmed`、`conditional_submit + isApplicable=true + submitted` MUST 计为完成
- **AND** `approval_required + submitted` 和 `returned` MUST 计为未完成

#### Scenario: 项目总览条件资料未触发不阻塞
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 项目总览不得将该资料项计入缺失资料或阻塞项

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

系统 MUST 允许对阶段资料相关后端仓储和 helper 做模块化拆分，但拆分后 MUST 保持阶段资料清单、资料状态、适用性、齐套摘要、责任人、我的资料任务和阶段资料附件能力的对外行为符合当前 `completionMode` 口径。

#### Scenario: 阶段资料清单查询行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户请求某项目阶段资料清单
- **THEN** 系统必须仍要求登录态，并按既有 8 阶段分组、资料项字段、责任人安全字段、状态追溯字段、适用性追溯字段、责任人变更追溯字段、`completionMode` 和派生完成状态返回数据

#### Scenario: 阶段齐套摘要行为按 completionMode
- **WHEN** 后端完成阶段资料模块拆分后，系统计算阶段齐套摘要或阶段推进齐套门禁
- **THEN** 系统必须按 `completionMode`、基础状态和 `isApplicable` 派生完成状态，不得退回到仅 `confirmed` 计为完成的旧口径

### Requirement: 阶段资料能力行为保持

系统 MUST 在当前 20260625 active 资料项模板下保持资料状态、适用性、责任人、附件、我的工作台和项目总览的既有能力边界，但 MUST 使用 `completionMode` 派生完成口径，而不是旧的 confirmed-only 口径。

#### Scenario: 资料状态机保持
- **WHEN** 已登录用户对当前项目级资料项执行提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 基础状态机
- **AND** 业务完成状态 MUST 由 `completionMode`、基础状态和 `isApplicable` 派生

#### Scenario: 阶段齐套摘要行为按 completionMode
- **WHEN** 系统计算阶段齐套摘要或阶段推进齐套门禁
- **THEN** 系统必须按 `completionMode` 派生完成状态计算，不得退回到仅 `confirmed` 计为完成的旧口径

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

### Requirement: 阶段资料提交权限边界

系统 MUST 将阶段资料提交权限限定为资料项当前责任人权限；完整资料查看权、项目经理身份、总经理身份、中心负责人身份、系统管理员身份、总经理助理身份或资料审核权限均不得自动授予 `canSubmitDocument` 或提交接口权限。

#### Scenario: 责任人可提交本人负责资料

- **WHEN** 当前用户是某适用阶段资料项的 `responsibleUserId` 或 `responsible_user_id`
- **THEN** 系统 MUST 返回 `canSubmitDocument = true`
- **AND** 提交接口 MUST 按资料状态机和完成规则继续处理该用户的提交请求

#### Scenario: 未分配责任人资料不可提交

- **WHEN** 阶段资料项没有分配责任人且当前用户具备该项目或资料的查看权限
- **THEN** 系统 MUST 允许该资料项按查看权限展示
- **AND** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 提交接口 MUST 拒绝该用户提交该资料项

#### Scenario: 完整查看不授予提交权限

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理仅因完整项目或完整资料查看口径可查看某资料项
- **THEN** 系统 MUST NOT 因该查看权限返回 `canSubmitDocument = true`
- **AND** 系统 MUST NOT 因该查看权限允许调用提交接口

#### Scenario: 审核权限不授予提交权限

- **WHEN** 当前用户对某已提交资料项具备 `canReviewDocument = true` 但不是该资料项责任人
- **THEN** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 系统 MUST 继续允许其按资料审核规则审核该已提交资料项
- **AND** 系统 MUST NOT 允许其把未提交资料项制造成已提交或完成状态

#### Scenario: 系统角色不授予业务提交权限

- **WHEN** 当前用户仅具备 `system_admin` 或 `general_manager_assistant` 组织角色且不是资料项责任人
- **THEN** 系统 MUST 返回 `canSubmitDocument = false`
- **AND** 提交接口 MUST 拒绝该用户提交阶段资料

#### Scenario: 项目经理作为责任人可提交

- **WHEN** 当前用户是项目经理且同时被分配为该资料项责任人
- **THEN** 系统 MUST 基于责任人身份返回 `canSubmitDocument = true`
- **AND** 系统 MUST NOT 基于项目经理身份本身授予其他资料项提交权限

### Requirement: 项目模式不改变阶段资料规则

系统 MUST 保持自研模式和供应链/外包模式使用同一阶段资料清单、齐套摘要和附件规则。

#### Scenario: 自研外包共用 20260625 64 项资料
- **WHEN** 系统初始化自研或外包项目的阶段资料
- **THEN** 两种项目模式都必须使用当前 20260625 的 64 项阶段资料

#### Scenario: 项目模式不改变齐套摘要
- **WHEN** 系统计算自研或外包项目阶段齐套摘要
- **THEN** 系统仍必须按 `completionMode`、基础状态和 `isApplicable` 派生完成状态

#### Scenario: 项目模式不改变附件边界
- **WHEN** 用户为自研或外包项目资料上传、查询、下载或删除附件
- **THEN** 系统必须保持在线平台附件规则，且不得因项目模式联动文件管理平台

### Requirement: 资料确认退回与阶段审批权限关系

系统 MUST 保持资料确认/退回能力与泛化阶段审批接口解耦；当前在线平台内部资料闭环不使用泛化阶段审批接口作为资料权限边界。

#### Scenario: 资料责任人不是审批人
- **WHEN** 用户仅因负责某资料项而调用资料确认或资料退回接口
- **THEN** 系统必须按资料级审核权限校验，不得自动授予审核权

#### Scenario: 不引用泛化阶段审批接口作为当前边界
- **WHEN** 系统校验资料确认或退回权限
- **THEN** 系统 MUST NOT 要求调用或通过泛化阶段审批接口
- **AND** 系统 MUST NOT 将阶段审批通过或退回作为资料项确认/退回的当前权限边界

### Requirement: 阶段资料审批边界

阶段资料能力 MUST 为资料级审核和阶段推进提供资料完成依据，但 MUST NOT 在资料附件、资料提交或资料责任人能力中自动驱动资料审核或阶段推进；当前流程无泛化阶段审批前置。

#### Scenario: 资料附件不自动驱动审核或推进
- **WHEN** 用户上传、下载或删除阶段资料附件
- **THEN** 系统不得自动确认资料、自动退回资料或自动推进阶段

#### Scenario: 资料责任人变更不自动驱动审核或推进
- **WHEN** 项目经理或中心负责人分配或清空资料责任人
- **THEN** 系统不得自动确认资料、自动退回资料或自动推进阶段

#### Scenario: 标记不适用不自动推进
- **WHEN** 有权用户标记资料不适用后当前阶段齐套摘要变为完成
- **THEN** 系统不得自动推进阶段

### Requirement: 资料级审核语义

系统 MUST 将 `approval_required` 的提交、确认和退回表达为单个资料项的资料级审核；`submit_only` 的提交或上传 MUST 表达为资料完成，不得表达为待审核。

#### Scenario: approval_required 审核对象是单个资料项
- **WHEN** 用户提交、确认或退回 `completionMode = approval_required` 的资料项
- **THEN** 系统和页面必须将该动作表达为单个资料项的资料级审核，不得表达为整个阶段已经审批

#### Scenario: submit_only submitted 不表示待审核
- **WHEN** 系统展示或处理 `completionMode = submit_only` 且 `status = submitted` 的资料项
- **THEN** 系统 MUST 表达为已完成或已提交完成
- **AND** 系统 MUST NOT 表达为待审核

#### Scenario: 页面和系统文案不统一解释 submitted
- **WHEN** 页面或接口展示 `status = submitted`
- **THEN** 必须结合 `completionMode` 和派生完成状态解释，不得把所有 submitted 都解释为待审核

### Requirement: 附件准备与资料提交边界

当前阶段阶段资料附件 MUST 保存在在线平台附件系统；附件操作不得表示文件平台归档完成，资料是否完成 MUST 以前端/后端返回的 `completionMode` 派生完成状态为准。

#### Scenario: 附件保存在在线平台
- **WHEN** 责任人或有权用户上传阶段资料附件
- **THEN** 系统 MUST 保存到在线平台现有附件系统
- **AND** 系统 MUST NOT 因附件操作调用文件管理平台归档

#### Scenario: submit_only 上传或提交可达到完成点
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 用户上传或提交资料
- **THEN** 该资料是否完成 MUST 以后端返回的 `isComplete`、`completionStatus` 或等价派生完成状态为准

#### Scenario: 附件存在不等于文件平台归档
- **WHEN** 阶段资料项存在一个或多个附件
- **THEN** 系统不得把附件存在解释为文件平台归档完成
- **AND** 系统不得把旧的 `confirmed` 作为所有资料合格的通用规则

### Requirement: 资料级审核与阶段关口审批关系

当前 20260625 在线平台内部资料闭环 MUST 使用 `completionMode` 派生完成状态作为阶段齐套摘要和阶段推进依据，不再把资料审核结果作为泛化阶段关口审批提交条件，也不再要求“资料全部 confirmed 后提交阶段关口审批”。

#### Scenario: 齐套摘要按 completionMode
- **WHEN** 系统计算阶段资料齐套摘要
- **THEN** 系统 MUST 按资料项 `completionMode`、基础状态和 `isApplicable` 派生完成状态
- **AND** 系统 MUST NOT 统一要求所有适用资料均达到 `confirmed`

#### Scenario: 不提交泛化阶段关口审批
- **WHEN** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 系统 MUST NOT 要求用户提交泛化阶段关口审批作为推进前置
- **AND** 系统 MUST NOT 因缺少泛化阶段关口审批通过状态而拒绝资料闭环完成

#### Scenario: 资料完成不自动推进
- **WHEN** 资料项提交、确认或按 `completionMode` 派生为完成
- **THEN** 系统不得自动推进阶段
- **AND** 阶段推进仍必须由具备推进权限的用户按当前阶段和标准顺序触发

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

### Requirement: 资料审核待办来源

系统 MUST 将待当前用户审核的资料项作为工作台资料审核待办来源；普通待审核资料 MUST 只从 `completionMode = approval_required`、`status = submitted` 且 `revision_required` 不是 true 的资料项生成 `document_review` 待办；`revision_required = true` 的资料必须已返工重提并可通过 `revision_resubmitted_at` 或等价显式字段证明后，才可进入审核待办，不得用 `submittedAt` 与 `revision_requested_at` 的时间比较替代。

#### Scenario: 待审核资料状态
- **WHEN** 资料项适用、未删除、`completionMode = approval_required`、`status = submitted`，且当前用户符合资料级审核人规则
- **AND** `revision_required` 不是 true
- **THEN** 系统必须将该资料项纳入 `document_review` 待办

#### Scenario: 返工重提后待审核资料状态
- **WHEN** 资料项适用、未删除、`completionMode = approval_required`、`status = submitted`，且当前用户符合资料级审核人规则
- **AND** `revision_required = true`
- **AND** 系统可通过 `revision_resubmitted_at` 或等价显式字段证明该提交是返工重提
- **THEN** 系统必须将该资料项纳入 `document_review` 待办
- **AND** 系统 MUST 仍将该资料视为未完成，直到审核确认清除 `revision_required`

#### Scenario: revision_required 不直接生成审核待办
- **WHEN** 资料项 `revision_required = true`
- **AND** 该资料项尚未按 `approval_required` 重新提交
- **THEN** 系统 MUST NOT 仅因返工标记将该资料纳入 `document_review` 待办
- **AND** 系统 MUST 将有责任人的返工资料纳入责任人待办

#### Scenario: approval_required 返工重提前只进责任待办
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** 系统不能通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 只将其纳入责任人待办
- **AND** 系统 MUST NOT 将其纳入审核待办

#### Scenario: approval_required 返工重提后进审核待办
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** 状态为 `submitted`
- **AND** 系统可通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 将其纳入符合审核权限用户的 `document_review` 待办

#### Scenario: submit_only 不进入审核待办
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 系统 MUST NOT 将该资料项纳入 `document_review` 待办

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

### Requirement: 阶段资料结构化归属中心

系统 MUST 为当前 active 阶段资料模板和项目级阶段资料快照维护结构化归属中心字段，当前 active 模板 MUST 为 `v20260624`。

#### Scenario: 模板包含结构化归属中心

- **WHEN** 系统初始化或读取当前 active 阶段资料模板
- **THEN** 每个模板项 MUST 包含可空 `ownerDepartment` 和可空 `reviewDepartment`

#### Scenario: 归属中心使用现有部门枚举

- **WHEN** 模板或项目级资料项保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 字段值 MUST 为空或属于现有 `BUSINESS_DEPARTMENT` 常量

#### Scenario: 新项目保存归属中心快照

- **WHEN** 项目创建成功并初始化 `v20260624` 的 64 项阶段资料
- **THEN** 系统 MUST 将模板中的 `ownerDepartment` 和 `reviewDepartment` 保存到项目级资料快照

#### Scenario: 当前 active 模板使用 v20260624

- **WHEN** 本 change 实现后创建新项目
- **THEN** 系统 MUST 初始化 `v20260624` 的 64 项普通阶段资料，不得按 66 行规划表初始化普通阶段资料

#### Scenario: 旧数据兼容

- **WHEN** 旧项目资料缺少或未保存 `ownerDepartment`、`reviewDepartment`
- **THEN** 系统 MUST 不因字段为空导致资料清单、权限判断、附件查询或工作台查询报错

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

### Requirement: 归属中心字段返回

阶段资料清单和工作台资料项响应 MUST 返回结构化归属中心字段。

#### Scenario: 阶段资料清单返回归属中心

- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个资料项 MUST 返回 `ownerDepartment` 和 `reviewDepartment`

#### Scenario: 工作台资料项返回归属中心

- **WHEN** 用户查询我的工作台且返回资料类待办
- **THEN** 每个资料项待办 MUST 返回 `ownerDepartment` 和 `reviewDepartment`，或在权限计算上下文中包含等价字段

#### Scenario: 权限字段继续返回

- **WHEN** 系统返回阶段资料清单或工作台资料项
- **THEN** 响应 MUST 继续包含 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility` 或等价权限字段

### Requirement: v20260624 阶段资料模板

系统 MUST 支持以 20260624 版项目管理流程图为来源的 `v20260624` 阶段资料模板，并 MUST 将普通阶段资料模板口径限定为流程图直接产出文件。

#### Scenario: 当前 active 模板版本

- **WHEN** 系统加载当前阶段资料模板
- **THEN** 当前 active 模板版本 MUST 为 `v20260624`

#### Scenario: v20260624 模板包含 64 个产出文件

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 模板 MUST 包含 64 个阶段产出文件

#### Scenario: v20260624 阶段分布

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 各阶段资料数量 MUST 分别为立项 3、方案设计 15、合同签订 4、详细设计 17、生产制作 17、预验收 2、终验收 4、结题 2
- **AND** `4.1` MUST 为 `项目启动书`
- **AND** `5.1` MUST 为 `采购申请表`
- **AND** `7.1` MUST 为 `发货单`
- **AND** `7.2` MUST 为 `安装调试记录（现场）`
- **AND** `8.1` MUST 为 `发票（尾款）`
- **AND** `8.2` MUST 为 `项目结题报告`

#### Scenario: 排除非普通资料节点

- **WHEN** 系统加载 `v20260624` 普通阶段资料模板
- **THEN** 模板 MUST NOT 将 `7.P1 随机资料移交` 和 `8.P1 资料服务器核查` 计入普通阶段资料模板，除非后续业务确认它们形成独立文件

#### Scenario: 模板字段规划

- **WHEN** 系统定义 `v20260624` 阶段资料模板项
- **THEN** 每个资料项 MUST 包含稳定 `documentCode`、阶段、文件名、模板默认必填、适用条件、`ownerDepartment`、`reviewDepartment`、提交方式和备注
- **AND** `ownerDepartment` 和 `reviewDepartment` MUST 为空或属于现有 `BUSINESS_DEPARTMENT`
- **AND** 总经理、客户、项目经理、供应商或相关负责人等非中心审核/确认对象 MUST 只写入备注字段，不得写入 `ownerDepartment` 或 `reviewDepartment`
- **AND** 模板默认必填 MUST 使用布尔口径
- **AND** 条件性资料 MUST 通过适用条件说明，不得将自由文本必填值写入模板默认必填字段

#### Scenario: Markdown 规划表备用解析

- **WHEN** 系统从 `docs/9.10_v20260624阶段资料模板规划_20260624.md` 解析阶段资料模板
- **THEN** 系统 MUST 支持该文档当前 10 列规划表
- **AND** 解析结果 MUST 包含 64 个普通资料项
- **AND** 解析结果阶段分布 MUST 为 3/15/4/17/17/2/4/2
- **AND** 解析结果 MUST NOT 包含 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查`

### Requirement: 阶段推进沿用资料齐套口径

系统使用当前 20260625 资料模板时，阶段推进 MUST 按 `completionMode` 和 `revision_required` 派生完成口径判断当前阶段适用资料是否完成，并 MUST NOT 沿用旧的 confirmed-only、整阶段退回或泛化阶段审批口径。

#### Scenario: 当前阶段资料按 completionMode 完成才允许推进
- **WHEN** 系统判断项目是否可从当前阶段推进
- **THEN** 当前阶段适用资料 MUST 全部按各自 `completionMode` 且不带 `revision_required` 派生为完成

#### Scenario: 返工标记阻塞推进
- **WHEN** 当前阶段存在适用资料 `revision_required = true`
- **THEN** 系统 MUST 拒绝阶段推进
- **AND** 拒绝原因 MUST 能指出需返工资料

#### Scenario: 条件资料未触发不阻塞
- **WHEN** 当前阶段条件资料 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST NOT 将该资料计入缺失或推进阻塞项

#### Scenario: 条件资料触发后按 completionMode 和返工标记判断
- **WHEN** 当前阶段条件资料 `isApplicable = true`
- **THEN** 系统 MUST 按该资料的 `completionMode` 和 `revision_required` 判断是否完成

#### Scenario: 不新增复杂审批流
- **WHEN** 系统使用当前 20260625 阶段资料模板并处理精准返工
- **THEN** 系统 MUST NOT 因本规划新增合同审批流、付款流、采购审批流、发票审批流、设计变更自动流程引擎或资料服务器核查流程

### Requirement: 模拟数据重置策略

实现 `v20260624` 模板时 MAY 基于当前模拟数据性质重置旧项目资料，并 MUST NOT 将旧模拟资料兼容作为本 change 要求。

#### Scenario: 可重置模拟项目资料

- **WHEN** 本 change 将运行模板切换到 `v20260624`
- **THEN** 实现 MAY 清理当前模拟项目资料并重新初始化 `v20260624` 64 项模板
- **AND** reset MUST 将项目状态重置为 `normal`
- **AND** reset MUST 将每个项目第 1 阶段重置为 `current` 且审批状态为 `not_submitted`
- **AND** reset MUST 将每个项目第 2-8 阶段重置为 `not_started` 且审批状态为 `not_submitted`
- **AND** reset MUST 清理旧阶段审批历史、阶段推进/审批/资料业务日志、阶段资料附件记录、附件物理文件、项目阶段资料和旧模板
- **AND** reset MUST 在数据库事务提交成功后再删除附件物理文件
- **AND** reset MUST 拒绝清理明显过宽或非阶段资料附件目录

#### Scenario: 不要求兼容旧模拟数据

- **WHEN** 系统切换到 `v20260624` 模板
- **THEN** 本规划 MUST NOT 要求兼容旧模拟数据

#### Scenario: 不要求保留历史项目资料

- **WHEN** 系统切换到 `v20260624` 模板并重置模拟数据
- **THEN** 本规划 MUST NOT 要求保留历史项目资料

### Requirement: 特殊资料项简单处理口径

系统 MUST 将 `v20260624` 中的合同、采购、发票和设计变更相关产出先按普通或条件性阶段资料项处理，不得在第一版为其新增独立流程状态机。

#### Scenario: 合同审核记录表作为资料项
- **WHEN** 系统处理合同审核记录表
- **THEN** 系统必须按阶段资料项处理其适用性、责任人、附件、提交、审核和齐套状态，不得新增合同审批流程状态机

#### Scenario: 采购申请和采购合同审核作为资料项
- **WHEN** 系统处理采购申请表或采购合同审核记录表
- **THEN** 系统必须按阶段资料项处理其适用性、责任人、附件、提交、审核和齐套状态，不得新增采购审批流程状态机

#### Scenario: 发票作为条件性资料项
- **WHEN** 系统处理预付款、发货款或尾款发票资料项
- **THEN** 系统必须按普通或条件性资料项处理，不得新增付款状态、发票状态或资金审批流程

#### Scenario: 设计变更产出作为条件性资料项
- **WHEN** 系统处理设计变更 3D 模型、产品平面图、零部件清单或技术通知单
- **THEN** 系统必须按条件性资料项处理，不得新增设计变更流程引擎或自动触发机制

#### Scenario: 随机资料移交和资料服务器核查不进入普通模板
- **WHEN** 业务尚未确认 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 形成独立文件
- **THEN** 系统不得将其计入普通阶段资料模板

### Requirement: 20260625 阶段资料完成规则

系统 MUST 为阶段资料模板规划完成规则字段，例如 `completionMode`，用于表达资料项是提交即完成、需要确认/审批、条件触发后提交，或未来可扩展的条件触发后确认/审批。

#### Scenario: 模板包含 completionMode
- **WHEN** 系统后续定义 20260625 阶段资料模板或项目级资料快照
- **THEN** 每个资料项 MUST 包含稳定 `completionMode`
- **AND** `completionMode` MUST 使用 `submit_only`、`approval_required`、`conditional_submit` 或 `conditional_approval`

#### Scenario: 不默认所有资料走审核
- **WHEN** 系统根据 20260625 流程图解释阶段资料完成规则
- **THEN** 系统 MUST NOT 默认所有资料都需要提交审核并确认通过

#### Scenario: submit_only 完成口径
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 该资料项 MUST 在提交或上传后计为完成

#### Scenario: approval_required 完成口径
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 该资料项 MUST 在确认或审批通过后计为完成

#### Scenario: conditional_submit 完成口径
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** 条件尚未触发
- **THEN** 该资料项 MUST 不计入缺失或阶段推进阻塞
- **AND** 条件触发后 MUST 在提交或上传后计为完成

#### Scenario: conditional_approval 完成口径
- **WHEN** 资料项 `completionMode = conditional_approval`
- **AND** 条件尚未触发
- **THEN** 该资料项 MUST 不计入缺失或阶段推进阻塞
- **AND** 条件触发后 MUST 在确认或审批通过后计为完成

#### Scenario: 当前模板未使用 conditional_approval
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** 当前 64 项中 `conditional_approval` 数量 MUST 为 0

#### Scenario: 当前模板完成规则统计
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

### Requirement: 20260625 资料主线与条件性判断

系统 MUST 区分主线必产资料的 NO 回退和真正条件触发资料，不得将带 NO 回退的主线资料误判为条件性资料。

#### Scenario: 主线 NO 回退仍是主线必产
- **WHEN** 流程图中主线资料经过确认节点且 NO 回退到前序修改节点
- **THEN** 该资料 MUST 仍标记为主线必产
- **AND** 系统 MUST 要求其按完成规则重新提交或重新确认

#### Scenario: NO 回退目标不自动变成审批资料
- **WHEN** 审查或评审节点 NO 回退到上游产出文件
- **THEN** 系统 MUST NOT 仅因该文件是 NO 回退目标就将其设为 `approval_required`
- **AND** 系统 MUST 继续按该文件自身节点是否存在 YES/NO 或 YES-only 判断 `completionMode`
- **AND** 若审查或评审节点有独立记录类产出，则该记录类产出 MUST 按流程图节点设置为 `approval_required`

#### Scenario: 图纸审查资料完成规则
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** `4.14 产品平面图` MUST 使用 `submit_only`
- **AND** `4.15 产品零部件清单` MUST 使用 `submit_only`
- **AND** `4.16 图纸审查记录` MUST 使用 `approval_required`

#### Scenario: 设计变更资料是条件触发
- **WHEN** 厂内安装调试不通过并触发设计变更
- **THEN** `3D模型（设计变更）`、`产品平面图（设计变更）`、`零部件清单（设计变更）` 和 `技术通知单（设计变更）` MUST 标记为条件触发资料
- **AND** 在未确认独立审批节点前，这四项 MUST 使用 `conditional_submit`

#### Scenario: 客户要求资料是条件触发
- **WHEN** 客户要求提供工艺时序图、节拍表或演示动画
- **THEN** 对应资料 MUST 按 `conditional_submit` 处理

#### Scenario: 发票资料按普通产出完成
- **WHEN** 系统处理 `发票（预付款）`、`发票（发货款）` 或 `发票（尾款）`
- **AND** 20260625 流程图没有为该发票资料标出明确 YES/NO 或 YES-only 节点
- **THEN** 系统 MUST 使用 `submit_only`
- **AND** 系统 MUST NOT 因发票资料而新增付款流、发票审批流或额外确认前置

#### Scenario: 排除过程节点
- **WHEN** 资料服务器核查或随机资料移交尚未被确认为独立文件产出
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 纳入普通 64 项资料模板

### Requirement: 20260625 阶段资料齐套摘要

系统 MUST 将阶段资料齐套摘要从统一 `confirmed` 口径调整为按资料项完成规则计算。

#### Scenario: 齐套摘要按完成规则计算
- **WHEN** 系统计算阶段资料齐套摘要
- **THEN** 系统 MUST 对每个适用资料按其 `completionMode` 判断是否完成

#### Scenario: 缺失列表包含完成规则
- **WHEN** 系统返回缺失资料列表
- **THEN** 每个缺失资料 MUST 包含资料编号、资料名称、当前状态和完成规则

#### Scenario: 非触发条件资料不计缺失
- **WHEN** 条件资料尚未触发
- **THEN** 系统 MUST 不将该资料纳入缺失资料列表

#### Scenario: 归档状态不代替完成状态
- **WHEN** 后续文件平台联动返回资料归档状态
- **THEN** 系统 MUST NOT 仅因文件已归档而将资料视为按 `completionMode` 完成

### Requirement: 在线平台阶段资料收集审核闭环

当前闭环 MUST 表达为资料收集、按 `completionMode` 提交/审核、在线平台附件保存和阶段推进；文件平台归档 MUST 暂停，不得作为资料完成或阶段推进前置。

#### Scenario: 资料责任人提交资料
- **WHEN** 资料责任人完成在线平台附件上传或资料整理
- **THEN** 系统必须允许其按资料项和 `completionMode` 提交资料

#### Scenario: completionMode 完成后进入齐套
- **WHEN** 资料项适用且按其 `completionMode` 派生为完成
- **THEN** 系统必须将该资料项计入阶段完成资料

#### Scenario: 在线平台附件保存
- **WHEN** 用户上传、查看、下载或删除阶段资料附件
- **THEN** 系统 MUST 使用在线平台附件系统保存和管理附件
- **AND** 系统 MUST NOT 因附件操作调用文件管理平台归档

#### Scenario: 文件平台归档暂停
- **WHEN** 当前在线平台内部资料闭环运行
- **THEN** 系统 MUST NOT 要求文件平台归档作为资料完成或阶段推进前置

#### Scenario: 阶段推进只看当前阶段门禁
- **WHEN** 系统判断阶段推进
- **THEN** 系统必须只基于当前阶段适用资料 `completionMode` 完成情况和既有推进权限判断
- **AND** 系统 MUST NOT 依赖泛化阶段关口审批状态

### Requirement: 20260625 资料模板 completionMode

阶段资料模板和项目级阶段资料实例 MUST 保存 `completionMode`，并 MUST 使用 20260625 最终 64 项资料完成规则。

#### Scenario: 模板包含 completionMode
- **WHEN** 系统定义当前 20260625 阶段资料模板
- **THEN** 每个模板项 MUST 包含 `completionMode`
- **AND** `completionMode` MUST 为 `submit_only`、`approval_required`、`conditional_submit` 或 `conditional_approval`

#### Scenario: 项目资料实例保存 completionMode
- **WHEN** 系统初始化项目级阶段资料清单
- **THEN** 每个项目级资料项 MUST 保存模板中的 `completionMode` 快照

#### Scenario: 当前 64 项 completionMode 统计
- **WHEN** 系统初始化或校验当前 20260625 64 项普通资料模板
- **THEN** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

#### Scenario: 图纸审查资料口径
- **WHEN** 系统初始化或校验当前 20260625 64 项普通资料模板
- **THEN** `4.14 产品平面图` MUST 使用 `submit_only`
- **AND** `4.15 产品零部件清单` MUST 使用 `submit_only`
- **AND** `4.16 图纸审查记录` MUST 使用 `approval_required`

#### Scenario: 发票资料口径
- **WHEN** 系统初始化或校验当前 20260625 64 项普通资料模板
- **THEN** `3.4 发票（预付款）` MUST 使用 `submit_only`
- **AND** `6.2 发票（发货款）` MUST 使用 `submit_only`
- **AND** `8.1 发票（尾款）` MUST 使用 `submit_only`
- **AND** 系统 MUST NOT 因发票资料新增付款流或发票审批流

### Requirement: 资料状态按 completionMode 完成

系统 MUST 按资料项 `completionMode`、基础状态、适用性、`revision_required` 和特殊资料规则判断资料是否完成、是否进入审核待办以及是否阻塞阶段推进。

#### Scenario: 1.2 approval_required 使用专用完成规则

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** `completionMode = approval_required`
- **THEN** 系统 MUST 使用专用多节点审批完成规则判断其是否完成
- **AND** 系统 MUST NOT 只按普通 `approval_required + confirmed` 规则判定完成

#### Scenario: 1.2 多节点全部通过后完成

- **WHEN** `1.2 项目立项审批表` `business_review approved`
- **AND** `technical_review approved`
- **AND** `general_review approved`
- **AND** `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 派生为完成

### Requirement: 在线平台附件为当前默认保存方式

当前阶段阶段资料附件 MUST 保存到在线平台附件系统，并 MUST NOT 联动文件管理平台。

#### Scenario: 默认在线平台附件保存
- **WHEN** 用户上传阶段资料附件
- **THEN** 系统 MUST 保存到在线平台现有附件记录和附件存储

#### Scenario: 不生成文件平台归档状态
- **WHEN** 系统保存、查询或展示阶段资料附件
- **THEN** 系统 MUST NOT 创建文件平台目录映射
- **AND** 系统 MUST NOT 设置 `not_archived`、`archived` 或 `archive_failed` 状态
- **AND** 系统 MUST NOT 调用文件管理平台归档接口

### Requirement: 精准返工固定分类

系统 MUST 将审批 NO 后的返工处理固定分为 A 类固定候选返工、B 类单份退回和 C 类厂内安装调试特殊处理，并 MUST 保持当前 64 项 `completionMode` 统计不变；`1.2` 多节点审批 NO 仍复用 A 类固定候选 `1.1`。

#### Scenario: 1.2 多节点 NO 仍只返工 1.1

- **WHEN** `1.2 项目立项审批表` 的商务评价、技术评价或总经理审批节点审批 NO
- **THEN** A 类返工候选 MUST 仅为 `1.1 项目需求表`
- **AND** 系统 MUST 只把 `1.1` 标记为 `revision_required`
- **AND** `1.2` 自身 MUST 通过节点状态、基础状态或专用多节点状态阻塞，不得作为返工目标写 `revision_required`
- **AND** 系统 MUST NOT 允许自由勾选第 1 阶段全部资料

#### Scenario: 1.2 多节点不改变 completionMode 数量

- **WHEN** 系统规划或实现 `1.2 项目立项审批表` 多节点审批
- **THEN** `1.2` MUST 仍保留在当前 64 项普通资料模板中
- **AND** `submit_only 33`、`approval_required 24`、`conditional_submit 7`、`conditional_approval 0` MUST 保持不变

### Requirement: A 类固定候选返工映射

系统 MUST 固定 A 类审批资料与上游返工候选范围，审批人不得自由勾选本阶段全部资料。

#### Scenario: A 类映射清单
- **WHEN** 系统判断 A 类审批资料的候选范围
- **THEN** `1.2` 的候选 MUST 仅为 `1.1`
- **AND** `2.12` 的候选 MUST 仅为 `2.4-2.11`
- **AND** `2.13` 的候选 MUST 仅为 `2.4-2.11`
- **AND** `3.3` 的候选 MUST 仅为 `3.2`
- **AND** `4.12` 的候选 MUST 仅为 `4.3-4.11`
- **AND** `4.13` 的候选 MUST 仅为 `4.3-4.11`
- **AND** `4.16` 的候选 MUST 仅为 `4.14` 和 `4.15`
- **AND** `4.17` 的候选 MUST 仅为 `4.14` 和 `4.15`
- **AND** `5.4` 的候选 MUST 仅为 `5.3`

#### Scenario: 2.12 和 2.13 排除 2.2 与 2.3
- **WHEN** 审批人退回 `2.12` 或 `2.13`
- **THEN** 候选范围 MUST NOT 包含 `2.2` 或 `2.3`

#### Scenario: 只允许适用候选
- **WHEN** 系统返回或校验 A 类返工候选
- **THEN** 候选 MUST 只包含当前项目中 `isApplicable !== false` 的资料

#### Scenario: A 类至少选择一个候选
- **WHEN** 审批人提交 A 类退回请求
- **THEN** `revisionTargetDocumentIds` MUST 至少包含 1 个合法候选

#### Scenario: A 类不使用设计变更字段
- **WHEN** 审批人提交 A 类退回请求
- **THEN** 系统 MUST 使用 `revisionTargetDocumentIds` 表示固定返工候选
- **AND** 系统 MUST NOT 要求或使用 `designChangeTargetDocumentIds`

### Requirement: B 类单份退回规则

系统 MUST 将固定 B 类资料及没有明确上游返工候选的普通审批资料按单份退回处理。

#### Scenario: B 类固定清单
- **WHEN** 审批资料为 `2.2`、`2.3`、`2.14`、`2.15`、`3.1`、`3.2`、`5.1`、`5.3`、`7.4` 或没有明确上游候选的普通审批资料
- **THEN** 审批 NO MUST 只退回该审批资料自身
- **AND** 系统 MUST NOT 展示或接受上游返工候选

#### Scenario: 3.2 和 5.3 双重角色不冲突
- **WHEN** `3.2` 或 `5.3` 自身审批不通过
- **THEN** 系统 MUST 按 B 类退回自身
- **WHEN** `3.2` 被 `3.3` 指定返工或 `5.3` 被 `5.4` 指定返工
- **THEN** 系统 MUST 按 A 类上游返工处理

### Requirement: C 类厂内安装调试特殊处理

系统 MUST 将 `5.12 安装调试记录（厂内）` 审批 NO 作为 C 类特殊处理；`5.12` 退回时 MUST 按 C 类规则校验 `designChangeTargetDocumentIds`，合法选择后触发对应设计变更资料。

#### Scenario: 5.12 可触发设计变更资料
- **WHEN** 审批人退回 `5.12`
- **THEN** 系统 MUST 要求请求通过 `designChangeTargetDocumentIds` 勾选 `5.13`、`5.14`、`5.15`、`5.16` 中至少 1 项
- **AND** 被勾选资料 MUST 同时设置 `isApplicable = true` 和 `revision_required = true`

#### Scenario: 5.12 设计变更字段合法范围
- **WHEN** 审批人退回 `5.12`
- **THEN** `designChangeTargetDocumentIds` MUST 只能包含 `5.13`、`5.14`、`5.15`、`5.16`
- **AND** 选择其他资料 MUST 被拒绝

#### Scenario: 5.12 不选择设计变更目标拒绝
- **WHEN** 审批人退回 `5.12`
- **AND** `designChangeTargetDocumentIds` 为空或缺失
- **THEN** 系统 MUST 拒绝该请求

#### Scenario: 未勾选资料不触发
- **WHEN** 审批人退回 `5.12` 且未勾选某个 `5.13-5.16` 资料
- **THEN** 系统 MUST NOT 自动触发该资料

#### Scenario: 整改和外部处理资料不做上游候选
- **WHEN** 审批资料为 `5.9`、`5.17`、`6.1`、`7.2` 或 `7.3`
- **THEN** 第一版 MUST 仍按当前审批资料本身退回
- **AND** 系统 MUST NOT 展示上游候选选择

### Requirement: 精准返工字段

系统 MUST 为项目级阶段资料项规划独立精准返工字段。

#### Scenario: 返工字段清单
- **WHEN** 系统保存项目级资料项返工状态
- **THEN** 数据模型 MUST 支持 `revision_required`
- **AND** 数据模型 MUST 支持 `revision_reason`
- **AND** 数据模型 MUST 支持 `revision_source_document_id`
- **AND** 数据模型 MUST 支持 `revision_requested_by_user_id`
- **AND** 数据模型 MUST 支持 `revision_requested_at`
- **AND** 数据模型 MUST 支持 `revision_resubmitted_by_user_id`
- **AND** 数据模型 MUST 支持 `revision_resubmitted_at`
- **AND** 数据模型 MUST 支持 `revision_completed_by_user_id`
- **AND** 数据模型 MUST 支持 `revision_completed_at`

### Requirement: 精准返工校验

系统 MUST 在审批退回请求中校验返工目标，确保请求只作用于固定业务范围。

#### Scenario: A 类非法候选拒绝
- **WHEN** A 类退回请求包含不属于固定候选范围的资料 ID
- **THEN** 系统 MUST 拒绝该请求

#### Scenario: 条件未触发候选拒绝
- **WHEN** 返工目标资料 `isApplicable = false`
- **THEN** 系统 MUST 拒绝选择该资料作为返工目标

#### Scenario: 非 A 类上游目标拒绝
- **WHEN** 非 A 类退回请求携带上游 `revisionTargetDocumentIds`
- **THEN** 系统 MUST 拒绝该请求

#### Scenario: C 类设计变更字段不按 A 类校验
- **WHEN** `5.12` 退回请求携带合法 `designChangeTargetDocumentIds`
- **THEN** 系统 MUST 按 C 类规则校验
- **AND** 系统 MUST NOT 将其作为非 A 类携带 `revisionTargetDocumentIds` 拒绝

### Requirement: 精准返工完成动作

系统 MUST 提供按 `completionMode` 分流的返工完成机制。

#### Scenario: submit_only 和 conditional_submit 明确清除返工
- **WHEN** `submit_only` 或 `conditional_submit` 返工目标已重新上传或修改
- **THEN** 责任人 MUST 执行明确完成返工动作后，系统才可清除 `revision_required`
- **AND** 系统 MUST 校验资料权限

#### Scenario: approval_required 重新审核后清除返工
- **WHEN** `approval_required` 返工目标执行返工重提并被审核确认
- **THEN** 系统 MUST 清除 `revision_required`
- **AND** 系统 MUST 记录返工完成追溯字段

#### Scenario: approval_required 重提不清除返工
- **WHEN** `approval_required` 返工目标执行返工重提
- **THEN** 系统 MUST 将基础状态置为 `submitted`
- **AND** 系统 MUST 保持 `revision_required = true`
- **AND** 系统 MUST 记录 `revision_resubmitted_by_user_id` 和 `revision_resubmitted_at`
- **AND** 系统 MUST 直到审核确认通过后才清除返工标记

### Requirement: 1.2 项目立项审批表完成状态

系统 MUST 为 `1.2 项目立项审批表` 提供区别于普通 `approval_required` 的派生完成状态。

#### Scenario: 必需节点全部通过才完成

- **WHEN** 系统派生 `1.2` 完成状态
- **THEN** 系统 MUST 校验 `business_review approved`、`technical_review approved` 和 `general_review approved`
- **AND** 任一节点待审、未开始、退回或未通过时，`1.2` MUST 派生为未完成

#### Scenario: 前置退回后总经理失效则不完成

- **WHEN** `business_review` 或 `technical_review` 退回
- **THEN** 系统 MUST 将 `general_review` 视为失效、未开始或等待前置
- **AND** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 已通过的并行另一侧节点 MUST 保留通过结果

#### Scenario: 总经理退回后前置通过仍不完成

- **WHEN** `general_review` 退回
- **AND** `business_review` 和 `technical_review` 已通过结果保留
- **THEN** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 直到 `general_review` 重新通过后才可恢复完成判断
- **AND** 已通过的 `business_review` 和 `technical_review` MUST 保留通过结果

#### Scenario: 返工未清除时不能完成

- **WHEN** `1.2` 的所有审批节点均已通过
- **AND** `1.1` 仍存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 继续将 `1.2` 派生为未完成
- **AND** 系统 MUST NOT 要求或依赖 `1.2 revision_required` 表达该阻塞

#### Scenario: 1.3 仍按 submit_only

- **WHEN** 系统判断第 1 阶段资料完成状态
- **THEN** `1.3 项目立项通知` MUST 继续按 `submit_only` 提交或上传完成规则判断
- **AND** 系统 MUST NOT 因 `1.2` 多节点审批改变 `1.3` 的完成规则

### Requirement: 1.3 项目立项通知提交前置门禁

系统 MUST 在阶段资料层面阻止 `1.3 项目立项通知` 早于 `1.2 项目立项审批表` 最终通过提交。

#### Scenario: 1.2 未通过时拒绝 1.3 提交

- **WHEN** 用户提交 `1.3 项目立项通知`
- **AND** `1.2 项目立项审批表` 尚未由总经理最终审批通过
- **THEN** 系统 MUST 拒绝 `1.3` 提交
- **AND** 系统 MUST 返回 `1.2` 未最终通过或等价阻塞原因

#### Scenario: 1.2 通过后允许 1.3 按规则提交

- **WHEN** `1.2 项目立项审批表` 已由总经理最终审批通过
- **AND** 当前用户是营销中心负责人或后端授权的等价处理人
- **THEN** 系统 MUST 允许 `1.3` 按在线表单和 `completionMode` 规则提交

### Requirement: 立项阶段在线表单产出

系统 MUST 将立项阶段 `1.1 项目需求表`、`1.2 项目立项审批表` 和 `1.3 项目立项通知` 规划为在线表单产出，并继续复用当前阶段资料底座保存基础状态、责任人、提交追溯、`completionMode` 和精准返工字段。

#### Scenario: 1.1 在线表单产出
- **WHEN** 系统初始化或展示 `1.1 项目需求表`
- **THEN** 系统 MUST 将其作为在线表单产出处理
- **AND** 字段设计来源 MUST 为 `项目需求表-模板.xlsx`

#### Scenario: 1.2 在线表单产出
- **WHEN** 系统初始化或展示 `1.2 项目立项审批表`
- **THEN** 系统 MUST 将其作为在线表单产出处理
- **AND** 字段设计来源 MUST 为 `项目立项审批表-模板.xlsx`

#### Scenario: 1.3 在线表单产出
- **WHEN** 系统初始化或展示 `1.3 项目立项通知`
- **THEN** 系统 MUST 将其作为在线表单产出处理
- **AND** 字段设计来源 MUST 为 `关于确定项目名称及编号的通知-模板.docx`

#### Scenario: 在线表单仍回到资料底座
- **WHEN** 用户提交 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 系统 MUST 将提交结果回写或派生到对应项目级阶段资料项完成状态
- **AND** 系统 MUST NOT 建立脱离阶段资料清单的第二套产出完成状态

#### Scenario: 普通资料提交接口不得提交立项在线表单产出
- **WHEN** 用户通过普通阶段资料提交接口提交 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 系统 MUST 拒绝该请求并返回 `ONLINE_FORM_SUBMISSION_REQUIRED` 或等价稳定错误码
- **AND** 系统 MUST 返回 HTTP 409 或等价冲突状态
- **AND** 错误详情 MUST 包含 `documentId` 和 `documentCode`
- **AND** 系统 MUST NOT 更新资料基础状态、在线表单状态、`1.2` 评价/审批状态或写入提交成功日志
- **AND** 系统 MUST NOT 因旧数据状态或旧资料清单入口允许绕过在线表单提交

#### Scenario: 普通返工完成接口不得清除立项在线表单产出返工
- **WHEN** 用户通过普通返工完成接口处理 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 系统 MUST 拒绝该请求并返回 `ONLINE_FORM_REVISION_COMPLETION_REQUIRED` 或等价稳定错误码
- **AND** 系统 MUST 返回 HTTP 409 或等价冲突状态
- **AND** 错误详情 MUST 包含 `documentId` 和 `documentCode`
- **AND** 系统 MUST NOT 清除 `revision_required`
- **AND** 系统 MUST NOT 写入 `document.revision_completed` 成功日志
- **AND** 系统 MUST NOT 因普通返工完成接口恢复或推进 `1.2` 评价/审批节点

#### Scenario: 1.1 返工必须通过在线表单重提清除
- **WHEN** `1.2` 总经理审批不通过触发 `1.1 项目需求表 revision_required = true`
- **AND** `1.1` 责任人通过在线表单重新提交 `1.1`
- **THEN** 系统 MUST 清除 `1.1 revision_required`
- **AND** 系统 MUST 记录 `revision_completed_by_user_id` 和 `revision_completed_at` 或等价完成字段
- **AND** 系统 MUST 在同一事务中写入在线表单提交日志和返工完成日志
- **AND** 系统 MUST NOT 因 `1.1` 返工清除自动将 `1.2` 视为最终通过

#### Scenario: 1.2 重填必须通过在线表单重新进入评价审批
- **WHEN** `1.2 项目立项审批表` 因总经理审批不通过处于需重填状态
- **AND** `1.2` 原责任人通过在线表单重新提交 `1.2`
- **THEN** 系统 MUST 重新激活营销评价和研发评价待办
- **AND** 系统 MUST 将总经理最终审批置为等待两项评价完成
- **AND** 系统 MUST NOT 复用旧一轮评价或审批结果直接完成 `1.2`
- **AND** 系统 MUST NOT 允许普通资料提交接口完成该重填

#### Scenario: 1.1 返工未清除前不得保存或提交 1.2 重填
- **WHEN** `1.2` 总经理审批不通过已触发 `1.1 项目需求表 revision_required = true`
- **AND** `1.1 revision_required` 仍关联来源 `1.2 项目立项审批表` 且尚未清除
- **THEN** 系统 MUST 拒绝 `1.2` 在线表单草稿保存和在线表单提交
- **AND** 系统 MUST 返回 `INITIATION_REWORK_NOT_CLEARED` 或等价稳定错误码
- **AND** 系统 MUST NOT 更新 `1.2` 在线表单数据或资料基础状态
- **AND** 系统 MUST NOT 激活营销评价、研发评价或总经理审批待办
- **AND** 系统 MUST NOT 写入 `1.2` 保存、提交或评价启动成功日志

### Requirement: 立项阶段责任人规则

系统 MUST 对立项阶段在线表单产出执行专用责任人规则：`1.1` 和 `1.2` 由营销中心负责人分配责任人，`1.3` 默认由营销中心负责人处理。

#### Scenario: 1.1 责任人由营销中心负责人分配
- **WHEN** `1.1 项目需求表` 需要填写或提交
- **THEN** 系统 MUST 要求先由营销中心负责人分配责任人
- **AND** 只有被分配责任人才能按权限填写或提交

#### Scenario: 1.2 责任人由营销中心负责人分配
- **WHEN** `1.2 项目立项审批表` 需要填写或提交
- **THEN** 系统 MUST 要求先由营销中心负责人分配责任人
- **AND** 只有被分配责任人才能按权限填写或提交

#### Scenario: 无责任人不得提交 1.1 或 1.2
- **WHEN** `1.1` 或 `1.2` 尚未分配责任人
- **THEN** 系统 MUST 拒绝在线表单提交
- **AND** 系统 MUST 返回可展示的责任人缺失原因

#### Scenario: 管理身份不代替责任人提交
- **WHEN** 中心负责人、项目经理、总经理、总经理助理或项目创建人不是 `1.1` 或 `1.2` 的责任人
- **THEN** 系统 MUST NOT 仅因其查看或管理身份允许其代替责任人提交 `1.1` 或 `1.2`

#### Scenario: 1.3 默认营销中心负责人处理
- **WHEN** `1.3 项目立项通知` 需要填写或提交
- **THEN** 系统 MUST 默认由营销中心负责人处理
- **AND** 系统 MUST NOT 要求为 `1.3` 单独分配资料责任人

### Requirement: 立项在线表单责任人分配权限一致性

系统 MUST 对 `1.1 项目需求表` 和 `1.2 项目立项审批表` 使用一致的责任人分配权限规则，并 MUST 保证后端返回的 `permissions.canManageResponsibility` 与责任人保存/清空接口的实际授权结果一致。

#### Scenario: 营销中心负责人可分配 1.1 和 1.2
- **WHEN** 当前用户是 `organizationRole = center_manager` 且 `department = marketing_center`
- **AND** 资料项为 `1.1 项目需求表` 或 `1.2 项目立项审批表`
- **THEN** 阶段资料清单、项目工作区产出或等价资料权限上下文 MUST 返回 `canManageResponsibility = true`
- **AND** 责任人保存/清空接口 MUST 允许该用户分配或清空责任人

#### Scenario: 非营销中心负责人不得分配 1.1 和 1.2
- **WHEN** 当前用户是研发中心负责人、其他中心负责人、总经理助理、系统管理员或非中心负责人
- **AND** 资料项为 `1.1 项目需求表` 或 `1.2 项目立项审批表`
- **THEN** 后端返回的 `canManageResponsibility` MUST 为 false
- **AND** 责任人保存/清空接口 MUST 拒绝该用户操作
- **AND** 系统 MUST NOT 因项目经理、项目创建人、总经理、项目查看权限或中心负责人身份本身放宽该权限

#### Scenario: 1.3 不单独分配责任人
- **WHEN** 资料项为 `1.3 项目立项通知`
- **THEN** 后端返回的 `canManageResponsibility` MUST 为 false
- **AND** 责任人保存/清空接口 MUST NOT 要求或允许为 `1.3` 单独分配资料责任人
- **AND** `1.3` MUST 继续按营销中心负责人默认处理规则填写和提交

#### Scenario: 其他阶段资料分配权限不被放宽
- **WHEN** 资料项不是 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 系统 MUST 继续使用既有资料责任人分配权限规则
- **AND** 本修复 MUST NOT 将营销中心负责人扩展为所有阶段资料的责任人分配人

#### Scenario: 在线表单提交责任人规则不变
- **WHEN** `1.1` 或 `1.2` 已完成责任人分配
- **THEN** 只有被分配责任人可保存、填写或提交对应在线表单
- **AND** 未分配责任人或当前用户不是责任人时，在线表单提交 MUST 继续被拒绝

