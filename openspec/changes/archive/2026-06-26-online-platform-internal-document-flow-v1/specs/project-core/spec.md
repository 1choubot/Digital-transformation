## MODIFIED Requirements

### Requirement: 项目主数据

系统 MUST 以数字化管理平台保存项目主数据。项目主数据至少包括可空项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划开始时间、计划完成时间、备注和可空 `createdByUserId`；非空项目编号 MUST 唯一，多个空项目编号 MUST 允许共存。

#### Scenario: 创建项目主数据允许空编号
- **WHEN** 已登录且有权限用户提交项目名称、客户和项目经理等创建项目所需基础信息
- **THEN** 系统 MUST 在数字化管理平台创建项目主数据记录
- **AND** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST 记录 `createdByUserId`

#### Scenario: 非空项目编号唯一
- **WHEN** 用户填写、生成或更新非空项目编号
- **THEN** 系统 MUST 校验该项目编号唯一
- **AND** 系统 MUST 拒绝与已有非空项目编号重复的保存请求

#### Scenario: 空项目编号不冲突
- **WHEN** 多个项目尚未生成项目编号
- **THEN** 系统 MUST 允许这些项目同时保持空 `projectCode`

#### Scenario: 项目初始状态
- **WHEN** 项目创建成功
- **THEN** 系统必须将项目状态初始化为正常，除非创建请求明确提供其他允许的基础状态

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、当前 20260625 64 项项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入，并 MUST NOT 因 `projectCode` 为空拒绝创建。

#### Scenario: 成功创建项目
- **WHEN** 具备创建项目权限的已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化当前 20260625 64 项项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 创建项目允许项目编号为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空

#### Scenario: 创建信息不完整
- **WHEN** 具备创建项目权限的已登录用户缺少项目名称、客户、项目经理或其他必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息
- **AND** 系统 MUST NOT 因 `projectCode` 为空而拒绝创建

#### Scenario: 创建失败无副作用
- **WHEN** 项目创建因权限不足、字段校验失败、项目经理校验失败或其他创建前置校验失败
- **THEN** 系统不得插入项目主数据，不得生成项目阶段，不得生成项目级阶段资料，不得写入 `project.created` 或其他成功业务日志

#### Scenario: 后置项目编号触发点
- **WHEN** `1.2 项目立项审批表` 已按 `approval_required` 审核通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **THEN** 系统 MUST 允许具备项目维护权限、项目经理权限、管理员权限或等价既有权限边界的用户填写或生成 `projectCode`

#### Scenario: 后置项目编号不重建对象
- **WHEN** 项目创建后填写、生成或更新 `projectCode`
- **THEN** 系统 MUST 只更新项目编号及必要追溯字段
- **AND** 系统 MUST NOT 重新初始化项目阶段、阶段资料或附件

#### Scenario: 创建项目不触发文件平台联动
- **WHEN** 项目创建成功
- **THEN** 系统不能在本能力中调用文件管理平台创建目录、上传文件、下载文件、生成文件映射、同步文件平台用户、同步权限或判断下载权限

#### Scenario: 创建日志失败回滚项目创建
- **WHEN** 项目主数据、8 阶段初始化或项目级阶段资料清单初始化已经准备提交，但 `project.created` 业务操作日志写入失败
- **THEN** 系统必须回滚项目创建事务，不得留下没有对应创建日志的新项目

### Requirement: 阶段推进齐套门禁

系统 MUST 在推进当前阶段前检查当前阶段项目级阶段资料清单是否已初始化，并 MUST 只按当前阶段适用资料的 `completionMode` 派生完成状态判断阶段推进门禁，不得统一要求所有适用资料均为 `confirmed`。

#### Scenario: 只检查当前阶段
- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只检查项目当前阶段的适用资料完成情况，不得因其他阶段资料缺失而拒绝当前阶段推进

#### Scenario: 当前阶段资料清单必须已初始化
- **WHEN** 当前阶段没有任何 `project_stage_documents` 资料项记录
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: submit_only submitted 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = submit_only`
- **AND** 该资料基础状态为 `submitted`
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: approval_required submitted 不计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `submitted`
- **THEN** 系统 MUST 将该资料派生为待审核且未完成

#### Scenario: approval_required confirmed 计为完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料基础状态为 `confirmed`
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
- **THEN** 系统 MUST 将该资料派生为已完成

#### Scenario: returned 仍未完成
- **WHEN** 当前阶段适用资料基础状态为 `returned`
- **THEN** 系统 MUST 将该资料派生为未完成

#### Scenario: 当前阶段完成允许推进
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为已完成
- **THEN** 系统必须视为当前阶段资料完成，并允许进入阶段推进状态更新

#### Scenario: 缺失适用资料拒绝推进
- **WHEN** 当前阶段存在适用资料未按其 `completionMode` 完成
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 返回缺失资料列表
- **WHEN** 系统因缺失适用资料拒绝阶段推进
- **THEN** 响应必须包含可读错误和缺失适用资料列表，列表中每项至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

### Requirement: 简单阶段推进边界

系统 MUST 使用当前阶段资料 `completionMode` 完成门禁推进项目阶段，并 MUST 不因 20260625 内部资料闭环引入跳阶段、回退、自动阶段流转、泛化阶段关口审批或复杂工作流引擎。

#### Scenario: 阶段推进继续基于当前阶段资料门禁
- **WHEN** 已登录且有推进权限的用户请求推进项目当前阶段
- **THEN** 系统必须继续只检查当前阶段适用资料按 `completionMode` 派生出的完成情况，并在满足推进权限和阶段状态后按 8 阶段顺序推进

#### Scenario: 阶段推进不要求当前阶段审批通过
- **WHEN** 用户请求推进项目当前阶段
- **AND** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化阶段关口审批或 `approval_status = approved` 而拒绝阶段推进

#### Scenario: 不新增跳阶段或回退
- **WHEN** 系统按 20260625 内部资料闭环推进项目阶段
- **THEN** 系统不得新增跳阶段、阶段回退、任意选择目标阶段或自由调整阶段顺序能力

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统实现阶段资料收集、资料审核或阶段推进
- **THEN** 系统不得新增可视化流程编排、任意节点配置器、合同审批流、采购审批流、付款流、发票审批流、设计变更流程引擎、自动通知、日报周报或资料服务器核查流程

### Requirement: 第一版简单资料闭环

系统 MUST 将当前第一版业务闭环限定为在线平台内部阶段资料收集、资料提交/审核、在线平台附件保存和阶段推进。

#### Scenario: 项目创建初始化闭环对象
- **WHEN** 项目创建成功
- **THEN** 系统必须初始化标准 8 阶段和当前 20260625 64 项阶段资料，作为资料收集和阶段推进依据

#### Scenario: completionMode 计入齐套
- **WHEN** 当前阶段资料项适用且按其 `completionMode` 达到完成点
- **THEN** 系统必须将该资料项计入当前阶段完成资料

#### Scenario: 未达到 completionMode 不计入齐套
- **WHEN** 当前阶段资料项适用但未达到其 `completionMode` 完成点
- **THEN** 系统不得将该资料项计入已完成资料

#### Scenario: 文件平台暂停
- **WHEN** 当前阶段保存资料附件
- **THEN** 系统 MUST 将附件保存在在线平台现有附件系统
- **AND** 系统 MUST NOT 调用文件管理平台、保存文件平台 folder mapping 或产生归档状态

### Requirement: 工作台阶段关口审批和阶段推进待办

系统 MUST 在当前 20260625 在线平台内部资料闭环中只按 `completionMode` 完成情况和既有推进权限生成阶段推进待办，并 MUST NOT 因泛化阶段关口审批生成推进前置。

#### Scenario: 阶段关口审批待办暂停
- **WHEN** 系统生成当前阶段工作台待办
- **THEN** 工作台 MUST NOT 因泛化阶段关口审批状态生成 `stage_gate_approval` 待办

#### Scenario: 项目经理阶段推进待办
- **WHEN** 当前用户是项目经理、当前阶段适用资料已经按 `completionMode` 完成、且当前阶段不是第 8 阶段
- **THEN** 工作台可以返回 `stage_advance` 待办

#### Scenario: 阶段推进待办不要求 approval_status
- **WHEN** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 工作台 MUST NOT 因当前阶段关口审批状态不是 `approved` 而隐藏阶段推进待办

#### Scenario: 阶段推进待办仍要求资料完成
- **WHEN** 当前阶段存在适用资料未按 `completionMode` 完成，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

### Requirement: 阶段推进按结构化归属中心识别本中心项目

系统 MUST 使用结构化归属中心判断中心负责人是否可推进本中心相关项目阶段，并 MUST 保持当前阶段 `completionMode` 完成门禁不变。

#### Scenario: 中心负责人推进本中心相关项目
- **WHEN** 当前用户是中心负责人且项目属于其本中心相关项目
- **AND** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 系统 MAY 允许其推进当前阶段

#### Scenario: 中心负责人不得跨中心推进
- **WHEN** 当前用户是中心负责人但项目不属于其本中心相关项目
- **THEN** 系统 MUST 拒绝其推进阶段，除非该用户同时具备项目经理或总经理等其他允许身份

#### Scenario: 阶段推进归属判断优先级
- **WHEN** 系统判断中心负责人是否可推进某项目阶段
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门

### Requirement: 工作台阶段推进待办按结构化归属中心识别

系统 MUST 使用结构化归属中心生成中心负责人 `stage_advance` 工作台待办，并 MUST 以当前阶段适用资料按 `completionMode` 完成为前置条件。

#### Scenario: 中心负责人因归属中心获得阶段推进待办
- **WHEN** 当前用户是中心负责人且项目中存在 `ownerDepartment = 本人部门` 或 `reviewDepartment = 本人部门` 的阶段资料
- **AND** 当前阶段适用资料已经按 `completionMode` 完成
- **AND** 当前阶段不是第 8 阶段
- **THEN** 工作台 MAY 返回该项目当前阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段仍不生成普通推进待办
- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台 MUST NOT 生成普通 `stage_advance` 待办

#### Scenario: 阶段推进待办限制不变
- **WHEN** 当前阶段适用资料未按 `completionMode` 完成，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

### Requirement: 项目总览看板查询接口

系统 MUST 提供 `GET /api/projects/overview-dashboard`，用于已登录用户查询跨项目总览数据和汇总指标，并 MUST 按当前 20260625 `completionMode` 派生完成口径返回当前阶段齐套摘要和我的待办资料任务数量。

#### Scenario: 返回项目总览汇总指标
- **WHEN** 系统返回项目总览看板数据
- **THEN** 响应必须包含 `summary`
- **AND** `summary` 至少包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`

#### Scenario: 汇总我的待办资料任务
- **WHEN** 系统计算 `myPendingStageDocumentTasks`
- **THEN** 系统必须使用当前登录用户 ID，按资料责任人、适用性和 `completionMode` 派生完成状态统计待办资料任务数量
- **AND** 系统 MUST NOT 将 `completionMode = submit_only` 且 `status = submitted` 的已完成资料计入待办
- **AND** 系统 MUST NOT 将 `isApplicable = false` 的未触发 `conditional_submit` 资料计入待办

#### Scenario: 当前阶段正常返回齐套摘要
- **WHEN** 项目存在唯一当前阶段且当前阶段存在资料项记录
- **THEN** 系统必须返回该当前阶段的 `currentStageCompletenessSummary`
- **AND** 摘要至少包含 `requiredTotal`、`completedRequiredCount` 或等价完成数量、`incompleteRequiredCount` 和 `completionPercent`
- **AND** 如为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 等同按 `completionMode` 派生的完成数量，不得只统计 `status = confirmed`

#### Scenario: 当前阶段缺失资料列表字段
- **WHEN** 当前阶段存在未按 `completionMode` 完成的适用资料
- **THEN** `currentStageIncompleteRequiredDocuments` 中每个资料项必须至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode` 和 `isComplete`、`completionStatus` 或等价派生完成状态

### Requirement: 项目经理职责边界

系统 MUST 明确项目经理在项目内负责推进、任务分配、催办和全量进度查看，但不得因此改变资料审核身份或 `completionMode` 派生完成门禁。

#### Scenario: 项目经理查看项目全量进度
- **WHEN** 项目经理查看其负责项目
- **THEN** 系统必须允许其查看该项目阶段、资料、齐套摘要、责任人和附件等全量进度信息

#### Scenario: 项目经理完成后推进阶段
- **WHEN** 当前阶段适用资料均已按各自 `completionMode` 派生为完成
- **THEN** 项目经理可推进其负责项目当前阶段，且阶段推进仍必须基于 `completionMode` 完成门禁和既有推进权限

#### Scenario: 非项目经理不得推进不属于自己的项目
- **WHEN** 普通员工不是该项目项目经理却直接调用该项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 总经理助理不得推进任何项目
- **WHEN** 总经理助理直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 系统管理员不得推进业务项目
- **WHEN** 系统管理员直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理不因项目身份获得资料审批权
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认或退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备资料级审核规则允许的审核身份

### Requirement: 项目参与人派生

系统 MUST 从项目资料责任人派生项目参与人，不得在第一版新增项目成员表或项目参与人表，并 MUST NOT 因项目参与人派生改变当前阶段 `completionMode` 派生完成门禁。

#### Scenario: 项目参与人由资料责任人派生
- **WHEN** 用户在某项目中至少负责一项资料
- **THEN** 系统必须将该用户视为该项目参与人

#### Scenario: 不新增项目参与人表
- **WHEN** 系统表达项目参与人
- **THEN** 系统不得在本 change 中新增项目参与人表或手工维护项目参与人清单

#### Scenario: 项目参与人不改变阶段推进门禁
- **WHEN** 系统判断阶段是否可推进
- **THEN** 项目参与人派生规则不得改变当前阶段适用资料按 `completionMode` 派生完成的门禁口径

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份；当前内部资料闭环 MUST NOT 返回泛化阶段关口审批待办。

#### Scenario: 返回工作台待办类型
- **WHEN** 系统返回工作台待办
- **THEN** 每条待办的 `type` MUST 是 `document_responsibility`、`document_review` 或 `stage_advance` 之一
- **AND** 系统 MUST NOT 返回 `stage_gate_approval`

#### Scenario: 资料责任待办排除已完成 submit_only
- **WHEN** 系统生成 `document_responsibility` 待办
- **THEN** 只允许包含当前用户负责、适用且未按 `completionMode` 派生完成的资料项
- **AND** 系统 MUST NOT 包含 `completionMode = submit_only` 且 `status = submitted` 的资料项

#### Scenario: 资料审核待办只包含 approval_required submitted
- **WHEN** 系统生成 `document_review` 待办
- **THEN** 只允许包含 `completionMode = approval_required`、`status = submitted` 且当前用户具备资料审核权限的资料项
- **AND** 系统 MUST NOT 将 `submit_only` 或未触发的 `conditional_submit` 资料纳入审核待办

#### Scenario: 阶段推进待办按 completionMode 和权限
- **WHEN** 系统生成 `stage_advance` 待办
- **THEN** 只允许在当前阶段适用资料均按 `completionMode` 完成且当前用户具备推进权限时返回
- **AND** 系统 MUST NOT 因 `approval_status` 生成或隐藏阶段推进待办

#### Scenario: targetRoute 不进入阶段关口审批页
- **WHEN** 系统返回工作台待办列表
- **THEN** 每条待办的 `targetRoute` MUST 指向资料项处理位置、受限任务视图或阶段推进位置
- **AND** `targetRoute` MUST NOT 指向阶段关口审批处理页、阶段审批通过页或阶段审批退回页

#### Scenario: 工作台查询只读
- **WHEN** 用户查询我的工作台
- **THEN** 系统不得改变项目状态、阶段状态、资料状态、资料适用性、责任人、附件或业务日志

### Requirement: 整项目审计信息访问控制

系统 MUST 将项目基础可见性与整项目业务日志访问权限分开；当前内部资料闭环不要求展示或查询新的泛化阶段关口审批历史，历史兼容审批历史如仍存在，只能作为 legacy 只读审计信息并继续受权限保护。

#### Scenario: 项目经理查看自己项目审计信息
- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统可以允许其查看该项目完整业务日志
- **AND** 如 legacy 阶段审批历史接口仍存在，系统 MAY 允许其按既有权限只读查看

#### Scenario: 总经理查看完整审计信息
- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统可以允许其查看全部项目的完整业务日志
- **AND** 如 legacy 阶段审批历史接口仍存在，系统 MAY 允许其按既有权限只读查看

#### Scenario: 普通员工不得查看整项目业务日志
- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整业务日志，并返回无权错误

#### Scenario: legacy 阶段审批历史不是当前必备能力
- **WHEN** 当前 20260625 在线平台内部资料闭环运行
- **THEN** 系统 MUST NOT 要求展示、生成或依赖新的泛化阶段关口审批历史
- **AND** legacy 阶段审批历史 MUST NOT 作为当前阶段推进或资料完成判断依据

### Requirement: 20260624 项目流程依据

当前 `online-platform-internal-document-flow-v1` MUST NOT 将 `智能制造项目管理流程图20260624.pdf` 或 `v20260624` 作为当前主流程依据；当前实现依据 MUST 收敛到 20260625 流程图、`docs/9.11_20260625项目流程资料审批口径规划.md` 和 `docs/9.12_在线平台内部资料闭环规划_20260625.md`。

#### Scenario: 20260624 不再作为当前主流程依据
- **WHEN** 系统说明或实现当前项目主流程、阶段推进和阶段资料完成口径
- **THEN** 系统 MUST NOT 以 `智能制造项目管理流程图20260624.pdf` 或 `v20260624` 作为当前主流程依据

#### Scenario: 保持 8 阶段主干不变
- **WHEN** 系统初始化或展示项目阶段
- **THEN** 系统必须继续按顺序使用立项阶段、方案设计阶段、合同签订阶段、详细设计阶段、生产制作阶段、预验收阶段、终验收阶段和结题阶段

#### Scenario: 阶段标识保持不变
- **WHEN** 系统保存标准 8 阶段
- **THEN** 系统必须继续使用 `initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout` 作为稳定阶段标识

### Requirement: 20260625 项目流程依据

系统 MUST 将 `智能制造项目管理流程图20260625.pdf`、`docs/9.11_20260625项目流程资料审批口径规划.md` 和 `docs/9.12_在线平台内部资料闭环规划_20260625.md` 作为当前在线平台内部资料闭环的实现依据。

#### Scenario: 使用 20260625 流程作为当前依据
- **WHEN** 系统说明或实现项目主流程、项目编号生成、阶段资料完成规则和阶段推进门禁
- **THEN** 系统 MUST 以 20260625 流程图、`docs/9.11` 和 `docs/9.12` 作为当前依据
- **AND** 普通阶段资料项数量 MUST 为 64 项

#### Scenario: completionMode 数量
- **WHEN** 系统初始化或校验当前 20260625 64 项资料
- **THEN** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

#### Scenario: 排除非普通资料过程节点
- **WHEN** 系统维护当前普通阶段资料模板
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 计入普通 64 项资料模板，除非后续正式确认它们形成独立文件

#### Scenario: 保持 8 阶段主干
- **WHEN** 系统初始化或展示项目阶段
- **THEN** 系统 MUST 继续使用立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段

## ADDED Requirements

### Requirement: 在线平台项目编号后置

系统 MUST 支持项目创建初期没有正式项目编号，并 MUST 在 `1.2 项目立项审批表` 审核通过且 `1.3 项目立项通知` 提交或上传完成后填写或生成正式 `projectCode`。

#### Scenario: 创建项目允许 projectCode 为空
- **WHEN** 有权限用户创建项目且项目尚未完成立项审批
- **THEN** 系统 MUST 允许 `projectCode` 为空
- **AND** 系统 MUST NOT 因 `projectCode` 为空拒绝创建

#### Scenario: 空项目编号仍初始化项目闭环对象
- **WHEN** 系统创建 `projectCode` 为空的项目
- **THEN** 系统 MUST 保存项目主数据
- **AND** 系统 MUST 初始化标准 8 阶段
- **AND** 系统 MUST 初始化当前 20260625 64 项项目级阶段资料清单
- **AND** 系统 MUST 记录 `project.created` 业务操作日志

#### Scenario: 非空 projectCode 唯一
- **WHEN** 系统填写、生成或更新非空 `projectCode`
- **THEN** 系统 MUST 校验该编号在项目主数据中唯一
- **AND** 系统 MUST 拒绝与已有非空项目编号重复的保存请求

#### Scenario: 空 projectCode 不参与唯一冲突
- **WHEN** 多个尚未立项的项目暂未生成 `projectCode`
- **THEN** 系统 MUST 允许这些项目同时保持空 `projectCode`

#### Scenario: 后置项目编号节点
- **WHEN** `1.2 项目立项审批表` 已按 `approval_required` 审核通过
- **AND** `1.3 项目立项通知` 已按 `submit_only` 提交或上传完成
- **THEN** 系统 MUST 允许填写或生成 `projectCode`
- **AND** 系统 MUST 沿用项目维护权限、项目经理、管理员或等价现有权限边界，不新增复杂权限模型

#### Scenario: 后置项目编号不重建项目对象
- **WHEN** 项目立项审批通过且项目立项通知提交后填写或生成 `projectCode`
- **THEN** 系统 MUST 只更新项目编号及必要追溯字段
- **AND** 系统 MUST NOT 重新初始化项目阶段、阶段资料或附件

### Requirement: 在线平台 completionMode 阶段推进

系统 MUST 按当前阶段适用资料的 `completionMode` 判断阶段推进门禁，并 MUST NOT 额外叠加泛化阶段审批门禁。

#### Scenario: 阶段推进按 completionMode 计算
- **WHEN** 系统判断当前阶段是否可推进
- **THEN** 系统 MUST 只检查当前阶段适用资料是否按各自 `completionMode` 完成

#### Scenario: submit_only 资料提交后完成
- **WHEN** 当前阶段适用资料 `completionMode = submit_only`
- **AND** 该资料已提交或上传
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: approval_required 资料审核通过后完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料已确认或审批通过
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: approval_required 未审核不完成
- **WHEN** 当前阶段适用资料 `completionMode = approval_required`
- **AND** 该资料仅为已提交但未确认或审批通过
- **THEN** 系统 MUST 将该资料计为未完成

#### Scenario: conditional_submit 未触发不阻塞
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** 该资料 `isApplicable = false`
- **THEN** 系统 MUST NOT 将该资料计入缺失资料或阶段推进阻塞项

#### Scenario: conditional_submit 触发后提交完成
- **WHEN** 当前阶段资料 `completionMode = conditional_submit`
- **AND** 该资料 `isApplicable = true`
- **AND** 该资料已提交或上传
- **THEN** 系统 MUST 将该资料计为已完成

#### Scenario: 不依赖泛化阶段审批门禁
- **WHEN** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化阶段级审批或 `approval_status = approved` 而拒绝阶段推进

#### Scenario: 阶段推进仍保留权限边界
- **WHEN** 用户请求推进当前阶段
- **THEN** 系统 MUST 继续校验当前用户是否具备阶段推进权限
- **AND** 系统 MUST 继续只允许按标准 8 阶段顺序推进当前阶段

### Requirement: 在线平台资料接口派生完成状态

系统 MUST 在阶段资料相关后端响应中返回 `completionMode` 和派生完成状态，使前端能够区分基础状态 `submitted` 在不同完成规则下的业务含义。

#### Scenario: 返回 completionMode 和完成状态
- **WHEN** 后端返回项目阶段资料项、缺失资料项、资料责任待办或资料审核待办
- **THEN** 每个资料项 MUST 包含 `completionMode`
- **AND** 每个资料项 MUST 包含 `isComplete`、`completionStatus` 或等价派生完成状态字段

#### Scenario: submit_only submitted 返回已完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 基础状态为 `submitted`
- **THEN** 后端 MUST 返回派生完成状态为 `completed` 或等价已完成状态
- **AND** 后端 MUST NOT 将该资料项返回为待审核状态

#### Scenario: approval_required submitted 返回待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 基础状态为 `submitted`
- **THEN** 后端 MUST 返回派生完成状态为 `pending_review` 或等价待审核状态
- **AND** `isComplete` MUST 为 false

#### Scenario: returned 返回未完成
- **WHEN** 资料项基础状态为 `returned`
- **THEN** 后端 MUST 返回派生完成状态为 `returned`、`incomplete` 或等价未完成状态
- **AND** `isComplete` MUST 为 false

### Requirement: 在线平台附件本地保存

暂停文件平台联动时，阶段资料附件 MUST 保存在在线平台现有附件系统中，且系统 MUST NOT 调用文件管理平台。

#### Scenario: 附件保存到在线平台
- **WHEN** 用户上传阶段资料附件
- **THEN** 系统 MUST 使用在线平台现有附件存储和附件记录保存文件

#### Scenario: 不调用文件平台
- **WHEN** 用户上传、查看、下载、删除或提交阶段资料附件
- **THEN** 系统 MUST NOT 调用文件管理平台 API
- **AND** 系统 MUST NOT 创建或更新 file-platform folder mapping
- **AND** 系统 MUST NOT 创建 `archived` 或 `archive_failed` 归档状态

#### Scenario: 文件平台恢复需独立 change
- **WHEN** 后续需要恢复文件管理平台联动
- **THEN** 系统 MUST 通过独立 change 重新规划和实现文件夹映射、归档触发、文件列表、下载和文件日志

## REMOVED Requirements

### Requirement: 阶段审批流状态模型
**Reason**: 当前 20260625 在线平台内部资料闭环不再使用泛化阶段关口审批作为阶段推进门禁；资料级 `approval_required` 才表示需要审核的资料节点。

**Migration**: 使用 `在线平台 completionMode 阶段推进` 和 `在线平台资料接口派生完成状态` requirements。

### Requirement: 阶段审批接口和参数校验
**Reason**: 当前闭环不实现泛化阶段审批提交、审批通过、退回或审批历史接口作为推进前置。

**Migration**: 后续如重新需要阶段关口审批，应通过独立 change 重新定义，不得影响本 change 的 completionMode 推进口径。

### Requirement: 第一版审批节点规则
**Reason**: 当前闭环不使用阶段关口审批中心规则决定阶段推进。

**Migration**: 阶段推进权限继续沿用项目经理、中心负责人、管理员或既有推进权限边界，并按当前阶段资料 `completionMode` 完成情况判断。

### Requirement: 阶段审批动作状态机
**Reason**: 当前闭环不再要求资料全部 `confirmed` 后提交阶段审批，也不要求阶段审批状态流转后才能推进。

**Migration**: 使用资料级 `approval_required` 的提交、审核通过和退回规则；阶段推进直接检查当前阶段适用资料完成状态。

### Requirement: 阶段审批权限边界
**Reason**: 当前闭环不实施泛化阶段审批处理权限。

**Migration**: 资料审核权限仍由资料级审核规则控制，阶段推进权限由既有推进身份和归属中心规则控制。

### Requirement: 阶段审批历史
**Reason**: 当前闭环不产生新的泛化阶段审批历史。

**Migration**: 审核追溯使用资料级提交、确认、退回追溯字段和项目业务操作日志。

### Requirement: 阶段审批流与阶段推进约束
**Reason**: 当前 20260625 在线平台内部资料闭环明确不再要求当前阶段审批状态为 `approved` 才允许阶段推进，也不再要求所有适用资料均为 `confirmed`。

**Migration**: 使用 `阶段推进齐套门禁` 和 `简单阶段推进边界` 中的 `completionMode` 派生完成规则。
