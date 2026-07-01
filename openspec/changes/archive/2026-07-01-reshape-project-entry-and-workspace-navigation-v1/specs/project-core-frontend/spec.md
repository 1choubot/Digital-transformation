## ADDED Requirements

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
