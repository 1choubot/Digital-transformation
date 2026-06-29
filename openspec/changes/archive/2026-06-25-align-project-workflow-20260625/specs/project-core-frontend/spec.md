## ADDED Requirements

### Requirement: 前端项目编号后置展示

前端 MUST 在后续规划中支持项目创建时不填写项目编号，并 MUST 在项目列表、项目详情、搜索结果和待办入口中展示空项目编号的合理占位。

#### Scenario: 新建项目表单不强制项目编号
- **WHEN** 用户创建尚未立项审批通过的新项目
- **THEN** 前端 MUST 不再强制填写项目编号
- **AND** 前端 MUST 明确项目编号将在立项审批通过并发布项目立项通知后生成或填写

#### Scenario: 项目列表展示待立项编号
- **WHEN** 项目列表接口返回 `projectCode` 为空
- **THEN** 前端 MUST 展示 `待立项编号` 或等价文案，而不是展示空白、`undefined` 或错误状态

#### Scenario: 项目详情展示编号生成节点
- **WHEN** 项目详情接口返回 `projectCode` 为空
- **THEN** 前端 MUST 展示项目尚未生成正式编号
- **AND** 前端 MUST 将编号生成与立项审批通过及项目立项通知发布关联说明

#### Scenario: 搜索兼容空项目编号
- **WHEN** 用户在项目列表或工作台按项目名称、客户或其他字段查找项目
- **THEN** 前端 MUST 不因项目编号为空而隐藏项目或阻止进入项目详情

### Requirement: 20260625 阶段资料完成状态展示

前端 MUST 在后续规划中根据后端返回的资料完成规则和资料状态展示更细的资料处理状态，不应继续把所有资料操作都表达为提交资料审核。

#### Scenario: 展示多种资料状态
- **WHEN** 前端展示阶段资料列表
- **THEN** 页面 SHOULD 能区分待提交、已完成、待确认/审批、已确认/审批通过、已退回修改、条件未触发和不适用等状态

#### Scenario: submit_only 资料不使用审核文案
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 前端 SHOULD 将主要操作表达为提交、上传或标记完成
- **AND** 前端 SHOULD NOT 将该资料项的主要按钮统一命名为 `提交资料审核`

#### Scenario: 发票资料按 submit_only 展示
- **WHEN** 页面展示 `发票（预付款）`、`发票（发货款）` 或 `发票（尾款）`
- **AND** 该资料项 `completionMode = submit_only`
- **THEN** 前端 MUST 将主要操作表达为提交、上传或完成
- **AND** 前端 MUST NOT 将该资料项展示为提交审核、付款审批、发票审批或待额外确认前置

#### Scenario: approval_required 资料使用确认审批文案
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 前端 SHOULD 展示待确认/审批、确认通过和退回修改等处理状态

#### Scenario: 条件资料展示触发状态
- **WHEN** 资料项 `completionMode` 为 `conditional_submit` 或 `conditional_approval`
- **THEN** 前端 SHOULD 展示条件未触发、已触发待处理或不适用状态
- **AND** 未触发时 SHOULD 明确该资料不计入当前缺失

#### Scenario: 阶段推进说明按完成规则表达
- **WHEN** 前端展示阶段推进入口或不可推进原因
- **THEN** 页面 MUST 说明阶段推进依据为当前阶段适用资料按各自完成规则完成
- **AND** 页面 MUST NOT 表达为资料齐套后还需要额外通过泛化的阶段级审批
