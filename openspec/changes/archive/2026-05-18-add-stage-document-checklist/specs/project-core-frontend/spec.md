## MODIFIED Requirements

### Requirement: 项目详情页

前端 MUST 提供项目详情页，并 MUST 调用 `GET /api/projects/:projectId` 获取项目基础状态和创建人追溯字段，同时 MUST 展示该项目的阶段资料清单基础信息和状态。

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

#### Scenario: 展示 8 阶段基础状态

- **WHEN** 项目详情接口返回阶段列表
- **THEN** 页面必须按阶段顺序展示全部 8 个阶段的阶段名称、阶段状态和当前阶段标记

#### Scenario: 展示阶段资料清单

- **WHEN** 用户打开项目详情页
- **THEN** 页面必须展示“阶段资料清单”区域，并按阶段展示资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId` 和基础状态

#### Scenario: 展示资料项状态

- **WHEN** 页面展示资料项基础状态
- **THEN** `not_submitted` 必须显示为“待提交”，`submitted` 必须显示为“已提交”，`confirmed` 必须显示为“已确认”，`returned` 必须显示为“已退回”

#### Scenario: 资料清单加载状态

- **WHEN** 前端请求项目阶段资料清单
- **THEN** 页面必须处理加载中、接口失败和空清单状态

#### Scenario: 项目不存在

- **WHEN** `GET /api/projects/:projectId` 返回 `PROJECT_NOT_FOUND`
- **THEN** 页面必须展示项目不存在的提示，并提供返回项目列表的入口

#### Scenario: 详情不展示排除能力

- **WHEN** 用户打开项目详情页
- **THEN** 页面不能展示在线表单填写入口、文件上传入口、文件下载入口、文件管理平台同步动作、复杂权限控制、业务日志、看板指标、阶段推进、资料齐套率计算结果、提交按钮、退回按钮、确认按钮或补初始化按钮
