## ADDED Requirements

### Requirement: 项目入口与工作区数据边界

系统 MUST 支持前端将项目总览作为项目主入口、将项目详情作为项目工作区；第一版 MUST 复用现有项目核心接口，不新增后端接口、不改变项目创建、立项阶段在线表单或阶段资料状态机。

#### Scenario: 项目总览承载项目入口
- **WHEN** 前端加载项目主入口
- **THEN** 系统 MUST 允许前端通过现有 `GET /api/projects/overview-dashboard` 获取项目总览数据
- **AND** 响应 MUST 能继续支持展示用户可见项目、项目状态、当前阶段、齐套或进度信息

#### Scenario: 项目工作区承载单项目内部导航
- **WHEN** 前端进入某个项目 `/projects/:id`
- **THEN** 系统 MUST 允许前端通过现有 `GET /api/projects/:id`、`GET /api/projects/:id/workspace` 和 `GET /api/projects/:id/stage-document-checklist` 组合展示项目工作区
- **AND** 系统 MUST 继续保持项目基础状态、阶段节点视图和阶段资料清单的接口职责边界

#### Scenario: 第一版不新增后端接口
- **WHEN** 实现项目入口和工作区导航调整
- **THEN** 系统 MUST NOT 因本 change 新增项目入口、主导航、蓝色节点点击或产出工作区后端接口
- **AND** 系统 MUST NOT 因本 change 修改数据库、migration 或后端权限模型

#### Scenario: 不改变立项阶段状态机
- **WHEN** 前端通过项目工作区展示立项阶段节点和在线表单入口
- **THEN** 系统 MUST 继续沿用既有 `1.1 / 1.2 / 1.3` 在线表单、评价/审批、返工和前置门禁规则
- **AND** 系统 MUST NOT 因项目入口调整改变这些资料的提交、完成或返工状态判断

### Requirement: 项目工作区阶段范围边界

系统 MUST 支持项目工作区展示 8 阶段导航框架；第一版只要求立项阶段完整节点体验，其他 7 个阶段 MAY 通过占位、旧资料清单入口或后续配置状态表达。

#### Scenario: 8 阶段导航框架
- **WHEN** 前端请求项目工作区数据
- **THEN** 系统 MUST 继续支持展示立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 个阶段
- **AND** 系统 MUST NOT 将 8 阶段导航框架解释为本 change 必须补齐所有阶段蓝色节点映射

#### Scenario: 立项阶段完整支持
- **WHEN** 前端展示立项阶段
- **THEN** 系统 MUST 继续支持项目输入、项目市场调研、项目立项审批和项目立项通知节点
- **AND** 系统 MUST 继续支持立项阶段节点到 `1.1`、`1.2`、`1.3` 产出的映射

#### Scenario: 其他阶段暂不完整映射
- **WHEN** 前端展示其他 7 个阶段
- **THEN** 系统 MAY 返回占位、旧资料清单入口或后续配置状态
- **AND** 系统 MUST NOT 要求本 change 补齐其他 7 个阶段完整蓝色节点映射
- **AND** 系统 MUST NOT 要求本 change 将其他阶段产出在线表单化

### Requirement: 蓝色节点状态和产出入口边界

系统 MUST 将蓝色节点作为阶段内业务语境入口，节点状态 MUST 从产出、在线表单、评价/审批、返工和 `completionMode` 派生，不得为项目入口调整新增独立节点完成状态。

#### Scenario: 节点状态派生
- **WHEN** 系统向前端提供蓝色节点状态
- **THEN** 节点状态 MUST 从关联产出、在线表单状态、评价/审批状态、返工状态和 `completionMode` 派生
- **AND** 系统 MUST NOT 因本 change 新增独立蓝色节点完成状态

#### Scenario: 节点产出工作区数据
- **WHEN** 前端展示节点产出工作区
- **THEN** 系统 MUST 继续通过现有阶段资料清单、项目工作区和在线表单接口提供产出名称、资料状态、完成状态、责任人、阻塞原因和可操作权限
- **AND** 系统 MUST NOT 要求新增专用产出工作区接口作为第一版前置条件
