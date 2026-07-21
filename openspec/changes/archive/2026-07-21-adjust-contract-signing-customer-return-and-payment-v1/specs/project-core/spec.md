## MODIFIED Requirements

### Requirement: 签订协议和合同节点
合同签订 workflow MUST 在 `contract_signing` 节点支持商务负责人退回客户不接受的源合同文件、上传扫描件，并在两份扫描件齐备后统一完成签订节点。

#### Scenario: 上传扫描件
- **WHEN** 项目位于签订协议和合同节点
- **THEN** 商务负责人 MUST 能上传技术协议扫描件
- **AND** 商务负责人 MUST 能上传销售合同扫描件
- **AND** 商务负责人 MUST 能下载已上传的技术协议扫描件和销售合同扫描件 current file
- **AND** 已完成签订节点后扫描件 MUST NOT 再展示重复上传入口

#### Scenario: 客户退回技术协议只退回技术准备线
- **WHEN** 商务负责人在签订协议和合同节点选择客户退回技术协议
- **THEN** 系统 MUST 只退回技术协议准备线
- **AND** 销售合同准备线 MUST 保持已通过状态
- **AND** 对应技术协议扫描件 current file 和完成状态 MUST 失效
- **AND** 技术协议重新上传并经研发中心负责人审批通过前，系统 MUST NOT 允许完成签订节点

#### Scenario: 客户退回销售合同只退回销售准备线
- **WHEN** 商务负责人在签订协议和合同节点选择客户退回销售合同
- **THEN** 系统 MUST 只退回销售合同准备线
- **AND** 技术协议准备线 MUST 保持已通过状态
- **AND** 对应销售合同扫描件 current file 和完成状态 MUST 失效
- **AND** 销售合同重新上传并经营销中心负责人审批通过前，系统 MUST NOT 允许完成签订节点

#### Scenario: 签订节点完成
- **WHEN** 技术协议扫描件和销售合同扫描件都已上传
- **AND** 技术协议准备线和销售合同准备线都处于已通过状态
- **THEN** 商务负责人 MUST 能执行签订完成动作
- **AND** 系统 MUST 将签订协议和合同节点置为完成
- **AND** 系统 MUST 将 C21 技术协议扫描件和 C23 销售合同扫描件派生为完成
- **AND** 系统 MUST 激活项目预付款支付节点

#### Scenario: 签订节点未满足条件不能完成
- **WHEN** 任一扫描件未上传
- **OR** 任一准备线处于客户退回后待重走状态
- **THEN** 系统 MUST NOT 允许完成签订协议和合同节点
- **AND** DTO MUST 返回明确阻塞原因

#### Scenario: 不再暴露扫描件确认权限
- **WHEN** 系统返回签订协议和合同节点 DTO
- **THEN** DTO MUST NOT 暴露扫描件确认通过或确认不通过权限
- **AND** 系统 MUST NOT 将扫描件处理表述为审批或确认线下签署结果通过/不通过

### Requirement: 项目预付款支付节点
合同签订 workflow MUST 在 `advance_payment` 节点支持商务负责人处理预付款完成或申请总经理放行，并 MUST 在总经理等待状态区分未付款放行和已付款通过两种结果。

#### Scenario: 商务负责人完成支付
- **WHEN** 商务负责人在项目预付款支付节点选择完成支付
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 激活项目启动通知节点
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 完成后系统 MUST NOT 继续返回完成支付或申请总经理放行权限

#### Scenario: 未完成支付等待总经理放行
- **WHEN** 商务负责人在项目预付款支付节点选择未完成支付，待总经理审批
- **THEN** 系统 MUST 进入总经理放行等待状态
- **AND** 项目 MUST 停留在项目预付款支付节点直到总经理选择一种通过结果
- **AND** 系统 MUST 将 `advance_payment` 节点状态和 `paymentFlow.status` 置为 `waiting_general_manager`
- **AND** 节点阻塞原因 MUST 显示 `等待总经理审批预付款放行`

#### Scenario: 只有总经理可处理等待放行
- **WHEN** 项目处于总经理放行等待状态
- **THEN** 只有总经理 MUST 能执行未付款并通过或已付款通过动作
- **AND** 非总经理用户 MUST NOT 能绕过该等待状态进入项目启动通知节点
- **AND** 总经理通过权限 MUST 只在 `advance_payment` 和 `paymentFlow` 均处于 `waiting_general_manager` 时返回

#### Scenario: 总经理未付款并通过
- **WHEN** 总经理选择未付款并通过
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 激活项目启动通知节点
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `released`
- **AND** 放行后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 总经理已付款通过
- **WHEN** 总经理选择已付款通过
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 激活项目启动通知节点
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 通过后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 旧笼统放行入口不能代替总经理选择
- **WHEN** 系统收到旧的笼统总经理放行动作
- **THEN** 系统 MUST 拒绝该动作并返回 409 或 410
- **AND** 错误信息 MUST 提示总经理改用未付款并通过或已付款通过
- **AND** 系统 MUST NOT 将旧动作默认映射为未付款并通过
- **AND** 系统 MUST NOT 改变 `advance_payment` 节点状态、`paymentFlow.status` 或项目启动通知节点状态
