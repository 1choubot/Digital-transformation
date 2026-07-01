## ADDED Requirements

### Requirement: 项目工作区和立项在线表单业务日志

系统 MUST 为项目轻量创建、立项阶段在线表单提交、`1.2` 评价/审批和 `1.3` 提交保留结构化业务日志能力；节点视图本身作为导航和展示入口时不要求写入查看日志。

#### Scenario: 轻量创建日志
- **WHEN** 用户成功创建只包含项目名称、客户和客户联系方式的项目
- **THEN** 系统 MUST 记录 `project.created` 或等价项目创建日志
- **AND** 日志 MUST 能表达创建时项目编号、项目经理、项目模式、参与中心、计划时间和立项日期可以为空

#### Scenario: 节点查看不强制记日志
- **WHEN** 用户仅在项目工作区切换阶段或蓝色节点查看状态
- **THEN** 系统 MAY 不记录 `stage_node.view` 或等价查看日志
- **AND** 系统 MUST NOT 因查看节点而改变任何业务状态

#### Scenario: 在线表单更新和提交日志
- **WHEN** 用户保存、更新或提交 `1.1`、`1.2` 或 `1.3` 在线表单
- **THEN** 系统 MUST 记录 `form.updated`、`form.submitted` 或等价稳定业务日志动作
- **AND** 日志 MUST 能关联项目、阶段、资料项、表单、操作人和操作时间

#### Scenario: 日志不放宽操作权限
- **WHEN** 系统记录项目工作区、在线表单、评价或审批日志
- **THEN** 系统 MUST NOT 因日志查看权或节点查看权放宽资料提交、评价、审批、阶段推进或项目编号填写权限

## MODIFIED Requirements

### Requirement: 业务日志动作和目标类型

系统 MUST 使用稳定的 `action_type` 和 `target_type` 表示第一版业务操作日志类型，并 MUST 为精准返工请求、返工完成、立项在线表单和 `1.2 项目立项审批表` 评价/最终审批增加稳定日志动作。

#### Scenario: 支持立项在线表单动作

- **WHEN** 用户保存或提交 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知` 在线表单
- **THEN** 系统 MUST 记录稳定 `action_type` 的项目业务操作日志
- **AND** `target_type` MUST 能区分在线表单、阶段资料或等价业务目标

#### Scenario: 支持 1.2 评价和审批动作

- **WHEN** 营销中心负责人提交营销评价、研发中心负责人提交研发评价、总经理审批通过或总经理审批不通过
- **THEN** 系统 MUST 记录稳定 `action_type` 的项目业务操作日志
- **AND** `target_type` SHOULD 使用 `initiation_review`、`stage_document`、`online_form` 或等价可区分 `1.2` 评价/审批的目标类型

#### Scenario: 支持 1.2 建议动作类型

- **WHEN** 系统记录 `1.2 项目立项审批表` 评价/审批日志
- **THEN** 日志动作类型 MAY 使用 `initiation.evaluation.submitted`
- **AND** 日志动作类型 MAY 使用 `initiation.approval.approved`
- **AND** 日志动作类型 MAY 使用 `initiation.approval.returned`
- **AND** 日志动作类型 MAY 使用 `initiation.completed`
- **AND** 日志动作类型 MAY 使用 `document.revision_requested` 表达总经理不通过触发的 `1.1` 返工

#### Scenario: 1.2 失败操作不写成功日志

- **WHEN** `1.2` 表单提交、评价提交、总经理审批、返工请求或最终完成因权限、状态、参数、返工门禁或业务校验失败
- **THEN** 系统不得写入对应成功业务操作日志

### Requirement: 业务日志结构化详情

系统 MUST 在 `details_json` 中保存第一版业务动作所需的结构化上下文，并 MUST 为精准返工日志和 `1.2` 评价/审批日志保存来源资料、评价/审批动作、原因、操作人和时间等可审计信息。

#### Scenario: 在线表单日志详情

- **WHEN** 系统记录立项阶段在线表单保存或提交日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`formKey`、`fromStatus`、`toStatus`、`actorUserId` 和 `operatedAt`

#### Scenario: 1.2 评价详情

- **WHEN** 系统记录营销评价或研发评价日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`evaluationType`、`evaluatorUserId`、`evaluationText` 和 `evaluatedAt`
- **AND** `evaluationType` MUST 能区分营销评价和研发评价

#### Scenario: 1.2 总经理审批详情

- **WHEN** 系统记录总经理最终审批通过或不通过日志
- **THEN** `details_json` MUST 至少包含 `projectId`、`stageDocumentId`、`documentCode`、`documentName`、`approvalResult`、`approverUserId`、`approvalOpinion` 和 `approvedAt`
- **AND** 审批不通过日志 MUST 能关联 `1.1 项目需求表` 返工目标和 `1.2` 需重新填写状态

#### Scenario: 1.2 触发精准返工日志关联

- **WHEN** `1.2` 总经理审批不通过触发 `1.1 项目需求表` 精准返工
- **THEN** `initiation.approval.returned` 或等价审批不通过日志 MUST 能关联来源 `1.2` 审批资料
- **AND** `document.revision_requested` 日志 MUST 能关联目标 `1.1` 返工资料
- **AND** 两类日志 MUST 能共同审计退回原因、返工原因、操作人和时间

### Requirement: 1.2 多节点审批业务日志

系统 MUST 为 `1.2 项目立项审批表` 的营销评价、研发评价和总经理最终审批提供结构化、可追溯的项目业务操作日志。

#### Scenario: 营销评价日志

- **WHEN** 营销中心负责人提交营销评价文本
- **THEN** 系统 MUST 记录营销评价动作、评价人、评价文本和时间
- **AND** 系统 MUST NOT 将营销评价记录为审批通过或审批退回

#### Scenario: 研发评价日志

- **WHEN** 研发中心负责人提交研发评价文本
- **THEN** 系统 MUST 记录研发评价动作、评价人、评价文本和时间
- **AND** 系统 MUST NOT 将研发评价记录为审批通过或审批退回

#### Scenario: 总经理审批通过日志

- **WHEN** 总经理最终审批通过 `1.2 项目立项审批表`
- **THEN** 系统 MUST 记录总经理审批通过动作、审批人、审批意见和时间

#### Scenario: 总经理审批不通过日志

- **WHEN** 总经理最终审批不通过 `1.2 项目立项审批表`
- **THEN** 系统 MUST 记录总经理审批不通过动作、审批人、审批意见和时间
- **AND** 系统 MUST 记录其触发 `1.1` 返工和 `1.2` 重新填写的上下文

#### Scenario: 最终完成日志

- **WHEN** `1.2` 在线表单已提交、营销评价完成、研发评价完成、总经理审批通过且相关返工清除
- **THEN** 系统 MUST 记录 `1.2` 最终完成日志

#### Scenario: 不做通知推送

- **WHEN** 系统记录 `1.2` 评价/审批业务日志
- **THEN** 系统 MUST NOT 因该日志动作发送推送通知、站内信、短信或邮件
