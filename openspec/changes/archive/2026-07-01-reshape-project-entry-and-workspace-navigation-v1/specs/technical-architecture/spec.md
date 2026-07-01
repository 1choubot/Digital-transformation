## ADDED Requirements

### Requirement: 项目入口与工作区导航前端架构边界

技术架构 MUST 将本 change 限定为前端信息架构调整：项目总览作为跨项目入口，项目工作区作为单项目内部导航与产出工作入口；第一版 MUST 复用现有后端接口，不新增数据库结构或后端权限模型。

#### Scenario: 前端路由和导航调整为主
- **WHEN** 团队实现本 change
- **THEN** 实现重点 MUST 放在前端主导航、路由入口、项目总览入口和项目工作区布局
- **AND** 系统 MUST NOT 因本 change 新增后端服务模块、数据库表、migration 或后端权限模型

#### Scenario: 旧项目列表组件不是产品入口
- **WHEN** 团队实施 `/projects` 路由和主导航调整
- **THEN** `/projects` MUST 进入项目总览或等价项目总览体验
- **AND** `ProjectListPage.vue` MAY 仅作为源码文件和开发回退能力保留
- **AND** 前端 MUST NOT 新增 `/projects/list` 或其他用户可见旧项目列表产品入口

#### Scenario: 复用现有接口
- **WHEN** 前端实现项目总览和项目工作区导航
- **THEN** 前端 MUST 复用 `/api/projects/overview-dashboard`、`/api/projects/:id`、`/api/projects/:id/workspace`、`/api/projects/:id/stage-document-checklist` 和 `/api/projects/:id/stage-documents/:documentId/online-form`
- **AND** 第一版 MUST NOT 要求新增项目入口、蓝色节点点击或产出工作区后端接口

#### Scenario: 权限来源仍以后端为准
- **WHEN** 前端展示节点产出、在线表单、评价或审批入口
- **THEN** 前端 MUST 使用现有后端接口返回的权限字段、online form permissions 和 blockingReasons
- **AND** 前端 MUST NOT 通过主导航、路由或蓝色节点本地状态自行推断业务操作权限

### Requirement: 项目工作区组件拆分架构

前端架构 SHOULD 将项目工作区拆分为阶段导航、蓝色节点列表和节点产出工作区等可维护组件；该拆分 MUST 保持项目总览和项目工作区职责分离。

#### Scenario: 项目总览不承载阶段导航
- **WHEN** 前端展示项目总览
- **THEN** 页面 MUST 只承担跨项目入口、项目摘要、新建项目和进入工作区职责
- **AND** 页面 MUST NOT 承载单项目 8 阶段内部导航

#### Scenario: 项目工作区承载内部导航
- **WHEN** 前端展示项目工作区
- **THEN** 页面 MUST 承载左侧 8 阶段导航、阶段蓝色节点和节点产出工作区
- **AND** 组件拆分 MUST NOT 改变后端接口职责或业务状态来源

#### Scenario: 节点产出工作区不直接等于表单
- **WHEN** 前端实现节点产出工作区组件
- **THEN** 组件 MUST 先展示产出状态、责任人、阻塞原因和动作入口
- **AND** 在线表单 MUST 由用户点击填写资料或查看在线表单后打开
- **AND** 组件 MUST NOT 将点击蓝色节点直接实现为进入编辑表单

### Requirement: 第一版阶段范围架构边界

技术架构 MUST 将第一版完整范围限定为立项阶段，其他 7 个阶段只允许占位、旧资料清单入口或后续配置状态，不得因本 change 扩大为全阶段节点重建。

#### Scenario: 立项阶段完整落地
- **WHEN** 第一版实现项目工作区导航
- **THEN** 立项阶段 MUST 完整展示项目输入、项目市场调研、项目立项审批和项目立项通知节点
- **AND** 立项阶段 MUST 保留既有在线表单入口、评价/审批入口和阻塞原因展示

#### Scenario: 其他阶段不在线表单化
- **WHEN** 第一版展示其他 7 个阶段
- **THEN** 系统 MAY 展示占位、旧资料清单入口或后续配置状态
- **AND** 技术架构 MUST NOT 要求本 change 补齐其他 7 个阶段完整蓝色节点映射
- **AND** 技术架构 MUST NOT 要求本 change 将其他阶段产出在线表单化

#### Scenario: 不恢复排除能力
- **WHEN** 团队实施项目入口和工作区导航调整
- **THEN** 系统 MUST NOT 因本 change 恢复文件平台联动
- **AND** 系统 MUST NOT 新增日报、周报、通知推送、账号管理或通用审批流能力
