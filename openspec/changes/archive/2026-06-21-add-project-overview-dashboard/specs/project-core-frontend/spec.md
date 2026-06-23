## ADDED Requirements

### Requirement: 项目总览页面

前端 MUST 提供“项目总览”页面，用于登录用户集中查看跨项目汇总指标和项目当前阶段齐套情况。

#### Scenario: 主导航展示项目总览入口

- **WHEN** 用户已登录并进入数字化平台主界面
- **THEN** 前端必须在主导航中提供“项目总览”入口

#### Scenario: 未登录访问项目总览

- **WHEN** 用户未登录、登录态无效或登录态已过期时访问项目总览页面
- **THEN** 前端必须按现有未登录处理跳转登录或展示需要登录的可读提示

#### Scenario: 加载项目总览

- **WHEN** 已登录用户打开项目总览页面
- **THEN** 前端必须携带当前登录态调用 `GET /api/projects/overview-dashboard`

#### Scenario: 展示项目总览汇总指标

- **WHEN** 项目总览接口返回 `summary`
- **THEN** 页面必须展示项目总数、进行中项目数、已完成项目数、风险/延期项目数和我的待办资料数量

#### Scenario: 我的待办资料指标跳转

- **WHEN** 用户点击“我的待办资料”指标
- **THEN** 前端必须跳转到我的资料任务页面

#### Scenario: 我的待办资料全局口径说明

- **WHEN** 页面展示“我的待办资料”指标
- **THEN** 页面必须说明该指标为当前登录用户全局待办资料数量，不随项目状态、当前阶段或关键字筛选变化

#### Scenario: 展示项目总览列表或卡片

- **WHEN** 项目总览接口返回项目列表
- **THEN** 页面必须以列表或卡片方式展示每个项目的项目编号、项目名称、客户、项目经理、项目状态、当前阶段、当前阶段齐套率、未完成适用必填资料数量和计划时间

#### Scenario: 展示当前阶段齐套率

- **WHEN** 项目卡片包含 `currentStageCompletenessSummary`
- **THEN** 页面必须展示当前阶段适用必填资料总数、已确认数量、未完成数量和完成百分比

#### Scenario: 展示未完成适用必填资料

- **WHEN** 项目卡片包含非空 `currentStageIncompleteRequiredDocuments`
- **THEN** 页面必须展示或允许展开查看未完成适用必填资料清单，并展示资料编号、资料名称和状态

#### Scenario: 展示无缺失资料状态

- **WHEN** 项目卡片的 `currentStageIncompleteRequiredDocuments` 为空且 `currentStageCompletenessSummary` 不为空
- **THEN** 页面必须展示当前阶段暂无未完成适用必填资料的可读状态

#### Scenario: 展示当前阶段异常

- **WHEN** 项目卡片包含 `currentStageIssue`
- **THEN** 页面必须展示可读提示，说明当前阶段缺失、存在多个当前阶段或当前阶段资料清单未初始化等异常状态

#### Scenario: 支持状态筛选

- **WHEN** 用户在项目总览页面选择项目状态筛选
- **THEN** 前端必须使用合法项目状态调用 `GET /api/projects/overview-dashboard`，并展示筛选后的汇总指标和项目列表

#### Scenario: 支持当前阶段筛选

- **WHEN** 用户在项目总览页面选择当前阶段序号筛选
- **THEN** 前端必须使用 1 到 8 的阶段序号调用 `GET /api/projects/overview-dashboard`，并展示筛选后的汇总指标和项目列表

#### Scenario: 支持关键字筛选

- **WHEN** 用户在项目总览页面输入项目关键字
- **THEN** 前端必须使用该关键字调用 `GET /api/projects/overview-dashboard`，并按后端返回结果展示项目总览

#### Scenario: 筛选错误提示

- **WHEN** 项目总览接口返回 `INVALID_PROJECT_STATUS_FILTER` 或 `INVALID_STAGE_ORDER`
- **THEN** 页面必须展示可读中文错误提示，并保留当前页面上下文

#### Scenario: 项目总览加载状态

- **WHEN** 前端请求项目总览接口
- **THEN** 页面必须处理加载中、接口失败和空项目列表状态

#### Scenario: 点击项目跳转项目详情

- **WHEN** 用户点击项目总览中的某个项目
- **THEN** 前端必须跳转到该项目对应的项目详情页

#### Scenario: 展示项目总览边界说明

- **WHEN** 用户打开项目总览页面
- **THEN** 页面必须展示可读说明，明确齐套率基于当前手工状态和人工适用性判断，不代表文件已上传，也不代表在线表单已填写

#### Scenario: 项目总览页面不提供排除能力

- **WHEN** 用户查看或操作项目总览页面
- **THEN** 页面不得提供文件上传、文件下载、文件管理平台联动、在线表单、消息提醒、超期提醒、截止日期、大屏图表、复杂权限配置、项目成员权限、导出、分页或批量操作入口
