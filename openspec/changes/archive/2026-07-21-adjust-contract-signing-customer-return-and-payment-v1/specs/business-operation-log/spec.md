## MODIFIED Requirements

### Requirement: 合同签订 workflow 日志
系统 MUST 为合同签订 workflow 的上传、审批、客户退回、签订完成、预付款放行、项目启动通知和自动推进详细设计记录业务日志。

#### Scenario: 技术协议上传日志
- **WHEN** 技术负责人成功上传技术协议
- **THEN** 系统 MUST 记录技术协议上传业务日志
- **AND** 日志 MUST 包含项目 ID、节点、上传槽、文件 revision、操作人和操作时间

#### Scenario: 技术协议审批日志
- **WHEN** 研发中心负责人审批通过或不通过技术协议
- **THEN** 系统 MUST 记录技术协议审批通过或不通过业务日志
- **AND** 不通过日志 MUST 包含退回原因和返回技术协议准备线的上下文

#### Scenario: 销售合同上传日志
- **WHEN** 商务负责人成功上传销售合同
- **THEN** 系统 MUST 记录销售合同上传业务日志
- **AND** 日志 MUST 包含项目 ID、节点、上传槽、文件 revision、操作人和操作时间

#### Scenario: 销售合同审批日志
- **WHEN** 营销中心负责人审批通过或不通过销售合同
- **THEN** 系统 MUST 记录销售合同审批通过或不通过业务日志
- **AND** 不通过日志 MUST 包含退回原因和返回销售合同准备线的上下文

#### Scenario: 扫描件上传日志
- **WHEN** 商务负责人成功上传技术协议扫描件或销售合同扫描件
- **THEN** 系统 MUST 分别记录技术协议扫描件上传或销售合同扫描件上传业务日志
- **AND** 日志 MUST 包含项目 ID、节点、上传槽、文件 revision、操作人和操作时间

#### Scenario: 客户退回源合同日志
- **WHEN** 商务负责人在签订协议和合同节点退回技术协议或销售合同
- **THEN** 系统 MUST 分别记录客户退回技术协议或客户退回销售合同业务日志
- **AND** 日志 MUST 包含只退回对应准备线、对应扫描件失效、操作人和退回原因

#### Scenario: 签订完成日志
- **WHEN** 商务负责人在两个扫描件已上传且准备线均通过后完成签订节点
- **THEN** 系统 MUST 记录签订协议和合同完成业务日志
- **AND** 日志 MUST 包含 C21/C23 派生完成和进入项目预付款支付节点的上下文

#### Scenario: 预付款处理日志
- **WHEN** 商务负责人选择预付款完成
- **THEN** 系统 MUST 记录预付款完成业务日志
- **AND** 商务负责人选择未完成支付待总经理审批时系统 MUST 记录未付款申请总经理放行业务日志
- **AND** 前端操作日志 MUST 将预付款完成和未付款申请总经理放行 action type 映射为中文文案

#### Scenario: 总经理两种通过日志
- **WHEN** 总经理选择未付款并通过
- **THEN** 系统 MUST 记录总经理未付款放行通过业务日志
- **AND** 日志 MUST 包含项目 ID、节点、操作人、时间和 `paymentFlow.status=released`
- **WHEN** 总经理选择已付款通过
- **THEN** 系统 MUST 记录总经理确认已付款通过业务日志
- **AND** 日志 MUST 包含项目 ID、节点、操作人、时间和 `paymentFlow.status=completed`
- **AND** 前端操作日志 MUST 将两种通过 action type 分别映射为中文文案

#### Scenario: 项目启动通知和自动推进日志
- **WHEN** 商务负责人成功上传项目启动通知
- **THEN** 系统 MUST 记录项目启动通知上传业务日志
- **AND** 系统自动推进到详细设计阶段时 MUST 记录自动推进到详细设计阶段业务日志
- **AND** 自动推进日志 MAY 复用 `stage.advanced` action type
- **AND** 自动推进日志 details MUST 包含 `triggerAction=contract_signing.project_kickoff_notice_uploaded`、节点、上传槽、C25、file/revision 上下文
- **AND** 前端操作日志 MUST 将项目启动通知上传 action type 映射为中文文案
