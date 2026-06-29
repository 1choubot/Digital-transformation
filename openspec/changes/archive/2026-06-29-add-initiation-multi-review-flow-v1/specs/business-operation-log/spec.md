## MODIFIED Requirements

### Requirement: 业务日志动作和目标类型

系统 MUST 使用稳定的 `action_type` 和 `target_type` 表示第一版业务操作日志类型，并 MUST 为精准返工请求、返工完成和 `1.2 项目立项审批表` 多节点审批增加稳定日志动作。

#### Scenario: 支持 1.2 多节点审批动作

- **WHEN** 普通 `1.2 项目立项审批表` 资料提交触发多节点激活、节点通过、节点退回、返工清除后的节点恢复或最终完成动作
- **THEN** 系统 MUST 记录稳定 `action_type` 的项目业务操作日志
- **AND** `target_type` SHOULD 使用 `initiation_review`、`stage_document` 或等价可区分 `1.2` 节点审批的目标类型

#### Scenario: 支持 1.2 建议动作类型

- **WHEN** 系统记录 `1.2 项目立项审批表` 多节点审批日志
- **THEN** 日志动作类型 MAY 使用 `initiation_review.submitted`
- **AND** 日志动作类型 MAY 使用 `initiation_review.business_approved`、`initiation_review.business_returned`
- **AND** 日志动作类型 MAY 使用 `initiation_review.technical_approved`、`initiation_review.technical_returned`
- **AND** 日志动作类型 MAY 使用 `initiation_review.general_approved`、`initiation_review.general_returned`
- **AND** 日志动作类型 MAY 使用 `initiation_review.completed`

#### Scenario: initiation_review.submitted 表示普通资料提交后启动

- **WHEN** 系统记录 `initiation_review.submitted`
- **THEN** 该日志 MUST 表示普通 `1.2 项目立项审批表` 资料提交或上传后，多节点审批被启动或节点被激活
- **AND** 该日志 MUST NOT 表示新增了独立前端节点提交按钮
- **AND** 该日志 MUST NOT 表示独立于普通资料提交的节点提交流程

#### Scenario: 1.2 节点失败不写成功日志

- **WHEN** 普通 `1.2` 资料提交触发多节点激活、节点通过、节点退回、返工清除后的节点恢复或最终完成因权限、状态、参数、返工门禁或业务校验失败
- **THEN** 系统不得写入对应成功业务操作日志

### Requirement: 业务日志结构化详情

系统 MUST 在 `details_json` 中保存第一版业务动作所需的结构化上下文，并 MUST 为精准返工日志和 `1.2` 多节点审批日志保存来源资料、审批节点、原因、操作人和时间等可审计信息。

#### Scenario: 1.2 节点审批详情

- **WHEN** 系统记录 `1.2 项目立项审批表` 节点审批日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`nodeKey`、`nodeName`、`fromStatus`、`toStatus`、`actorUserId` 和 `operatedAt`
- **AND** 审批通过日志 MUST 能保存审批意见或等价备注
- **AND** 审批退回日志 MUST 保存退回原因

#### Scenario: 前置退回导致总经理节点失效可审计

- **WHEN** `business_review` 或 `technical_review` 退回导致已生成或已通过的 `general_review` 失效、清空或回到未开始
- **THEN** 对应业务日志 `details_json` MUST 能表达被失效节点、失效前状态和失效原因

#### Scenario: 并行已通过节点保留可审计

- **WHEN** `business_review` 或 `technical_review` 退回且并行另一侧已通过结果保留
- **THEN** 对应业务日志 `details_json` MUST 能表达保留的并行节点和其审批状态

#### Scenario: 总经理退回不要求前置重跑可审计

- **WHEN** `general_review` 退回且 `business_review`、`technical_review` 已通过结果保留
- **THEN** 对应业务日志 `details_json` MUST 能表达前置节点已通过结果被保留

#### Scenario: 1.2 触发精准返工日志关联

- **WHEN** `1.2` 节点退回触发 `1.1 项目需求表` 精准返工
- **THEN** `1.2` 节点退回日志 MUST 能关联来源 `1.2` 审批资料
- **AND** `document.revision_requested` 日志 MUST 能关联目标 `1.1` 返工资料
- **AND** 两类日志 MUST 能共同审计退回原因、返工原因、操作人和时间

### Requirement: 业务日志事务一致性

系统 MUST 保证关键业务状态变更与对应业务操作日志在同一事务中提交；`1.2` 多节点审批状态、精准返工字段和业务日志也 MUST 保持事务一致。

#### Scenario: 1.2 多节点激活和审批日志同事务

- **WHEN** 普通 `1.2 项目立项审批表` 资料提交触发多节点激活、节点通过、节点退回或返工清除后的节点恢复成功
- **THEN** 节点状态变更和对应业务日志写入 MUST 在同一事务中提交

#### Scenario: 1.2 退回返工日志同事务

- **WHEN** `1.2` 节点退回成功并标记 `1.1 revision_required = true`
- **THEN** 节点退回状态、`1.1` 返工字段和 `document.revision_requested` 业务日志 MUST 在同一事务中提交
- **AND** 任一日志写入失败 MUST 回滚节点状态和返工字段变更

#### Scenario: 1.2 最终完成日志同事务

- **WHEN** `1.2` 商务评价、技术评价和总经理审批均最终通过并满足无返工门禁
- **THEN** 系统 MUST 在同一事务中记录 `initiation_review.completed` 或等价最终完成日志

## ADDED Requirements

### Requirement: 1.2 多节点审批业务日志

系统 MUST 为 `1.2 项目立项审批表` 多节点审批提供结构化、可追溯的项目业务操作日志。

#### Scenario: 商务评价日志

- **WHEN** 商务评价审批通过或退回
- **THEN** 系统 MUST 记录商务评价节点、审批动作、审批人、意见或退回原因和时间

#### Scenario: 技术评价日志

- **WHEN** 技术评价审批通过或退回
- **THEN** 系统 MUST 记录技术评价节点、审批动作、审批人、意见或退回原因和时间

#### Scenario: 总经理审批日志

- **WHEN** 总经理审批通过或退回
- **THEN** 系统 MUST 记录总经理审批节点、审批动作、审批人、意见或退回原因和时间

#### Scenario: 总经理节点失效日志上下文

- **WHEN** 商务评价或技术评价退回导致总经理节点失效
- **THEN** 系统 MUST 通过节点退回日志或等价业务日志上下文记录总经理节点失效事实
- **AND** 系统 MUST NOT 因记录该上下文新增复杂 action type

#### Scenario: 最终完成日志

- **WHEN** `1.2` 所有必需节点通过且相关返工清除
- **THEN** 系统 MUST 记录 `1.2` 多节点审批最终完成日志

#### Scenario: 不做通知推送

- **WHEN** 系统记录 `1.2` 多节点审批业务日志
- **THEN** 系统 MUST NOT 因日志动作发送推送通知、站内信、短信或邮件
