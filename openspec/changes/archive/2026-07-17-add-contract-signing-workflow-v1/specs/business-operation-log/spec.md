## MODIFIED Requirements

### Requirement: 报价投标业务日志动作
系统 MUST 为报价/投标分支选择、报价、投标和满足进入合同签订阶段门禁记录业务日志。

#### Scenario: 总经理选择报价或投标日志
- **WHEN** 总经理成功选择报价流程或投标流程
- **THEN** 系统 MUST 记录报价/投标分支选择业务日志
- **AND** 日志 MUST 包含选择的分支、操作人和操作时间

#### Scenario: 报价单日志
- **WHEN** 商务负责人成功提交报价单
- **THEN** 系统 MUST 记录报价单提交业务日志
- **AND** 商务负责人确认报价被客户接受时系统 MUST 记录报价被客户接受业务日志

#### Scenario: 报价未被客户接受日志
- **WHEN** 商务负责人记录客户不同意报价
- **THEN** 系统 MUST 记录报价未通过业务日志
- **AND** 商务负责人线下与总经理讨论后选择退回研发成本估算时系统 MUST 记录退回研发成本估算业务日志
- **AND** 商务负责人线下与总经理讨论后选择项目结束时系统 MUST 记录项目结束业务日志

#### Scenario: 投标上传日志
- **WHEN** 商务负责人成功上传投标商务标
- **THEN** 系统 MUST 记录投标商务标提交业务日志
- **AND** 技术负责人成功上传投标技术标时系统 MUST 记录投标技术标提交业务日志

#### Scenario: 投标审批日志
- **WHEN** 总经理审批通过或退回投标书
- **THEN** 系统 MUST 记录投标审批通过或退回业务日志
- **AND** 退回日志 MUST 包含返回投标节点并重提商务标、技术标的上下文

#### Scenario: 进入合同签订门禁日志
- **WHEN** 报价被客户接受或投标书经总经理审批通过
- **THEN** 系统 MUST 将报价/投标节点置为已通过并记录 `solution_design.ready_for_contract` 门禁日志
- **AND** 日志 MUST 关联报价或投标通过的来源动作
- **AND** 后续进入合同签订阶段时系统 MUST 由合同签订 workflow 记录独立合同业务日志

## ADDED Requirements

### Requirement: 合同签订 workflow 日志
系统 MUST 为合同签订 workflow 的上传、审批、签署确认、预付款放行、项目启动通知和自动推进详细设计记录业务日志。

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

#### Scenario: 签署结果确认日志
- **WHEN** 商务负责人确认技术协议扫描件或销售合同扫描件线下签署结果
- **THEN** 系统 MUST 分别记录技术协议扫描件签署确认通过/不通过或销售合同扫描件签署确认通过/不通过日志
- **AND** 不通过日志 MUST 包含只退回对应准备线或两条线都退回的上下文

#### Scenario: 预付款处理日志
- **WHEN** 商务负责人选择预付款完成
- **THEN** 系统 MUST 记录预付款完成业务日志
- **AND** 商务负责人选择未完成支付待总经理审批时系统 MUST 记录未付款申请总经理放行业务日志
- **AND** 前端操作日志 MUST 将预付款完成和未付款申请总经理放行 action type 映射为中文文案

#### Scenario: 总经理放行日志
- **WHEN** 总经理通过预付款放行
- **THEN** 系统 MUST 记录总经理放行通过业务日志
- **AND** 日志 MUST 包含项目 ID、节点、操作人和操作时间
- **AND** 前端操作日志 MUST 将总经理放行通过 action type 映射为中文文案

#### Scenario: 项目启动通知和自动推进日志
- **WHEN** 商务负责人成功上传项目启动通知
- **THEN** 系统 MUST 记录项目启动通知上传业务日志
- **AND** 系统自动推进到详细设计阶段时 MUST 记录自动推进到详细设计阶段业务日志
- **AND** 自动推进日志 MAY 复用 `stage.advanced` action type
- **AND** 自动推进日志 details MUST 包含 `triggerAction=contract_signing.project_kickoff_notice_uploaded`、节点、上传槽、C25、file/revision 上下文
- **AND** 前端操作日志 MUST 将项目启动通知上传 action type 映射为中文文案
