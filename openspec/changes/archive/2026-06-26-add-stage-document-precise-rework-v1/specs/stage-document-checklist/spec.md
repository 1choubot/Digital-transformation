## MODIFIED Requirements

### Requirement: 资料项基础状态

系统 MUST 保存项目级资料项基础状态，并 MUST 区分基础状态、业务完成状态和精准返工标记；业务完成状态 MUST 由 `completionMode`、`status`、`isApplicable` 和 `revision_required` 派生。

#### Scenario: 基础状态枚举
- **WHEN** 系统保存资料项状态
- **THEN** 状态必须是 `not_submitted`、`submitted`、`confirmed` 或 `returned` 之一

#### Scenario: 返工标记独立于基础状态
- **WHEN** 审批 NO 要求上游资料返工
- **THEN** 系统 MUST 使用 `revision_required` 等独立返工字段标记上游资料
- **AND** 系统 MUST NOT 复用 `returned` 改写上游资料的基础状态
- **AND** 每次设置 `revision_required = true` 时，系统 MUST 清空 `revision_resubmitted_by_user_id` 和 `revision_resubmitted_at`

#### Scenario: revision_required 覆盖完成状态
- **WHEN** 资料项 `revision_required = true`
- **THEN** 系统 MUST 将业务完成状态派生为未完成或需返工
- **AND** 即使该资料基础状态为 `submitted` 或 `confirmed` 也 MUST 阻塞阶段推进

#### Scenario: submit_only submitted 派生完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将业务完成状态派生为 `completed` 或等价已完成状态

#### Scenario: approval_required submitted 派生待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将业务完成状态派生为 `pending_review` 或等价待审核状态

#### Scenario: approval_required 返工重提后派生待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** 状态为 `submitted`
- **AND** 系统可通过 `revision_resubmitted_at` 或等价显式字段判断该提交是返工重提
- **THEN** 系统 MUST 将该资料表达为待审核且仍未完成
- **AND** 系统 MUST NOT 在审核确认前清除 `revision_required`

#### Scenario: returned 派生未完成
- **WHEN** 资料项状态为 `returned`
- **THEN** 系统 MUST 将业务完成状态派生为 `incomplete` 或等价未完成状态

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

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 按 `completionMode` 限定提交、确认和退回动作；审批退回 MUST 支持精准返工目标规划，不得整阶段退回或自动退回全部前置资料。

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

#### Scenario: A 类退回必须选择固定候选
- **WHEN** 用户退回 A 类审批资料
- **THEN** 请求 MUST 携带 `returnReason` 和 `revisionTargetDocumentIds`
- **AND** `revisionTargetDocumentIds` MUST 至少包含 1 个固定候选范围内的当前项目适用资料

#### Scenario: 非 A 类不得携带上游返工目标
- **WHEN** 用户退回 B 类、C 类或其他非 A 类审批资料
- **THEN** 系统 MUST 拒绝携带 `revisionTargetDocumentIds` 的请求
- **AND** 系统 MUST 只按该审批资料自身退回处理，除 `5.12` C 类特殊规则外不得标记其他资料返工

#### Scenario: C 类使用独立设计变更字段
- **WHEN** 用户退回 `5.12 安装调试记录（厂内）`
- **THEN** 请求 MUST 使用 `designChangeTargetDocumentIds` 表示设计变更触发项
- **AND** 请求 MUST NOT 使用 `revisionTargetDocumentIds`
- **AND** `designChangeTargetDocumentIds` 不算违反非 A 类不得携带上游 `revisionTargetDocumentIds` 的规则

#### Scenario: 不自动退回全部前置资料
- **WHEN** 任一审批资料被退回
- **THEN** 系统 MUST NOT 自动将同阶段全部前置资料置为 `returned`
- **AND** 系统 MUST NOT 因退回动作整阶段回退

#### Scenario: 清除返工必须显式发生
- **WHEN** 上游 `submit_only` 或 `conditional_submit` 资料完成返工
- **THEN** 责任人必须在具备资料权限的前提下执行明确返工完成动作，系统才可清除 `revision_required`

#### Scenario: 审核资料返工必须重新确认
- **WHEN** 上游 `approval_required` 资料被标记 `revision_required = true`
- **THEN** 该资料必须执行返工重提并经审核确认后才可清除 `revision_required`
- **AND** `3.2 销售合同` 和 `5.3 采购合同` MUST 适用该规则

#### Scenario: confirmed 返工资料仍允许重提
- **WHEN** 上游 `approval_required` 资料基础状态已经是 `confirmed`
- **AND** `revision_required = true`
- **THEN** 系统 MUST 允许责任人在具备资料权限时执行返工重提
- **AND** 重提后基础状态 MUST 进入 `submitted`
- **AND** 重提时 MUST NOT 清除 `revision_required`
- **AND** 重提时 MUST 设置 `revision_resubmitted_by_user_id` 和 `revision_resubmitted_at`

#### Scenario: 返工重提再次退回保持返工
- **WHEN** 上游 `approval_required` 返工资料重提后再次被退回
- **THEN** 系统 MUST 保持 `revision_required = true`
- **AND** 系统 MUST 清空或失效本轮 `revision_resubmitted_by_user_id` 和 `revision_resubmitted_at`
- **AND** 直到后续返工重提并审核确认通过后才可清除

### Requirement: 阶段资料齐套摘要

系统 MUST 为每个阶段分组返回适用资料齐套摘要，并 MUST 只基于当前项目级阶段资料项、`completionMode`、基础状态、现有 `isApplicable` 适用性和 `revision_required` 返工标记判断计算。

#### Scenario: 返回阶段齐套摘要字段
- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个阶段分组必须返回 `completenessSummary`，包含 `requiredTotal`、`completedRequiredCount` 或等价已完成数量、`incompleteRequiredCount`、`completionPercent` 和 `incompleteRequiredDocuments`

#### Scenario: 只统计适用资料项
- **WHEN** 系统计算阶段齐套摘要
- **THEN** 系统必须只统计当前项目级资料项中 `isApplicable = true` 且参与阶段推进门禁的资料项

#### Scenario: revision_required 计为未完成
- **WHEN** 适用资料项 `revision_required = true`
- **THEN** 系统 MUST 将其计入未完成数量和 `incompleteRequiredDocuments`
- **AND** 系统 MUST 在缺失资料项中返回返工原因和来源审批资料标识或等价上下文

#### Scenario: submit_only submitted 计为完成
- **WHEN** 适用资料项 `completionMode = submit_only` 且状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统必须将其计入已完成数量

#### Scenario: approval_required confirmed 计为完成
- **WHEN** 适用资料项 `completionMode = approval_required` 且状态为 `confirmed`
- **AND** `revision_required` 不是 true
- **THEN** 系统必须将其计入已完成数量

#### Scenario: conditional_submit 未触发不进入缺失列表
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统不得将该资料项计入 `requiredTotal` 或 `incompleteRequiredDocuments`

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

### Requirement: 资料确认退回审批边界

系统 MUST 保持资料确认/退回能力只用于需要审核的资料项，并 MUST 为资料级审核权限保留组织角色边界；精准返工不得扩大资料审核人范围。

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

#### Scenario: 精准返工不改变审核权限
- **WHEN** 用户对审批资料执行退回并指定返工目标
- **THEN** 系统 MUST 仍按该审批资料的资料级审核权限判断是否允许退回
- **AND** 被指定返工资料的责任人不得因此获得审批资料退回权限

#### Scenario: 项目经理默认不是资料审核人
- **WHEN** 项目经理仅因项目经理身份调用资料确认或退回接口
- **THEN** 系统必须拒绝，除非其同时具备资料级审核规则允许的审核身份

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

### Requirement: 资料状态按 completionMode 完成

系统 MUST 按资料项 `completionMode`、基础状态、适用性和 `revision_required` 判断资料是否完成、是否进入审核待办以及是否阻塞阶段推进。

#### Scenario: revision_required 优先判未完成
- **WHEN** 资料项 `revision_required = true`
- **THEN** 系统 MUST 将该资料项计为未完成或需返工
- **AND** 系统 MUST 阻塞阶段推进

#### Scenario: submit_only 提交后完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 该资料项已提交或上传
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料项计为完成
- **AND** 系统 MUST NOT 为该资料项生成审核待办

#### Scenario: approval_required 审核通过后完成
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 该资料项已确认或审批通过
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料项计为完成

#### Scenario: approval_required 返工后重新审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **THEN** 系统 MUST 要求返工重提并经审核确认后才可清除返工标记并恢复完成状态
- **AND** 返工重提时基础状态 MUST 进入 `submitted`
- **AND** 返工重提时 MUST NOT 清除 `revision_required`

## ADDED Requirements

### Requirement: 精准返工固定分类

系统 MUST 将审批 NO 后的返工处理固定分为 A 类固定候选返工、B 类单份退回和 C 类厂内安装调试特殊处理，并 MUST 保持当前 64 项 `completionMode` 统计不变。

#### Scenario: 不改变 completionMode 数量
- **WHEN** 系统实现精准返工能力
- **THEN** `submit_only` MUST 仍为 33 项
- **AND** `approval_required` MUST 仍为 24 项
- **AND** `conditional_submit` MUST 仍为 7 项
- **AND** `conditional_approval` MUST 仍为 0 项

#### Scenario: 不整阶段退回
- **WHEN** 审批资料 NO
- **THEN** 系统 MUST NOT 整阶段退回
- **AND** 系统 MUST NOT 自动退回全部前置资料

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
