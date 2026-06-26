## MODIFIED Requirements

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 要求登录态，按阶段分组返回资料项、状态追溯字段、适用性追溯字段、责任人字段、责任人变更追溯字段、`completionMode`、派生完成状态和阶段资料齐套摘要。

#### Scenario: 查询项目阶段资料清单
- **WHEN** 已登录用户请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回
- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称、该阶段资料项列表和 `completenessSummary`

#### Scenario: 资料项字段返回
- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、基础状态、`completionMode`、`isComplete` 或 `completionStatus` 等派生完成状态字段、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt`、`returnReason`、`isApplicable`、适用性追溯字段、`responsibleUserId`、`responsibleUser`、`responsibilityUpdatedByUserId` 和 `responsibilityUpdatedAt`

#### Scenario: submit_only submitted 返回已完成
- **WHEN** 后端返回 `completionMode = submit_only` 且基础状态为 `submitted` 的资料项
- **THEN** 该资料项派生完成状态 MUST 为 `completed` 或等价已完成状态
- **AND** `isComplete` MUST 为 true

#### Scenario: approval_required submitted 返回待审核
- **WHEN** 后端返回 `completionMode = approval_required` 且基础状态为 `submitted` 的资料项
- **THEN** 该资料项派生完成状态 MUST 为 `pending_review` 或等价待审核状态
- **AND** `isComplete` MUST 为 false

#### Scenario: returned 返回未完成
- **WHEN** 后端返回基础状态为 `returned` 的资料项
- **THEN** 该资料项派生完成状态 MUST 表示未完成
- **AND** `isComplete` MUST 为 false

#### Scenario: 阶段齐套摘要字段返回
- **WHEN** 后端返回阶段分组数据
- **THEN** 每个阶段的 `completenessSummary` 必须包含 `requiredTotal`、`completedRequiredCount` 或等价已完成数量、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`
- **AND** 如果为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 与按 `completionMode` 派生的已完成数量一致，不得仅统计 `status = confirmed`

#### Scenario: 阶段齐套摘要缺失列表字段返回
- **WHEN** 每个阶段的 `completenessSummary` 包含非空 `incompleteRequiredDocuments`
- **THEN** `incompleteRequiredDocuments` 中的每个资料项必须至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

### Requirement: 阶段资料齐套摘要

系统 MUST 为每个阶段分组返回适用资料齐套摘要，并 MUST 只基于当前项目级阶段资料项、`completionMode`、基础状态和现有 `isApplicable` 适用性判断计算。

#### Scenario: 返回阶段齐套摘要字段
- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个阶段分组必须返回 `completenessSummary`，包含 `requiredTotal`、`completedRequiredCount` 或等价已完成数量、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用资料项
- **WHEN** 系统计算阶段齐套摘要
- **THEN** 系统必须只统计当前项目级资料项中 `isApplicable = true` 且参与阶段推进门禁的资料项

#### Scenario: submit_only submitted 计为完成
- **WHEN** 适用资料项 `completionMode = submit_only` 且状态为 `submitted`
- **THEN** 系统必须将其计入已完成数量

#### Scenario: approval_required confirmed 计为完成
- **WHEN** 适用资料项 `completionMode = approval_required` 且状态为 `confirmed`
- **THEN** 系统必须将其计入已完成数量

#### Scenario: approval_required submitted 计为未完成
- **WHEN** 适用资料项 `completionMode = approval_required` 且状态为 `submitted`
- **THEN** 系统必须将其计入 `incompleteRequiredCount`，并加入缺失或未完成资料列表

#### Scenario: conditional_submit 未触发不进入缺失列表
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统不得将该资料项计入 `requiredTotal` 或 `incompleteRequiredDocuments`

#### Scenario: conditional_submit 触发后按提交判断
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = true`
- **AND** 状态为 `submitted`
- **THEN** 系统必须将其计入已完成数量

#### Scenario: returned 计为未完成
- **WHEN** 适用资料项状态为 `returned`
- **THEN** 系统必须将其计入 `incompleteRequiredCount`，并加入缺失或未完成资料列表

#### Scenario: 缺失资料项最小字段
- **WHEN** `incompleteRequiredDocuments` 返回资料项
- **THEN** 每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

#### Scenario: 完成百分比计算规则
- **WHEN** 系统计算 `completionPercent`
- **THEN** 当 `requiredTotal > 0` 时必须按 `round(completedRequiredCount / requiredTotal * 100)` 或等价完成数量计算，并返回 0 到 100 的整数

#### Scenario: 没有适用资料的阶段
- **WHEN** 阶段 `requiredTotal = 0`
- **THEN** 系统必须返回 `completionPercent = 100`

#### Scenario: 阶段推进读取 completionMode 摘要口径
- **WHEN** 系统执行阶段推进齐套门禁
- **THEN** 系统必须使用同一 `completionMode` 派生完成口径判断当前阶段是否可推进

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

### Requirement: 阶段资料后端模块化保持行为

系统 MUST 允许对阶段资料相关后端仓储和 helper 做模块化拆分，但拆分后 MUST 保持阶段资料清单、资料状态、适用性、齐套摘要、责任人、我的资料任务和阶段资料附件能力的对外行为符合当前 `completionMode` 口径。

#### Scenario: 阶段资料清单查询行为保持
- **WHEN** 后端完成阶段资料模块拆分后，已登录用户请求某项目阶段资料清单
- **THEN** 系统必须仍要求登录态，并按既有 8 阶段分组、资料项字段、责任人安全字段、状态追溯字段、适用性追溯字段、责任人变更追溯字段、`completionMode` 和派生完成状态返回数据

#### Scenario: 阶段齐套摘要行为按 completionMode
- **WHEN** 后端完成阶段资料模块拆分后，系统计算阶段齐套摘要或阶段推进齐套门禁
- **THEN** 系统必须按 `completionMode`、基础状态和 `isApplicable` 派生完成状态，不得退回到仅 `confirmed` 计为完成的旧口径

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

系统 MUST 保存项目级资料项基础状态，并 MUST 区分基础状态和业务完成状态；业务完成状态 MUST 由 `completionMode`、`status` 和 `isApplicable` 派生。

#### Scenario: 基础状态枚举
- **WHEN** 系统保存资料项状态
- **THEN** 状态必须是 `not_submitted`、`submitted`、`confirmed` 或 `returned` 之一

#### Scenario: submit_only submitted 派生完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 状态为 `submitted`
- **THEN** 系统 MUST 将业务完成状态派生为 `completed` 或等价已完成状态

#### Scenario: approval_required submitted 派生待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 状态为 `submitted`
- **THEN** 系统 MUST 将业务完成状态派生为 `pending_review` 或等价待审核状态

#### Scenario: returned 派生未完成
- **WHEN** 资料项状态为 `returned`
- **THEN** 系统 MUST 将业务完成状态派生为 `incomplete` 或等价未完成状态

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 按 `completionMode` 限定提交、确认和退回动作。

#### Scenario: 标记待提交资料为已提交
- **WHEN** 已登录用户将状态为 `not_submitted` 且适用的项目级资料项标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，并记录提交追溯字段

#### Scenario: 标记已退回资料为已提交
- **WHEN** 已登录用户将状态为 `returned` 且适用的项目级资料项重新标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，记录新的提交追溯字段，并清空退回追溯字段

#### Scenario: confirm 只适用于需要审核资料
- **WHEN** 已登录用户确认状态为 `submitted` 的项目级资料项
- **THEN** 系统 MUST 仅允许 `completionMode = approval_required` 或未来 `conditional_approval` 的资料执行确认
- **AND** 系统 MUST NOT 要求 `submit_only` 资料进入确认主流程

#### Scenario: return 只适用于需要审核资料
- **WHEN** 已登录用户退回状态为 `submitted` 的项目级资料项
- **THEN** 系统 MUST 仅允许 `completionMode = approval_required` 或未来 `conditional_approval` 的资料执行退回
- **AND** 系统 MUST NOT 将 `submit_only` 资料退回作为主流程操作

#### Scenario: submit_only submitted 不进审核待办
- **WHEN** 资料项 `completionMode = submit_only` 且状态为 `submitted`
- **THEN** 系统 MUST 将该资料项派生为完成
- **AND** 系统 MUST NOT 为该资料项生成审核待办

#### Scenario: conditional_submit 使用 isApplicable
- **WHEN** 资料项 `completionMode = conditional_submit`
- **THEN** `isApplicable = false` MUST 表示未触发或不适用且不阻塞
- **AND** `isApplicable = true` 且状态为 `submitted` MUST 派生为完成

### Requirement: 我的阶段资料任务查询接口

系统 MUST 提供 `GET /api/me/stage-document-tasks`，用于已登录用户查询分配给自己的项目级阶段资料项任务，并 MUST 使用 `completionMode` 派生完成状态过滤和展示任务。

#### Scenario: 默认 pending 排除已完成 submit_only
- **WHEN** 已登录用户未提供 `status` 筛选时请求我的资料任务
- **THEN** 系统必须按 `status=pending` 处理，只返回当前登录用户负责、适用且未按 `completionMode` 完成的资料项
- **AND** 系统 MUST NOT 返回 `completionMode = submit_only` 且 `status = submitted` 的已完成资料

#### Scenario: submitted 筛选结合 completionMode
- **WHEN** 已登录用户使用 `status=submitted` 请求我的资料任务
- **THEN** 系统返回的任务必须包含 `completionMode` 和派生完成状态
- **AND** `approval_required + submitted` MUST 表达为待审核
- **AND** `submit_only + submitted` MUST 表达为已提交完成或已完成

#### Scenario: 我的资料任务返回字段
- **WHEN** 系统返回我的资料任务列表
- **THEN** 每个任务必须至少包含 `documentId`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageName`、`stageOrder`、`documentCode`、`documentName`、`isRequired`、`status`、`completionMode`、`isComplete` 或 `completionStatus`、`isApplicable`、`returnReason`、`submittedAt`、`confirmedAt`、`returnedAt` 和 `responsibilityUpdatedAt`

#### Scenario: 排序和筛选不混入已完成资料
- **WHEN** 系统返回 pending 或责任人待办口径的我的资料任务
- **THEN** 排序和筛选结果 MUST NOT 将已完成的 `submit_only + submitted` 混入责任人待办

### Requirement: 阶段资料能力行为保持

系统 MUST 在当前 20260625 active 资料项模板下保持资料状态、适用性、责任人、附件、我的工作台和项目总览的既有能力边界，但 MUST 使用 `completionMode` 派生完成口径，而不是旧的 confirmed-only 口径。

#### Scenario: 资料状态机保持
- **WHEN** 已登录用户对当前项目级资料项执行提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 基础状态机
- **AND** 业务完成状态 MUST 由 `completionMode`、基础状态和 `isApplicable` 派生

#### Scenario: 阶段齐套摘要行为按 completionMode
- **WHEN** 系统计算阶段齐套摘要或阶段推进齐套门禁
- **THEN** 系统必须按 `completionMode` 派生完成状态计算，不得退回到仅 `confirmed` 计为完成的旧口径

### Requirement: 资料确认退回审批边界

系统 MUST 保持资料确认/退回能力只用于需要审核的资料项，并 MUST 为资料级审核权限保留组织角色边界。

#### Scenario: 当前状态机继续存在
- **WHEN** 系统处理资料提交、确认或退回
- **THEN** 系统必须继续使用 `not_submitted`、`submitted`、`confirmed`、`returned` 基础状态机

#### Scenario: 资料确认退回只针对需要审核资料
- **WHEN** 用户调用资料确认或退回接口
- **THEN** 系统 MUST 仅允许对 `completionMode = approval_required` 或未来 `conditional_approval` 且状态为 `submitted` 的资料执行
- **AND** 系统 MUST NOT 要求 `submit_only` 资料进入确认/退回主流程

#### Scenario: 项目经理默认不是资料审核人
- **WHEN** 项目经理仅因项目经理身份调用资料确认或退回接口
- **THEN** 系统必须拒绝，除非其同时具备资料级审核规则允许的审核身份

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

### Requirement: 资料审核待办来源

系统 MUST 将待当前用户审核的资料项作为工作台资料审核待办来源，并 MUST 只从 `completionMode = approval_required` 且 `status = submitted` 的资料项生成 `document_review` 待办。

#### Scenario: 待审核资料状态
- **WHEN** 资料项适用、未删除、`completionMode = approval_required`、`status = submitted`，且当前用户符合资料级审核人规则
- **THEN** 系统必须将该资料项纳入 `document_review` 待办

#### Scenario: submit_only 不进入审核待办
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 系统 MUST NOT 将该资料项纳入 `document_review` 待办

#### Scenario: 未触发 conditional_submit 不进入审核待办
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST NOT 将该资料项纳入 `document_review` 待办

#### Scenario: 审核权限按资料级规则
- **WHEN** 系统判断中心负责人或总经理是否可审核资料
- **THEN** 必须按资料级审核权限判断
- **AND** 系统 MUST NOT 按泛化阶段关口审批节点生成资料审核待办

### Requirement: 阶段资料附件资料项级权限

阶段资料附件接口 MUST 在项目存在和资料项存在校验后执行资料项级权限判断，不能只用项目可见性作为附件访问依据，并 MUST 使用 `completionMode` 派生完成状态替代旧 confirmed-only 删除边界。

#### Scenario: 附件访问不能只按项目可见性
- **WHEN** 用户对某资料项调用附件列表、下载、上传或删除接口
- **THEN** 系统必须校验当前用户是否有权访问该资料项附件，不得仅因用户可见项目就允许操作

#### Scenario: 项目经理删除附件边界
- **WHEN** 项目经理删除自己负责项目的附件
- **THEN** 第一版只允许其删除自己上传、当前仍有资料项附件访问权且资料未按 `completionMode` 派生完成的附件

#### Scenario: 附件删除要求当前访问权
- **WHEN** 用户删除某资料项附件
- **THEN** 系统必须同时校验当前用户不是系统管理员或总经理助理、当前用户仍有该资料项附件访问权、当前用户是该附件上传人、且资料未按 `completionMode` 派生完成

#### Scenario: submit_only completed 不绕过删除规则
- **WHEN** 资料项 `completionMode = submit_only` 且 `status = submitted`
- **THEN** 系统 MUST 将其视为已完成资料处理附件删除边界，不得因 `status != confirmed` 允许绕开删除限制

### Requirement: 阶段推进沿用资料齐套口径

系统使用当前 20260625 资料模板时，阶段推进 MUST 按 `completionMode` 派生完成口径判断当前阶段适用资料是否完成，并 MUST NOT 沿用旧的 confirmed-only 或泛化阶段审批口径。

#### Scenario: 当前阶段资料按 completionMode 完成才允许推进
- **WHEN** 系统判断项目是否可从当前阶段推进
- **THEN** 当前阶段适用资料 MUST 全部按各自 `completionMode` 派生为完成

#### Scenario: 条件资料未触发不阻塞
- **WHEN** 当前阶段条件资料 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST NOT 将该资料计入缺失或推进阻塞项

#### Scenario: 条件资料触发后按 completionMode 判断
- **WHEN** 当前阶段条件资料 `isApplicable = true`
- **THEN** 系统 MUST 按该资料的 `completionMode` 判断是否完成

#### Scenario: 不新增复杂审批流
- **WHEN** 系统使用当前 20260625 阶段资料模板
- **THEN** 系统 MUST NOT 因本规划新增合同审批流、付款流、采购审批流、发票审批流、设计变更自动触发流程或资料服务器核查流程

## ADDED Requirements

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

系统 MUST 按资料项 `completionMode` 判断资料是否完成、是否进入审核待办以及是否阻塞阶段推进。

#### Scenario: submit_only 提交后完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 该资料项已提交或上传
- **THEN** 系统 MUST 将该资料项计为完成
- **AND** 系统 MUST NOT 为该资料项生成审核待办

#### Scenario: approval_required 审核通过后完成
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 该资料项已确认或审批通过
- **THEN** 系统 MUST 将该资料项计为完成

#### Scenario: approval_required submitted 进入审核待办
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 该资料项状态为 `submitted`
- **THEN** 系统 MUST 在具备审核权限的用户工作台中生成审核待办

#### Scenario: 后端返回派生完成状态
- **WHEN** 系统返回阶段资料项、缺失资料项或待办资料项
- **THEN** 系统 MUST 返回 `completionMode`
- **AND** 系统 MUST 返回 `isComplete`、`completionStatus` 或等价派生完成状态字段

#### Scenario: 审核待办只包含 approval_required
- **WHEN** 系统生成资料审核待办
- **THEN** 待办 MUST 只包含 `completionMode = approval_required` 且状态为 `submitted` 的资料项
- **AND** 系统 MUST NOT 将 `submit_only` 或未触发的 `conditional_submit` 资料项纳入审核待办

#### Scenario: submit_only submitted 派生已完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 该资料项状态为 `submitted`
- **THEN** 系统 MUST 返回派生完成状态为 `completed` 或等价已完成状态
- **AND** 系统 MUST NOT 将该资料项表达为待审核

#### Scenario: conditional_submit 未触发不阻塞
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST 不将该资料项计入缺失资料、未完成资料或阶段推进阻塞项

#### Scenario: conditional_submit 触发后提交完成
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = true`
- **AND** 该资料项已提交或上传
- **THEN** 系统 MUST 将该资料项计为完成

#### Scenario: returned 仍未完成
- **WHEN** 资料项状态为 `returned`
- **THEN** 系统 MUST 将该资料项派生为未完成

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

## REMOVED Requirements

### Requirement: 阶段资料收集审核归档闭环
**Reason**: 当前阶段文件管理平台归档暂停，旧标题把“归档”放在当前正向闭环名称中，容易被理解为文件平台归档仍是资料完成或阶段推进前置。

**Migration**: 使用 `在线平台阶段资料收集审核闭环` requirement；当前闭环只包含资料收集、按 `completionMode` 提交/审核、在线平台附件保存和阶段推进。文件平台归档后续如恢复，必须通过独立 change 重新定义。

### Requirement: 阶段资料与阶段审批流关系
**Reason**: 当前 20260625 在线平台内部资料闭环不再要求所有适用必填资料均为 `confirmed` 后提交泛化阶段审批，也不再把阶段审批作为推进门禁。

**Migration**: 使用 `资料状态按 completionMode 完成` 和 `阶段资料齐套摘要` 的 `completionMode` 派生完成规则；资料级 `approval_required` 继续由资料审核待办处理。
