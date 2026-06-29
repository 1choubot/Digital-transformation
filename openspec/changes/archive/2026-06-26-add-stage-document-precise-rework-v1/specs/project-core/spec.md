## MODIFIED Requirements

### Requirement: 阶段推进齐套门禁

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化，并 MUST 只按当前阶段适用资料的 `completionMode`、基础状态、适用性和 `revision_required` 派生完成状态判断阶段推进门禁，不得统一要求所有适用资料均为 `confirmed`，也不得忽略精准返工标记。

#### Scenario: 只检查当前阶段
- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只检查项目当前阶段的适用资料完成情况，不得因其他阶段资料缺失而拒绝当前阶段推进

#### Scenario: 当前阶段资料清单必须已初始化
- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: revision_required 阻塞推进
- **WHEN** 当前阶段存在适用资料 `revision_required = true`
- **THEN** 系统 MUST 将该资料视为未完成或需返工
- **AND** 系统 MUST 拒绝阶段推进，即使该资料基础状态为 `submitted` 或 `confirmed`

#### Scenario: approval_required 重提后仍阻塞直到确认
- **WHEN** 当前阶段存在 `completionMode = approval_required` 且 `revision_required = true` 的适用资料
- **AND** 该资料已经返工重提并进入 `submitted`
- **THEN** 系统 MUST 仍拒绝阶段推进
- **AND** 直到该资料审核确认并清除 `revision_required` 后才可恢复推进判断

#### Scenario: submit_only submitted 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = submit_only`
- **AND** 该资料基础状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: approval_required submitted 不计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `submitted`
- **THEN** 系统 MUST 将该资料派生为待审核且未完成

#### Scenario: approval_required confirmed 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `confirmed`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: conditional_submit 复用适用性
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 系统 MUST 将该资料视为未触发或不适用
- **AND** 系统 MUST NOT 将该资料计入缺失资料或阶段推进阻塞项

#### Scenario: conditional_submit 触发后提交完成
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** `isApplicable = true`
- **AND** 该资料基础状态为 `submitted`
- **AND** `revision_required` 不是 true
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: 当前阶段完成允许推进
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为已完成且均无 `revision_required`
- **THEN** 系统必须视为当前阶段资料完成，并允许进入阶段推进状态更新

#### Scenario: 返回缺失资料列表
- **WHEN** 系统因缺失适用资料或需返工资料拒绝阶段推进
- **THEN** 响应必须包含可读错误和缺失适用资料列表
- **AND** 列表中每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode`、派生完成状态和返工标记

### Requirement: 项目总览看板查询接口

系统 MUST 提供 `GET /api/projects/overview-dashboard`，用于已登录用户查询跨项目总览数据和汇总指标，并 MUST 按当前 20260625 `completionMode` 与 `revision_required` 派生完成口径返回当前阶段齐套摘要、未完成资料和我的待办资料任务数量。

#### Scenario: 返回项目总览汇总指标
- **WHEN** 系统返回项目总览看板数据
- **THEN** 响应必须包含 `summary`
- **AND** `summary` 至少包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`

#### Scenario: 汇总我的待办资料任务
- **WHEN** 系统计算 `myPendingStageDocumentTasks`
- **THEN** 系统必须使用当前登录用户 ID，按资料责任人、适用性、`completionMode` 和 `revision_required` 派生完成状态统计待办资料任务数量
- **AND** 系统 MUST 将当前用户负责且 `revision_required = true` 的适用资料计入待办
- **AND** 系统 MUST NOT 将 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料计入待办
- **AND** 系统 MUST NOT 将 `isApplicable = false` 的未触发 `conditional_submit` 资料计入待办

#### Scenario: 当前阶段正常返回齐套摘要
- **WHEN** 项目存在唯一当前阶段且当前阶段存在资料项记录
- **THEN** 系统必须返回该当前阶段的 `currentStageCompletenessSummary`
- **AND** 摘要至少包含 `requiredTotal`、`completedRequiredCount` 或等价完成数量、`incompleteRequiredCount` 和 `completionPercent`
- **AND** 如为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 等同按 `completionMode` 与 `revision_required` 派生的完成数量，不得只统计 `status = confirmed`

#### Scenario: 当前阶段缺失资料列表字段
- **WHEN** 当前阶段存在未按 `completionMode` 完成或 `revision_required = true` 的适用资料
- **THEN** `currentStageIncompleteRequiredDocuments` 中每个资料项必须至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode`、返工标记和 `isComplete`、`completionStatus` 或等价派生完成状态

### Requirement: 项目经理职责边界

系统 MUST 明确项目经理在项目内负责推进、任务分配、催办和全量进度查看，但不得因此改变资料审核身份、`completionMode` 派生完成门禁或精准返工审核边界。

#### Scenario: 项目经理查看项目全量进度
- **WHEN** 项目经理查看其负责项目
- **THEN** 系统必须允许其查看该项目阶段、资料、齐套摘要、责任人、返工标记和附件等全量进度信息

#### Scenario: 项目经理完成后推进阶段
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为完成且没有 `revision_required`
- **THEN** 项目经理可推进其负责项目当前阶段，且阶段推进仍必须基于完成门禁、返工门禁和既有推进权限

#### Scenario: 项目经理可分配未指定责任人的返工资料
- **WHEN** 项目存在 `revision_required = true` 且未分配责任人的资料
- **THEN** 项目经理或既有规则允许的负责人可先按资料责任人分配能力为该资料分配责任人

#### Scenario: 项目经理不因项目身份获得资料审批权
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认、退回或精准返工退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备资料级审核规则允许的审核身份

#### Scenario: 非项目经理不得推进不属于自己的项目
- **WHEN** 普通员工不是该项目项目经理却直接调用该项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份；当前内部资料闭环 MUST NOT 返回泛化阶段关口审批待办，且 MUST 将有责任人的精准返工资料纳入资料责任待办。

#### Scenario: 返回工作台待办类型
- **WHEN** 系统返回工作台待办
- **THEN** 每条待办的 `type` MUST 是 `document_responsibility`、`document_review` 或 `stage_advance` 之一
- **AND** 系统 MUST NOT 返回 `stage_gate_approval`

#### Scenario: 资料责任待办包含需返工资料
- **WHEN** 系统生成 `document_responsibility` 待办
- **THEN** 只允许包含当前用户负责、适用且未按 `completionMode` 与 `revision_required` 派生完成的资料项
- **AND** 系统 MUST 包含当前用户负责且 `revision_required = true` 的资料项
- **AND** 系统 MUST NOT 包含 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的资料项

#### Scenario: approval_required 返工重提前只进责任待办
- **WHEN** 系统生成待办
- **AND** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** 系统不能通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 将该资料作为责任人待办返回给责任人
- **AND** 系统 MUST NOT 将该资料作为 `document_review` 返回给审核人

#### Scenario: 资料审核待办只包含 approval_required submitted
- **WHEN** 系统生成 `document_review` 待办
- **THEN** 普通资料只允许包含 `completionMode = approval_required`、`status = submitted`、`revision_required` 不是 true 且当前用户具备资料审核权限的资料项
- **AND** `revision_required = true` 的资料只有在系统可通过 `revision_resubmitted_at` 或等价显式字段判断已返工重提后，才可纳入审核待办
- **AND** 系统 MUST NOT 用 `submittedAt` 与 `revision_requested_at` 的时间比较替代显式重提标记
- **AND** 系统 MUST NOT 仅因 `revision_required = true` 或仅因旧 `status = submitted` 将资料纳入审核待办
- **AND** 系统 MUST NOT 将 `submit_only` 或未触发的 `conditional_submit` 资料纳入审核待办

#### Scenario: approval_required 返工重提后进入审核待办
- **WHEN** 系统生成 `document_review` 待办
- **AND** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **AND** `status = submitted`
- **AND** 系统可通过 `revision_resubmitted_at` 或等价显式字段判断该资料已返工重提
- **THEN** 系统 MUST 将该资料返回给符合审核权限的审核人
- **AND** 系统 MUST 保持该资料未完成，直到审核确认清除 `revision_required`

#### Scenario: 阶段推进待办按 completionMode 返工门禁和权限
- **WHEN** 系统生成 `stage_advance` 待办
- **THEN** 只允许在当前阶段适用资料均按 `completionMode` 完成、没有 `revision_required` 且当前用户具备推进权限时返回
- **AND** 系统 MUST NOT 因 `approval_status` 生成或隐藏阶段推进待办

#### Scenario: targetRoute 不进入阶段关口审批页
- **WHEN** 系统返回工作台待办列表
- **THEN** 每条待办的 `targetRoute` MUST 指向资料项处理位置、受限任务视图或阶段推进位置
- **AND** `targetRoute` MUST NOT 指向阶段关口审批处理页、阶段审批通过页或阶段审批退回页

#### Scenario: 无责任人返工不进入个人工作台
- **WHEN** 资料项 `revision_required = true` 且没有责任人
- **THEN** 系统 MUST NOT 将其放入任意用户个人工作台
- **AND** 系统 MUST 继续通过项目详情资料清单返回该资料，供项目经理或有权限负责人先分配责任人

## ADDED Requirements

### Requirement: 精准返工阶段门禁

系统 MUST 将 `revision_required` 作为当前阶段推进门禁的一部分。

#### Scenario: 返工标记未清除不得推进
- **WHEN** 当前阶段存在适用资料 `revision_required = true`
- **THEN** 系统 MUST 拒绝阶段推进
- **AND** 拒绝结果 MUST 能让前端展示需返工资料

#### Scenario: 清除返工后恢复推进判断
- **WHEN** 当前阶段所有适用资料均按 `completionMode` 完成且所有 `revision_required` 均已清除
- **THEN** 系统 MUST 按既有当前阶段、顺序推进、项目状态和推进权限规则继续判断是否允许推进

### Requirement: 精准返工工作台集成

系统 MUST 将有责任人的需返工资料纳入资料责任待办，并保持工作台不包含阶段关口审批待办。

#### Scenario: 工作台显示需返工资料
- **WHEN** 当前用户负责某个 `revision_required = true` 的适用资料
- **THEN** 工作台 MUST 返回该资料的 `document_responsibility` 待办
- **AND** 待办必须包含资料编号、资料名称、项目、阶段、返工原因和目标路由

#### Scenario: 返工重提改变待办类型
- **WHEN** `approval_required + revision_required` 资料尚未返工重提
- **THEN** 工作台 MUST 将其作为责任待办
- **WHEN** 该资料返工重提后进入 `submitted`
- **THEN** 工作台 MUST 将其作为审核待办返回给有审核权限的用户

#### Scenario: 工作台不发送通知
- **WHEN** 系统生成需返工工作台数据
- **THEN** 系统 MUST NOT 因本 change 创建推送通知、站内信、短信或邮件
