# project-core-frontend Specification

## Purpose
TBD - created by archiving change add-project-core-frontend. Update Purpose after archive.
## Requirements
### Requirement: API base URL 配置

前端 MUST 支持配置数字化平台后端 API base URL，并 MUST 通过该配置访问 `digital-platform-api`。

#### Scenario: 读取 API base URL

- **WHEN** 前端应用启动
- **THEN** 系统必须读取已配置的 API base URL，并用于项目核心 API 请求

#### Scenario: 禁止硬编码正式 API 地址

- **WHEN** 页面调用项目列表、创建或详情接口
- **THEN** 页面不能直接硬编码完整后端服务地址

### Requirement: 项目列表页

前端 MUST 提供项目列表页，并 MUST 调用 `GET /api/projects` 获取正式项目数据和创建人追溯字段。

#### Scenario: 加载项目列表

- **WHEN** 用户打开项目列表页
- **THEN** 前端必须调用 `GET /api/projects` 并展示返回的项目列表

#### Scenario: 展示列表基础字段

- **WHEN** 项目列表接口返回项目数据
- **THEN** 页面必须展示项目编号、项目名称、客户、项目经理、项目状态、当前阶段、计划开始时间、计划完成时间和创建人基础信息或创建人字段

#### Scenario: 历史项目创建人为空

- **WHEN** 项目列表接口返回创建人为空的历史项目
- **THEN** 页面必须允许创建人为空，并继续展示该项目

#### Scenario: 项目列表空状态

- **WHEN** 项目列表接口返回空数组
- **THEN** 页面必须展示空状态，并提供新建项目入口

#### Scenario: 列表接口失败

- **WHEN** 项目列表接口请求失败
- **THEN** 页面必须展示可读错误提示，并允许用户重新加载

#### Scenario: 列表不展示排除能力

- **WHEN** 用户打开项目列表页
- **THEN** 页面不能展示看板指标、资料齐套率、资料缺失统计、文件归档状态、复杂权限入口或日志入口

### Requirement: 新建项目页

前端 MUST 提供新建项目页，并 MUST 携带当前登录态调用 `POST /api/projects` 创建项目；当前 20260625 在线平台内部资料闭环中，项目编号 `projectCode` MUST NOT 作为创建必填项。

#### Scenario: 提交有效项目允许空编号
- **WHEN** 已登录用户填写项目名称、客户和项目经理等必需信息并提交
- **THEN** 前端必须携带当前登录态调用 `POST /api/projects` 创建项目，并在成功后展示成功结果或进入项目详情
- **AND** 前端 MUST 允许创建请求不包含 `projectCode` 或 `projectCode` 为空

#### Scenario: 提交缺少必填字段
- **WHEN** 用户提交缺少项目名称、客户、项目经理或其他必需字段的项目
- **THEN** 页面必须展示校验提示，且不得假装创建成功
- **AND** 页面 MUST NOT 因项目编号为空显示必填校验错误

#### Scenario: 后端返回重复项目编号
- **WHEN** `POST /api/projects` 或后置项目编号更新接口返回 `PROJECT_CODE_EXISTS`
- **THEN** 页面必须展示项目编号已存在的提示

#### Scenario: 新建项目不触发排除能力
- **WHEN** 用户创建项目
- **THEN** 页面不得触发在线表单、文件上传、文件下载、文件管理平台联动、复杂权限配置、阶段推进或资料齐套率计算
- **AND** 页面不得直接调用日志写入接口或展示日志配置入口
- **AND** `project.created` 创建日志由后端 `POST /api/projects` 创建事务负责，前端不得绕过项目创建接口单独写日志

### Requirement: 项目详情页

前端 MUST 提供项目详情页，并 MUST 调用 `GET /api/projects/:projectId` 获取项目基础状态和创建人追溯字段，同时 MUST 展示该项目的阶段资料清单基础信息、`completionMode`、派生完成状态、状态追溯字段、适用性、责任人、附件区域、资料操作、阶段资料齐套摘要、当前阶段推进入口和只读业务日志区域。

#### Scenario: 展示项目基础信息
- **WHEN** 项目详情接口返回项目数据
- **THEN** 页面必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段
- **AND** 当 `projectCode` 为空时 MUST 显示 `待生成` 或等价文案

#### Scenario: 展示阶段资料清单
- **WHEN** 用户打开项目详情页
- **THEN** 页面必须展示“阶段资料清单”区域，并按阶段展示资料项名称、是否必填、默认责任部门或责任角色、提交方式、基础状态、`completionMode`、派生完成状态、状态追溯字段、适用性、适用性追溯字段、责任人、责任人变更追溯字段、阶段资料附件区域和阶段资料齐套摘要

#### Scenario: 展示资料项派生完成状态
- **WHEN** 页面展示资料项状态
- **THEN** 页面 MUST 优先使用后端返回的 `completionStatus`、`isComplete` 或等价派生字段展示业务完成状态
- **AND** 页面 MUST NOT 仅凭基础 `status = submitted` 将所有资料显示为待审核

#### Scenario: submit_only submitted 展示已完成
- **WHEN** 资料项 `completionMode = submit_only` 且基础状态为 `submitted`
- **THEN** 页面 MUST 展示为已完成或等价完成状态
- **AND** 页面 MUST NOT 展示为待审核

#### Scenario: approval_required submitted 展示待审核
- **WHEN** 资料项 `completionMode = approval_required` 且基础状态为 `submitted`
- **THEN** 页面 MUST 展示为待审核或等价状态

### Requirement: Demo 使用边界

前端实现 MUST 只把现有 Demo 作为页面参考，不能使用 Demo 静态数据作为正式项目核心数据来源。

#### Scenario: 页面参考 Demo

- **WHEN** 团队实现项目列表、新建项目和项目详情页面
- **THEN** 可以参考 Demo 的布局、视觉样式和交互形态

#### Scenario: 禁止使用 Demo 静态数据

- **WHEN** 页面需要展示项目、阶段或创建结果
- **THEN** 页面必须使用 `digital-platform-api` 返回的数据，不能使用 Demo 静态项目数据作为正式数据来源

### Requirement: 项目详情页资料手工状态操作

项目详情页 MUST 按资料项 `completionMode` 展示提交、确认和退回操作，并 MUST 使用后端返回的派生完成状态、返工标记、可选返工候选刷新资料列表、齐套摘要和缺失资料列表。

#### Scenario: submit_only 不展示确认退回
- **WHEN** 页面展示 `completionMode = submit_only` 的资料项
- **THEN** 页面 MUST 将主操作表达为提交、上传或完成
- **AND** 页面 MUST NOT 展示确认、审核通过或退回操作作为主流程入口

#### Scenario: approval_required submitted 展示确认退回
- **WHEN** 页面展示 `completionMode = approval_required` 且基础状态为 `submitted` 的资料项
- **AND** `revision_required` 不是 true，或后端已明确该资料是返工重提后的审核待办
- **THEN** 页面可以按当前用户资料级审核权限展示确认/审核通过和退回操作
- **AND** 页面 MUST 表达该操作对象是单个资料项

#### Scenario: A 类退回展示固定候选多选
- **WHEN** 用户退回 A 类审批资料
- **THEN** 页面 MUST 展示后端返回的固定返工候选多选控件，并将选择结果提交为 `revisionTargetDocumentIds`
- **AND** 候选展示 MUST 包含资料编号、资料名称、责任人、当前状态、完成规则和是否适用
- **AND** 页面 MUST NOT 使用 `designChangeTargetDocumentIds` 提交 A 类返工候选

#### Scenario: A 类未选择候选不能提交
- **WHEN** 用户退回 A 类审批资料但未选择任何返工候选
- **THEN** 页面 MUST 阻止提交退回
- **AND** 页面 MUST 提示至少选择 1 个返工资料

#### Scenario: B 类只展示退回原因
- **WHEN** 用户退回 B 类或其他没有明确上游候选的普通审批资料
- **THEN** 页面 MUST 只展示退回原因输入
- **AND** 页面 MUST NOT 展示上游返工候选选择器

#### Scenario: C 类展示设计变更触发选项
- **WHEN** 用户退回 `5.12 安装调试记录（厂内）`
- **THEN** 页面 MUST 允许用户勾选 `5.13-5.16` 设计变更触发项，并将选择结果提交为 `designChangeTargetDocumentIds`
- **AND** 页面 MUST 表达被勾选资料会被设置为适用且需返工
- **AND** 页面 MUST NOT 使用 `revisionTargetDocumentIds` 提交 C 类设计变更触发项

#### Scenario: C 类未选择设计变更项不能提交
- **WHEN** 用户退回 `5.12 安装调试记录（厂内）`
- **AND** 未选择任何 `5.13-5.16` 设计变更触发项
- **THEN** 页面 MUST 阻止提交退回
- **AND** 页面 MUST 提示至少选择 1 个设计变更资料

#### Scenario: 操作后刷新派生摘要
- **WHEN** 用户完成资料提交、确认、退回或返工完成操作
- **THEN** 页面必须重新获取或刷新后端返回的 `completionMode` 派生完成状态、返工标记、阶段齐套摘要和缺失资料列表

### Requirement: 项目详情页资料状态追溯展示

前端 MUST 展示阶段资料清单接口返回的提交、确认、退回、适用性和责任人变更追溯字段。

#### Scenario: 展示提交追溯

- **WHEN** 资料项包含 `submittedByUserId` 或 `submittedAt`
- **THEN** 页面必须展示提交人字段或提交时间字段的可读信息

#### Scenario: 展示确认追溯

- **WHEN** 资料项包含 `confirmedByUserId` 或 `confirmedAt`
- **THEN** 页面必须展示确认人字段或确认时间字段的可读信息

#### Scenario: 展示退回追溯

- **WHEN** 资料项包含 `returnedByUserId`、`returnedAt` 或 `returnReason`
- **THEN** 页面必须展示退回人字段、退回时间字段或退回原因的可读信息

#### Scenario: 展示不适用追溯

- **WHEN** 资料项包含 `notApplicableByUserId`、`notApplicableAt` 或 `notApplicableReason`
- **THEN** 页面必须展示标记不适用人字段、标记不适用时间字段或不适用原因的可读信息

#### Scenario: 展示恢复适用追溯

- **WHEN** 资料项包含 `restoredApplicableByUserId` 或 `restoredApplicableAt`
- **THEN** 页面必须展示恢复适用人字段或恢复适用时间字段的可读信息

#### Scenario: 展示责任人变更追溯

- **WHEN** 资料项包含 `responsibilityUpdatedByUserId` 或 `responsibilityUpdatedAt`
- **THEN** 页面必须展示责任人最近一次变更人字段或变更时间字段的可读信息

#### Scenario: 追溯字段为空

- **WHEN** 资料项追溯字段为空
- **THEN** 页面必须允许字段为空，并不得因此阻止阶段资料清单展示

### Requirement: 项目详情页阶段资料齐套展示

项目详情页 MUST 按当前 20260625 `completionMode` 与 `revision_required` 派生完成口径展示阶段资料齐套情况，不得把“已确认资料数”作为唯一完成口径，也不得隐藏需返工资料对推进门禁的影响。

#### Scenario: 展示已完成资料数
- **WHEN** 页面展示阶段齐套摘要
- **THEN** 页面 MUST 展示已完成资料数、适用资料总数、未完成资料数和完成比例
- **AND** 已完成资料数 MUST 使用后端 `completedRequiredCount` 或等价 `completionMode` 与 `revision_required` 派生完成数量

#### Scenario: 兼容 confirmedRequiredCount
- **WHEN** 后端为兼容旧前端返回 `confirmedRequiredCount`
- **THEN** 页面只可将其作为派生完成数量的兼容字段使用
- **AND** 页面 MUST NOT 将其解释为仅 `status = confirmed` 的资料数量

#### Scenario: 缺失列表展示返工信息
- **WHEN** 页面展示缺失或未完成资料列表
- **THEN** 每项 MUST 展示或可查看 `documentCode`、`documentName`、基础 `status`、`completionMode`、派生完成状态和返工标记
- **AND** 对 `revision_required = true` 的资料 MUST 显示需返工原因或可查看来源审批资料

#### Scenario: 需返工阻塞推进
- **WHEN** 当前阶段存在 `revision_required = true` 的适用资料
- **THEN** 页面 MUST 将其展示为门禁未完成原因
- **AND** 页面 MUST NOT 因资料基础状态为 `submitted` 或 `confirmed` 将其显示为可推进

### Requirement: 项目详情页资料适用性操作与展示

前端 MUST 在项目详情页阶段资料清单中展示资料项适用性、不适用原因和适用性追溯字段，并 MUST 提供手工标记不适用和恢复适用操作。

#### Scenario: 展示资料项适用性

- **WHEN** 阶段资料清单接口返回资料项 `isApplicable`
- **THEN** 页面必须展示该资料项为“适用”或“不适用”

#### Scenario: 展示不适用原因和追溯

- **WHEN** 资料项包含 `notApplicableReason`、`notApplicableByUserId`、`notApplicableAt`、`restoredApplicableByUserId` 或 `restoredApplicableAt`
- **THEN** 页面必须展示不适用原因、标记不适用追溯字段或恢复适用追溯字段的可读信息

#### Scenario: 提供标记不适用操作

- **WHEN** 页面展示适用资料项
- **THEN** 页面必须提供不适用原因输入和“标记不适用”操作，并在触发时携带当前登录态和非空原因调用资料项标记不适用接口

#### Scenario: 前端校验不适用原因

- **WHEN** 用户未填写非空不适用原因就触发标记不适用操作
- **THEN** 页面必须展示校验提示，且不得调用标记不适用接口

#### Scenario: 提供恢复适用操作

- **WHEN** 页面展示不适用资料项
- **THEN** 页面必须提供“恢复适用”操作，并在触发时携带当前登录态调用资料项恢复适用接口

#### Scenario: 不适用资料不提供状态操作

- **WHEN** 页面展示不适用资料项
- **THEN** 页面不得提供标记提交、确认或退回操作

#### Scenario: 适用性操作成功后刷新清单和摘要

- **WHEN** 资料项适用性操作成功
- **THEN** 页面必须重新加载该项目阶段资料清单，并展示更新后的适用性、适用性追溯字段、阶段齐套摘要和缺失必填资料列表

#### Scenario: 适用性操作失败提示

- **WHEN** 资料项适用性操作失败
- **THEN** 页面必须展示可读错误提示，并保留当前页面上下文

#### Scenario: 展示不适用边界说明

- **WHEN** 用户打开项目详情页阶段资料清单
- **THEN** 页面必须展示可读说明，明确“不适用”是人工业务判断，用于说明该项目不需要该资料，不代表资料已提交、已确认或已归档

### Requirement: 项目详情页手工阶段推进

前端 MUST 在项目详情页提供当前阶段的手工推进入口，并 MUST 展示阶段推进所需的当前阶段适用资料按 `completionMode` 派生的完成情况。

#### Scenario: 展示当前阶段推进说明
- **WHEN** 项目详情页加载成功且项目存在当前阶段
- **THEN** 页面必须展示“手工推进阶段”相关入口或说明，并明确阶段推进基于当前阶段适用资料的 `completionMode` 完成情况

#### Scenario: 阶段推进不展示泛化审批门禁
- **WHEN** 页面展示阶段推进入口或不可推进原因
- **THEN** 页面 MUST NOT 表达为阶段推进还需要泛化阶段关口审批通过
- **AND** 页面 MUST NOT 要求所有资料均为 `confirmed`

#### Scenario: 阶段推进失败展示原因
- **WHEN** 阶段推进接口返回缺失适用资料或其他可读错误
- **THEN** 页面必须展示后端返回的不可推进原因，并显示包含 `completionMode` 和派生完成状态的缺失资料

### Requirement: 项目详情页业务日志展示

前端 MUST 在项目详情页提供只读“业务日志”区域，用于展示该项目最近的业务操作日志。

#### Scenario: 查询项目业务日志

- **WHEN** 用户打开项目详情页
- **THEN** 前端必须调用 `GET /api/projects/:projectId/operation-logs` 查询该项目业务日志

#### Scenario: 展示业务日志字段

- **WHEN** 业务日志接口返回日志列表
- **THEN** 页面必须展示日志时间、操作人字段、`actionType` 或中文摘要、`summary`

#### Scenario: 业务日志加载状态

- **WHEN** 前端查询项目业务日志
- **THEN** 页面必须处理加载中、接口失败和空日志状态

#### Scenario: 业务日志只读

- **WHEN** 用户查看项目详情页业务日志区域
- **THEN** 页面不得提供日志新增、编辑、删除、筛选导出、复杂分页、权限配置、通知、个人待办或责任人分配入口

### Requirement: 用户管理页面

前端 MUST 提供第一版基础用户管理页面，并 MUST 只允许平台管理员进入或操作。

#### Scenario: 平台管理员看到用户管理入口

- **WHEN** 当前登录用户 `isPlatformAdmin = true`
- **THEN** 前端必须展示用户管理入口

#### Scenario: 非管理员不展示入口

- **WHEN** 当前登录用户 `isPlatformAdmin` 不为 `true`
- **THEN** 前端不得展示用户管理入口，或在直接访问用户管理页面时展示无权限提示

#### Scenario: 加载用户列表

- **WHEN** 平台管理员打开用户管理页面
- **THEN** 前端必须携带当前登录态调用用户列表接口，并展示用户列表

#### Scenario: 展示用户基础字段

- **WHEN** 用户列表接口返回用户数据
- **THEN** 页面必须展示账号、姓名、部门、角色、启用状态、平台管理员标识和可空 `filePlatformUserId`
- **AND** 页面展示姓名时必须使用响应中的 `name`

#### Scenario: 新增用户表单

- **WHEN** 平台管理员在用户管理页面新增用户
- **THEN** 页面必须提供 `account`、`displayName`、`department`、`role`、`password`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId` 输入，并调用新增用户接口
- **AND** 页面必须使用 `displayName` 作为新增用户请求字段

#### Scenario: 编辑用户基础信息

- **WHEN** 平台管理员编辑用户
- **THEN** 页面必须允许编辑 `displayName`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和 `filePlatformUserId`，不得通过普通编辑表单修改 `account` 或 `password`
- **AND** 页面必须使用响应中的 `name` 初始化姓名展示，并使用 `displayName` 作为编辑用户请求字段

#### Scenario: 启用禁用用户

- **WHEN** 平台管理员在用户管理页面启用或禁用用户
- **THEN** 页面必须携带当前登录态调用对应用户管理接口，并在成功后刷新用户列表

#### Scenario: 重置密码

- **WHEN** 平台管理员在用户管理页面重置用户密码
- **THEN** 页面必须通过单独的重置密码操作提交新密码，并不得在页面展示密码哈希或密码内部字段

#### Scenario: 用户管理加载状态

- **WHEN** 前端请求用户管理接口
- **THEN** 页面必须处理加载中、接口失败和空用户列表状态

#### Scenario: 文件平台用户 ID 只展示和编辑

- **WHEN** 页面展示或编辑 `filePlatformUserId`
- **THEN** 页面不得调用文件管理平台校验、同步文件平台用户或判断文件平台权限

#### Scenario: 用户管理页面边界

- **WHEN** 用户查看或操作用户管理页面
- **THEN** 页面不得新增项目成员管理、责任人分配、个人待办、复杂权限矩阵、部门权限继承、审批流、文件平台同步、登录审计、用户管理操作日志、单点登录或批量导入用户入口

### Requirement: 项目详情页资料责任人展示与分配

前端 MUST 在项目详情页阶段资料清单中展示资料项当前责任人，并 MUST 提供手工分配或清空责任人的操作。

#### Scenario: 展示资料项责任人

- **WHEN** 阶段资料清单接口返回资料项 `responsibleUser` 或 `responsibleUserId`
- **THEN** 页面必须在对应资料项中展示当前责任人基础信息；未分配责任人时必须展示未分配的可读状态

#### Scenario: 展示禁用责任人状态

- **WHEN** 阶段资料清单接口返回的 `responsibleUser.isEnabled = false`
- **THEN** 页面必须仍展示该责任人，并以可读方式提示该用户当前已禁用

#### Scenario: 展示责任人变更追溯

- **WHEN** 资料项包含 `responsibilityUpdatedByUserId` 或 `responsibilityUpdatedAt`
- **THEN** 页面必须展示责任人最近一次变更人字段或变更时间字段的可读信息

#### Scenario: 加载责任人候选用户

- **WHEN** 用户打开项目详情页并需要分配资料责任人
- **THEN** 前端必须携带当前登录态调用 `GET /api/users/responsibility-candidates`，并将返回用户用于责任人选择控件

#### Scenario: 候选用户字段使用

- **WHEN** 前端使用 `GET /api/users/responsibility-candidates` 的响应渲染责任人选择控件
- **THEN** 页面只能依赖候选用户的 `id`、`account`、`name`、`department`、`role` 和 `filePlatformUserId` 字段，不得依赖 `isPlatformAdmin` 或 `is_platform_admin`

#### Scenario: 分配资料责任人

- **WHEN** 已登录用户在资料项中选择一个启用用户作为责任人并提交
- **THEN** 前端必须携带当前登录态调用资料项责任人分配接口，并提交所选用户的 `responsibleUserId`

#### Scenario: 清空资料责任人

- **WHEN** 已登录用户在资料项中选择清空责任人并提交
- **THEN** 前端必须携带当前登录态调用资料项责任人分配接口，并提交 `responsibleUserId = null`

#### Scenario: 责任人操作成功后刷新

- **WHEN** 资料项责任人分配或清空操作成功
- **THEN** 页面必须重新加载该项目阶段资料清单和项目业务日志，并展示更新后的责任人、责任人追溯字段和 `document.responsible_changed` 日志

#### Scenario: 责任人操作失败提示

- **WHEN** 资料项责任人分配或清空操作失败
- **THEN** 页面必须展示可读错误提示，并保留当前页面上下文

#### Scenario: 非法责任人 ID 错误提示

- **WHEN** 资料项责任人分配接口返回 `INVALID_RESPONSIBLE_USER_ID`
- **THEN** 页面必须展示可读中文提示，说明责任人参数无效并建议刷新后重试

#### Scenario: 责任人不存在或禁用错误提示

- **WHEN** 资料项责任人分配接口返回 `RESPONSIBLE_USER_NOT_FOUND_OR_DISABLED`
- **THEN** 页面必须展示可读中文提示，说明责任人不存在或已禁用并建议重新选择

#### Scenario: 展示手工分配边界说明

- **WHEN** 用户打开项目详情页阶段资料清单
- **THEN** 页面必须展示可读说明，明确资料责任人是手工分配，不代表权限控制、个人待办或文件权限

#### Scenario: 不提供复杂权限入口

- **WHEN** 用户查看或操作资料项责任人分配
- **THEN** 页面不得提供项目权限、资料权限、文件权限、角色权限矩阵、复杂 RBAC、个人待办、通知、文件平台同步或在线表单入口

### Requirement: 我的资料任务页面

我的资料任务页面 MUST 使用 `completionMode`、`revision_required` 和派生完成状态展示、筛选和排序任务，默认 pending 视图不得混入已完成的 `submit_only + submitted` 资料，但必须包含当前用户负责的需返工资料。

#### Scenario: pending 包含需返工资料
- **WHEN** 用户打开我的资料任务默认 pending 视图
- **THEN** 页面 MUST 展示后端返回的当前用户负责且 `revision_required = true` 的资料任务

#### Scenario: pending 排除已完成 submit_only
- **WHEN** 用户打开我的资料任务默认 pending 视图
- **THEN** 页面 MUST NOT 展示 `completionMode = submit_only`、`status = submitted` 且 `revision_required` 不是 true 的已完成资料作为待办

#### Scenario: 任务状态按 completionMode 和返工标记展示
- **WHEN** 页面展示资料任务
- **THEN** 页面 MUST 优先展示 `revision_required = true` 的任务为需返工
- **AND** `submit_only + submitted` 且无返工 MUST 显示为已完成或已提交完成
- **AND** `approval_required + submitted` 且无返工 MUST 显示为待审核

#### Scenario: 任务字段包含返工信息
- **WHEN** 页面展示资料任务列表
- **THEN** 页面 MUST 展示或可查看 `completionMode`
- **AND** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价字段表达业务完成状态
- **AND** 页面 MUST 展示或可查看返工标记、返工原因和来源审批资料

### Requirement: 项目总览页面

项目总览页面 MUST 使用当前阶段 `completionMode` 派生完成数量展示齐套率、未完成资料和我的待办资料数量，不得继续把“已确认数量”作为唯一完成口径。

#### Scenario: 当前阶段齐套率使用完成数量
- **WHEN** 页面展示项目当前阶段齐套率
- **THEN** 页面 MUST 使用 `completedRequiredCount` 或等价 `completionMode` 派生完成数量计算和展示

#### Scenario: 不以已确认为唯一口径
- **WHEN** 页面展示当前阶段资料完成摘要
- **THEN** 页面 MUST NOT 将“已确认数量”表达为当前流程唯一完成口径
- **AND** 页面 MUST NOT 暗示 `submit_only` 资料必须确认后才完成

#### Scenario: 未完成资料展示 completionMode
- **WHEN** 页面展示当前阶段未完成资料
- **THEN** 页面 MUST 展示或可查看每项资料的 `completionMode` 和派生完成状态

### Requirement: 项目详情页模块化重构保持行为

项目详情页模块化重构后 MUST 保持当前 20260625 `completionMode` 行为，而不是保持旧 confirmed-only 行为；资料项操作 MUST 按 `completionMode` 分流。

#### Scenario: 操作按 completionMode 展示
- **WHEN** 项目详情页完成模块化重构或组件拆分
- **THEN** `submit_only` 资料 MUST 展示提交/上传/完成操作，不展示确认/退回主流程
- **AND** `approval_required` 资料 MUST 保留提交、待审核、确认/审核通过和退回修改操作

#### Scenario: 摘要和缺失列表保持 completionMode
- **WHEN** 模块化后的项目详情页展示阶段摘要或缺失资料
- **THEN** 页面 MUST 继续使用后端返回的 `completionMode` 派生完成状态
- **AND** 页面 MUST NOT 退回到所有资料都需要确认/退回的旧行为

### Requirement: 项目详情页资料附件展示与操作

项目详情页资料附件区域 MUST 继续使用在线平台附件能力，并 MUST 以后端返回的 `completionMode` 与 `revision_required` 派生完成状态判断上传、提交或返工完成后的资料完成表现；附件操作不得表达为文件平台归档完成。

#### Scenario: 上传后完成状态以后端为准
- **WHEN** 用户上传或提交资料附件后页面刷新资料项
- **THEN** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价派生状态展示资料是否完成
- **AND** 页面 MUST NOT 将“附件上传一定不等于资料完成”作为通用规则

#### Scenario: submit_only 返工需要明确完成动作
- **WHEN** `submit_only` 或 `conditional_submit` 资料 `revision_required = true`
- **AND** 用户完成上传或修改
- **THEN** 页面 MUST 提供或引导执行明确返工完成动作
- **AND** 页面 MUST NOT 仅因附件存在就绕过后端返工清除权限

#### Scenario: approval_required 返工不直接清除
- **WHEN** `approval_required` 资料 `revision_required = true`
- **THEN** 页面 MUST 显示“返工重提”或等价入口
- **AND** 页面 MUST NOT 提供绕过审核的清除返工主流程入口

#### Scenario: approval_required 返工重提后展示待审核
- **WHEN** `approval_required` 资料执行返工重提后后端返回 `status = submitted`
- **AND** `revision_required = true`
- **THEN** 页面 MUST 展示该资料为待审核且仍需审核确认清除返工
- **AND** 页面 MUST NOT 将重提动作本身展示为已完成

#### Scenario: 附件不表达文件平台归档
- **WHEN** 页面展示附件列表、上传、下载或删除操作
- **THEN** 页面 MUST NOT 将附件存在、附件上传成功、资料提交成功或返工完成表达为文件平台归档完成

### Requirement: 用户管理组织角色前端
前端 MUST 在用户管理页面展示和维护组织角色、部门和岗位/职务文本，并 MUST 按组织角色约束部门输入。

#### Scenario: 展示组织角色和部门
- **WHEN** 用户管理列表或详情接口返回用户数据
- **THEN** 页面必须展示 `organizationRole`、`department`、`role`、`isEnabled` 和 `isPlatformAdmin`

#### Scenario: 维护组织角色
- **WHEN** 有权用户新增或编辑用户
- **THEN** 页面必须提供 `organizationRole` 选择，并使用总经理、系统管理员、总经理助理、中心负责人、员工的可读文案

#### Scenario: 全局角色部门为空
- **WHEN** 页面选择总经理、系统管理员或总经理助理
- **THEN** 页面必须禁用或清空部门选择，并提示这些角色不隶属于四个业务部门

#### Scenario: 部门内角色必须选择部门
- **WHEN** 页面选择中心负责人或员工
- **THEN** 页面必须要求选择运营中心、营销中心、制造中心或研发中心之一

#### Scenario: 岗位文本单独展示
- **WHEN** 页面展示或编辑用户岗位/职务
- **THEN** 页面必须将现有 `role` 作为岗位/职务文本处理，不得用它替代组织角色

### Requirement: 项目模式和项目经理前端
前端 MUST 在项目创建、编辑、详情、列表和总览中展示项目模式和项目经理用户信息。

#### Scenario: 项目创建选择项目模式
- **WHEN** 用户创建项目
- **THEN** 页面必须提供自研模式和供应链/外包模式选择，并提交 `projectMode`

#### Scenario: 项目创建选择项目经理用户
- **WHEN** 用户创建项目
- **THEN** 页面必须提供项目经理用户选择，并提交 `projectManagerUserId`

#### Scenario: 项目创建选择参与部门
- **WHEN** 用户创建项目
- **THEN** 页面必须使用四个业务部门复选框或多选控件维护参与部门，展示中文部门名，但提交 `operations_center`、`marketing_center`、`manufacturing_center`、`rd_center` 枚举数组

#### Scenario: 项目创建不得提交参与部门自由文本
- **WHEN** 用户创建项目
- **THEN** 页面不得使用自由文本输入“研发中心、制造中心”等中文参与部门文本作为请求体

#### Scenario: 项目编辑以项目经理用户 ID 为准
- **WHEN** 用户编辑项目经理
- **THEN** 页面必须提交 `projectManagerUserId`，不得提交旧 `projectManager` 文本作为权限或保存依据

#### Scenario: 项目经理候选边界提示
- **WHEN** 页面展示项目经理候选用户
- **THEN** 页面必须只展示或提示可选择启用的中心负责人或员工，不得允许选择总经理、系统管理员或总经理助理

#### Scenario: 项目经理非法错误展示
- **WHEN** 后端返回 `INVALID_PROJECT_MANAGER_USER_ID`、`PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED` 或 `PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED`
- **THEN** 页面必须展示可理解的项目经理选择错误，不得把旧 `projectManager` 文本作为回退保存字段

#### Scenario: 参与部门非法错误展示
- **WHEN** 后端返回 `INVALID_PARTICIPATING_DEPARTMENT`
- **THEN** 页面必须展示可理解的参与部门选择错误，并提示只能选择四个业务部门之一

#### Scenario: 项目详情展示项目治理字段
- **WHEN** 项目详情接口返回项目模式和项目经理用户
- **THEN** 页面必须展示项目模式、项目经理、项目经理所属部门和岗位/职务文本

#### Scenario: 旧项目经理文本仅展示兼容
- **WHEN** 项目响应仍包含 `projectManager` 文本
- **THEN** 页面只能将其作为展示兼容字段使用，且应优先展示 `projectManagerUser`；页面不得基于旧文本判断项目经理权限

#### Scenario: 项目总览展示项目治理字段
- **WHEN** 项目总览接口返回项目模式和项目经理用户
- **THEN** 页面必须在项目卡片或列表中展示项目模式和项目经理用户信息

### Requirement: 前端项目可见范围
前端 MUST 以登录态调用项目列表、项目详情和项目总览接口，并 MUST 以接口返回的可见项目作为展示依据。

#### Scenario: 项目列表只展示后端可见项目
- **WHEN** 当前用户打开项目列表页
- **THEN** 页面必须携带登录态调用 `GET /api/projects`，并只展示后端返回的项目，不得在前端拼接或展示无权项目

#### Scenario: 项目详情无权错误展示
- **WHEN** 后端对项目详情返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示无权访问提示，不得继续把该项目当作可操作项目

#### Scenario: 项目总览只展示后端可见项目
- **WHEN** 当前用户打开项目总览页
- **THEN** 页面必须携带登录态调用 `GET /api/projects/overview-dashboard`，并只展示后端返回的项目卡片和汇总指标

### Requirement: 项目详情组织权限入口边界
前端 MUST 根据第一版组织角色和项目身份规划展示项目详情页操作入口，并 MUST 防止总经理助理看到审批、退回、阶段推进和责任人分配入口。

#### Scenario: 总经理助理全局查看
- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面可以展示所有项目、所有流程和所有资料进度的查看入口

#### Scenario: 总经理助理不显示审批入口
- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面不得显示资料确认、资料退回、阶段推进、资料责任人分配、标记不适用或恢复适用入口

#### Scenario: 系统管理员不显示业务操作入口
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 页面不得显示资料确认、资料退回、阶段推进、资料责任人分配、标记不适用或恢复适用入口

#### Scenario: 前端隐藏不是权限边界
- **WHEN** 总经理助理或其他无权用户绕过页面直接调用资料确认、退回、阶段推进、资料责任人分配或清空接口
- **THEN** 后端仍必须拒绝；页面应正确展示 `FORBIDDEN_OPERATION` 或既有统一权限错误码对应的错误信息

#### Scenario: 项目经理查看全量进度
- **WHEN** 当前用户是某项目的项目经理
- **THEN** 项目详情页必须允许其查看该项目全量阶段、资料、齐套摘要、责任人和附件进度

#### Scenario: 项目经理推进入口仍受齐套门禁
- **WHEN** 当前用户是某项目的项目经理且页面显示阶段推进入口
- **THEN** 页面必须继续基于当前阶段适用必填资料齐套摘要提示是否可推进

#### Scenario: 非项目经理不显示阶段推进入口
- **WHEN** 当前用户不是该项目项目经理，也不具备后续允许推进项目的其他身份
- **THEN** 页面不得仅因其是普通员工而显示该项目阶段推进入口

#### Scenario: 普通员工只显示自己负责资料提交入口
- **WHEN** 当前用户 `organizationRole = employee`
- **THEN** 页面只能对 `responsibleUserId = 当前用户 id` 的资料显示提交入口，不得显示确认、退回、责任人分配、标记不适用、恢复适用或阶段推进入口

#### Scenario: 中心负责人只显示本中心相关操作入口
- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 页面只能在本中心相关项目或资料范围内显示确认、退回、责任人分配、标记不适用、恢复适用或阶段推进入口；跨中心项目或资料不得显示这些入口

#### Scenario: 项目经理不自动显示审批入口
- **WHEN** 当前用户仅因项目经理身份打开项目详情页
- **THEN** 页面不得因此自动显示资料确认或退回入口；审批入口应由中心负责人、总经理等审批身份决定

#### Scenario: 项目经理责任人分配入口仅限负责项目
- **WHEN** 当前用户是某项目的项目经理
- **THEN** 页面只能在其负责项目中显示资料责任人分配或调整入口，且候选用户必须符合责任人候选用户规则

### Requirement: 前端资料责任人和项目参与人展示
前端 MUST 继续以资料项责任人展示资料职责，并 MUST 将项目参与人作为资料责任人的派生结果展示或统计。

#### Scenario: 展示资料责任人
- **WHEN** 阶段资料清单返回资料项责任人
- **THEN** 页面必须继续展示资料责任人，不得新增技术负责人维护入口替代资料责任人

#### Scenario: 责任人候选用户排除全局角色
- **WHEN** 页面展示资料责任人候选用户
- **THEN** 页面必须只展示启用的中心负责人或员工，且不得展示总经理、系统管理员、总经理助理、禁用用户、密码字段或非展示必需的平台管理员内部字段

#### Scenario: 展示项目参与人派生说明
- **WHEN** 页面展示项目参与人或项目协作人员
- **THEN** 页面必须说明项目参与人来自该项目中至少负责一项资料的用户

#### Scenario: 不新增项目成员维护入口
- **WHEN** 用户查看项目详情或项目总览
- **THEN** 页面不得在本 change 中新增项目成员表维护入口、技术负责人表维护入口或项目参与人表维护入口

### Requirement: 前端排除能力边界
前端 MUST 在组织角色和项目治理规划中保持现有业务能力边界，不得新增日报周报、文件平台联动或自动通知能力。

#### Scenario: 不新增日报周报入口
- **WHEN** 页面实现组织角色或项目治理字段
- **THEN** 页面不得新增日报、周报、自动生成日报或自动汇总日报入口

#### Scenario: 不新增文件平台联动入口
- **WHEN** 页面实现组织角色或项目治理字段
- **THEN** 页面不得新增文件管理平台同步、文件平台账号管理、文件平台权限判断或文件平台归档入口

#### Scenario: 不新增自动通知入口
- **WHEN** 页面实现项目经理催办或职责边界展示
- **THEN** 页面不得在本 change 中新增自动通知、消息提醒或超期提醒入口

#### Scenario: 不新增复杂权限配置入口
- **WHEN** 页面实现组织角色和项目治理能力
- **THEN** 页面不得新增复杂 RBAC、按钮权限矩阵、部门继承权限或阶段审批流配置入口

### Requirement: 阶段审批流前端展示

当前 20260625 在线平台内部资料闭环中，前端 MUST NOT 将泛化阶段审批状态、阶段审批历史或二级阶段审批进度作为项目详情页当前阶段推进前置展示；资料级 `approval_required` 的审核状态仍 MUST 在资料项上正常展示。

#### Scenario: 不展示泛化阶段审批状态作为推进条件
- **WHEN** 页面展示项目详情、阶段列表或当前阶段推进入口
- **THEN** 页面 MUST NOT 将阶段 `approval_status`、阶段审批状态或阶段关口审批状态展示为当前阶段推进条件
- **AND** 页面 MUST NOT 提示必须先完成泛化阶段审批才能推进

#### Scenario: 不展示阶段审批历史入口
- **WHEN** 页面展示项目详情或阶段区域
- **THEN** 页面 MUST NOT 要求展示阶段关口审批历史入口
- **AND** 页面 MUST NOT 要求展示审批时间、审批人、审批角色、审批动作、审批意见或审批前后状态作为当前流程必备 UI

#### Scenario: 不展示二级阶段审批进度
- **WHEN** 页面展示阶段 `initiation`、`contract` 或 `closeout`
- **THEN** 页面 MUST NOT 展示营销中心负责人、项目经理所属中心负责人或总经理的二级阶段关口审批进度

#### Scenario: 资料级审核状态仍展示
- **WHEN** 页面展示 `completionMode = approval_required` 的资料项
- **THEN** 页面 MUST 继续按资料项显示提交、待审核、审核通过或退回修改等资料级审核状态
- **AND** 页面 MUST NOT 将该资料级审核状态混同为阶段关口审批状态

### Requirement: 阶段审批流前端操作入口

当前 20260625 在线平台内部资料闭环中，前端 MUST NOT 提供泛化阶段审批提交、重新提交、审批通过或审批退回入口；前端只展示资料级 `approval_required` 的提交、审核通过和退回操作，并按 `completionMode` 完成情况与推进权限展示阶段推进入口。

#### Scenario: 不展示提交阶段审批入口
- **WHEN** 页面展示项目详情、阶段区域或当前阶段操作区
- **THEN** 页面 MUST NOT 展示提交阶段审批或重新提交阶段审批入口

#### Scenario: 不展示阶段审批处理入口
- **WHEN** 当前用户是中心负责人、总经理、总经理助理、系统管理员、项目经理或其他用户
- **THEN** 页面 MUST NOT 展示阶段审批通过、阶段审批退回、中心负责人审批通过、中心负责人退回、总经理审批通过或总经理退回入口

#### Scenario: 只展示资料级审核入口
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 当前用户具备该资料项审核权限
- **THEN** 页面可以展示资料项审核通过和退回修改入口
- **AND** 页面 MUST 表达该操作对象是单个资料项

#### Scenario: 阶段推进入口不绑定阶段审批操作
- **WHEN** 当前阶段适用资料已经按 `completionMode` 完成
- **AND** 当前用户具备阶段推进权限
- **THEN** 页面可以展示阶段推进入口
- **AND** 页面 MUST NOT 要求用户先提交或通过泛化阶段审批

### Requirement: 审批状态下的阶段推进前端

前端 MUST 将阶段推进入口绑定当前阶段适用资料按 `completionMode` 派生的完成情况和当前用户可推进身份，并 MUST 不提供跳阶段、回退或自动流转入口。

#### Scenario: 阶段审批未通过不隐藏推进入口
- **WHEN** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 页面 MUST NOT 仅因当前阶段审批状态不是 `approved` 而隐藏可点击的阶段推进入口
- **AND** 页面 MUST NOT 展示“需先完成阶段关口审批”或等价提示

#### Scenario: 阶段推进仍展示资料门禁
- **WHEN** 当前阶段存在适用资料未按 `completionMode` 完成
- **THEN** 页面必须展示后端返回的缺失资料和派生完成状态并禁止推进

#### Scenario: 有权限用户可推进
- **WHEN** 当前用户具备项目经理、中心负责人、管理员或其他规格允许的推进身份
- **AND** 当前阶段适用资料已经按 `completionMode` 完成
- **THEN** 页面可以展示阶段推进入口

#### Scenario: 不新增自动流转入口
- **WHEN** 页面实现阶段推进展示和操作
- **THEN** 页面不得新增自动阶段流转、跳阶段、阶段回退、批量审批、消息通知、日报周报或文件管理平台联动入口

### Requirement: 审批错误提示前端

前端 MUST 为当前在线平台内部资料闭环的资料级审核和阶段推进错误提供可理解中文提示，但 MUST NOT 将泛化阶段审批错误作为阶段推进主路径规则。

#### Scenario: 缺失资料提示
- **WHEN** 后端返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- **THEN** 页面必须提示当前阶段存在未按 `completionMode` 完成的适用资料
- **AND** 页面必须在后端返回缺失列表时展示缺失资料、`completionMode` 和派生完成状态

#### Scenario: 阶段审批未通过旧错误兼容提示
- **WHEN** 后端兼容旧实现返回 `PROJECT_APPROVAL_NOT_APPROVED`
- **THEN** 页面 MAY 展示兼容性提示，说明当前阶段暂不能推进
- **AND** 页面 MUST NOT 将该错误解释为当前 20260625 内部资料闭环必须先通过泛化阶段关口审批
- **AND** 页面 MUST NOT 因该兼容错误在正常 UI 中展示提交阶段审批或阶段审批通过入口

#### Scenario: 资料级审核错误提示保留
- **WHEN** 后端返回资料级审核相关的权限、退回原因或状态错误
- **THEN** 页面 MUST 展示可理解中文提示
- **AND** 页面 MUST 将错误对象表达为资料项审核，而不是阶段关口审批

#### Scenario: 非法项目或阶段参数提示
- **WHEN** 后端返回 `INVALID_PROJECT_ID`、`INVALID_PROJECT_STAGE_ID`、`PROJECT_NOT_FOUND` 或 `PROJECT_STAGE_NOT_FOUND`
- **THEN** 页面必须展示项目或阶段参数无效、项目不存在或阶段不存在的可读提示

### Requirement: 前端项目创建权限入口

前端 MUST 根据当前用户组织角色控制项目创建入口和创建页提交行为，但不得把前端隐藏作为唯一权限边界。

#### Scenario: 有权限用户显示创建项目入口

- **WHEN** 当前用户 `organizationRole = general_manager` 或 `center_manager`
- **THEN** 项目列表页、项目总览页或导航中的创建项目入口可以显示

#### Scenario: 无权限用户不显示创建项目入口

- **WHEN** 当前用户 `organizationRole = employee`、`general_manager_assistant` 或 `system_admin`
- **THEN** 页面不得显示创建项目入口

#### Scenario: 绕过入口访问创建页

- **WHEN** 无创建项目权限的用户直接访问项目创建页
- **THEN** 页面必须显示无权限提示或禁止提交，不得让用户以为可以创建项目

#### Scenario: 创建接口权限错误提示

- **WHEN** `POST /api/projects` 返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示当前账号无权创建项目或无权执行该操作的可理解提示

#### Scenario: 前端隐藏不是权限边界

- **WHEN** 用户绕过页面直接调用 `POST /api/projects`
- **THEN** 后端仍必须按项目核心规格拒绝无权限创建；前端只负责入口隐藏、提交禁用和错误提示

### Requirement: 普通业务页面用户展示格式

前端 MUST 在项目列表、项目详情、项目总览、责任人展示和审批历史等普通业务页面中清晰区分用户姓名、部门、岗位和审批角色，不得把系统组织角色与岗位文本混成一行展示。

#### Scenario: 项目经理展示格式

- **WHEN** 项目详情、项目列表或项目总览展示项目经理用户
- **THEN** 页面必须以姓名作为主文本，并以“部门 · 岗位/职务”作为辅助文本，例如 `研发工程师一（研发中心 · 研发工程师）`

#### Scenario: 创建人展示格式

- **WHEN** 项目详情、项目列表或项目总览展示创建人
- **THEN** 页面必须以姓名作为主文本，并以“部门 · 岗位/职务”作为辅助文本；创建人为空时必须允许展示为空或未记录

#### Scenario: 责任人展示格式

- **WHEN** 阶段资料清单展示资料责任人
- **THEN** 页面必须以姓名作为主文本，并以“部门 · 岗位/职务”作为辅助文本，不得在同一普通标签中追加 `organizationRole`

#### Scenario: 组织角色展示范围

- **WHEN** 页面处于用户管理、权限说明或必要的审批角色上下文之外
- **THEN** 页面不得把 `organizationRole` 与 `role` 一起拼接为普通用户身份展示文本

#### Scenario: 审批历史展示审批角色

- **WHEN** 审批历史展示审批记录
- **THEN** 审批角色可以展示为“项目经理”、“中心负责人”或“总经理”，但审批人普通身份展示仍必须避免重复显示“员工 / 岗位”这种混合文本

### Requirement: 资料级审核与阶段关口审批前端表达

前端 MUST 在项目详情页清晰区分单个资料项的资料级审核和当前阶段推进；当前 20260625 内部资料闭环 MUST NOT 表达为所有资料先全部审核通过再提交泛化阶段关口审批。

#### Scenario: 资料级审核命名
- **WHEN** 页面展示 `approval_required` 资料的提交、确认或退回操作
- **THEN** 页面文案必须表达这是资料项审核，对象是单个资料项

#### Scenario: submit_only 不使用审核文案
- **WHEN** 页面展示 `submit_only` 资料
- **THEN** 页面 MUST 将主操作表达为提交、上传或完成
- **AND** 页面 MUST NOT 展示提交审核、审核通过或退回入口

#### Scenario: 不展示阶段关口审批前置说明
- **WHEN** 页面展示阶段推进入口或不可推进原因
- **THEN** 页面必须说明阶段推进依据为当前阶段适用资料按各自 `completionMode` 完成且用户具备推进权限
- **AND** 页面 MUST NOT 说明阶段推进需要同时满足“资料全部 confirmed”和“阶段关口审批通过”

#### Scenario: 不展示总经理阶段关口审批入口
- **WHEN** 页面展示当前项目详情或阶段操作区
- **THEN** 页面 MUST NOT 展示总经理阶段关口审批入口、中心负责人阶段关口审批入口或二级阶段审批进度
- **AND** 如未来恢复泛化阶段关口审批，MUST 通过独立 change 重新定义前端入口和文案

### Requirement: 我的工作台页面

前端 MUST 将当前“我的资料任务”升级或改名为“我的工作台 / 我的待办”，并 MUST 展示当前用户的资料责任待办、资料审核待办和阶段推进待办；当前 20260625 在线平台内部资料闭环 MUST NOT 展示阶段关口审批待办分类或入口，且 MUST 展示需返工资料待办。

#### Scenario: 工作台展示待办分类
- **WHEN** 工作台接口返回待办数据
- **THEN** 页面必须展示我负责的资料、待我审核的资料和待我推进阶段等分类或筛选
- **AND** 页面 MUST 支持将 `revision_required = true` 的资料责任待办展示为“需返工资料”或等价文案
- **AND** 页面 MUST NOT 展示阶段关口审批待办分类
- **AND** 页面 MUST NOT 展示“待我阶段关口审批”、“待阶段关口审批”或等价筛选/入口

#### Scenario: 审核待办只来自 approval_required
- **WHEN** 工作台展示待审核资料
- **THEN** 普通待审核资料 MUST 只来自 `completionMode = approval_required`、`status = submitted` 且 `revision_required` 不是 true 的资料项
- **AND** `revision_required = true` 的资料必须已返工重提，并由后端作为审核待办返回后，前端才可展示为待审核资料
- **AND** 页面 MUST NOT 将未重新提交的 `revision_required` 资料、`submit_only`、未触发的 `conditional_submit` 或泛化阶段审批事项展示为资料审核待办

#### Scenario: approval_required 返工重提后进入审核视图
- **WHEN** 工作台返回 `completionMode = approval_required`、`revision_required = true`、`status = submitted` 且已返工重提的资料审核待办
- **THEN** 页面 MUST 将其展示为待审核
- **AND** 页面 MUST 表达审核确认后才会恢复完成

#### Scenario: 阶段推进待办按 completionMode 返工门禁和权限
- **WHEN** 工作台展示阶段推进待办
- **THEN** 阶段推进待办 MUST 只按当前阶段适用资料的 `completionMode` 完成情况、`revision_required` 清除情况和当前用户推进权限展示
- **AND** 页面 MUST NOT 因 `approval_status` 生成阶段关口审批待办
- **AND** 页面 MUST NOT 因 `approval_status != approved` 隐藏符合资料完成、返工清除和推进权限条件的阶段推进待办

#### Scenario: 点击返工待办进入资料项
- **WHEN** 用户点击需返工资料待办
- **THEN** 页面 MUST 导航到对应资料项处理位置或受限资料任务视图
- **AND** 页面 MUST NOT 进入阶段关口审批处理页

### Requirement: 普通员工任务视图

前端 MUST 对普通员工提供受限任务视图或受限项目详情，避免其因一个资料任务看到完整项目资料和其他人附件。

#### Scenario: 普通员工从待办进入任务视图

- **WHEN** 普通员工点击自己的资料责任待办
- **THEN** 页面必须进入任务视图或受限项目详情，只展示该用户相关资料任务

#### Scenario: 直接打开详情仍按后端过滤

- **WHEN** 普通员工手动输入项目详情地址
- **THEN** 前端必须以后端资料清单接口返回结果为准展示，不得在前端补全或缓存展示无权资料

#### Scenario: 普通员工不展示无关资料

- **WHEN** 普通员工处于受限任务视图
- **THEN** 页面不得展示其他人负责的资料项

#### Scenario: 普通员工不展示无关附件入口

- **WHEN** 普通员工无权访问某资料项附件
- **THEN** 页面不得展示该资料项附件列表、下载按钮、上传按钮或删除按钮

#### Scenario: 普通员工受限视图不展示整项目审计面板

- **WHEN** 普通员工处于受限任务视图或仅因资料项责任可见项目
- **THEN** 页面不得展示整项目业务日志面板或整项目阶段关口审批历史列表

#### Scenario: 无审计权限不加载审计接口

- **WHEN** 当前用户不具备完整项目审计权限
- **THEN** 页面不得主动调用整项目业务日志接口或阶段关口审批历史接口获取完整项目审计数据

#### Scenario: 项目经理保持完整项目视图

- **WHEN** 当前用户是该项目项目经理
- **THEN** 页面可以展示该项目完整资料清单和附件区域

#### Scenario: 项目经理保持完整审计视图

- **WHEN** 当前用户是该项目项目经理
- **THEN** 页面可以展示该项目完整业务日志和阶段关口审批历史

#### Scenario: 总经理保持完整项目视图

- **WHEN** 当前用户是总经理
- **THEN** 页面可以展示完整项目资料和附件区域

#### Scenario: 总经理保持完整审计视图

- **WHEN** 当前用户是总经理
- **THEN** 页面可以展示完整业务日志和阶段关口审批历史

#### Scenario: 中心负责人视图按中心收敛

- **WHEN** 当前用户是中心负责人
- **THEN** 页面应展示项目基础信息和本中心相关资料，跨中心资料附件入口不得展示

#### Scenario: 前端使用后端权限字段

- **WHEN** 页面渲染资料项操作和附件入口
- **THEN** 页面必须优先使用后端返回的 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument` 或等价权限字段

#### Scenario: 上传按钮只使用上传权限字段

- **WHEN** 页面判断附件上传入口是否展示
- **THEN** 页面必须使用后端返回的 `canUploadAttachment` 或等价上传权限字段，不得用 `canSubmitDocument`、`canSubmitStageDocument`、项目经理身份、中心负责人身份或总经理身份推导上传权限

#### Scenario: 前端不硬猜资料权限

- **WHEN** 页面判断资料项和附件按钮是否展示
- **THEN** 页面不得只根据 `organizationRole` 在前端硬编码最终权限，后端权限结果必须作为最终依据

### Requirement: 附件按钮权限展示

前端 MUST 根据后端权限边界展示附件列表、下载、上传和删除入口，但 MUST NOT 将前端隐藏作为唯一权限边界。

#### Scenario: 有权用户展示附件操作

- **WHEN** 当前用户有权访问资料项附件
- **THEN** 页面可以展示附件列表和相应的上传、下载或删除按钮

#### Scenario: 无权用户隐藏附件操作

- **WHEN** 当前用户无权访问资料项附件
- **THEN** 页面不得展示附件列表、下载按钮、上传按钮或删除按钮

#### Scenario: 附件无权错误提示

- **WHEN** 后端对附件操作返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示可理解的无权访问或无权操作提示

#### Scenario: 前端隐藏不是权限边界

- **WHEN** 用户绕过页面直接调用附件接口
- **THEN** 后端仍必须按资料项级权限拒绝；前端只负责入口隐藏和错误提示

### Requirement: 工作台不新增排除能力

前端工作台 MUST 保持当前能力边界，不得在本 change 中加入文件平台联动、消息推送、日报周报或复杂 RBAC 配置。

#### Scenario: 不新增文件平台联动入口

- **WHEN** 页面展示我的工作台或附件任务
- **THEN** 页面不得新增文件管理平台归档、同步、权限同步或文件平台下载权限入口

#### Scenario: 不新增消息通知入口

- **WHEN** 页面展示工作台待办
- **THEN** 页面不得新增消息推送、自动通知或超期提醒配置入口

#### Scenario: 不新增日报周报入口

- **WHEN** 页面展示我的工作台
- **THEN** 页面不得新增日报、周报或日报周报查看权限入口

#### Scenario: 不新增复杂权限配置入口

- **WHEN** 页面实现工作台和附件权限显示
- **THEN** 页面不得新增复杂 RBAC、按钮权限矩阵或资料权限配置页面

### Requirement: 阶段资料归属中心前端展示

前端 MUST 在项目详情阶段资料清单中展示后端返回的结构化责任中心和审核中心，并 MUST 继续以后端权限字段作为按钮显示依据。

#### Scenario: 展示默认责任中心和审核中心

- **WHEN** 阶段资料清单接口返回 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 页面 MUST 展示对应中文部门名称，并允许字段为空时展示为空或未指定

#### Scenario: 不只展示中文角色字符串

- **WHEN** 页面展示资料项默认责任信息
- **THEN** 页面 MUST 优先展示结构化 `ownerDepartment` / `reviewDepartment`，不得只依赖 `defaultResponsibilityRole` / `confirmRole` 表达资料归属

#### Scenario: 按后端权限字段展示责任人分配入口

- **WHEN** 页面判断是否展示“分配责任人”入口
- **THEN** 页面 MUST 使用后端返回的 `canManageResponsibility` 或等价权限字段，不得只根据 `organizationRole` 在前端硬猜

#### Scenario: 按后端权限字段展示资料审核入口

- **WHEN** 页面判断是否展示资料审核通过或退回入口
- **THEN** 页面 MUST 使用后端返回的 `canReviewDocument` 或等价权限字段，不得只根据 `organizationRole` 在前端硬猜

### Requirement: 工作台保持归属中心权限边界

前端工作台 MUST 保持“我的工作台 / 我的待办”文案，并 MUST 使用后端返回的待办和权限结果展示资料责任与资料审核任务。

#### Scenario: 工作台文案保持

- **WHEN** 用户打开工作台
- **THEN** 页面 MUST 继续展示“我的工作台”或“我的待办”，不得改回“我的资料任务”

#### Scenario: 资料责任待办不扩大

- **WHEN** 工作台返回 `document_responsibility` 待办
- **THEN** 页面 MUST 只展示后端返回的本人负责且需要处理的资料，不得在前端补充本中心未分配资料待办

#### Scenario: 审核待办按后端结果展示

- **WHEN** 工作台返回 `document_review` 待办
- **THEN** 页面 MUST 按后端返回结果展示待审核资料，并使用后端权限字段控制处理入口

#### Scenario: 普通员工受限视图保持

- **WHEN** 普通员工从资料责任待办或项目详情进入受限视图
- **THEN** 页面 MUST 以后端过滤后的资料清单为准，不得展示其他人资料或跨中心附件入口

#### Scenario: 阶段推进入口按归属中心判断本中心项目

- **WHEN** 页面判断中心负责人是否可看到阶段推进入口
- **THEN** 页面 MUST 在资料项存在 `ownerDepartment` 或 `reviewDepartment` 时只按这两个字段判断本中心相关资料
- **AND** 仅当 `ownerDepartment` 和 `reviewDepartment` 都为空时，才 MAY 使用 `responsibleUser.department` 作为旧数据兼容判断

### Requirement: 简单资料闭环前端边界

前端 MUST 将第一版项目详情体验表达为阶段资料收集、按 `completionMode` 提交/审核、在线平台附件保存和阶段推进，不得展示文件平台归档状态，不得把特殊资料项展示为独立复杂流程，也不得把泛化阶段关口审批通过表达为阶段推进前置。

#### Scenario: 项目详情体验边界
- **WHEN** 页面展示项目详情
- **THEN** 页面 MUST 表达当前体验由阶段资料收集、资料提交/审核、在线平台附件保存和阶段推进组成
- **AND** 页面 MUST NOT 将文件平台归档状态展示作为当前体验组成部分

#### Scenario: 不展示文件平台归档状态
- **WHEN** 页面展示阶段资料、附件区域、阶段汇总或项目详情
- **THEN** 页面 MUST NOT 展示 `not_archived`、`archived` 或 `archive_failed`
- **AND** 页面 MUST NOT 展示文件平台文件列表、文件平台下载入口、归档失败重试入口、文件平台目录 ID 或文件平台日志入口

#### Scenario: 特殊资料项按资料项展示
- **WHEN** 页面展示合同审核记录表、采购申请表、采购合同审核记录表、发票或设计变更资料
- **THEN** 页面必须按普通或条件性资料项展示其适用性、责任人、附件、`completionMode` 和资料项状态

#### Scenario: 不展示复杂流程入口
- **WHEN** 页面展示合同审核记录表、采购申请表、采购合同审核记录表、发票或设计变更资料
- **THEN** 页面不得提供合同审批流、采购审批流、付款流、发票流转、发票审批流、设计变更流程引擎或额外流程状态机入口

#### Scenario: 阶段推进说明
- **WHEN** 页面展示阶段推进入口或阶段推进不可用原因
- **THEN** 页面必须说明阶段推进需要当前阶段适用资料按 `completionMode` 完成且用户具备推进权限
- **AND** 页面 MUST NOT 说明阶段推进还需要泛化阶段关口审批通过
- **AND** 页面 MUST NOT 说明阶段推进需要所有资料均为 `confirmed`

### Requirement: 前端项目编号后置展示

前端 MUST 支持项目创建时不填写项目编号，并 MUST 在项目列表、项目详情、搜索结果和待办入口中展示空项目编号的合理占位，且 MUST 在项目详情显示或提供后置填写项目编号入口。

#### Scenario: 新建项目表单不强制项目编号
- **WHEN** 用户创建尚未立项审批通过的新项目
- **THEN** 前端 MUST 不再强制填写项目编号
- **AND** 前端 MUST 明确项目编号将在 `1.2 项目立项审批表` 审核通过并提交或上传 `1.3 项目立项通知` 后生成或填写

#### Scenario: 项目列表展示待生成编号
- **WHEN** 项目列表接口返回 `projectCode` 为空
- **THEN** 前端 MUST 展示 `待生成` 或等价文案，而不是展示空白、`undefined` 或错误状态

#### Scenario: 项目详情显示后置填写入口
- **WHEN** 项目详情接口返回 `projectCode` 为空
- **AND** `1.2 项目立项审批表` 已审核通过
- **AND** `1.3 项目立项通知` 已提交或上传完成
- **AND** 当前用户具备项目维护、项目经理、管理员或等价既有权限边界
- **THEN** 项目详情 MUST 显示或提供后置填写项目编号入口
- **AND** 该入口 MUST 提示非空项目编号必须唯一

#### Scenario: 搜索兼容空项目编号
- **WHEN** 用户在项目列表或工作台按项目名称、客户或其他字段查找项目
- **THEN** 前端 MUST 不因项目编号为空而隐藏项目或阻止进入项目详情

### Requirement: 20260625 阶段资料完成状态展示

前端 MUST 根据后端返回的资料完成规则、基础状态和派生完成状态展示资料处理状态，不得继续把所有资料操作都表达为提交资料审核。

#### Scenario: 展示多种资料状态
- **WHEN** 前端展示阶段资料列表
- **THEN** 页面 MUST 能区分待提交、已完成、待确认/审批、已确认/审批通过、已退回修改、条件未触发和不适用等状态

#### Scenario: submit_only 资料不使用审核文案
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 前端 MUST 将主要操作表达为提交、上传或标记完成
- **AND** 前端 MUST NOT 将该资料项的主要按钮统一命名为 `提交资料审核`

#### Scenario: approval_required submitted 展示待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 基础状态为 `submitted`
- **THEN** 前端 MUST 展示待确认/审批或待审核状态

#### Scenario: 条件资料展示触发状态
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 前端 MUST 展示条件未触发或不适用状态
- **AND** 前端 MUST 明确该资料当前不计入缺失

#### Scenario: 条件资料触发后展示提交完成状态
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = true`
- **THEN** 前端 MUST 按提交或上传后完成展示该资料状态

#### Scenario: 阶段推进说明按完成规则表达
- **WHEN** 前端展示阶段推进入口或不可推进原因
- **THEN** 页面 MUST 说明阶段推进依据为当前阶段适用资料按各自完成规则完成
- **AND** 页面 MUST NOT 表达为资料齐套后还需要额外通过泛化的阶段级审批

### Requirement: 项目详情页 20260625 阶段资料展示

前端 MUST 在项目详情页按后端返回的当前 20260625 阶段资料项动态展示阶段资料清单、`completionMode`、派生完成状态、齐套摘要和未完成资料，不得写死资料名称、资料数量或旧模板版本。

#### Scenario: 展示当前资料项
- **WHEN** 阶段资料清单接口返回当前 20260625 资料项
- **THEN** 项目详情页必须按接口返回的阶段分组、资料项名称、是否必填、提交方式、责任中心、审核中心、责任角色、状态、`completionMode`、派生完成状态、适用性、责任人和附件信息展示资料项

#### Scenario: 齐套摘要展示当前资料项
- **WHEN** 阶段资料清单接口返回基于当前 20260625 资料项和 `completionMode` 计算的 `completenessSummary`
- **THEN** 项目详情页必须展示该摘要中的适用资料总数、已完成数量、未完成数量和完成百分比

#### Scenario: 缺失资料展示当前资料项
- **WHEN** `incompleteRequiredDocuments` 返回当前 20260625 未完成资料
- **THEN** 页面必须展示 `documentCode`、`documentName`、`status`、`completionMode` 和派生完成状态

### Requirement: 前端项目编号后置体验

前端 MUST 支持项目创建时不填写项目编号，并 MUST 在列表、详情、搜索结果和工作台中兼容空 `projectCode`。

#### Scenario: 新建项目不强制项目编号
- **WHEN** 用户创建尚未完成立项审批的新项目
- **THEN** 新建项目页面 MUST 不再强制填写项目编号
- **AND** 前端 MUST 允许提交不包含 `projectCode` 的创建请求

#### Scenario: 空项目编号展示待生成
- **WHEN** 项目列表、项目详情、搜索结果或工作台返回 `projectCode` 为空
- **THEN** 前端 MUST 展示 `待生成` 或等价文案
- **AND** 前端 MUST NOT 展示 `undefined`、`null`、空白错误状态或阻止进入项目详情

#### Scenario: 后置填写项目编号入口
- **WHEN** 项目尚未生成正式编号且用户具备维护项目编号权限
- **AND** `1.2 项目立项审批表` 已审核通过
- **AND** `1.3 项目立项通知` 已提交或上传完成
- **THEN** 项目详情 MUST 显示或提供后置填写或更新项目编号入口
- **AND** 该入口 MUST 表达非空项目编号必须唯一

#### Scenario: 搜索筛选兼容空编号
- **WHEN** 用户使用项目列表、搜索或工作台筛选
- **THEN** 前端 MUST NOT 因 `projectCode` 为空隐藏项目或报错

### Requirement: 前端按 completionMode 展示资料操作

前端 MUST 根据后端返回的 `completionMode`、`revision_required` 和派生完成状态展示资料项按钮、状态和文案，不得继续把所有资料统一表达为提交审核。

#### Scenario: 使用派生完成状态
- **WHEN** 阶段资料列表展示资料项
- **THEN** 前端 MUST 使用后端返回的 `completionStatus`、`isComplete` 或等价派生完成状态展示业务完成状态
- **AND** 前端 MUST NOT 仅凭基础 `status = submitted` 将所有资料显示为待审核

#### Scenario: revision_required 优先显示需返工
- **WHEN** 资料项 `revision_required = true`
- **THEN** 前端 MUST 将该资料显示为需返工或等价未完成状态
- **AND** 前端 MUST NOT 将其显示为阶段推进已满足

#### Scenario: submit_only 不展示审核动作
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 前端 MUST NOT 将主操作展示为提交审核
- **AND** 前端 MUST NOT 展示审核通过、退回或审核待办入口

#### Scenario: approval_required 展示审核流程
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 前端 MUST 展示提交、待审核、审核通过和退回修改等状态或操作
- **AND** 退回修改 MUST 按精准返工 A/B/C 规则展示允许的返工选择

#### Scenario: approval_required 返工重提入口
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** `revision_required = true`
- **THEN** 前端 MUST 展示“返工重提”或等价入口
- **AND** 前端 MUST NOT 展示直接清除返工入口

### Requirement: 前端暂停文件平台归档展示

当前阶段前端 MUST 不展示文件平台归档状态、文件平台文件列表、文件平台下载入口或归档重试入口。

#### Scenario: 不展示归档状态
- **WHEN** 前端展示阶段资料附件区域
- **THEN** 前端 MUST NOT 展示 `not_archived`、`archived` 或 `archive_failed` 归档状态

#### Scenario: 不展示文件平台入口
- **WHEN** 前端展示项目详情或阶段资料清单
- **THEN** 前端 MUST NOT 展示文件平台文件列表、文件平台下载入口、文件平台目录 ID 或归档失败重试入口

#### Scenario: 附件仍可在线平台操作
- **WHEN** 用户有权限查看、上传、下载或删除阶段资料附件
- **THEN** 前端 MUST 继续使用在线平台附件接口完成这些操作

### Requirement: 精准退回候选选择器

前端 MUST 在 A 类审批资料退回时展示固定候选选择器，并 MUST 防止用户提交空候选；C 类 `5.12` MUST 使用独立设计变更触发项选择器。

#### Scenario: 候选字段展示
- **WHEN** A 类退回弹窗展示返工候选
- **THEN** 每个候选 MUST 展示资料编号、资料名称、责任人、当前状态、完成规则和是否适用

#### Scenario: 候选范围不自由扩展
- **WHEN** 用户打开 A 类退回弹窗
- **THEN** 页面 MUST 只展示后端返回的固定候选
- **AND** 页面 MUST NOT 提供自由搜索或勾选本阶段全部资料的入口

#### Scenario: 5.12 设计变更触发项选择器
- **WHEN** 用户打开 `5.12` 退回弹窗
- **THEN** 页面 MUST 只展示 `5.13`、`5.14`、`5.15`、`5.16` 作为设计变更触发项
- **AND** 页面 MUST 使用 `designChangeTargetDocumentIds` 提交选择结果
- **AND** 页面 MUST 防止用户选择其他资料

### Requirement: 需返工资料展示

前端 MUST 在项目详情资料卡片、缺失资料列表和工作台中展示需返工资料。

#### Scenario: 资料卡片显示需返工
- **WHEN** 资料项 `revision_required = true`
- **THEN** 资料卡片 MUST 显示“需返工”或等价状态
- **AND** 页面 MUST 展示或可查看返工原因和来源审批资料

#### Scenario: 未分配责任人提示
- **WHEN** 资料项 `revision_required = true` 且没有责任人
- **THEN** 项目详情 MUST 显示“需返工但未分配责任人”或等价提示
- **AND** 页面 MUST 引导项目经理或有权限负责人先分配责任人

### Requirement: 精准返工前端边界

前端 MUST 将精准返工限定为资料级审批 NO 后的资料返工能力。

#### Scenario: 不做推送通知入口
- **WHEN** 前端展示或处理精准返工
- **THEN** 页面 MUST NOT 新增推送通知、站内信、短信或邮件配置入口

#### Scenario: 不展示文件平台返工入口
- **WHEN** 前端展示需返工资料
- **THEN** 页面 MUST NOT 展示文件平台归档状态、文件平台文件列表、folder id 或归档重试入口

#### Scenario: 不解决 1.2 多节点审批
- **WHEN** 前端展示 `1.2 项目立项审批表` 的退回能力
- **THEN** 本 change MUST 只规划审批 NO 后对 `1.1` 的精准返工选择
- **AND** 页面 MUST NOT 因本 change 新增商务评价、技术评价、总经理多节点在线审批流程 UI

