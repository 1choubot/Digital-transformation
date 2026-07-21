## MODIFIED Requirements

### Requirement: 项目预付款支付节点
合同签订 workflow MUST 在 `advance_payment` 节点支持商务负责人处理预付款完成或申请总经理放行，并 MUST 在三个预付款最终动作确认后生成 C25 项目启动通知文件、完成合同阶段并自动推进详细设计。

#### Scenario: 商务负责人完成支付并生成项目启动通知
- **WHEN** 商务负责人在项目预付款支付节点选择完成支付
- **AND** 前端完成用户确认
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 系统 MUST 生成 C25 `项目启动通知` 文件
- **AND** 系统 MUST 将 C25 项目启动通知资料完成结果置为完成
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 自动推进 MUST 调用统一阶段门禁，不得直接手写项目阶段字段绕过门禁
- **AND** 完成后系统 MUST NOT 继续返回完成支付或申请总经理放行权限

#### Scenario: 未完成支付等待总经理放行
- **WHEN** 商务负责人在项目预付款支付节点选择未完成支付，待总经理审批
- **THEN** 系统 MUST 进入总经理放行等待状态
- **AND** 项目 MUST 停留在项目预付款支付节点直到总经理选择一种通过结果
- **AND** 系统 MUST 将 `advance_payment` 节点状态和 `paymentFlow.status` 置为 `waiting_general_manager`
- **AND** 节点阻塞原因 MUST 显示 `等待总经理审批预付款放行`
- **AND** 系统 MUST NOT 在申请等待时生成 C25 项目启动通知

#### Scenario: 只有总经理可处理等待放行
- **WHEN** 项目处于总经理放行等待状态
- **THEN** 只有总经理 MUST 能执行未付款并通过或已付款通过动作
- **AND** 非总经理用户 MUST NOT 能绕过该等待状态进入详细设计阶段
- **AND** 总经理通过权限 MUST 只在 `advance_payment` 和 `paymentFlow` 均处于 `waiting_general_manager` 时返回

#### Scenario: 总经理未付款并通过并生成项目启动通知
- **WHEN** 总经理选择未付款并通过
- **AND** 前端完成用户确认
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `released`
- **AND** 系统 MUST 生成 C25 `项目启动通知` 文件
- **AND** 系统 MUST 将 C25 项目启动通知资料完成结果置为完成
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 放行后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 总经理已付款通过并生成项目启动通知
- **WHEN** 总经理选择已付款通过
- **AND** 前端完成用户确认
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 系统 MUST 生成 C25 `项目启动通知` 文件
- **AND** 系统 MUST 将 C25 项目启动通知资料完成结果置为完成
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 通过后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 生成失败不得部分完成预付款最终动作
- **WHEN** 任一预付款最终动作触发 C25 项目启动通知生成
- **AND** 生成文件或文件存储失败
- **THEN** 系统 MUST 拒绝该最终动作并返回明确错误
- **AND** 系统 MUST NOT 将 `advance_payment` 节点置为完成
- **AND** 系统 MUST NOT 完成 C25 资料结果
- **AND** 系统 MUST NOT 推进到详细设计阶段

#### Scenario: 生成后可下载项目启动通知
- **WHEN** C25 项目启动通知已由预付款最终动作生成成功
- **THEN** 有合同 workflow 查看权限且后端授权的用户 MUST 能下载当前生成文件
- **AND** 下载接口 MUST 返回 generated file 的文件名、MIME 类型和文件内容
- **AND** 未生成、生成失败或生成文件存储缺失时 MUST 拒绝下载并返回明确错误

#### Scenario: 未执行最终确认不能手工推进
- **WHEN** 用户手工请求推进合同签订阶段
- **AND** 项目预付款支付节点尚未完成任一最终动作
- **THEN** 系统 MUST 拒绝推进到详细设计阶段
- **AND** 系统 MUST 在门禁详情中返回 `项目启动通知未生成完成` 或等价阻塞原因
- **AND** 系统 MUST NOT 通过普通资料卡片、旧独立节点、前端状态或 C24 发票资料判断该门禁

#### Scenario: 旧笼统放行入口不能代替总经理选择
- **WHEN** 系统收到旧的笼统总经理放行动作
- **THEN** 系统 MUST 拒绝该动作并返回 409 或 410
- **AND** 错误信息 MUST 提示总经理改用未付款并通过或已付款通过
- **AND** 系统 MUST NOT 将旧动作默认映射为未付款并通过
- **AND** 系统 MUST NOT 改变 `advance_payment` 节点状态、`paymentFlow.status`、C25 生成文件或项目当前阶段

#### Scenario: 合同阶段主流程只有三个节点
- **WHEN** 系统初始化或查询合同签订 workflow
- **THEN** 系统 MUST 只返回准备协议和合同、签订协议和合同、项目预付款支付三个主流程节点
- **AND** 系统 MUST NOT 返回独立项目启动通知主流程节点
- **AND** 系统 MUST NOT 返回旧蓝图节点作为合同主流程节点

#### Scenario: 项目启动通知不新增资料项
- **WHEN** 系统同步项目启动通知到阶段资料完成结果
- **THEN** 系统 MUST 映射到既有 C25 稳定资料编码
- **AND** 生成文件 MUST 作为 C25 的产出形态
- **AND** 系统 MUST NOT 新增资料项或改变 v20260629 71 项资料总数
- **AND** 系统 MUST NOT 新增第 72 项资料

#### Scenario: 项目启动通知项目名称使用组合展示值
- **WHEN** 系统生成 C25 项目启动通知文件
- **THEN** 模板内项目名称字段 MUST 使用 `项目编号+客户名称-项目名`
- **AND** 项目编号、客户名称和项目名均存在时 MUST 生成类似 `KRF25037金风-智能力矩扳手项目` 的展示值
- **AND** 缺客户名时 MUST 使用 `项目编号-项目名`
- **AND** 缺项目编号时 MUST 使用 `客户名称-项目名`
- **AND** 只剩项目名时 MUST 使用项目名
- **AND** 全缺时 MUST 使用 `未命名项目`
- **AND** 系统 MUST 去除首尾空白并避免多余 `-`

## REMOVED Requirements

### Requirement: 项目启动通知节点

**Reason**: 项目启动通知不再作为合同签订阶段独立主流程节点，改由项目预付款支付节点的三个最终确认动作生成并完成 C25。

**Migration**: 删除或隐藏独立节点入口；历史 C25 数据保留为资料产出，后续主流程导航和阶段推进均以三节点合同 workflow、预付款最终动作和 C25 generated file 为准。
