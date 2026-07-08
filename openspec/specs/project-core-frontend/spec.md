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

前端 MUST 提供项目列表页，并 MUST 调用 `GET /api/projects` 获取后端按当前用户查看权限过滤后的正式项目数据和创建人追溯字段。

#### Scenario: 加载项目列表

- **WHEN** 用户打开项目列表页
- **THEN** 前端必须调用 `GET /api/projects` 并展示返回的项目列表

#### Scenario: 管理层项目列表展示全部项目

- **WHEN** 总经理、总经理助理或中心负责人打开项目列表页
- **THEN** 页面 MUST 展示后端返回的全部项目列表

#### Scenario: 创建人项目列表展示自己创建项目

- **WHEN** 项目创建人打开项目列表页
- **THEN** 页面 MUST 展示后端返回的其创建项目

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

前端 MUST 提供新建项目页，并 MUST 携带当前登录态调用 `POST /api/projects` 创建项目；项目创建表单 MUST 只要求项目名称、客户和客户联系方式，项目编号、项目经理、项目模式、参与中心、计划开始时间、计划结束时间和立项日期 MUST NOT 作为创建必填项。

#### Scenario: 提交轻量项目
- **WHEN** 已登录用户填写项目名称、客户和客户联系方式并提交
- **THEN** 前端必须携带当前登录态调用 `POST /api/projects` 创建项目
- **AND** 前端 MUST 允许创建请求不包含 `projectCode` 或 `projectCode` 为空
- **AND** 前端 MUST 允许创建请求不包含项目经理、项目模式、参与中心、计划时间和立项日期

#### Scenario: 提交缺少必填字段
- **WHEN** 用户提交缺少项目名称、客户或客户联系方式的项目
- **THEN** 页面必须展示校验提示，且不得假装创建成功
- **AND** 页面 MUST NOT 因项目编号、项目经理、项目模式、参与中心、计划时间或立项日期为空显示必填校验错误

#### Scenario: 后端返回重复项目编号
- **WHEN** 后置项目编号更新接口返回 `PROJECT_CODE_EXISTS`
- **THEN** 页面必须展示项目编号已存在的提示

#### Scenario: 新建项目不触发排除能力
- **WHEN** 用户创建项目
- **THEN** 页面不得触发在线表单、文件上传、文件下载、文件管理平台联动、复杂权限配置、阶段推进或资料齐套率计算
- **AND** 页面不得直接调用日志写入接口或展示日志配置入口
- **AND** `project.created` 创建日志由后端 `POST /api/projects` 创建事务负责，前端不得绕过项目创建接口单独写日志

### Requirement: 项目详情页

前端 MUST 提供项目详情页，并 MUST 将其组织为项目工作区；页面 MUST 组合调用项目基础状态、阶段节点视图、阶段资料清单、附件、业务日志、总览/齐套和 `1.2` 专用评价/审批等后端接口展示项目体验。`GET /api/projects/:projectId` 只用于获取项目基础状态和创建人追溯字段，不承载阶段资料清单、附件列表/下载、业务日志、齐套摘要全集或 `1.2` 评价/审批全集。

#### Scenario: 展示项目工作区

- **WHEN** 用户打开项目详情页
- **THEN** 页面 MUST 展示项目工作区
- **AND** 页面 MUST 支持通过 8 阶段导航框架和已配置节点切换右侧节点工作区
- **AND** 页面 MUST NOT 因其他阶段节点尚未补齐完整配置而阻塞立项阶段节点展示

#### Scenario: 展示 1.2 评价审批状态

- **WHEN** 用户打开项目立项审批节点
- **THEN** 页面 MUST 展示 `1.2 项目立项审批表` 在线表单状态
- **AND** 页面 MUST 展示营销评价、研发评价和总经理最终审批状态
- **AND** 页面 MUST 展示评价人或审批人、评价文本或审批意见、处理时间
- **AND** 页面 MUST 展示 `1.2` 整体是否最终完成

#### Scenario: 营销研发评价并行展示

- **WHEN** 页面展示 `1.2 项目立项审批表` 评价状态
- **THEN** 营销评价和研发评价 MUST 作为并行评价项展示
- **AND** 营销评价人 MUST 展示为营销中心负责人或对应后端返回用户
- **AND** 研发评价人 MUST 展示为研发中心负责人或对应后端返回用户
- **AND** 页面 MUST NOT 将营销评价或研发评价展示为通过/不通过审批

#### Scenario: 总经理审批等待评价完成

- **WHEN** 营销评价或研发评价任一项尚未完成
- **THEN** 页面 MUST 将总经理审批展示为等待评价完成、不可处理或等价状态
- **AND** 页面 MUST 禁用或隐藏总经理审批按钮

#### Scenario: 1.2 操作入口按后端权限展示

- **WHEN** 页面展示 `1.2 项目立项审批表` 的表单、评价或审批操作
- **THEN** 页面 MUST 只在后端返回当前用户可处理对应动作时展示填写、提交、评价、审批通过或审批不通过入口
- **AND** 页面 MUST NOT 因用户是中心负责人、总经理助理、项目创建人或项目经理且可查看项目而展示无权操作入口

#### Scenario: 1.2 不展示为泛化阶段关口

- **WHEN** 页面展示 `1.2 项目立项审批表` 评价/审批状态
- **THEN** 页面 MUST 将其表达为 `1.2` 专用资料状态
- **AND** 页面 MUST NOT 将其展示为泛化阶段关口审批或二级阶段审批进度

#### Scenario: 总经理不通过后的返工和重填展示

- **WHEN** 总经理审批不通过且后端返回 `1.1` 返工和 `1.2` 需重新填写状态
- **THEN** 页面 MUST 展示 `1.1 项目需求表` 返工阻塞原因
- **AND** 页面 MUST 展示 `1.2 项目立项审批表` 需要原责任人重新填写
- **AND** 页面 MUST NOT 自动清空或替换 `1.2` 原责任人展示

#### Scenario: 1.3 前置门禁展示

- **WHEN** `1.2 项目立项审批表` 尚未由总经理最终审批通过
- **THEN** 页面 MUST 隐藏或禁用 `1.3 项目立项通知` 的填写/提交入口
- **AND** 页面 MUST 展示 `1.2` 未最终通过的阻塞原因

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

前端 MUST 在项目详情页提供当前阶段的手工推进入口，并 MUST 展示阶段推进所需的当前阶段适用资料按 `completionMode`、`revision_required` 和特殊资料派生规则计算的完成情况。

#### Scenario: 1.2 未最终通过时推进不可用

- **WHEN** 第 1 阶段的 `1.2 项目立项审批表` 尚未完成商务评价、技术评价和总经理审批的最终通过
- **THEN** 页面 MUST 按后端门禁结果展示阶段推进不可用
- **AND** 页面 MUST NOT 因 `1.2` 单个节点已通过或资料基础状态为 `confirmed` 就展示可推进

#### Scenario: 1.2 返工未清除时显示阻塞

- **WHEN** `1.2` 退回触发 `1.1 项目需求表` 精准返工且 `revision_required` 未清除
- **THEN** 页面 MUST 将相关返工展示为阶段推进阻塞原因
- **AND** 页面 MUST NOT 将 `1.2` 显示为最终完成

### Requirement: 项目详情页业务日志展示

前端 MUST 在项目详情页提供只读“业务日志”区域，用于展示后端允许当前用户查看的项目最近业务操作日志。

#### Scenario: 查询项目业务日志

- **WHEN** 用户打开项目详情页
- **THEN** 前端必须调用 `GET /api/projects/:projectId/operation-logs` 查询该项目业务日志

#### Scenario: 全量查看角色展示业务日志

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理打开其有业务日志查看权的项目详情
- **THEN** 页面 MUST 展示后端返回的业务日志列表

#### Scenario: 无权日志错误展示

- **WHEN** 后端对业务日志接口返回无权错误
- **THEN** 页面 MUST 展示可读无权提示或隐藏日志内容，不得伪造日志数据

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

项目总览页面 MUST 使用后端按当前用户查看权限返回的项目范围，并 MUST 使用当前阶段 `completionMode` 派生完成数量展示后端返回的齐套率、未完成资料和我的待办资料数量，不得继续把“已确认数量”作为唯一完成口径。

#### Scenario: 总览展示后端可见项目

- **WHEN** 用户打开项目总览页面
- **THEN** 页面 MUST 携带登录态调用 `GET /api/projects/overview-dashboard`
- **AND** 页面 MUST 只展示后端返回的项目卡片和汇总指标

#### Scenario: 管理层总览展示全部项目

- **WHEN** 总经理、总经理助理或中心负责人打开项目总览页面
- **THEN** 页面 MUST 展示后端返回的全部项目总览数据

#### Scenario: 创建人总览展示自己创建项目

- **WHEN** 项目创建人打开项目总览页面
- **THEN** 页面 MUST 展示后端返回的其创建项目总览数据

#### Scenario: 当前阶段齐套率使用完成数量

- **WHEN** 后端返回项目当前阶段齐套摘要且页面展示项目当前阶段齐套率
- **THEN** 页面 MUST 使用 `completedRequiredCount` 或等价 `completionMode` 派生完成数量计算和展示

#### Scenario: 不以已确认为唯一口径

- **WHEN** 页面展示当前阶段资料完成摘要
- **THEN** 页面 MUST NOT 将“已确认数量”表达为当前流程唯一完成口径
- **AND** 页面 MUST NOT 暗示 `submit_only` 资料必须确认后才完成

#### Scenario: 未完成资料展示 completionMode

- **WHEN** 后端返回当前阶段未完成资料明细且页面展示当前阶段未完成资料
- **THEN** 页面 MUST 展示或可查看每项资料的 `completionMode` 和派生完成状态

#### Scenario: 普通员工受限总览不展示完整齐套明细

- **WHEN** 普通员工仅因资料责任关系看到项目总览卡片
- **THEN** 页面 MUST 只展示后端返回的项目基础卡片、个人待办数和可见资料明细
- **AND** 页面 MUST NOT 补齐或伪造完整当前阶段齐套摘要
- **AND** 页面 MUST NOT 展示后端未返回的其他资料编号、名称、状态或 `completionMode`
- **AND** 当后端未返回齐套摘要时，页面应显示“暂无可查看齐套明细”或等价文案

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

项目详情页资料附件区域 MUST 继续使用在线平台附件能力，并 MUST 以后端返回的 `completionMode`、`revision_required` 和附件权限字段展示附件列表、下载、上传和删除入口；附件操作不得表达为文件平台归档完成。

#### Scenario: 全量查看角色显示附件列表和下载入口

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理查看其可见项目资料项
- **AND** 后端返回 `canViewAttachments` 或 `canDownloadAttachment` 为 true
- **THEN** 页面 MUST 显示附件列表和下载入口

#### Scenario: 上传删除入口仍按后端权限字段

- **WHEN** 页面判断附件上传或删除入口是否展示
- **THEN** 页面 MUST 分别使用后端返回的 `canUploadAttachment` 和 `canDeleteAttachment`
- **AND** 页面 MUST NOT 因用户可查看或下载附件而显示上传或删除入口

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

前端 MUST 在项目详情、列表和总览中兼容展示项目模式和项目经理用户信息；新建项目页 MUST NOT 要求选择项目经理、项目模式或参与部门。第二阶段补录入口不属于本 change 的当前实现范围，必须由后续 change 另行规划。

#### Scenario: 项目创建不选择项目模式
- **WHEN** 用户创建项目
- **THEN** 页面 MUST NOT 将自研模式或供应链/外包模式选择作为创建必填项

#### Scenario: 项目创建不选择项目经理用户
- **WHEN** 用户创建项目
- **THEN** 页面 MUST NOT 将项目经理用户选择作为创建必填项

#### Scenario: 项目创建不选择参与部门
- **WHEN** 用户创建项目
- **THEN** 页面 MUST NOT 将参与部门复选框、多选控件或自由文本作为创建必填项

#### Scenario: 第二阶段补录入口后续实现
- **WHEN** 项目第一阶段完成并进入第二阶段
- **THEN** 页面 MUST NOT 因本 change 要求实现项目经理、项目模式和立项日期补录入口
- **AND** 第二阶段补录入口、权限按钮和校验提示 MUST 通过后续 change 另行规划和实现
- **AND** 页面 MUST NOT 在第一阶段创建时强制用户填写这些字段

#### Scenario: 项目详情展示项目治理字段
- **WHEN** 项目详情接口返回项目模式和项目经理用户
- **THEN** 页面必须展示项目模式、项目经理、项目经理所属部门和岗位/职务文本

#### Scenario: 旧项目经理文本仅展示兼容
- **WHEN** 项目响应仍包含 `projectManager` 文本
- **THEN** 页面只能将其作为展示兼容字段使用，且应优先展示 `projectManagerUser`
- **AND** 页面不得基于旧文本判断项目经理权限

#### Scenario: 项目总览展示项目治理字段
- **WHEN** 项目总览接口返回项目模式和项目经理用户
- **THEN** 页面必须在项目卡片或列表中展示项目模式和项目经理用户信息

### Requirement: 前端项目可见范围

前端 MUST 以登录态调用项目列表、项目详情和项目总览接口，并 MUST 以接口返回的可见项目作为展示依据。

#### Scenario: 项目列表只展示后端可见项目

- **WHEN** 当前用户打开项目列表页
- **THEN** 页面必须携带登录态调用 `GET /api/projects`，并只展示后端返回的项目，不得在前端拼接或展示无权项目

#### Scenario: 管理层可见全部项目

- **WHEN** 当前用户是总经理、总经理助理或中心负责人
- **THEN** 页面 MUST 展示后端返回的全部项目，不得在前端按中心或参与关系二次过滤

#### Scenario: 创建人可见自己创建项目

- **WHEN** 当前用户是项目创建人
- **THEN** 页面 MUST 展示后端返回的其创建项目

#### Scenario: 系统管理员不显示业务项目

- **WHEN** 当前用户仅具备系统管理员身份且后端未返回业务项目
- **THEN** 页面 MUST NOT 因其系统管理员身份在前端补充或显示业务项目

#### Scenario: 项目详情无权错误展示

- **WHEN** 后端对项目详情返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示无权访问提示，不得继续把该项目当作可操作项目

#### Scenario: 项目总览只展示后端可见项目

- **WHEN** 当前用户打开项目总览页
- **THEN** 页面必须携带登录态调用 `GET /api/projects/overview-dashboard`，并只展示后端返回的项目卡片和汇总指标

### Requirement: 项目详情组织权限入口边界

前端 MUST 根据后端权限字段展示项目详情页操作入口；总经理、总经理助理、中心负责人、项目创建人和项目经理的查看能力不得直接推导为审批、退回、阶段推进、责任人分配、适用性管理、项目编号填写或附件上传/删除入口。

#### Scenario: 总经理助理全局查看

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面可以展示所有项目、所有流程和所有资料进度的查看入口

#### Scenario: 中心负责人全局查看

- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 页面可以展示全部项目、完整阶段资料、附件下载和业务日志查看入口
- **AND** 页面 MUST NOT 仅因中心负责人可全局查看而显示跨中心业务操作入口

#### Scenario: 项目创建人查看自己创建项目

- **WHEN** 当前用户是某项目创建人
- **THEN** 页面可以展示该项目完整阶段资料、附件下载和业务日志查看入口
- **AND** 页面 MUST NOT 仅因创建人身份显示资料提交、审核、退回、精准返工、责任人分配、适用性、阶段推进、项目编号填写、附件上传或附件删除入口

#### Scenario: 总经理助理不显示审批入口

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面不得仅因该身份显示资料确认、资料退回、精准返工退回、阶段推进、资料责任人分配、标记不适用、恢复适用、附件上传或附件删除入口

#### Scenario: 系统管理员不显示业务操作入口

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 页面不得显示资料确认、资料退回、精准返工退回、阶段推进、资料责任人分配、标记不适用、恢复适用、附件上传、附件删除或项目编号填写入口，除非后端返回明确业务权限

#### Scenario: 前端隐藏不是权限边界

- **WHEN** 总经理助理或其他无权用户绕过页面直接调用资料确认、退回、精准返工、阶段推进、资料责任人分配、清空、适用性、附件上传、附件删除或项目编号填写接口
- **THEN** 后端仍必须拒绝；页面应正确展示 `FORBIDDEN_OPERATION` 或既有统一权限错误码对应的错误信息

#### Scenario: 项目经理查看全量进度

- **WHEN** 当前用户是某项目的项目经理
- **THEN** 项目详情页必须允许其查看该项目全量阶段、资料、齐套摘要、责任人、附件进度和业务日志

#### Scenario: 项目经理推进入口仍受齐套门禁

- **WHEN** 当前用户是某项目的项目经理且页面显示阶段推进入口
- **THEN** 页面必须继续基于后端返回的当前阶段适用资料齐套摘要、返工门禁和推进权限提示是否可推进

#### Scenario: 非项目经理不显示阶段推进入口

- **WHEN** 当前用户不是该项目项目经理，也不具备后端返回的其他推进权限
- **THEN** 页面不得仅因其可查看项目而显示该项目阶段推进入口

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

前端 MUST 将当前“我的资料任务”升级或改名为“我的工作台 / 我的待办”，并 MUST 展示当前用户的资料责任待办、资料审核待办、`1.2` 专用节点审批待办和阶段推进待办；当前 20260625 在线平台内部资料闭环 MUST NOT 展示泛化阶段关口审批待办分类或入口，且 MUST 展示需返工资料待办。

#### Scenario: 1.2 节点审批待办按后端返回展示

- **WHEN** 工作台接口返回 `1.2` 商务评价、技术评价或总经理审批待办
- **THEN** 页面 MUST 按后端返回的待办类型、节点名称、项目和资料信息展示
- **AND** 页面 MUST 只为后端允许处理的待办展示处理入口

#### Scenario: 1.2 节点审批待办归入资料审核筛选

- **WHEN** 工作台接口返回后端类型为 `initiation_review` 的 `1.2` 节点审批待办
- **THEN** 页面 MUST 将该待办归入“待我审核的资料”筛选和统计
- **AND** 页面 MUST NOT 单独展示“待我审批 1.2”筛选项或独立分类
- **AND** 页面 MUST 继续展示 `1.2 项目立项审批表` 资料名和商务评价审批、技术评价审批或总经理审批节点名
- **AND** 页面 MUST NOT 因前端展示归类改变后端 `initiation_review` 待办类型或专用节点审批权限

#### Scenario: 总经理待办不提前展示

- **WHEN** 商务评价审批或技术评价审批任一节点尚未通过
- **THEN** 页面 MUST NOT 在前端补齐或伪造总经理审批待办
- **AND** 仅当后端在二者均通过后返回总经理待办时，页面才展示该待办

#### Scenario: 不给所有中心负责人补齐 1.2 待办

- **WHEN** 当前用户是中心负责人但后端未返回 `1.2` 节点审批待办
- **THEN** 页面 MUST NOT 在前端根据中心负责人身份补齐或伪造该待办

#### Scenario: 不展示泛化阶段关口审批入口

- **WHEN** 页面展示工作台待办
- **THEN** 页面 MUST NOT 因 `1.2` 多节点审批新增 `stage_gate_approval` 分类或泛化阶段关口审批入口

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

#### Scenario: 中心负责人全量查看但操作按权限收敛

- **WHEN** 当前用户是中心负责人
- **THEN** 页面可以展示全部项目、完整阶段资料、附件下载入口和业务日志
- **AND** 资料提交、审核、退回、精准返工、责任人分配、适用性、附件上传、附件删除、阶段推进和项目编号填写等操作入口仍必须以后端权限字段或本中心业务授权为准
- **AND** 页面 MUST NOT 仅因中心负责人可全量查看项目和资料而展示上述业务操作入口

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

#### Scenario: 有查看权限展示附件列表

- **WHEN** 后端返回 `canViewAttachments = true`
- **THEN** 页面可以展示附件列表

#### Scenario: 有下载权限展示下载按钮

- **WHEN** 后端返回 `canDownloadAttachment = true`
- **THEN** 页面可以展示附件下载按钮

#### Scenario: 上传按钮只使用上传权限字段

- **WHEN** 页面判断附件上传入口是否展示
- **THEN** 页面必须使用后端返回的 `canUploadAttachment` 或等价上传权限字段，不得用项目可见性、完整资料查看权、附件下载权、项目经理身份、中心负责人身份、总经理身份或总经理助理身份推导上传权限

#### Scenario: 删除按钮只使用删除权限字段

- **WHEN** 页面判断附件删除入口是否展示
- **THEN** 页面必须使用后端返回的 `canDeleteAttachment` 或等价删除权限字段，不得用项目可见性、完整资料查看权、附件下载权、项目经理身份、中心负责人身份、总经理身份或总经理助理身份推导删除权限

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

前端 MUST 支持项目创建时不填写项目编号，并 MUST 在项目列表、项目详情、搜索结果和待办入口中展示空项目编号的合理占位，且 MUST 在项目详情显示或提供后置填写项目编号入口；`1.2` 门禁 MUST 使用多节点最终通过状态。

#### Scenario: 新建项目表单不强制项目编号

- **WHEN** 用户创建尚未立项审批通过的新项目
- **THEN** 前端 MUST 不再强制填写项目编号
- **AND** 前端 MUST 明确项目编号将在 `1.2 项目立项审批表` 多节点最终通过并提交或上传 `1.3 项目立项通知` 后生成或填写

#### Scenario: 项目详情显示后置填写入口

- **WHEN** 项目详情接口返回 `projectCode` 为空
- **AND** `1.2 项目立项审批表` 商务评价、技术评价和总经理审批均最终通过
- **AND** `1.3 项目立项通知` 已提交或上传完成
- **AND** `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **AND** `1.2` 不存在待审、退回、未通过或其他专用多节点阻塞状态
- **AND** 当前用户具备项目维护、项目经理或等价业务项目编号维护权限
- **THEN** 项目详情 MUST 显示或提供后置填写项目编号入口
- **AND** 该入口 MUST 提示非空项目编号必须唯一

#### Scenario: 系统管理员不默认显示编号入口

- **WHEN** 当前用户仅具备系统管理员身份
- **AND** 不具备项目维护、项目经理或等价业务项目编号维护权限
- **THEN** 页面 MUST NOT 仅因系统管理员身份显示项目编号填写入口

#### Scenario: 单节点通过不显示编号入口

- **WHEN** `1.2 项目立项审批表` 只有商务评价、技术评价或总经理审批中的单个节点通过
- **THEN** 页面 MUST NOT 因该单节点通过显示项目编号填写入口

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

前端 MUST 支持项目创建时不填写项目编号，并 MUST 在列表、详情、搜索结果和工作台中兼容空 `projectCode`；后置项目编号入口 MUST 以 `1.2` 多节点最终通过作为必要前提。

#### Scenario: 后置填写项目编号入口

- **WHEN** 项目尚未生成正式编号且用户具备维护项目编号权限
- **AND** `1.2 项目立项审批表` 商务评价、技术评价和总经理审批均最终通过
- **AND** `1.3 项目立项通知` 已提交或上传完成
- **AND** `1.1` 不存在由 `1.2` NO 触发且未清除的精准返工
- **AND** `1.2` 不存在待审、退回、未通过或其他专用多节点阻塞状态
- **THEN** 项目详情 MUST 显示或提供后置填写或更新项目编号入口
- **AND** 该入口 MUST 表达非空项目编号必须唯一

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

前端 MUST 将精准返工限定为资料级审批 NO 后的资料返工能力；`1.2` 多节点审批必须由本专用 change 单独规划和实现，不得作为精准返工能力的隐含扩展。

#### Scenario: 不解决 1.2 多节点审批

- **WHEN** 前端展示 `1.2 项目立项审批表` 的退回能力
- **THEN** 精准返工能力本身仍只负责审批 NO 后对 `1.1` 的固定返工目标
- **AND** `1.2` 的商务评价、技术评价、总经理多节点在线审批 MUST 由 `add-initiation-multi-review-flow-v1` 专用规划覆盖

### Requirement: 1.2 项目立项多节点审批前端

前端 MUST 为 `1.2 项目立项审批表` 提供专用多节点审批展示和操作入口，并 MUST 保持查看权限与业务操作权限分离。

#### Scenario: 节点状态完整展示

- **WHEN** 后端返回 `1.2` 多节点审批状态
- **THEN** 页面 MUST 展示商务评价审批、技术评价审批、总经理审批的状态、审批人或角色、意见或退回原因和时间

#### Scenario: 并行和退回状态展示

- **WHEN** 后端返回 `business_review`、`technical_review` 和 `general_review` 状态
- **THEN** 页面 MUST 表达商务评价和技术评价是并行节点
- **AND** 页面 MUST 表达总经理节点依赖商务评价和技术评价都通过
- **AND** 页面 MUST 表达前置节点退回会使总经理节点失效或等待前置重新完成

#### Scenario: 当前用户只处理自己的节点

- **WHEN** 当前用户只对某一个 `1.2` 审批节点有处理权限
- **THEN** 页面 MUST 只展示该节点的通过/退回入口
- **AND** 页面 MUST NOT 展示其他节点的操作入口

#### Scenario: 阶段推进和项目编号提示使用后端门禁

- **WHEN** 后端返回第 1 阶段推进或项目编号填写门禁未满足
- **THEN** 页面 MUST 展示后端返回的 `1.2` 多节点未完成、`1.3` 未提交或精准返工未清除等原因
- **AND** 页面 MUST NOT 在前端自行推断放行

### Requirement: 项目工作区阶段节点导航

前端 MUST 将项目详情重塑为项目工作区，左侧展示 8 阶段导航框架，右侧展示被选中节点的节点工作区。第一版 MUST 完整展示立项阶段节点；其他阶段 MAY 先展示阶段占位、旧资料清单入口或后续配置状态。

#### Scenario: 左侧展示 8 阶段节点导航
- **WHEN** 用户打开项目详情页
- **THEN** 页面 MUST 展示 8 个阶段导航
- **AND** 页面 MUST NOT 将 8 阶段导航框架解释为本 change 必须一次性展示所有阶段的完整蓝色节点

#### Scenario: 右侧展示节点工作区
- **WHEN** 用户选择某个蓝色流程节点
- **THEN** 页面 MUST 在右侧展示节点工作区
- **AND** 节点工作区 MUST 展示节点名称、派生状态、关联产出、责任人、阻塞原因和当前用户可操作按钮

#### Scenario: 节点第一屏不直接编辑表单
- **WHEN** 用户进入节点工作区
- **THEN** 页面 MUST 先展示状态和动作入口
- **AND** 页面 MUST 通过“填写/编辑”或等价按钮进入表单编辑
- **AND** 页面 MUST NOT 将编辑表单直接作为节点第一屏

#### Scenario: 节点状态来自后端派生
- **WHEN** 页面展示蓝色节点状态
- **THEN** 页面 MUST 使用后端返回的关联产出、在线表单、评价/审批和返工状态
- **AND** 页面 MUST NOT 在前端维护一套独立节点完成状态

#### Scenario: 其他阶段可占位或使用旧清单入口
- **WHEN** 页面展示方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段
- **THEN** 页面 MAY 展示阶段占位、旧资料清单入口或后续配置状态
- **AND** 页面 MUST NOT 因其他阶段节点未完整配置而阻塞立项阶段工作区实现
- **AND** 页面 MUST NOT 在本 change 要求其他阶段在线表单入口

### Requirement: 立项阶段节点工作区前端

前端 MUST 在项目工作区中完整展示立项阶段的项目输入、项目市场调研、项目立项审批和项目立项通知节点。

#### Scenario: 展示立项阶段 4 个节点
- **WHEN** 用户展开立项阶段
- **THEN** 页面 MUST 展示项目输入、项目市场调研、项目立项审批和项目立项通知

#### Scenario: 项目市场调研表单入口
- **WHEN** 用户打开项目市场调研节点
- **THEN** 页面 MUST 展示 `1.1 项目需求表` 在线表单产出入口
- **AND** 页面 MUST 根据后端权限字段展示填写、编辑或提交入口

#### Scenario: 项目立项审批表单和评价审批入口
- **WHEN** 用户打开项目立项审批节点
- **THEN** 页面 MUST 展示 `1.2 项目立项审批表` 在线表单产出入口
- **AND** 页面 MUST 展示营销评价、研发评价和总经理最终审批状态
- **AND** 页面 MUST 只在后端返回当前用户可处理对应动作时展示评价或审批入口

#### Scenario: 项目立项通知表单入口
- **WHEN** 用户打开项目立项通知节点
- **THEN** 页面 MUST 展示 `1.3 项目立项通知` 在线表单产出入口
- **AND** 页面 MUST 在 `1.2` 未最终通过时隐藏或禁用填写/提交入口并展示阻塞原因

#### Scenario: 旧资料操作区不诱导立项在线表单产出普通提交
- **WHEN** 页面在旧阶段资料清单或资料卡片操作区展示 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 页面 MUST NOT 展示普通“提交资料”、“返工重提”或“完成返工”按钮作为这些资料的提交入口
- **AND** 页面 MUST 引导用户通过在线表单入口填写、保存或提交
- **AND** 在线表单提交成功后，页面 MUST 使用后端返回的最新权限禁用继续编辑和再次提交入口

#### Scenario: 旧资料操作方法不得调用立项在线表单产出旧接口
- **WHEN** 前端处理 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 的提交或返工操作
- **THEN** 页面 MUST NOT 调用普通资料提交接口
- **AND** 页面 MUST NOT 调用普通返工完成接口
- **AND** 页面 MUST 将提交、重提和返工清除入口指向在线表单

#### Scenario: 工作台文案指向在线表单
- **WHEN** 我的工作台展示 `1.1`、`1.2` 或 `1.3` 的资料责任待办
- **THEN** 待办动作文案 MUST 使用“填写/提交在线表单”、“通过在线表单重提”或“查看在线表单前置状态”等语义
- **AND** 待办动作文案 MUST NOT 使用“提交资料”、“返工重提”或“完成返工”等旧资料状态接口语义

#### Scenario: 1.2 被 1.1 返工阻塞时前端禁用在线表单
- **WHEN** 后端返回 `1.2 项目立项审批表` 在线表单权限
- **AND** `blockingReasons` 表示关联 `1.1 项目需求表` 返工未清除
- **THEN** 页面 MUST 禁用 `1.2` 表单字段、保存草稿按钮和提交表单按钮
- **AND** 页面 MUST 展示后端返回的阻塞原因
- **AND** 页面 MUST NOT 允许用户通过旧资料提交或旧返工完成按钮绕过该阻塞

#### Scenario: 工作台 1.2 评价审批待办反映返工阻塞
- **WHEN** `1.1 项目需求表` 存在由 `1.2` 总经理审批不通过触发且未清除的返工
- **THEN** 我的工作台 MUST NOT 展示可处理的 `1.2` 营销评价、研发评价或总经理最终审批待办
- **AND** 若工作台展示 `1.2` 责任待办，动作文案 MUST 表达为查看在线表单前置状态或等价阻塞语义
- **AND** 工作台 MUST NOT 将该待办展示为可直接提交评价、处理审批或普通提交资料

### Requirement: 项目入口与主导航前端信息架构

前端 MUST 将项目总览作为项目主入口，并 MUST 弱化独立项目列表入口；第一版 `/projects` MUST 进入项目总览或等价项目总览体验，`ProjectListPage.vue` 只保留源码文件且 MUST NOT 作为用户可见产品入口。

#### Scenario: 项目总览作为主入口
- **WHEN** 用户从主导航进入项目模块
- **THEN** 页面 MUST 进入项目总览或等价项目总览体验
- **AND** 页面 MUST 展示用户可见项目、项目状态、当前阶段、齐套或进度信息
- **AND** 页面 MUST 提供新建项目入口

#### Scenario: 主导航不展示独立项目列表入口
- **WHEN** 前端展示主导航
- **THEN** 主导航 MUST NOT 展示独立“项目列表”入口
- **AND** 项目模块入口 MUST 指向项目总览或等价项目总览入口

#### Scenario: projects 路由进入项目总览
- **WHEN** 用户访问 `/projects`
- **THEN** 前端 MUST 进入项目总览或等价项目总览体验
- **AND** 前端 MUST NOT 展示旧项目列表作为 `/projects` 的第一版产品入口

#### Scenario: 不提供可见旧列表路由
- **WHEN** 用户查看可见导航、按钮、链接或页面入口
- **THEN** 前端 MUST NOT 提供独立项目列表入口
- **AND** 前端 MUST NOT 新增 `/projects/list` 或其他可见旧列表路由作为产品入口

#### Scenario: ProjectListPage 仅源码保留
- **WHEN** 第一版实施项目入口调整
- **THEN** 前端 MUST NOT 物理删除 `ProjectListPage.vue`
- **AND** `ProjectListPage.vue` MUST 只作为源码保留或开发回退能力存在
- **AND** `ProjectListPage.vue` MUST NOT 作为用户可见产品入口

#### Scenario: 项目入口文案统一
- **WHEN** 页面展示用户可见的项目入口、返回入口、导航入口或面包屑
- **THEN** 文案 MUST 使用“项目总览”“返回项目总览”或等价项目入口语义
- **AND** 页面 MUST NOT 使用“项目列表”或“返回项目列表”表达项目主入口
- **AND** 该清理范围 MUST 覆盖 `ProjectDetailPage.vue`、`ProjectCreatePage.vue`、`UserManagementPage.vue`、`App.vue` 等现有入口文案

#### Scenario: 从项目总览进入工作区
- **WHEN** 用户在项目总览中点击某个项目
- **THEN** 前端 MUST 进入该项目的项目工作区 `/projects/:id`
- **AND** 前端 MUST NOT 在项目总览页展示单项目 8 阶段内部导航

### Requirement: 项目工作区导航布局前端信息架构

前端 MUST 将项目详情页定位为项目工作区；项目工作区 MUST 左侧展示 8 阶段导航，右侧展示当前阶段内容、蓝色节点和节点产出工作区。

#### Scenario: 项目详情定位为工作区
- **WHEN** 用户打开 `/projects/:id`
- **THEN** 前端 MUST 展示项目工作区
- **AND** 页面 MUST 组合展示项目基础状态、阶段导航、阶段内容和节点产出信息

#### Scenario: 左侧 8 阶段导航
- **WHEN** 用户进入项目工作区
- **THEN** 页面 MUST 在项目工作区左侧展示 8 个阶段导航
- **AND** 该阶段导航 MUST 只作为单项目内部导航
- **AND** 页面 MUST NOT 在项目总览页展示该项目内部阶段导航

#### Scenario: 右侧阶段内容
- **WHEN** 用户选择某个阶段
- **THEN** 页面 MUST 在右侧展示该阶段内容
- **AND** 立项阶段 MUST 完整展示项目输入、项目市场调研、项目立项审批和项目立项通知节点
- **AND** 其他 7 个阶段 MAY 展示占位、旧资料清单入口或“后续配置”状态

#### Scenario: 工作台深链定位项目工作区
- **WHEN** 用户从我的工作台通过 `taskMode`、`documentId`、`stageId` 或 `nodeKey` 深链进入 `/projects/:id`
- **THEN** 前端 MUST 自动选中对应阶段、蓝色节点和产出工作区
- **AND** `taskMode=initiationReview` 且 `documentId` 指向 `1.2 项目立项审批表` 时，前端 MUST 选中包含该 1.2 产出的“项目立项审批”蓝色节点
- **AND** `nodeKey` MUST 被解释为 1.2 营销评价、研发评价或总经理审批节点 key，而不是蓝色节点 key
- **AND** 前端 MUST 展示对应产出工作区和评价/审批面板
- **AND** 前端 MUST NOT 因深链自动打开在线表单

#### Scenario: 工作台资料责任和阶段推进深链定位
- **WHEN** 用户从我的工作台资料责任待办进入项目工作区
- **THEN** 前端 MUST 根据 `documentId` 选中包含该资料产出的蓝色节点
- **AND** `1.1` MUST 定位到项目市场调研，`1.2` MUST 定位到项目立项审批，`1.3` MUST 定位到项目立项通知
- **AND** 对其他 7 个阶段中尚未配置蓝色节点的资料，前端 MUST 根据阶段资料清单定位到该资料所属阶段
- **AND** 前端 MUST NOT 因未找到蓝色节点产出而错误回到默认立项阶段
- **AND** 前端 MUST NOT 因其他阶段资料深链自动打开在线表单
- **WHEN** 用户从阶段推进待办进入项目工作区
- **THEN** 前端 MUST 根据 `stageId` 选中对应阶段
- **AND** 前端 MUST NOT 因深链自动打开在线表单

#### Scenario: 其他阶段不阻塞第一版
- **WHEN** 方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段尚未配置完整蓝色节点
- **THEN** 页面 MUST NOT 因这些阶段未完整配置而阻塞立项阶段工作区展示
- **AND** 页面 MUST NOT 在本 change 要求其他阶段在线表单入口

### Requirement: 蓝色节点与产出工作区入口层级

前端 MUST 将蓝色节点作为阶段内业务语境入口；点击蓝色节点后 MUST 先展示节点关联产出工作区，再由用户通过“填写资料”或等价动作进入在线表单。

#### Scenario: 蓝色节点展示阶段业务语境
- **WHEN** 用户选择某个阶段
- **THEN** 页面 MUST 展示该阶段已配置的蓝色节点
- **AND** 蓝色节点 MUST 表达阶段内业务节点语境

#### Scenario: 点击节点先展示产出
- **WHEN** 用户点击蓝色节点
- **THEN** 页面 MUST 展示该节点关联产出工作区
- **AND** 页面 MUST NOT 直接打开在线表单作为点击节点后的第一屏

#### Scenario: 产出工作区展示内容
- **WHEN** 页面展示节点产出工作区
- **THEN** 页面 MUST 展示产出名称、资料状态、完成状态、责任人、是否可分配责任人、阻塞原因和填写资料或查看在线表单入口
- **AND** 若该产出需要评价或审批，页面 MUST 展示评价或审批入口

#### Scenario: 立项阶段主操作位于节点产出卡片
- **WHEN** 页面展示立项阶段的 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 前端 MUST 将这些产出的主要操作入口放在项目工作区节点产出卡片内
- **AND** `1.1` 和 `1.2` MUST 在节点产出卡片内展示责任人和责任人分配控件
- **AND** 责任人分配控件 MUST 仅在后端返回 `canManageResponsibility=true` 时可用
- **AND** `1.3` MUST NOT 展示单独责任人分配控件，并 MUST 继续表达默认由营销中心负责人处理
- **AND** `1.2` 产出卡片 MUST 展示营销评价、研发评价和总经理审批入口

#### Scenario: 立项阶段旧资料清单降级为辅助展示
- **WHEN** 页面在下方旧资料清单展示 `1.1`、`1.2` 或 `1.3`
- **THEN** 旧资料清单 MUST 仅作为状态和辅助信息展示
- **AND** 旧资料清单 MUST NOT 展示这些资料的责任人分配控件
- **AND** 旧资料清单 MUST NOT 展示普通提交、返工重提、完成返工或评价审批主操作
- **AND** 旧资料清单 SHOULD 提示用户在上方项目工作区处理立项阶段在线表单
- **AND** 该降级 MUST NOT 影响其他 7 个阶段资料清单的原有操作能力

#### Scenario: 旧资料清单入口不改变 SPA 路由
- **WHEN** 用户点击项目工作区内的旧资料清单入口
- **THEN** 前端 MUST 通过页面内滚动定位旧资料清单
- **AND** 前端 MUST NOT 使用 hash href 改变 SPA 路由或进入 not-found 页面

#### Scenario: 产出工作区空态区分
- **WHEN** 当前阶段已配置蓝色节点但用户尚未选择节点
- **THEN** 产出工作区 MUST 提示用户选择蓝色节点
- **WHEN** 当前阶段未配置蓝色节点
- **THEN** 产出工作区 MUST 提示本阶段暂未配置节点，并 MAY 引导用户使用旧资料清单入口

#### Scenario: 在线表单由动作入口打开
- **WHEN** 用户需要填写或查看在线表单
- **THEN** 页面 MUST 通过“填写资料”、“查看在线表单”或等价按钮打开在线表单
- **AND** 页面 MUST 使用后端在线表单接口返回的 permissions 和 blockingReasons 控制可编辑、可提交和阻塞展示

### Requirement: 前端接口复用边界

前端第一版 MUST 复用现有项目和在线表单接口组合项目总览与项目工作区体验，并 MUST NOT 因本 change 要求新增后端接口。

#### Scenario: 复用项目总览接口
- **WHEN** 页面加载项目总览
- **THEN** 前端 MUST 使用 `/api/projects/overview-dashboard` 或等价现有项目总览接口获取项目入口数据

#### Scenario: 复用项目工作区接口
- **WHEN** 页面加载项目工作区
- **THEN** 前端 MUST 复用 `/api/projects/:id`、`/api/projects/:id/workspace` 和 `/api/projects/:id/stage-document-checklist`
- **AND** 前端 MUST NOT 要求本 change 新增项目入口或工作区后端接口

#### Scenario: 复用在线表单接口
- **WHEN** 用户从节点产出工作区打开在线表单
- **THEN** 前端 MUST 使用 `/api/projects/:id/stage-documents/:documentId/online-form`
- **AND** 前端 MUST NOT 为其他 7 个阶段新增在线表单入口要求

### Requirement: 前端统一项目入口与项目工作区体验

前端 MUST 使用一致的项目入口、项目工作区层级、页面头部、面板、按钮、状态、空态和错误提示语义；项目工作区 MUST 将阶段、蓝色节点、节点产出、在线表单/评价审批动作按固定层级展示。旧资料清单 MUST 作为辅助兼容区展示，不得重新成为立项阶段主操作入口。

#### Scenario: 项目总览入口
- **WHEN** 用户从主导航进入项目模块或访问 `/projects`
- **THEN** 前端 MUST 进入项目总览或等价项目总览体验
- **AND** 页面 MUST 继续展示项目摘要、状态、当前阶段、进度或齐套信息和新建项目入口
- **AND** 用户可见入口 MUST NOT 将旧项目列表作为项目主入口

#### Scenario: 项目工作区层级
- **WHEN** 用户进入 `/projects/:id` 项目工作区
- **THEN** 页面 MUST 保留左侧 8 阶段导航
- **AND** 右侧阶段工作区 MUST 按阶段说明、蓝色节点列表、节点产出区、在线表单/评价审批动作区组织
- **AND** 点击蓝色节点 MUST 先展示节点产出区
- **AND** 点击蓝色节点 MUST NOT 自动打开在线表单

#### Scenario: 立项阶段主操作入口
- **WHEN** 页面展示立项阶段 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 前端 MUST 将在线表单、责任人、阻塞原因、评价或审批等主操作放在项目工作区节点产出卡片内
- **AND** 旧资料清单 MUST NOT 重新展示这些资料的普通提交、返工重提、完成返工或责任人分配主操作

#### Scenario: 其他 7 阶段旧清单辅助入口
- **WHEN** 方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段尚未配置完整蓝色节点
- **THEN** 前端 MAY 展示占位、后续配置状态或旧资料清单入口
- **AND** 旧资料清单入口 MUST 作为辅助兼容区保留
- **AND** 前端 MUST NOT 因弱化旧清单而移除其他 7 阶段临时资料操作能力

#### Scenario: 工作台深链定位体验
- **WHEN** 用户从我的工作台通过 `taskMode`、`documentId`、`stageId` 或 `nodeKey` 进入项目工作区
- **THEN** 前端 MUST 保留深链定位到对应阶段、蓝色节点或节点产出区的体验
- **AND** `nodeKey` 用于 `1.2` 营销评价、研发评价或总经理最终审批时，前端 MUST 定位到包含 `1.2` 产出的蓝色节点
- **AND** 深链定位 MUST NOT 自动打开在线表单

#### Scenario: 页面视觉语言统一
- **WHEN** 前端展示项目总览、新建项目、项目工作区、我的工作台或用户管理页面
- **THEN** 页面 MUST 使用一致的主导航、页面头部、返回入口、主按钮、次按钮、状态标签、空态和错误提示语义
- **AND** 页面 MUST NOT 混用“项目列表”作为项目主入口文案

#### Scenario: 桌面和移动布局不重叠
- **WHEN** 用户在桌面或移动 viewport 下使用项目总览、项目工作区或我的工作台
- **THEN** 主导航、阶段导航、蓝色节点、节点产出区、在线表单动作区和旧资料清单辅助区 MUST 不重叠
- **AND** 关键按钮和状态文案 MUST 不溢出其容器

### Requirement: 20260629 流程图前端工作区迁移边界

前端 MUST 将 20260629 自研模式流程图作为后续阶段蓝色节点和产出映射输入，并 MUST 继续保留项目总览作为项目入口、项目工作区作为单项目主操作区、旧资料清单作为其他阶段辅助兼容区。

#### Scenario: 项目总览入口不被流程图更新改变
- **WHEN** 团队评审或规划 20260629 自研模式流程图
- **THEN** 前端 MUST 继续将项目总览作为项目主入口
- **AND** 前端 MUST NOT 因流程图更新恢复独立项目列表作为用户可见主入口

#### Scenario: 项目工作区继续承载阶段节点
- **WHEN** 后续迁移 20260629 后 7 阶段蓝色节点
- **THEN** 前端 MUST 继续使用项目工作区的 8 阶段导航、阶段说明、蓝色节点、节点产出和动作入口层级承载
- **AND** 前端 MUST NOT 新建脱离项目工作区的第二套阶段节点入口

#### Scenario: 前端产出层级表达草稿和成品
- **WHEN** 后续迁移准备技术协议、签订技术协议、准备销售合同、签订销售合同、准备采购合同或签订采购合同节点
- **THEN** 前端 MUST 能在项目工作区中将准备节点的草稿产出候选和签订节点的成品产出分开表达
- **AND** 前端 MUST NOT 长期把准备和签订两个蓝色节点都展示为同一个成品资料项的主操作入口

#### Scenario: 成本估算表允许协作展示
- **WHEN** 前端后续展示方案设计阶段成本估算和价格估算节点
- **THEN** 前端 MAY 将 `成本估算表` 展示为多人或多节点协作同一产出
- **AND** 前端 MUST NOT 将该例外扩展为技术协议、销售合同或采购合同准备/签订节点的通用展示规则

#### Scenario: 后 7 阶段未迁移前保留旧清单辅助区
- **WHEN** 方案设计、合同签订、详细设计、生产制作、预验收、终验收或结题阶段尚未完成蓝色节点迁移
- **THEN** 前端 MUST 继续允许通过占位、后续配置状态或旧资料清单辅助入口处理当前阶段资料
- **AND** 前端 MUST NOT 因流程图更新一次性删除旧资料清单辅助区

#### Scenario: 立项阶段主操作不回退
- **WHEN** 前端展示立项阶段 `1.1 / 1.2 / 1.3`
- **THEN** 前端 MUST 继续将在线表单、责任人、阻塞原因、评价或审批等主操作放在项目工作区节点产出卡片内
- **AND** 前端 MUST NOT 因 20260629 流程图评审恢复这些资料的旧资料清单主操作入口

### Requirement: 20260629 71 项候选不改变前端主操作入口

项目核心前端 MUST 将 20260629 71 项资料清单视为规划候选；前端 MUST 继续以 API 返回的当前项目资料、权限、状态、阻塞原因和工作区节点数据驱动展示。

#### Scenario: 前端不得直接展示新增候选主操作
- **WHEN** 前端渲染项目总览、项目工作区、旧资料清单或我的工作台
- **THEN** 前端 MUST NOT 因本规划 change 直接展示 `投标书`、草稿技术协议、草稿销售合同、生产制作阶段技术协议、草稿采购合同、合格供应商评价表、生产记录表或资料移交清单的主操作入口
- **AND** 前端 MUST 继续以 API 返回的项目级资料项为准

#### Scenario: 旧资料清单仍按当前资料返回
- **WHEN** 用户查看项目工作区的旧资料清单辅助区
- **THEN** 前端 MUST 继续展示后端返回的当前资料项
- **AND** 前端 MUST NOT 在本 change 中基于 71 候选清单本地拼接新增资料、隐藏旧合同审核资料或改变 completionMode 展示

#### Scenario: 工作台不生成候选待办
- **WHEN** 用户查看我的工作台待办
- **THEN** 前端 MUST NOT 因 71 项候选清单生成新增资料填写、评价审批或阶段推进入口
- **AND** 工作台深链 MUST 继续依赖后端返回的真实任务和现有项目资料

#### Scenario: 后续展示需等待独立实现
- **WHEN** 后续独立 change 确认并实现 71 项模板变化
- **THEN** 前端 MAY 根据后端返回的新资料、权限和状态展示入口
- **AND** 前端 MUST NOT 在该实现前把本规划文档当作运行时数据源

#### Scenario: 蓝色模块产出卡片是未来主操作区
- **WHEN** 后续逐阶段迁移 20260629 目标模板和工作区操作
- **THEN** 前端目标主操作区 MUST 为项目工作区上方的蓝色模块产出卡片
- **AND** 产出卡片 MAY 承载通用文件上传、责任人、状态、提交和审核入口
- **AND** 旧资料清单 MUST 作为兼容区保留，直到对应阶段迁移稳定

#### Scenario: 旧资料清单不是长期主入口
- **WHEN** 某阶段的蓝色模块、产出卡片、权限、状态和通用上传/提交/审核入口已完成迁移并验收稳定
- **THEN** 前端 MAY 弱化该阶段旧资料清单入口
- **AND** 前端 MUST NOT 在未完成对应阶段迁移前物理删除旧资料清单兼容区

#### Scenario: 第一版产出卡片默认承载文件上传
- **WHEN** 后续第一版迁移非立项阶段资料到产出卡片
- **THEN** 前端 MUST 默认将其作为文件上传或附件上传资料处理
- **AND** 前端 MUST NOT 因本规划默认新增在线表单、专用审批或复杂流程 UI

### Requirement: 项目工作区蓝色模块产出卡片 shell

项目核心前端 MUST 将项目工作区上方的蓝色模块产出卡片规划为未来主操作入口；本 change 的第一版范围仅为 shell：保留左侧 8 阶段、阶段内蓝色模块、产出卡片入口和状态展示，以及下方旧资料清单兼容区。

#### Scenario: 工作区显示 8 阶段和蓝色模块
- **WHEN** 用户进入项目工作区
- **THEN** 前端 MUST 展示左侧 8 阶段导航
- **AND** 当前阶段区域 MUST 能展示蓝色模块或等价占位

#### Scenario: 蓝色模块下显示产出卡片
- **WHEN** 用户选择某个阶段或蓝色模块
- **THEN** 前端 MUST 能展示该模块下的产出卡片
- **AND** 产出卡片 MUST 能展示资料名称、责任人、状态、阻塞原因以及处理入口

#### Scenario: 产出卡片权限以后端为准
- **WHEN** 前端渲染责任人分配、附件上传、提交、审核或退回入口
- **THEN** 前端 MUST 使用后端返回的权限和状态字段
- **AND** 前端 MUST NOT 本地推断角色权限或资料可操作性

#### Scenario: 非立项处理入口定位旧资料清单
- **WHEN** 用户在 shell 第一版查看非立项阶段产出卡片
- **THEN** 前端 MUST 展示可用的处理入口，用于跳转或滚动定位到旧资料清单对应资料
- **AND** 前端 MUST NOT 渲染不可用的假上传、假提交、假审核或假退回按钮
- **AND** 前端 MUST NOT 在本 change 中默认把通用文件上传、提交、审核或退回执行能力从旧资料清单迁移到产出卡片
- **AND** 通用执行能力迁移 MUST 后续按阶段独立实现

#### Scenario: 非立项处理入口不进入错误路由
- **WHEN** 用户点击非立项阶段产出卡片处理入口
- **THEN** 页面 MUST 定位到旧资料清单中的对应资料
- **AND** 当前 SPA route MUST NOT 被改成错误页面、not-found 页面或无效 hash 路由

#### Scenario: 立项在线表单不回退
- **WHEN** 当前产出为 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 前端 MUST 继续展示现有在线表单和 `1.2` 专用评价审批入口
- **AND** 前端 MUST NOT 将这三项改回旧资料清单普通文件上传主入口

#### Scenario: 旧资料清单作为兼容区保留
- **WHEN** 用户查看项目工作区
- **THEN** 下方旧资料清单 MUST 继续作为辅助兼容区可访问
- **AND** 前端 MUST NOT 在第一版大框架中物理删除旧资料清单

#### Scenario: 响应式布局不得重叠
- **WHEN** 用户在桌面或移动 viewport 查看项目工作区
- **THEN** 8 阶段导航、蓝色模块、产出卡片和旧资料清单 MUST 不重叠、不溢出

### Requirement: 产出卡片承载旧资料清单通用操作

项目核心前端 MUST 将项目工作区上方产出卡片作为现有项目资料通用操作的主入口；第一版迁移范围仅覆盖已经存在项目资料绑定的通用能力，并且 MUST 复用后端返回的资料状态、权限、阻塞原因、责任人和附件信息。

#### Scenario: 产出卡片展示现有资料通用内容
- **WHEN** 用户进入项目工作区并选择已绑定现有资料的产出卡片
- **THEN** 产出卡片 MUST 展示资料名称、责任人、资料状态、阻塞原因、权限原因和状态说明
- **AND** 展示内容 MUST 来自同一套后端资料状态，不得创建第二套完成状态

#### Scenario: 产出卡片承载第一批通用操作
- **WHEN** 已绑定现有资料的产出卡片具备对应后端权限
- **THEN** 前端 MUST 能在产出卡片上提供责任人分配/清空、附件列表、附件上传、附件下载、附件删除、提交资料、审核通过、审核退回、返工重提/返工完成、标记不适用和恢复适用入口
- **AND** 每个入口 MUST 使用现有资料接口和后端权限结果

#### Scenario: 无权限操作不显示假按钮
- **WHEN** 后端未返回某个资料操作权限，或产出卡片未绑定现有 documentId 或稳定 documentCode
- **THEN** 前端 MUST NOT 渲染可点击的假上传、假提交、假审核、假退回或假适用性按钮
- **AND** 前端 MAY 展示只读状态、阻塞原因或权限原因

#### Scenario: 立项在线表单不回退
- **WHEN** 当前产出为 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 前端 MUST 继续进入现有在线表单和 `1.2` 专用评价审批能力
- **AND** 前端 MUST NOT 为这些产出新增普通文件上传、普通提交或普通审核入口绕过在线表单

#### Scenario: 下方旧资料清单不再作为主入口
- **WHEN** 上方产出卡片已经承载某项现有资料的通用操作
- **THEN** 前端 MUST 将上方产出卡片作为已迁移资料的唯一主操作入口
- **AND** 下方旧资料清单 MUST 作为兼容或辅助区域展示，不得与上方形成两个并列主入口
- **AND** 下方旧资料清单 MUST NOT 渲染同一资料的主操作按钮
- **AND** 下方旧资料清单只能显示只读状态、兼容提示或返回上方产出卡片的定位入口

#### Scenario: 桌面和移动布局不重叠
- **WHEN** 用户在桌面或移动 viewport 使用项目工作区产出卡片
- **THEN** 责任人、状态、附件列表、操作按钮、阻塞原因和下方兼容区 MUST 不重叠、不溢出
- **AND** 关键操作入口 MUST 在小屏下保持可识别和可点击

### Requirement: 项目工作区卡片覆盖率核查

项目核心前端能力 MUST 支持旧资料清单清理前的 workspace card 覆盖率核查口径；核查结果 MUST 能明确当前运行资料是否已有上方项目工作区产出卡片作为主入口。

#### Scenario: 核查每项运行资料是否有上方卡片
- **WHEN** 团队执行旧资料清单清理前覆盖率核查
- **THEN** 每项当前 64 项运行资料 MUST 标明是否存在对应 workspace output/card
- **AND** 已覆盖资料 MUST 标明其上方卡片是否绑定 documentId 或稳定 documentCode

#### Scenario: 未覆盖资料必须说明原因
- **WHEN** 某项当前运行资料没有有效 workspace card 主入口
- **THEN** 核查结果 MUST 将其标记为 `legacy_only`、`shell_placeholder_only`、`needs_mapping_fix` 或 `needs_business_confirmation`
- **AND** 前端清理建议 MUST NOT 将该资料视为可脱离旧资料清单

#### Scenario: 旧清单清理前不得只看上方 UI
- **WHEN** 上方项目工作区展示某个 shell 产出或候选产出
- **THEN** 只有该产出绑定当前运行资料 documentId 或稳定 documentCode 且可承载主入口时，才能标记为 `covered_by_workspace_card`
- **AND** 仅存在 shell 占位 MUST 标记为 `shell_placeholder_only`

#### Scenario: 本 change 不隐藏旧清单
- **WHEN** 本 change 完成规划或后续核查口径实现
- **THEN** 前端 MUST NOT 因本 change 隐藏、折叠或删除旧资料清单组件
- **AND** 旧资料清单清理 MUST 通过后续独立 change 实施

### Requirement: 覆盖率核查表前端字段

项目核心前端能力 MUST 在覆盖率核查结果中保留足以支持人工验收和清理决策的字段。

#### Scenario: 核查表字段完整
- **WHEN** 生成或维护覆盖率核查表
- **THEN** 每行 MUST 包含 documentCode、documentName、stageOrder 或 stageKey、64模板存在、workspaceCoverageStatus、targetTemplateStatus、workspace卡片状态、操作覆盖、结论和后续动作
- **AND** 71目标存在 MAY 作为 `targetTemplateStatus` 的辅助说明，但 MUST NOT 替代 `targetTemplateStatus`
- **AND** 清理建议 MUST 能基于这些字段判断旧资料清单是否仍需保留主入口

### Requirement: 前端展示旧模板合同审核兼容卡片

项目核心前端 MUST 将 `3.3 合同审核记录表（销售合同）` 和 `5.4 采购合同审核记录表` 的上方 workspace card 作为当前运行资料主操作入口，并 MUST 复用现有产出卡片通用资料操作体验。

#### Scenario: 3.3 上方卡片主入口
- **WHEN** 用户在项目工作区查看合同签订阶段
- **THEN** 前端 MUST 能展示 `3.3 合同审核记录表（销售合同）` 的旧模板兼容产出卡片
- **AND** 该卡片 MUST 展示资料名称、责任人、状态、完成状态、权限原因、阻塞原因和附件摘要
- **AND** 该卡片 MUST 在绑定现有资料后承载责任人分配/清空、附件上传/下载/删除、提交、审核通过、审核退回、返工、不适用和恢复适用等现有通用操作

#### Scenario: 5.4 上方卡片主入口
- **WHEN** 用户在项目工作区查看生产制作阶段
- **THEN** 前端 MUST 能展示 `5.4 采购合同审核记录表` 的旧模板兼容产出卡片
- **AND** 该卡片 MUST 展示资料名称、责任人、状态、完成状态、权限原因、阻塞原因和附件摘要
- **AND** 该卡片 MUST 在绑定现有资料后承载责任人分配/清空、附件上传/下载/删除、提交、审核通过、审核退回、返工、不适用和恢复适用等现有通用操作

#### Scenario: 兼容卡片文案不误导为 71 模板新增
- **WHEN** 前端展示 `3.3` 或 `5.4` 兼容卡片
- **THEN** 卡片名称、节点名称或说明 MUST 表达其为旧模板兼容项或当前运行资料兼容入口
- **AND** 前端 MUST NOT 将其展示为 v20260629 新目标模板新增资料
- **AND** 前端 MUST NOT 因该卡片隐藏、折叠或删除下方旧资料清单

### Requirement: 旧资料清单默认折叠为兼容资料区

项目核心前端 MUST 在当前运行 64 项资料已由上方 workspace card 覆盖后，将项目详情页下方旧资料清单展示为默认折叠的兼容资料区，并 MUST 保持上方项目工作区产出卡片为唯一主操作区。

#### Scenario: 项目详情页默认折叠兼容资料区
- **WHEN** 用户进入项目详情页
- **THEN** 前端 MUST 默认不直接铺开下方旧资料清单
- **AND** 前端 MUST 展示“兼容资料区”或等价旧资料兼容语义标题
- **AND** 前端 MUST 展示摘要说明当前资料已迁移到上方项目工作区处理，本区域仅用于旧模板兼容查看

#### Scenario: 兼容资料区可展开收起
- **WHEN** 用户点击兼容资料区展开或收起按钮
- **THEN** 前端 MUST 切换下方旧资料清单的展开状态
- **AND** 展开后 MUST 继续展示原旧资料清单内容
- **AND** 收起后 MUST 保留兼容资料区标题、摘要和展开入口

#### Scenario: 上方 workspace card 仍是唯一主操作区
- **WHEN** 资料已经由上方 workspace card 覆盖
- **THEN** 前端 MUST 继续将上方产出卡片作为资料主操作入口
- **AND** 前端 MUST NOT 因兼容资料区展开而恢复旧资料清单中的主操作按钮
- **AND** `1.1 / 1.2 / 1.3` 在线表单和 `1.2` 专用评价审批入口 MUST 不受兼容资料区折叠影响

#### Scenario: 兼容资料区折叠时主操作反馈可见
- **WHEN** 用户在上方 workspace card 执行提交、审核、退回、返工、不适用、责任人或附件操作
- **THEN** 前端 MUST 在兼容资料区折叠时仍展示成功或错误反馈
- **AND** 前端 MUST NOT 将主操作反馈只渲染在折叠后的旧资料清单内部

#### Scenario: 兼容定位入口继续可用
- **WHEN** 用户展开兼容资料区查看旧资料清单
- **THEN** 前端 MUST 保留“到上方产出卡片处理”或等价定位入口
- **AND** 定位入口 MUST 继续定位到对应 workspace card
- **AND** 前端 MUST NOT 将定位行为改成错误路由、not-found 页面或无效 hash 路由

#### Scenario: 桌面和移动布局不重叠
- **WHEN** 用户在桌面或移动 viewport 查看项目详情页
- **THEN** 兼容资料区标题、摘要、展开按钮和展开后的旧资料清单 MUST 不重叠、不溢出
- **AND** 按钮文案和状态说明 MUST 在小屏下保持可识别和可点击

### Requirement: 前端按项目实际模板版本展示新旧项目

项目核心前端 MUST 在 v20260629 新项目默认模板启用后，按后端返回的项目实际资料、模板版本、workspace card、权限和状态渲染项目工作区；前端 MUST NOT 本地拼接 71 项模板或迁移旧项目。

#### Scenario: 新项目展示 v20260629 workspace card
- **WHEN** 用户打开按 v20260629 创建的新项目
- **THEN** 前端 MUST 以后端返回的 v20260629 资料、8 阶段、蓝色模块和产出卡片作为项目工作区主操作区
- **AND** 前端 MUST 继续使用后端返回的权限、状态、责任人、附件和阻塞原因控制操作入口

#### Scenario: 旧项目继续展示兼容资料区
- **WHEN** 用户打开仍为 20260625 64 项资料的旧项目
- **THEN** 前端 MUST 继续允许通过 workspace card 和兼容资料区查看旧项目资料
- **AND** 前端 MUST NOT 本地补齐 71 项资料、隐藏旧项目资料或改写旧项目 completionMode 展示

#### Scenario: LC33 LC54 只作为旧项目兼容卡片
- **WHEN** 前端展示 v20260629 新项目
- **THEN** 前端 MUST NOT 展示 `3.3` 或 `5.4` 作为新项目资料
- **AND** `LC33 / LC54` 文案 MUST 继续仅表达旧模板兼容项，不得误导为 71 项新模板资料

#### Scenario: 立项在线表单入口不回退
- **WHEN** 前端展示 v20260629 新项目的 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 前端 MUST 继续展示现有在线表单和 `1.2` 专用评价审批入口
- **AND** 前端 MUST NOT 为这些产出新增普通文件上传、普通提交或普通审核入口绕过在线表单

#### Scenario: 兼容资料区不删除隐藏
- **WHEN** v20260629 新项目默认模板启用
- **THEN** 前端 MUST 继续保留兼容资料区入口
- **AND** 前端 MUST NOT 因模板启用删除、隐藏或物理移除兼容资料区组件

#### Scenario: 兼容资料区文案适配新旧模板
- **WHEN** 前端展示兼容资料区标题、摘要或提示文案
- **THEN** 文案 MUST 适配 20260625 旧项目和 v20260629 新项目
- **AND** 前端 MUST NOT 在 v20260629 新项目中固定展示“当前 64 项资料已迁移”等只适用于旧项目的说明
- **AND** 文案 MUST 表达兼容资料区仅作为旧模板兼容查看入口，而不是新项目资料主操作区

### Requirement: v20260629 新项目页面运行验收

项目核心前端 MUST 支持 v20260629 新项目真实运行基线的页面验收；项目总览、项目详情、项目工作区、产出卡片、兼容资料区和我的工作台 MUST 按后端返回的新旧项目实际资料集合展示。

#### Scenario: 新项目展示 8 阶段和 71 项产出卡片
- **WHEN** 用户打开按 v20260629 创建的新项目详情页
- **THEN** 前端 MUST 展示项目工作区 8 阶段、蓝色模块和 71 项产出卡片
- **AND** 前端 MUST 使用后端返回的资料、权限、状态、责任人、附件和阻塞原因
- **AND** 前端 MUST NOT 本地拼接模板或伪造资料状态

#### Scenario: 新项目不显示旧兼容卡片
- **WHEN** 前端展示 v20260629 新项目 workspace
- **THEN** 前端 MUST NOT 展示 `3.3`、`5.4`、`LC33` 或 `LC54` 作为新项目资料或兼容卡片
- **AND** `LC33 / LC54` 文案 MUST 继续只在旧项目兼容语境出现

#### Scenario: 旧项目仍展示旧兼容卡片
- **WHEN** 用户打开仍为 20260625 64 项资料的旧项目
- **THEN** 前端 MUST 继续允许查看 `LC33 / LC54` 旧模板兼容卡片
- **AND** 前端 MUST NOT 为旧项目本地补齐 71 项资料或隐藏旧项目资料

#### Scenario: 产出卡片复用现有通用操作
- **WHEN** 用户在 v20260629 新项目非立项产出卡片上处理资料
- **THEN** 前端 MUST 继续复用现有责任人分配/清空、附件上传/下载/删除、提交、审核通过、审核退回、返工重提/返工完成、标记不适用和恢复适用入口
- **AND** 每个入口 MUST 使用后端返回的权限和状态
- **AND** 前端 MUST NOT 新增第二套上传、提交、审核、退回、返工或不适用规则

#### Scenario: 立项在线表单不回退
- **WHEN** 前端展示 v20260629 新项目的 `1.1`、`1.2` 或 `1.3`
- **THEN** 前端 MUST 继续展示现有在线表单和 `1.2` 专用评价审批入口
- **AND** 前端 MUST NOT 为这些产出新增普通文件上传、普通提交或普通审核入口绕过在线表单

#### Scenario: 我的工作台展示新项目待办
- **WHEN** 当前用户有 v20260629 新项目资料待办
- **THEN** 我的工作台 MUST 能展示对应待办并允许进入对应项目上下文
- **AND** 前端 MUST NOT 因模板版本为 v20260629 丢失待办或跳转到错误项目上下文

#### Scenario: 兼容资料区文案新旧项目均不误导
- **WHEN** 前端展示 v20260629 新项目或 20260625 旧项目的兼容资料区
- **THEN** 兼容资料区标题、摘要和提示 MUST 不把新项目误描述为 64 项迁移结果
- **AND** 旧项目中兼容资料区 MUST 仍可展开核对
- **AND** 前端 MUST NOT 删除、隐藏或物理移除兼容资料区

#### Scenario: 桌面和移动验收不重叠
- **WHEN** 用户在桌面或移动 viewport 查看 v20260629 新项目工作区、产出卡片、兼容资料区或我的工作台
- **THEN** 阶段导航、蓝色模块、产出卡片、操作按钮、提示信息和兼容资料区 MUST 不重叠、不溢出

### Requirement: 立项阶段责任人与退回路径前端呈现

项目核心前端 MUST 支持立项阶段责任人选择、项目输入展示、在线表单浏览和评价拒绝路径呈现；前端 MUST NOT 将在线表单伪装成真实文件生成或文件平台联动。

#### Scenario: 新建项目选择两个负责人
- **WHEN** 用户打开新建项目页面
- **THEN** 前端 MUST 要求选择商务负责人和技术负责人
- **AND** 商务负责人候选 MUST 来自营销中心启用用户
- **AND** 技术负责人候选 MUST 来自研发中心启用用户

#### Scenario: 项目输入节点展示信息
- **WHEN** 用户在项目详情查看立项阶段项目输入节点
- **THEN** 前端 MUST 展示项目名称、客户名称、客户联系人和电话、商务负责人、技术负责人
- **AND** 前端 MUST NOT 展示生成 Word/PDF 或文件平台文件的承诺

#### Scenario: 在线表单继续作为主入口
- **WHEN** 用户处理 `1.1`、`1.2` 或 `1.3`
- **THEN** 前端 MUST 继续展示在线表单入口
- **AND** `1.2` MUST 继续展示专用评价审批入口
- **AND** 前端 MUST NOT 回退为普通文件上传、普通提交或普通审核入口

#### Scenario: 有权限用户可浏览在线表单内容
- **WHEN** 有权限用户查看已填写的 `1.1`、`1.2` 或 `1.3`
- **THEN** 前端 MUST 支持浏览在线表单内容
- **AND** 浏览内容 MUST NOT 依赖真实 Word/PDF、附件或文件平台文件

#### Scenario: 商务和技术评价拒绝入口
- **WHEN** 营销中心负责人或研发中心负责人处理对应评价审批
- **THEN** 前端 MUST 提供拒绝入口和退回说明
- **AND** 拒绝说明 MUST 表达退回项目市场调研

#### Scenario: 总经理拒绝去向选择
- **WHEN** 总经理处理立项审批并选择拒绝
- **THEN** 前端 MUST 支持选择“退回项目市场调研”
- **AND** 前端 MUST 支持选择“项目结束”
- **AND** 前端 MUST 要求填写或选择项目结束原因
- **AND** 原因为空时 MUST NOT 提交“项目结束”
- **AND** 前端 MUST 清楚提示项目结束会阻止立项通知、方案设计和后续资料推进

#### Scenario: 项目结束状态展示
- **WHEN** 用户查看已结束项目的项目总览或项目详情
- **THEN** 前端 MUST 展示项目已结束状态
- **AND** 前端 MUST 至少展示结束原因摘要
- **AND** 前端 MUST NOT 将立项通知、方案设计、阶段推进或后续资料操作展示为可继续处理入口

#### Scenario: 项目结束待办不可处理
- **WHEN** 项目已结束且存在历史待办或历史资料记录
- **THEN** 前端 MUST NOT 将相关待办展示为可处理待办
- **AND** 前端 MAY 保留历史记录、审批记录和业务日志浏览入口用于审计

### Requirement: 立项在线表单真实模板渲染

项目核心前端 MUST 渲染与真实模板对齐的 `1.1`、`1.2`、`1.3` 在线表单结构，支持分组、评分项、自动带出字段和通知预览；本 change MUST NOT 将在线表单退回为普通上传或真实文件生成。

#### Scenario: 渲染 1.1 分组字段
- **WHEN** 用户打开 `1.1 项目需求表` 在线表单
- **THEN** 前端 MUST 按基础信息、环境要求、场地情况、工件描述、作业工艺、目标分组展示字段
- **AND** 前端 MUST 展示项目名称、客户名称、交流时间、交流次数、交流地点、交流方式、我方人员、甲方人员
- **AND** 前端 MUST 展示工作温度、储存温度、工作湿度、储存湿度、噪音、IP 防护等级、防腐等级、海拔高度、防爆要求
- **AND** 前端 MUST 展示可用场地尺寸、电源、气源、液压源、吊装设备
- **AND** 前端 MUST 展示工件外形尺寸、质量、材质、数量、是否有图纸 / 图纸提供说明
- **AND** 前端 MUST 展示作业工艺做什么、怎么做、是否有工艺文件 / 工艺文件提供说明
- **AND** 前端 MUST 展示自动化环节、节拍、人机交互模式、价格、工期

#### Scenario: 渲染 1.2 评分项
- **WHEN** 商务负责人打开 `1.2 项目立项审批表` 在线表单
- **THEN** 前端 MUST 展示基础信息、商务模块、技术模块和三方意见展示区域
- **AND** 前端 MUST 展示商务 7 项评分和技术 4 项评分
- **AND** 每项评分 MUST 展示条款内容、评价标准、分值 0-5、信息收集说明、责任人
- **AND** 每项评分 MUST 展示 schema 预置的真实模板条款内容和评价标准文本
- **AND** 每项评分 MUST 保留信息收集说明列；模板行内说明为空时也 MUST 显示可填写或待补充的说明字段
- **AND** 前端 MUST 允许商务负责人填写整张表，包括技术模块评分
- **AND** 前端 MUST NOT 为技术负责人新增表单填写任务

#### Scenario: 渲染 1.2 真实评分文本
- **WHEN** 商务负责人查看 `1.2 项目立项审批表` 评分区
- **THEN** 前端 MUST 展示商务模块 `甲方属性`、`甲方企业信息`、`身份角色`、`公司竞争优势`、`商务形式及背调`、`商务关系层级`、`项目情况` 的模板条款内容和评价标准
- **AND** 前端 MUST 展示技术模块 `特殊环境要求`、`行业门槛`、`技术成熟度`、`可借鉴案例` 的模板条款内容和评价标准
- **AND** 前端 MUST NOT 只渲染评分项名称和空白评分表

#### Scenario: 1.2 三方意见来自现有审批节点
- **WHEN** 用户查看 `1.2 项目立项审批表` 的三方意见区域
- **THEN** 前端 MUST 展示现有商务评价、技术评价、总经理审批节点产生的意见或状态
- **AND** 前端 MUST NOT 在普通表单里重复创建另一套商务评价、技术评价、总经理审批流

#### Scenario: 渲染 1.3 通知预览
- **WHEN** 营销中心负责人打开 `1.3 项目立项通知` 在线表单
- **THEN** 前端 MUST 展示固定标题“关于确定项目名称及编号的通知”
- **AND** 前端 MUST 展示固定正文“各部门：”
- **AND** 前端 MUST 展示固定正文“为便于公司项目生产准备、事前申请、费用填报、成本归集、物资采购等工作开展。现将各项目的项目名称、项目编号确定如下：”
- **AND** 前端 MUST 展示固定正文“请各部门严格按照项目名称、项目编号进行生产准备、费用填报、事前申请、成本归集、物资采购等工作。”
- **AND** 前端 MUST 展示包含序号、项目编号、项目名称、客户单位、立项日期的表格预览
- **AND** 前端 MUST 展示“重庆凯尔夫智能测控技术有限责任公司”和日期落款
- **AND** 前端 MUST NOT 提示或承诺生成 docx、Word、PDF 或文件平台文件

### Requirement: 项目编号前置到 1.3 提交前
项目核心前端 MUST 将既有“`1.3` 提交前必须已有项目编号”口径调整为“`1.3` 表单内填写并提交项目编号”。

#### Scenario: 1.3 内填写项目编号
- **WHEN** `1.2` 总经理最终审批通过后用户打开 `1.3`
- **THEN** 前端 MUST 在 `1.3` 表单中展示可编辑项目编号字段
- **AND** 前端 MUST 清楚表达该编号将在 `1.3` 提交时正式确定

#### Scenario: 1.3 缺少项目编号时阻止提交
- **WHEN** 用户尝试提交 `1.3` 且项目编号为空
- **THEN** 前端 MUST 展示缺少项目编号的阻塞原因
- **AND** 前端 MUST NOT 假装提交成功

#### Scenario: 1.3 自动带出已有项目编号
- **WHEN** 项目已有 `projects.project_code` 且用户打开 `1.3`
- **THEN** 前端 MAY 默认展示该项目编号
- **AND** 用户按权限修改后提交时前端 MUST 接受后端唯一性校验结果

### Requirement: 新建项目客户联系人前端呈现

项目核心前端 MUST 在新建项目、项目详情、项目列表、项目总览和立项项目输入节点中展示客户联系人，并 MUST 将其与客户联系方式保持同级业务字段。新建项目提交时客户联系人为空 MUST 阻止提交并提示；旧项目客户联系人为空时页面不得崩溃。

#### Scenario: 新建项目填写客户联系人
- **WHEN** 用户打开新建项目页面
- **THEN** 前端 MUST 展示客户联系人字段
- **AND** 客户联系人 MUST 位于客户联系方式前
- **AND** 客户联系人为空时前端 MUST 阻止提交并展示提示

#### Scenario: 项目页面展示客户联系人
- **WHEN** 前端展示项目列表、项目总览、项目详情或立项项目输入节点
- **THEN** 页面 MUST 能展示客户联系人
- **AND** 旧项目客户联系人为空时页面 MUST 不崩溃

### Requirement: 1.2 协同填写前端体验
项目核心前端 MUST 保持 `1.2` 商务负责人和技术负责人协同填写体验，但 MUST 按新版模板移除项目编号入口并更新评分项。

#### Scenario: 商务负责人填写新版商务区域
- **WHEN** 商务负责人打开 `1.2 项目立项审批表`
- **THEN** 前端 MUST 允许填写新版商务模块
- **AND** 前端 MUST 要求商务负责人填写项目开展模式单选字段
- **AND** 前端 MUST NOT 提供项目编号填写或确认入口

#### Scenario: 技术负责人填写新版技术区域
- **WHEN** 技术负责人打开 `1.2 项目立项审批表`
- **THEN** 前端 MUST 允许填写新版技术模块
- **AND** 前端 MUST NOT 允许技术负责人修改商务模块

#### Scenario: 双方完成状态继续可见
- **WHEN** 用户查看新版 `1.2`
- **THEN** 前端 MUST 继续展示商务部分完成状态和技术部分完成状态
- **AND** 双方未完成时前端 MUST 表达评价审批尚未启动或不可处理

### Requirement: 1.2 项目编号前置前端门禁
该既有前端门禁 MUST 被移除；`1.2` 前端不得再因项目编号为空阻止商务或技术部分提交。

#### Scenario: 1.2 不再校验项目编号
- **WHEN** 商务负责人提交新版 `1.2` 商务部分
- **THEN** 前端 MUST NOT 校验项目编号不为空
- **AND** 前端 MUST NOT 展示“请先填写项目编号”作为 `1.2` 阻塞原因

#### Scenario: 1.3 负责项目编号错误展示
- **WHEN** `1.3` 提交返回项目编号为空或重复的业务错误
- **THEN** 前端 MUST 在 `1.3` 表单中展示明确错误
- **AND** 前端 MUST NOT 引导用户回到 `1.2` 修改项目编号

### Requirement: 立项产出文件查看方向

项目核心前端 MUST 记录在线表单提交后查看模板生成文件的方向，但本 change MUST NOT 展示已生成文件的承诺或伪造下载入口。

#### Scenario: 在线表单作为填写入口
- **WHEN** 用户处理 `1.1`、`1.2` 或 `1.3`
- **THEN** 前端 MUST 继续展示在线表单填写入口
- **AND** 前端 MUST NOT 将填写入口改为普通附件上传

#### Scenario: 后续默认查看生成文件
- **WHEN** 后续实现模板文件生成能力
- **THEN** 有权限查看者 SHOULD 默认查看生成后的模板文件
- **AND** 前端 SHOULD 支持文件预览、下载或版本查看入口

#### Scenario: 本 change 不伪造文件生成
- **WHEN** 本 change 完成实现
- **THEN** 前端 MUST NOT 展示 Excel、Word、PDF 已生成的假状态
- **AND** 前端 MUST NOT 提示已经接入文件平台

### Requirement: 产出卡片文件查看入口

项目核心前端 MUST 规划在立项产出卡片中展示生成文件查看入口；有权限查看者在文件已生成时 SHOULD 默认看到生成文件入口，同时在线表单填写入口必须保留。

#### Scenario: 填写人继续打开在线表单
- **WHEN** 用户是当前在线表单填写人或有填写权限
- **THEN** 前端 MUST 继续提供在线表单填写入口
- **AND** 前端 MUST NOT 删除或隐藏在线表单填写入口

#### Scenario: 有权限查看者看到生成文件入口
- **WHEN** 用户有项目和资料查看权限
- **AND** 资料已有最新有效生成文件
- **THEN** 产出卡片 SHOULD 默认展示生成文件查看或下载入口
- **AND** 文件入口 MUST 对应原 `1.1 / 1.2 / 1.3` 资料项

#### Scenario: 不以普通附件上传替代
- **WHEN** 用户处理立项在线表单产出
- **THEN** 前端 MUST NOT 新增普通附件上传入口来替代在线表单或模板文件生成

### Requirement: 生成状态展示
项目核心前端 MUST 展示模板文件生成状态，包括未生成/待生成、生成中、已生成和生成失败或等价状态；失败状态不得被表达为在线表单未提交或审批未通过。

#### Scenario: 未生成时展示待生成状态
- **WHEN** 资料尚未达到生成条件或尚未生成文件
- **THEN** 产出卡片 SHOULD 展示未生成、待生成或等价状态
- **AND** 前端 MUST NOT 展示虚假的文件下载入口

#### Scenario: 生成中时展示状态
- **WHEN** 后端文件状态为生成中
- **THEN** 前端 SHOULD 展示生成中状态
- **AND** 前端 SHOULD 避免让用户误以为文件已经可下载

#### Scenario: 已生成时展示下载入口
- **WHEN** 后端返回生成文件状态为 `generated`
- **THEN** 前端 MUST 展示已生成状态
- **AND** 前端 MUST 展示后端允许的生成文件下载或查看入口

#### Scenario: 生成失败时展示错误摘要
- **WHEN** 后端文件状态为生成失败
- **THEN** 前端 SHOULD 展示失败状态和可理解错误摘要
- **AND** 前端 MUST NOT 将失败状态展示为已生成或 `generated`
- **AND** 前端 MUST NOT 将失败状态表达为在线表单未提交或审批未通过
- **AND** 前端 MUST NOT 声称在线表单提交或审批被回滚

#### Scenario: 失败后仍有最近成功版本
- **WHEN** 后端返回最新生成尝试为 `failed`
- **AND** 返回存在最近成功可下载版本
- **THEN** 前端 MUST 展示失败状态
- **AND** 前端 MAY 展示最近成功版本的下载入口
- **AND** 前端 MUST NOT 将失败版本本身表达为已生成

#### Scenario: 不展示伪造文件平台归档状态
- **WHEN** 本 change 未接入文件平台
- **THEN** 前端 MUST NOT 展示已归档到文件平台、已同步文件平台或等价假状态

#### Scenario: 重试入口受权限和后端能力控制
- **WHEN** 后续实现允许重试文件生成
- **THEN** 前端 SHOULD 仅在后端返回可重试且用户有权限时展示重试入口
- **AND** 前端 MUST NOT 在无权限或后端未开放重试时伪造重试入口

### Requirement: 文件查看基础可用性

项目核心前端 MUST 保证后续文件入口和生成状态在桌面端与移动端基础可用，不应导致产出卡片横向裁切或关键按钮不可见。

#### Scenario: 桌面端产出卡片可用
- **WHEN** 用户在桌面端查看项目详情或工作区产出卡片
- **THEN** 在线表单入口、文件状态和文件查看入口 SHOULD 清晰可见

#### Scenario: 移动端产出卡片可用
- **WHEN** 用户在移动端查看项目详情或工作区产出卡片
- **THEN** 文件状态和主要操作 SHOULD 可换行或自适应布局
- **AND** 前端 SHOULD 避免横向裁切关键操作

### Requirement: 前端只消费后端文件能力

项目核心前端 MUST 通过后端接口获取文件状态和下载/查看地址，不得在前端直接填充 Excel 或 Word 模板，也不得负责模板字段映射。

#### Scenario: 前端不直接填充模板
- **WHEN** 用户请求查看生成文件
- **THEN** 前端 SHOULD 调用后端文件状态、查看或下载接口
- **AND** 前端 MUST NOT 在浏览器端直接读取并填充真实模板文件

#### Scenario: 前端不负责字段映射
- **WHEN** 前端展示生成文件状态或下载入口
- **THEN** 前端 MUST 只展示后端返回的文件状态、错误摘要和可用操作
- **AND** 前端 MUST NOT 维护 Excel 单元格、Word 占位符或模板字段 mapping manifest

### Requirement: 立项产出卡片生成文件入口
项目核心前端 MUST 在 `1.1 / 1.2 / 1.3` 产出卡片上展示后端生成文件状态和下载入口，同时 MUST 保留在线表单填写或浏览入口。

#### Scenario: 在线表单入口保留
- **WHEN** 用户查看 `1.1 / 1.2 / 1.3` 产出卡片
- **THEN** 前端 MUST 继续展示后端允许的在线表单填写或浏览入口
- **AND** 前端 MUST NOT 用普通附件上传或文件下载替代在线表单入口

#### Scenario: 1.1 图片输入控件可用
- **WHEN** 用户填写 `1.1 项目需求表`
- **THEN** 前端 MUST 展示工件描述、作业工艺和目标的大文本字段
- **AND** 前端 MUST 在场地情况、工件描述和作业工艺区域展示后端 schema 声明的图片上传控件
- **AND** 前端 MUST 只允许 png/jpg/jpeg 图片，并 MUST NOT 提供非图片附件、OLE、PDF 或文件平台上传入口
- **AND** 每个区域 MUST show the uploaded image list in stable order with sequence, file name, size, download, and delete entry
- **AND** 每个区域达到 3 张后 MUST disable or block further upload with a clear message
- **AND** 移动端 MUST NOT 因大文本字段、说明文字或图片控件横向裁切

#### Scenario: 已生成时展示下载入口
- **WHEN** 后端返回生成文件状态为 `generated`
- **THEN** 前端 MUST 在产出卡片展示生成文件下载或查看入口
- **AND** 下载动作 MUST 调用后端生成文件下载接口

#### Scenario: 1.2 前置 1.1 时隐藏协同处理状态
- **WHEN** `1.1 项目需求表` 尚未提交或完成
- **AND** 用户打开 `1.2 项目立项审批表` 在线表单
- **THEN** 前端 MUST 根据后端 permissions 展示不可编辑、不可提交状态
- **AND** 前端 MUST 展示 `请先提交 1.1 项目需求表` 或等价阻塞原因
- **AND** 工作台 MUST NOT 展示可处理的 `1.2` 商务或技术协同待办

### Requirement: 前端不填充模板
项目核心前端 MUST 只消费后端文件状态和下载接口，不得在浏览器端填充 Excel 或 Word 模板，也不得维护 mapping manifest。

#### Scenario: 前端不负责模板映射
- **WHEN** 前端展示生成文件状态或处理下载动作
- **THEN** 前端 MUST NOT 维护 Excel 单元格、Word 占位符或字段 mapping manifest
- **AND** 前端 MUST NOT 读取并填充真实模板文件

#### Scenario: 桌面移动基础可用
- **WHEN** 用户在桌面端或移动端查看产出卡片
- **THEN** 文件状态、在线表单入口和下载入口 MUST 可换行或自适应
- **AND** 关键按钮 MUST NOT 被横向裁切

### Requirement: 新版立项编号流程前端呈现
项目核心前端 MUST 将项目编号填写入口从 `1.2 项目立项审批表` 移到 `1.3 项目立项通知`，并 MUST 展示新版 `1.2` 商务/技术评分字段。

#### Scenario: 1.2 不展示项目编号字段
- **WHEN** 用户打开 `1.2 项目立项审批表`
- **THEN** 前端 MUST NOT 展示项目编号填写或确认字段
- **AND** 前端 MUST NOT 将项目编号作为 `1.2` 提交前阻塞原因

#### Scenario: 1.2 展示新版商务评分项
- **WHEN** 商务负责人打开 `1.2`
- **THEN** 前端 MUST 展示客户企业属性、项目来源、项目定位、商务竞争条件、项目预算、付款条件
- **AND** 前端 MUST 展示项目开展模式必填单选字段
- **AND** 项目开展模式选项 MUST 为自研模式和供应链模式
- **AND** 前端 MUST 保持商务负责人只能提交其职责范围内内容

#### Scenario: 商务负责人未填项目开展模式不得提交
- **WHEN** 商务负责人提交 `1.2` 商务部分
- **AND** 项目开展模式为空
- **THEN** 前端 MUST 阻止提交或展示后端业务错误
- **AND** 前端 MUST NOT 将该字段表达为系统项目模式

#### Scenario: 1.2 展示新版技术评分项
- **WHEN** 技术负责人打开 `1.2`
- **THEN** 前端 MUST 展示项目需求、特殊环境要求、行业门槛、技术成熟度、研发模式
- **AND** 前端 MUST 保持技术负责人只能提交其职责范围内内容

#### Scenario: 1.3 项目编号可编辑必填
- **WHEN** 营销中心负责人打开 `1.3 项目立项通知`
- **THEN** 前端 MUST 展示可编辑的项目编号字段
- **AND** 项目编号为空时前端 MUST 阻止提交或展示后端阻塞原因
- **AND** 项目编号重复时前端 MUST 展示后端业务错误

#### Scenario: 1.3 生成文件状态沿用现有展示
- **WHEN** `1.3` 已提交并触发通知生成
- **THEN** 前端 MUST 沿用现有生成状态和下载入口展示
- **AND** 前端 MUST NOT 展示文件平台归档或同步假状态

