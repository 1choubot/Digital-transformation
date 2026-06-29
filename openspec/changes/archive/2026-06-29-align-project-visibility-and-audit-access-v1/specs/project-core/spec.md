## MODIFIED Requirements

### Requirement: 项目列表

系统 MUST 提供项目列表，用于查看当前用户有权查看的项目基础信息、项目状态、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目列表

- **WHEN** 用户打开项目列表
- **THEN** 系统必须按“项目可见范围”过滤后展示项目编号、项目名称、客户、项目经理、项目状态、当前阶段、计划开始时间、计划完成时间和创建人基础信息或创建人字段

#### Scenario: 管理层项目列表全量查看

- **WHEN** 总经理、总经理助理或中心负责人打开项目列表
- **THEN** 系统 MUST 返回全部业务项目的列表项
- **AND** 系统 MUST NOT 因返回列表项而授予任何项目内业务操作权限

#### Scenario: 创建人项目列表查看自己创建项目

- **WHEN** 当前用户是某项目 `createdByUserId`
- **THEN** 系统 MUST 允许该用户在项目列表中看到该项目

#### Scenario: 已完成项目当前阶段为空

- **WHEN** 项目 `status` 为 `completed` 且所有 8 个阶段均已完成
- **THEN** 系统必须允许项目列表中的当前阶段为空或展示为已完成状态，并不得因此阻止列表读取

#### Scenario: 历史项目列表创建人为空

- **WHEN** 项目列表包含 `createdByUserId` 为空的历史项目
- **THEN** 系统必须允许创建人基础信息为空，并继续按项目可见范围判断是否返回该项目

#### Scenario: 从列表进入项目详情

- **WHEN** 用户在项目列表中选择某个可见项目
- **THEN** 系统必须打开该项目的项目详情基础状态页

#### Scenario: 列表不展示看板指标

- **WHEN** 用户打开项目列表
- **THEN** 系统不能在本能力中展示管理层看板指标、资料齐套率、资料缺失统计或文件归档状态

### Requirement: 项目详情基础状态

系统 MUST 提供项目详情基础状态，用于有项目查看权的用户查看项目主数据、标准 8 阶段、当前阶段和创建人追溯字段；当项目已完成且不再有当前阶段时，当前阶段字段 MUST 允许为空。

#### Scenario: 查看项目基础信息

- **WHEN** 有项目查看权的用户打开项目详情
- **THEN** 系统必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段

#### Scenario: 查看历史项目详情

- **WHEN** 有项目查看权的用户打开 `createdByUserId` 为空的历史项目详情
- **THEN** 系统必须允许创建人基础信息为空，并继续展示项目基础状态

#### Scenario: 查看 8 阶段基础进度

- **WHEN** 有项目查看权的用户打开项目详情
- **THEN** 系统必须展示该项目的全部 8 个阶段、阶段顺序、阶段名称、阶段状态和当前阶段标记

#### Scenario: 已完成项目没有当前阶段

- **WHEN** 有项目查看权的用户打开 `status` 为 `completed` 且所有 8 个阶段均已完成的项目详情
- **THEN** 系统必须允许当前阶段为空，并继续展示项目基础状态和 8 阶段完成状态

#### Scenario: 项目详情查看不放宽操作权限

- **WHEN** 用户因总经理、总经理助理、中心负责人、项目创建人或项目经理身份获得项目详情查看权
- **THEN** 系统 MUST NOT 因该查看权授予阶段推进、项目编号填写、责任人分配、适用性变更、资料提交、资料审核、资料退回或精准返工退回权限

#### Scenario: 项目基础状态接口职责边界

- **WHEN** 有项目查看权的用户请求 `GET /api/projects/:projectId`
- **THEN** 该接口 MUST 只承载项目主数据、标准 8 阶段基础状态、当前阶段和创建人追溯字段
- **AND** 阶段资料清单、附件列表/下载、业务日志、齐套摘要 MUST 由阶段资料、附件、日志、总览/齐套等独立接口承载，供项目详情页组合展示
- **AND** 该接口 MUST NOT 展示或依赖文件平台同步状态
- **AND** 系统 MUST NOT 因项目详情基础状态接口恢复文件平台联动

### Requirement: 项目总览看板查询接口

系统 MUST 提供 `GET /api/projects/overview-dashboard`，用于已登录用户查询其有权查看项目的跨项目总览数据和汇总指标，并 MUST 按当前 20260625 `completionMode` 与 `revision_required` 派生完成口径返回我的待办资料任务数量；当前阶段齐套摘要和未完成资料明细 MUST 仅在当前用户拥有该项目完整资料查看权时返回。

#### Scenario: 返回项目总览汇总指标

- **WHEN** 系统返回项目总览看板数据
- **THEN** 响应必须包含 `summary`
- **AND** `summary` 至少包含 `totalProjects`、`activeProjects`、`completedProjects`、`riskProjects` 和 `myPendingStageDocumentTasks`

#### Scenario: 总览按项目查看范围返回项目

- **WHEN** 总经理、总经理助理或中心负责人查询项目总览
- **THEN** 系统 MUST 按全量项目范围返回总览项目和汇总指标
- **AND** 系统 MUST NOT 因总览可见性放宽而放宽任何阶段推进或资料操作权限

#### Scenario: 创建人总览可见自己创建项目

- **WHEN** 项目创建人查询项目总览
- **THEN** 系统 MUST 在可见项目范围中包含其 `createdByUserId` 匹配的项目

#### Scenario: 汇总我的待办资料任务

- **WHEN** 系统计算 `myPendingStageDocumentTasks`
- **THEN** 系统必须使用当前登录用户 ID，按资料责任人、适用性、`completionMode` 和 `revision_required` 派生完成状态统计待办资料任务数量
- **AND** 系统 MUST 将当前用户负责且 `revision_required = true` 的适用资料计入待办
- **AND** 系统 MUST NOT 将 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料计入待办
- **AND** 系统 MUST NOT 将 `isApplicable = false` 的未触发 `conditional_submit` 资料计入待办

#### Scenario: 当前阶段正常返回齐套摘要

- **WHEN** 当前用户拥有该项目完整资料查看权，且项目存在唯一当前阶段且当前阶段存在资料项记录
- **THEN** 系统必须返回该当前阶段的 `currentStageCompletenessSummary`
- **AND** 摘要至少包含 `requiredTotal`、`completedRequiredCount` 或等价完成数量、`incompleteRequiredCount` 和 `completionPercent`
- **AND** 如为兼容旧前端继续返回 `confirmedRequiredCount`，其含义 MUST 等同按 `completionMode` 与 `revision_required` 派生的完成数量，不得只统计 `status = confirmed`

#### Scenario: 当前阶段缺失资料列表字段

- **WHEN** 当前用户拥有该项目完整资料查看权，并且当前阶段存在未按 `completionMode` 完成或 `revision_required = true` 的适用资料
- **THEN** `currentStageIncompleteRequiredDocuments` 中每个资料项必须至少包含 `id`、`documentCode`、`documentName`、`status`、`completionMode`、返工标记和 `isComplete`、`completionStatus` 或等价派生完成状态

#### Scenario: 普通员工受限总览不返回完整齐套明细

- **WHEN** 普通员工仅因负责项目中某个资料项而可见该项目总览卡片
- **THEN** 系统 MAY 返回项目基础卡片字段，用于识别项目
- **AND** 系统 MUST NOT 返回该项目完整当前阶段齐套摘要
- **AND** 系统 MUST NOT 返回该项目中当前用户无权查看的未完成资料编号、名称、状态或 `completionMode`
- **AND** `myPendingStageDocumentTasks` 仍 MUST 只按当前登录用户的责任资料统计

### Requirement: 项目可见范围

系统 MUST 对项目列表、项目详情和项目总览看板按当前用户过滤可见项目，并 MUST 使用后端校验作为安全边界；查看范围放宽 MUST NOT 放宽任何业务操作权限。

#### Scenario: 项目列表必须登录

- **WHEN** 未登录用户请求 `GET /api/projects`
- **THEN** 系统必须返回未登录错误，不得返回项目列表

#### Scenario: 项目详情必须登录

- **WHEN** 未登录用户请求 `GET /api/projects/:projectId`
- **THEN** 系统必须返回未登录错误，不得返回项目详情

#### Scenario: 管理层全局查看

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 项目列表、项目详情和项目总览看板 MUST 可返回全部业务项目

#### Scenario: 项目创建人查看自己创建项目

- **WHEN** 当前用户是某项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目列表项、详情和总览卡片

#### Scenario: 项目经理查看自己负责项目

- **WHEN** 当前用户是某项目 `projectManagerUserId`
- **THEN** 系统 MUST 允许其查看该项目列表项、详情和总览卡片

#### Scenario: 资料责任人可见相关项目

- **WHEN** 当前用户在某项目中至少负责一项资料
- **THEN** 系统必须允许该用户查看该项目列表项、详情和总览卡片，但完整资料和附件视图仍按阶段资料权限过滤

#### Scenario: 普通员工只能查看自己相关项目

- **WHEN** 当前用户 `organizationRole = employee`
- **THEN** 系统只能返回该用户负责资料、作为项目经理或作为项目创建人的项目

#### Scenario: 系统管理员无默认业务项目权限

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理身份返回全部业务项目或授予项目详情查看权限

#### Scenario: 查看权限不派生操作权限

- **WHEN** 用户因项目可见范围规则可查看某项目
- **THEN** 系统 MUST NOT 仅因项目可见授予阶段推进、项目编号填写、责任人分配、适用性标记/恢复、资料提交、资料审核、资料退回、精准返工退回、附件上传或附件删除权限

#### Scenario: 无权项目详情返回权限错误

- **WHEN** 已登录用户直接访问无权项目详情
- **THEN** 系统必须返回稳定权限错误码 `FORBIDDEN_OPERATION`，不得返回项目详情

### Requirement: 项目基础可见与资料访问分离

系统 MUST 区分项目基础信息可见性、完整资料查看权限、附件查看/下载权限和业务操作权限；完整查看角色可以查看完整资料和已上传附件，但不得因此获得资料、附件或阶段业务操作权限。

#### Scenario: 普通员工可见相关项目基础信息

- **WHEN** 普通员工负责某项目中的至少一个资料项
- **THEN** 系统可以允许该员工查看该项目基础信息，用于理解任务所属项目

#### Scenario: 普通员工不因项目可见获得完整资料清单

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看该项目完整阶段资料清单

#### Scenario: 普通员工不因项目可见获得全部附件访问

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看、下载、上传或删除其他资料项附件

#### Scenario: 项目经理查看自己项目完整资料

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统必须允许其查看该项目完整资料清单、已上传附件和业务日志，用于统筹项目

#### Scenario: 项目创建人查看自己创建项目完整资料

- **WHEN** 当前用户是项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目完整资料清单、已上传附件和业务日志

#### Scenario: 管理层查看完整项目资料

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 系统 MUST 允许其查看全部项目的完整项目资料、已上传附件和业务日志

#### Scenario: 系统管理员无默认业务资料访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份授予业务项目资料、附件或业务日志访问权限

#### Scenario: 完整查看不授予附件上传删除

- **WHEN** 用户因总经理、总经理助理、中心负责人、项目创建人或项目经理身份获得完整资料和附件查看权限
- **THEN** 系统 MUST NOT 仅因该查看权限授予附件上传或附件删除权限

#### Scenario: 项目列表仍展示有权基础项目

- **WHEN** 用户查询项目列表或项目总览
- **THEN** 系统可以继续返回该用户有权看到的项目基础信息，但不得通过列表或总览泄露无权资料附件内容

#### Scenario: 员工直接打开项目详情仍受资料过滤

- **WHEN** 普通员工直接打开项目详情地址或直接调用资料清单 API
- **THEN** 后端仍必须只返回该员工有权访问的资料项，不得因绕过工作台入口返回完整资料清单

### Requirement: 整项目审计信息访问控制

系统 MUST 将项目基础可见性与整项目业务日志访问权限分开；总经理、总经理助理、中心负责人、项目创建人和项目经理按其可见项目范围查看完整业务日志，查看日志不得放宽任何业务操作权限。

#### Scenario: 管理层查看全部项目业务日志

- **WHEN** 当前用户 `organizationRole` 为 `general_manager`、`general_manager_assistant` 或 `center_manager`
- **THEN** 系统 MUST 允许其查看全部项目的完整业务日志

#### Scenario: 项目创建人查看自己创建项目业务日志

- **WHEN** 当前用户是项目 `createdByUserId`
- **THEN** 系统 MUST 允许其查看该项目完整业务日志

#### Scenario: 项目经理查看自己项目审计信息

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统可以允许其查看该项目完整业务日志
- **AND** 如 legacy 阶段审批历史接口仍存在，系统 MAY 允许其按既有权限只读查看

#### Scenario: 普通员工不得查看整项目业务日志

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整业务日志，并返回无权错误

#### Scenario: 系统管理员无默认业务日志权限

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统 MUST NOT 仅因系统管理员身份允许其查看项目业务日志

#### Scenario: 日志查看不放宽操作

- **WHEN** 用户获得某项目业务日志查看权限
- **THEN** 系统 MUST NOT 因日志查看权限授予资料提交、资料审核、资料退回、精准返工、附件上传、附件删除、阶段推进、责任人分配或适用性管理权限

#### Scenario: legacy 阶段审批历史不是当前必备能力

- **WHEN** 当前 20260625 在线平台内部资料闭环运行
- **THEN** 系统 MUST NOT 要求展示、生成或依赖新的泛化阶段关口审批历史
- **AND** legacy 阶段审批历史 MUST NOT 作为当前阶段推进或资料完成判断依据

### Requirement: 项目可见性按结构化归属中心识别

系统 MUST 保留结构化归属中心用于资料审核、责任分配、适用性管理和既有本中心业务操作判断，但中心负责人项目查看范围 MUST 按本 change 放宽为全部业务项目，不再仅按本中心相关项目过滤。

#### Scenario: 中心负责人查看全部项目

- **WHEN** 当前用户是中心负责人且系统判断其是否可见某项目
- **THEN** 系统 MUST 将全部业务项目视为该中心负责人可查看项目

#### Scenario: 结构化归属中心仍用于操作权限

- **WHEN** 系统判断中心负责人是否可审核资料、分配资料责任人、管理适用性或执行其他受中心边界约束的业务操作
- **THEN** 系统 MUST 继续使用 `ownerDepartment`、`reviewDepartment`、`participatingDepartments` 或既有规则判断操作权限
- **AND** 系统 MUST NOT 仅因中心负责人可查看全部项目而允许其操作跨中心资料

#### Scenario: 责任人部门仅作为旧数据 fallback

- **WHEN** 项目阶段资料已保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 系统 MUST 优先使用 `ownerDepartment` 和 `reviewDepartment` 判断中心负责人资料操作范围，不得再无条件使用 `responsibleUser.department`

#### Scenario: 旧资料缺少归属中心时兼容责任人部门

- **WHEN** 某项目阶段资料的 `ownerDepartment` 和 `reviewDepartment` 都为空
- **THEN** 系统 MAY 继续使用该资料责任人的部门作为旧数据兼容判断
