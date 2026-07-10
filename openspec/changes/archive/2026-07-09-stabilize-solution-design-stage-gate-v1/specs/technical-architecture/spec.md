## ADDED Requirements

### Requirement: 专用 workflow 必须挂接通用阶段门禁
技术架构 MUST 要求阶段内专用 workflow 的完成结果接入通用阶段齐套和阶段推进派生完成规则。

#### Scenario: 专用 workflow 接入阶段齐套
- **WHEN** 某阶段资料由专用 workflow 管理
- **THEN** 架构 MUST 提供派生完成规则、配置或插件机制，将专用 workflow 结果映射到通用阶段资料齐套
- **AND** 架构 MUST NOT 只完成专用 workflow 而让通用阶段推进门禁继续读取失效的普通资料基础状态

#### Scenario: 方案设计 C04-C19 作为派生完成样板
- **WHEN** 系统计算方案设计阶段 C04-C19 的完成结果
- **THEN** 架构 MUST 从方案设计节点、上传槽、在线表单生成文件、审批结果和报价/投标分支状态派生完成
- **AND** 架构 MUST 保持普通资料基础状态与派生完成状态可区分

#### Scenario: 不通过批量状态写回制造完成假象
- **WHEN** 专用 workflow 完成
- **THEN** 架构 SHOULD 优先通过派生规则参与齐套和推进
- **AND** 架构 MUST NOT 依赖批量修改普通资料状态来绕开专用 workflow 与通用门禁断链

### Requirement: 后续阶段复用共享阶段机制
技术架构 MUST 约束后续阶段实现优先复用共享阶段资料、齐套、推进和权限机制，而不是默认新建孤立的阶段专属状态机。

#### Scenario: 新阶段特殊流程挂接共享机制
- **WHEN** 后续阶段需要特殊流程、审批或上传槽
- **THEN** 架构 MUST 优先以派生规则、配置或插件方式挂接通用阶段资料齐套和阶段推进门禁
- **AND** 架构 MUST 明确该特殊流程如何影响通用资料完成、缺失资料列表和阶段推进

#### Scenario: 避免重复专用状态机
- **WHEN** 一个阶段可以用共享阶段资料机制表达
- **THEN** 架构 SHOULD 复用现有阶段资料、在线表单、上传、审批和推进能力
- **AND** 架构 SHOULD NOT 默认复制方案设计式的完整专用状态机

### Requirement: 权限 resolver 收敛
技术架构 MUST 将阶段资料、专用 workflow、工作台待办和阶段推进的权限判断逐步收敛到统一 resolver。

#### Scenario: 权限来源统一
- **WHEN** 系统判断用户是否可查看、上传、提交、审批、退回或推进阶段
- **THEN** 架构 SHOULD 复用共享权限上下文和 resolver
- **AND** 架构 SHOULD 避免在不同仓储、路由或前端组件中分散复制角色判断

#### Scenario: 前端只消费后端权限结果
- **WHEN** 前端展示阶段资料、专用 workflow 或阶段推进入口
- **THEN** 前端 MUST 使用后端返回的权限和阻塞原因
- **AND** 前端 MUST NOT 使用本地硬编码规则绕过统一权限 resolver
