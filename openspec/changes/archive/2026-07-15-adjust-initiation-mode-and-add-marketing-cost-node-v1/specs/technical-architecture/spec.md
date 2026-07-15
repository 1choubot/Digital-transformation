## MODIFIED Requirements

### Requirement: 方案设计上传槽和版本架构
技术架构 MUST 支持方案设计阶段文件产出、成本估算四段文件和投标书双上传槽的版本化上传。

#### Scenario: 普通文件产出上传槽
- **WHEN** 后续实现方案设计工作计划、产品功能框图、方案设计 8 个产出或报价单
- **THEN** 架构 MUST 使用阶段资料或节点上传槽记录文件、提交人、提交时间、版本、状态和审批关联
- **AND** 架构 MUST 不接外部文件平台

#### Scenario: 成本估算四段上传槽
- **WHEN** 后续实现 C17 成本估算表
- **THEN** 架构 MUST 在一个主资料项下支持研发成本估算、制造成本估算、营销成本估算、财务/运营成本估算四个内部上传槽
- **AND** 每个上传槽 MUST 保留文件版本和审批历史
- **AND** 后一上传槽 MUST 能引用前一上传槽的文件作为制作基础
- **AND** 营销成本估算上传槽 MUST 使用 `marketing_cost_estimation_file`

#### Scenario: 投标书双上传槽
- **WHEN** 后续实现投标流程
- **THEN** 架构 MUST 在投标书产出下支持商务标和技术标两个必填上传槽
- **AND** 架构 MUST 支持两个上传槽均完成后再提交总经理审批
- **AND** 架构 MUST NOT 新增商务标和技术标资料项

### Requirement: 方案设计专用流程与普通资料审核架构边界
技术架构 MUST 将纳入方案设计内部状态机的资料项和上传槽作为专用流程对象处理，普通资料审核不得形成第二套状态来源。

#### Scenario: 专用对象完成状态派生
- **WHEN** 后端计算项目方案分析、C15 内部方案评审、C16 客户方案评审、C17 成本估算、报价或投标相关资料的完成状态
- **THEN** 完成状态 MUST 从方案设计专用节点状态机派生
- **AND** C17 派生 MUST 消费研发、制造、营销、财务四段成本节点和 current 文件齐套结果
- **AND** 阶段推进门禁 MUST 使用专用节点最终状态和专用完成口径

#### Scenario: 普通审核接口拦截
- **WHEN** 用户直接调用普通阶段资料提交、确认或退回接口处理专用流程对象
- **THEN** 后端 MUST 拒绝请求或返回专用流程错误
- **AND** 普通接口 MUST NOT 绕过或替代项目方案分析节点审批、内部方案评审审批、客户方案评审审批、研发成本估算审批、制造成本估算审批、营销成本估算审批、财务负责人审批、总经理财务成本估算审批、商务负责人报价结果处理或投标审批

#### Scenario: 避免双重真相
- **WHEN** 架构设计方案设计节点状态、资料状态、齐套摘要、阶段推进门禁或工作台待办
- **THEN** 架构 MUST 避免普通资料状态与专用节点状态形成双重真相
- **AND** 工作台待办 MUST 来源于专用节点状态，不得同时生成普通资料审核待办和专用节点审批待办

## ADDED Requirements

### Requirement: 立项项目开展模式审批写回架构
技术架构 MUST 将 `1.2` 项目开展模式建模为总经理最终审批通过动作的一部分，并 MUST 写回 `1.2` 表单数据供模板生成使用。

#### Scenario: 总经理审批通过写回表单字段
- **WHEN** 总经理审批通过 `1.2 项目立项审批表`
- **THEN** 后端 MUST 在审批通过事务中校验并写回 `formData.projectExecutionMode`
- **AND** 模板生成 MUST 从 `1.2` 表单数据读取该字段
- **AND** 后端 MUST NOT 将该字段写入 `projects.project_mode`

#### Scenario: 总经理退回不校验项目开展模式
- **WHEN** 总经理退回 `1.2 项目立项审批表`
- **THEN** 后端 MUST NOT 校验 `projectExecutionMode`
- **AND** 后端 MUST 保持既有返工和阻断后续语义

### Requirement: 营销成本估算节点迁移架构
技术架构 MUST 通过正式 migration 扩展方案设计成本估算节点和上传槽枚举，并 MUST 将营销成本估算纳入 C17 专用 workflow。

#### Scenario: 正式 migration 扩展 enum
- **WHEN** 实现营销成本估算节点和上传槽
- **THEN** 系统 MUST 新增正式 migration 扩展 MySQL enum
- **AND** migration MUST 覆盖 `project_solution_design_nodes.node_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_slots.node_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_slots.slot_key`
- **AND** migration MUST 覆盖 `project_solution_design_upload_files.slot_key`
- **AND** 实现 MUST NOT 只依赖 `ensureSolutionDesignWorkflowSchema()`

#### Scenario: 成本链路统一重置范围
- **WHEN** 财务总经理退回成本估算或报价拒绝返回成本链路
- **THEN** 架构 MUST 将研发、制造、营销、财务四段作为统一重置和重提范围
- **AND** 退回后复用旧 current file 的判断 MUST 覆盖营销成本估算上传槽

### Requirement: 1.3 项目立项通知生成架构
技术架构 MUST 将新版 `1.3 项目立项通知` 模板、累计项目清单和项目开展模式列作为后端模板生成能力统一治理。

#### Scenario: 1.3 通知模板注册切换
- **WHEN** 后端注册 `INITIATION_TEMPLATE_KEY.NOTICE`
- **THEN** registry MUST 使用 `项目立项通知-模板.docx`
- **AND** registry MUST NOT 继续指向 `关于确定项目名称及编号的通知-模板.docx`

#### Scenario: 1.3 累计清单逐项目携带开展模式
- **WHEN** 后端生成 `1.3 项目立项通知` 累计项目清单
- **THEN** 每一行 MUST 携带该项目自己的 `projectExecutionMode`
- **AND** 后端 MUST NOT 只用当前项目的 `1.2` 值填充所有行

#### Scenario: 1.3 模板映射开展模式列
- **WHEN** 后端渲染 `项目立项通知-模板.docx`
- **THEN** 模板映射 MUST 将 `projectExecutionMode` 写入“开展模式”列
- **AND** `projectExecutionMode` MUST 仍不写入 `projects.project_mode`
