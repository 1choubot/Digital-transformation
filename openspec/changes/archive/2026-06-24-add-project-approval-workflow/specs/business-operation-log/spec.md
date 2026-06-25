## ADDED Requirements

### Requirement: 阶段审批流业务日志动作
系统 MUST 在阶段审批流成功动作后记录项目业务操作日志，并 MUST 使用稳定的 `action_type` 和 `target_type`。

#### Scenario: 提交审批记录业务日志
- **WHEN** 项目经理成功提交阶段审批
- **THEN** 系统必须记录 `action_type = approval.submitted` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 中心负责人审批通过记录业务日志
- **WHEN** 中心负责人成功通过阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.center_approved` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 中心负责人审批退回记录业务日志
- **WHEN** 中心负责人成功退回阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.center_returned` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 总经理审批通过记录业务日志
- **WHEN** 总经理成功通过阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.general_approved` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 总经理审批退回记录业务日志
- **WHEN** 总经理成功退回阶段审批节点
- **THEN** 系统必须记录 `action_type = approval.general_returned` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 重新提交审批记录业务日志
- **WHEN** 项目经理成功重新提交已退回阶段审批
- **THEN** 系统必须记录 `action_type = approval.resubmitted` 且 `target_type = approval` 的项目业务操作日志

#### Scenario: 审批历史查询不写业务日志
- **WHEN** 用户查询阶段审批历史
- **THEN** 系统不得写入项目业务操作日志

#### Scenario: 审批失败不写成功日志
- **WHEN** 审批提交、审批通过、审批退回或重新提交因权限、状态、参数或齐套校验失败
- **THEN** 系统不得写入对应审批成功业务操作日志

### Requirement: 阶段审批流日志详情
系统 MUST 在审批流业务日志 `details_json` 中保存审批动作所需的结构化上下文。

#### Scenario: 审批提交日志详情
- **WHEN** 系统记录 `approval.submitted` 或 `approval.resubmitted`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`fromApprovalStatus`、`toApprovalStatus` 和 `completenessSummary`

#### Scenario: 审批通过日志详情
- **WHEN** 系统记录 `approval.center_approved` 或 `approval.general_approved`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`approvalRole`、`fromApprovalStatus`、`toApprovalStatus` 和 `comment`

#### Scenario: 审批退回日志详情
- **WHEN** 系统记录 `approval.center_returned` 或 `approval.general_returned`
- **THEN** `details_json` 必须至少包含 `approvalId`、非空 `stageId`、`approvalNode`、`approvalRole`、`fromApprovalStatus`、`toApprovalStatus` 和 `returnReason`

#### Scenario: 审批节点来自当前阶段规则
- **WHEN** 系统记录阶段审批业务日志
- **THEN** `details_json.approvalNode` 必须是当前阶段第一版审批节点规则确定的审批节点

#### Scenario: 审批日志中文摘要
- **WHEN** 系统记录阶段审批流业务日志
- **THEN** 系统必须保存可读中文 `summary`，并表达审批节点、审批动作和主要目标

### Requirement: 阶段审批流日志事务一致性
系统 MUST 保证审批状态变更、审批记录写入和对应业务操作日志在同一事务中提交。

#### Scenario: 审批提交日志同事务
- **WHEN** 项目经理成功提交或重新提交审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批通过日志同事务
- **WHEN** 中心负责人或总经理成功通过审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批退回日志同事务
- **WHEN** 中心负责人或总经理成功退回审批
- **THEN** 审批状态变更、审批记录写入和业务日志写入必须在同一事务中提交

#### Scenario: 审批日志失败回滚审批变更
- **WHEN** 审批状态变更或审批记录已经准备提交但业务日志写入失败
- **THEN** 系统必须回滚审批状态变更和审批记录，不得出现审批成功但缺少业务日志的结果

#### Scenario: 审批记录和业务日志同事务
- **WHEN** 阶段审批成功动作写入审批历史记录
- **THEN** 审批历史记录和对应项目业务操作日志必须在同一事务中提交

#### Scenario: 审批日志不触发其他能力
- **WHEN** 系统记录阶段审批流业务日志
- **THEN** 系统不得因日志写入发送通知、创建个人待办、调用文件管理平台、填写在线表单、生成日报周报或自动推进阶段
