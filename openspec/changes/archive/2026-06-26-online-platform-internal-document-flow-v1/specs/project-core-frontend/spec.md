## MODIFIED Requirements

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

前端 MUST 将当前“我的资料任务”升级或改名为“我的工作台 / 我的待办”，并 MUST 展示当前用户的资料责任待办、资料审核待办和阶段推进待办；当前 20260625 在线平台内部资料闭环 MUST NOT 展示阶段关口审批待办分类或入口。

#### Scenario: 导航显示我的工作台
- **WHEN** 用户已登录
- **THEN** 主导航必须显示“我的工作台”或“我的待办”入口

#### Scenario: 工作台加载待办
- **WHEN** 用户打开我的工作台
- **THEN** 前端必须携带登录态调用 `GET /api/me/workbench` 或等价工作台接口

#### Scenario: 工作台展示待办分类
- **WHEN** 工作台接口返回待办数据
- **THEN** 页面必须展示我负责的资料、待我审核的资料和待我推进阶段等分类或筛选
- **AND** 页面 MUST NOT 展示阶段关口审批待办分类
- **AND** 页面 MUST NOT 展示“待我阶段关口审批”、“待阶段关口审批”或等价筛选/入口

#### Scenario: 审核待办只来自 approval_required
- **WHEN** 工作台展示待审核资料
- **THEN** 待审核资料 MUST 只来自 `completionMode = approval_required` 且 `status = submitted` 的资料项
- **AND** 页面 MUST NOT 将 `submit_only`、未触发的 `conditional_submit` 或泛化阶段审批事项展示为资料审核待办

#### Scenario: 阶段推进待办按 completionMode 和权限
- **WHEN** 工作台展示阶段推进待办
- **THEN** 阶段推进待办 MUST 只按当前阶段适用资料的 `completionMode` 完成情况和当前用户推进权限展示
- **AND** 页面 MUST NOT 因 `approval_status` 生成阶段关口审批待办
- **AND** 页面 MUST NOT 因 `approval_status != approved` 隐藏符合资料完成和推进权限条件的阶段推进待办

#### Scenario: 工作台展示摘要计数
- **WHEN** 工作台接口返回摘要计数
- **THEN** 页面必须展示总待办数量和按资料责任、资料审核、阶段推进等当前待办类型分组的数量
- **AND** 页面 MUST NOT 展示阶段关口审批待办计数

#### Scenario: 工作台待办字段展示
- **WHEN** 页面展示待办条目
- **THEN** 页面必须展示项目、阶段、资料项、状态、动作文案和更新时间等必要信息

#### Scenario: 点击待办进入处理位置
- **WHEN** 用户点击资料责任或资料审核待办
- **THEN** 页面必须进入资料项处理位置或任务视图
- **AND** 页面 MUST NOT 进入阶段关口审批处理页

#### Scenario: 点击阶段推进待办进入推进位置
- **WHEN** 用户点击阶段推进待办
- **THEN** 页面必须进入阶段推进位置或对应项目详情阶段推进区域
- **AND** 页面 MUST NOT 进入阶段关口审批提交、审批通过或审批退回页面

#### Scenario: 普通员工待办不进入完整项目详情
- **WHEN** 普通员工点击资料责任待办
- **THEN** 页面必须根据 `targetRoute` 进入受限任务视图，或进入携带 `documentId` / `taskMode` 的受限详情，不得直接打开完整项目详情

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

### Requirement: 项目详情页资料手工状态操作

项目详情页 MUST 按资料项 `completionMode` 展示提交、确认和退回操作，并 MUST 使用后端返回的派生完成状态刷新资料列表、齐套摘要和缺失资料列表。

#### Scenario: submit_only 不展示确认退回
- **WHEN** 页面展示 `completionMode = submit_only` 的资料项
- **THEN** 页面 MUST 将主操作表达为提交、上传或完成
- **AND** 页面 MUST NOT 展示确认、审核通过或退回操作作为主流程入口

#### Scenario: approval_required submitted 展示确认退回
- **WHEN** 页面展示 `completionMode = approval_required` 且基础状态为 `submitted` 的资料项
- **THEN** 页面可以按当前用户资料级审核权限展示确认/审核通过和退回操作
- **AND** 页面 MUST 表达该操作对象是单个资料项

#### Scenario: submitted 展示按 completionMode 分流
- **WHEN** 页面展示基础状态为 `submitted` 的资料项
- **THEN** `submit_only` MUST 展示为已完成或等价完成状态
- **AND** `approval_required` MUST 展示为待审核或等价状态

#### Scenario: 操作后刷新派生摘要
- **WHEN** 用户完成资料提交、确认或退回操作
- **THEN** 页面必须重新获取或刷新后端返回的 `completionMode` 派生完成状态、阶段齐套摘要和缺失资料列表

### Requirement: 项目详情页阶段资料齐套展示

项目详情页 MUST 按当前 20260625 `completionMode` 派生完成口径展示阶段资料齐套情况，不得把“已确认资料数”作为唯一完成口径，也不得表达为所有资料都必须 `confirmed`。

#### Scenario: 展示已完成资料数
- **WHEN** 页面展示阶段齐套摘要
- **THEN** 页面 MUST 展示已完成资料数、适用资料总数、未完成资料数和完成比例
- **AND** 已完成资料数 MUST 使用后端 `completedRequiredCount` 或等价 `completionMode` 派生完成数量

#### Scenario: 兼容 confirmedRequiredCount
- **WHEN** 后端为兼容旧前端返回 `confirmedRequiredCount`
- **THEN** 页面只可将其作为 `completionMode` 派生完成数量的兼容字段使用
- **AND** 页面 MUST NOT 将其解释为仅 `status = confirmed` 的资料数量

#### Scenario: 缺失列表展示完成规则
- **WHEN** 页面展示缺失或未完成资料列表
- **THEN** 每项 MUST 展示或可查看 `documentCode`、`documentName`、基础 `status`、`completionMode` 和派生完成状态

### Requirement: 我的资料任务页面

我的资料任务页面 MUST 使用 `completionMode` 和派生完成状态展示、筛选和排序任务，默认 pending 视图不得混入已完成的 `submit_only + submitted` 资料。

#### Scenario: pending 排除已完成 submit_only
- **WHEN** 用户打开我的资料任务默认 pending 视图
- **THEN** 页面 MUST NOT 展示 `completionMode = submit_only` 且 `status = submitted` 的已完成资料作为待办

#### Scenario: 任务状态按 completionMode 展示
- **WHEN** 页面展示基础状态为 `submitted` 的资料任务
- **THEN** `submit_only` MUST 显示为已完成或已提交完成
- **AND** `approval_required` MUST 显示为待审核

#### Scenario: 任务字段包含 completionMode
- **WHEN** 页面展示资料任务列表
- **THEN** 页面 MUST 展示或可查看 `completionMode`
- **AND** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价字段表达业务完成状态

#### Scenario: 排序筛选不混入完成任务
- **WHEN** 用户筛选、排序或分页查看 pending 责任资料任务
- **THEN** 页面 MUST 基于后端派生完成状态保持已完成 `submit_only` 不进入责任人待办

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

项目详情页资料附件区域 MUST 继续使用在线平台附件能力，并 MUST 以后端返回的 `completionMode` 派生完成状态判断上传或提交后的资料完成表现；附件操作不得表达为文件平台归档完成。

#### Scenario: 上传后完成状态以后端为准
- **WHEN** 用户上传或提交资料附件后页面刷新资料项
- **THEN** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价派生状态展示资料是否完成
- **AND** 页面 MUST NOT 将“附件上传一定不等于资料完成”作为通用规则

#### Scenario: submit_only 上传或提交可显示完成
- **WHEN** 资料项 `completionMode = submit_only` 且上传或提交后后端返回已完成
- **THEN** 页面 MUST 展示该资料项已完成或等价完成状态

#### Scenario: 附件不表达文件平台归档
- **WHEN** 页面展示附件列表、上传、下载或删除操作
- **THEN** 页面 MUST NOT 将附件存在、附件上传成功或资料提交成功表达为文件平台归档完成

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

## ADDED Requirements

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

前端 MUST 根据后端返回的 `completionMode` 展示资料项按钮、状态和文案，不得继续把所有资料统一表达为提交审核。

#### Scenario: 展示 completionMode 文案
- **WHEN** 阶段资料列表展示资料项
- **THEN** 前端 MUST 展示与 `completionMode` 对应的可读文案
- **AND** `submit_only` MUST 表达为提交即完成
- **AND** `approval_required` MUST 表达为需审核
- **AND** `conditional_submit` MUST 表达为条件触发后提交

#### Scenario: 使用派生完成状态
- **WHEN** 阶段资料列表展示资料项
- **THEN** 前端 MUST 使用后端返回的 `completionStatus`、`isComplete` 或等价派生完成状态展示业务完成状态
- **AND** 前端 MUST NOT 仅凭基础 `status = submitted` 将所有资料显示为待审核

#### Scenario: submit_only 不展示审核动作
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 前端 MUST NOT 将主操作展示为提交审核
- **AND** 前端 MUST NOT 展示审核通过、退回或审核待办入口

#### Scenario: submit_only submitted 展示已完成
- **WHEN** 资料项 `completionMode = submit_only`
- **AND** 基础状态为 `submitted`
- **THEN** 前端 MUST 展示已完成或等价完成状态

#### Scenario: approval_required 展示审核流程
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 前端 MUST 展示提交、待审核、审核通过和退回修改等状态或操作

#### Scenario: approval_required submitted 展示待审核
- **WHEN** 资料项 `completionMode = approval_required`
- **AND** 基础状态为 `submitted`
- **THEN** 前端 MUST 展示待审核或等价状态

#### Scenario: conditional_submit 展示触发状态
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** `isApplicable = false`
- **THEN** 前端 MUST 展示条件未触发或不适用状态
- **AND** 前端 MUST 表达该资料当前不计入缺失

#### Scenario: returned 展示未完成
- **WHEN** 资料项基础状态为 `returned`
- **THEN** 前端 MUST 展示退回修改或等价未完成状态

#### Scenario: 阶段汇总按 completionMode 表达缺失
- **WHEN** 前端展示阶段资料齐套摘要或不可推进原因
- **THEN** 前端 MUST 使用后端按 `completionMode` 计算的缺失和未完成资料
- **AND** 前端 MUST NOT 表达为所有资料都必须审核通过

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

## REMOVED Requirements

### Requirement: 项目详情页 v20260624 阶段资料展示
**Reason**: 当前 `online-platform-internal-document-flow-v1` 使用 20260625 资料项、`completionMode` 和派生完成状态，旧标题容易被理解为仍以 v20260624 阶段资料展示为当前正向口径。

**Migration**: 使用 `项目详情页 20260625 阶段资料展示` requirement；项目详情页仍按后端返回资料项动态展示，但展示依据为 20260625 资料清单和 completionMode。
