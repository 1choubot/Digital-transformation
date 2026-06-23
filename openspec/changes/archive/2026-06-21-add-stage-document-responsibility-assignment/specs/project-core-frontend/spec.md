## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: 项目详情页

前端 MUST 提供项目详情页，并 MUST 调用 `GET /api/projects/:projectId` 获取项目基础状态和创建人追溯字段，同时 MUST 展示该项目的阶段资料清单基础信息、状态、状态追溯字段、适用性、适用性追溯字段、责任人、责任人变更追溯字段、手工状态操作、适用性操作、责任人分配操作、阶段资料齐套摘要、当前阶段手工推进入口和只读业务日志区域。

#### Scenario: 加载项目详情

- **WHEN** 用户从项目列表进入某个项目详情
- **THEN** 前端必须调用 `GET /api/projects/:projectId` 加载该项目详情

#### Scenario: 展示项目基础信息

- **WHEN** 项目详情接口返回项目数据
- **THEN** 页面必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段

#### Scenario: 展示历史项目详情

- **WHEN** 项目详情接口返回创建人为空的历史项目
- **THEN** 页面必须允许创建人为空，并继续展示项目基础状态

#### Scenario: 展示当前阶段

- **WHEN** 项目详情接口返回当前阶段
- **THEN** 页面必须突出展示当前阶段名称和状态

#### Scenario: 已完成项目当前阶段为空

- **WHEN** 项目详情接口返回项目 `status` 为 `completed` 且当前阶段为空
- **THEN** 页面必须展示项目已完成或当前阶段为空的合理状态，并继续展示 8 阶段基础状态

#### Scenario: 展示 8 阶段基础状态

- **WHEN** 项目详情接口返回阶段列表
- **THEN** 页面必须按阶段顺序展示全部 8 个阶段的阶段名称、阶段状态和当前阶段标记

#### Scenario: 展示阶段资料清单

- **WHEN** 用户打开项目详情页
- **THEN** 页面必须展示“阶段资料清单”区域，并按阶段展示资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId`、基础状态、状态追溯字段、适用性、适用性追溯字段、责任人、责任人变更追溯字段和阶段资料齐套摘要

#### Scenario: 加载阶段资料清单携带登录态

- **WHEN** 用户打开项目详情页且前端加载阶段资料清单
- **THEN** 前端必须携带当前登录态调用 `GET /api/projects/:projectId/stage-document-checklist`

#### Scenario: 展示资料项状态

- **WHEN** 页面展示资料项基础状态
- **THEN** `not_submitted` 必须显示为“待提交”，`submitted` 必须显示为“已提交”，`confirmed` 必须显示为“已确认”，`returned` 必须显示为“已退回”

#### Scenario: 展示资料项适用性

- **WHEN** 页面展示资料项适用性
- **THEN** 适用资料项必须显示为“适用”，不适用资料项必须显示为“不适用”

#### Scenario: 资料清单加载状态

- **WHEN** 前端请求项目阶段资料清单
- **THEN** 页面必须处理加载中、接口失败和空清单状态

#### Scenario: 展示业务日志区域

- **WHEN** 用户打开项目详情页
- **THEN** 页面必须展示只读“业务日志”区域，并按项目业务日志展示要求加载和展示该项目日志

#### Scenario: 项目不存在

- **WHEN** `GET /api/projects/:projectId` 返回 `PROJECT_NOT_FOUND`
- **THEN** 页面必须展示项目不存在的提示，并提供返回项目列表的入口

#### Scenario: 详情不展示排除能力

- **WHEN** 用户打开项目详情页
- **THEN** 除既有手工阶段推进、既有手工资料项适用性、既有只读阶段资料齐套摘要、既有只读业务日志区域和本变更定义的手工资料项责任人分配外，页面不能展示在线表单填写入口、文件上传入口、文件下载入口、文件管理平台同步动作、复杂权限控制、角色权限控制、轻角色校验、管理层看板指标、项目类型模板自动标记不适用或补初始化按钮

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
