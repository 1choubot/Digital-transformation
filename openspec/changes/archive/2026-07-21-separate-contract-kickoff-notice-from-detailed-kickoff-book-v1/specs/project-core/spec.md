## MODIFIED Requirements

### Requirement: 简单阶段推进边界

系统 MUST 使用当前阶段资料 `completionMode` 完成门禁推进项目阶段，并 MUST 不因 20260625 内部资料闭环引入跳阶段、回退、泛化阶段关口审批或通用工作流引擎；配置的写操作自动推进 MUST 复用同一门禁并且一次最多推进一个阶段。合同签订阶段 MAY 使用本 change 规划的专用 workflow，但该 workflow MUST NOT 成为通用 BPM、任意节点配置器或跨阶段自由编排能力。

#### Scenario: 阶段推进继续基于当前阶段资料门禁
- **WHEN** 已登录且有推进权限的用户请求推进项目当前阶段
- **THEN** 系统必须继续只检查当前阶段适用资料按 `completionMode` 派生出的完成情况，并在满足推进权限和阶段状态后按 8 阶段顺序推进

#### Scenario: 阶段推进不要求当前阶段审批通过
- **WHEN** 用户请求推进项目当前阶段
- **AND** 当前阶段适用资料已经按各自 `completionMode` 完成
- **THEN** 系统 MUST NOT 因缺少泛化阶段关口审批或 `approval_status = approved` 而拒绝阶段推进

#### Scenario: 不新增跳阶段或回退
- **WHEN** 系统按 20260625 内部资料闭环推进项目阶段
- **THEN** 系统不得新增跳阶段、阶段回退、任意选择目标阶段或自由调整阶段顺序能力

#### Scenario: 不新增复杂流程引擎
- **WHEN** 系统实现阶段资料收集、资料审核或阶段推进
- **THEN** 系统不得新增可视化流程编排、任意节点配置器、采购审批流、发票审批流、设计变更流程引擎、自动通知、日报周报或资料服务器核查流程
- **AND** 合同签订阶段专用 workflow MUST 仅覆盖合同准备、签订和预付款支付 3 个主节点；项目启动通知 MUST 作为预付款最终动作生成文件，不得成为第 4 个合同主节点

### Requirement: 合同签订阶段专用 workflow
项目核心能力 MUST 为合同签订阶段提供专用 workflow，并 MUST 以该 workflow 表达准备协议和合同、签订协议和合同、项目预付款支付 3 个主节点的节点状态、权限、阻塞原因和资料完成派生。

#### Scenario: 合同 workflow 节点定义
- **WHEN** 系统初始化或查询合同签订阶段 workflow
- **THEN** 系统 MUST 返回 `contract_preparation`、`contract_signing`、`advance_payment` 3 个节点
- **AND** 节点名称 MUST 分别为准备协议和合同、签订协议和合同、项目预付款支付
- **AND** 节点顺序 MUST 固定为准备协议和合同 -> 签订协议和合同 -> 项目预付款支付
- **AND** 系统 MUST NOT 返回独立 `project_kickoff_notice` 主流程节点

#### Scenario: 合同 workflow 人员来源
- **WHEN** 系统计算合同签订 workflow 权限
- **THEN** 技术负责人和商务负责人 MUST 来自方案设计阶段 role assignment
- **AND** 研发中心负责人、营销中心负责人和总经理 MUST 按当前组织角色动态判断
- **AND** 系统 MUST NOT 在合同签订阶段要求重新做人事分配

#### Scenario: 合同 workflow 不改变阶段和资料数量
- **WHEN** 系统启用合同签订阶段专用 workflow
- **THEN** 系统 MUST 继续保留立项、方案设计、合同签订、详细设计、生产制作、预验收、终验收和结题 8 大阶段
- **AND** 系统 MUST 保持 v20260629 71 项资料总数不变
- **AND** 合同 workflow MUST 通过派生或同步更新既有资料项完成结果，不得新增第 72 项资料

#### Scenario: 合同阶段主导航单一来源
- **WHEN** 系统返回合同签订阶段工作区或导航
- **THEN** 合同阶段主流程节点 MUST 只来自 `contractSigningWorkflow` DTO
- **AND** 系统 MUST 只返回准备协议和合同、签订协议和合同、项目预付款支付 3 个主流程节点
- **AND** 系统 MUST NOT 将旧蓝图节点、C20/C21/C22/C23/C25 资料项或 C24 发票资料项作为合同阶段主流程节点返回

#### Scenario: 合同 workflow 派生既有资料完成结果
- **WHEN** 合同 workflow 写操作完成准备或签订相关业务结果
- **THEN** 系统 MUST 将 C20、C22、C21、C23 作为既有资料编码派生或同步完成结果
- **AND** 系统 MUST NOT 将 C25 / `4.1` 作为合同 workflow 派生完成资料
- **AND** 系统 MUST NOT 为这些业务结果新增资料项或改变 71 项资料总数
- **AND** C24 `发票（预付款）` MUST 保持普通/条件性资料项，不得进入合同 workflow 主流程

#### Scenario: 已结束项目禁止合同写操作
- **WHEN** 项目已结束
- **THEN** 系统 MUST 拒绝合同 workflow 的上传、提交、审批、退回、签署完成、预付款处理和总经理放行写操作

### Requirement: 项目预付款支付节点
合同签订 workflow MUST 在 `advance_payment` 节点支持商务负责人处理预付款完成或申请总经理放行，并 MUST 在三个预付款最终动作确认后生成合同 workflow 自有 `项目启动通知` 文件、完成合同阶段并自动推进详细设计。

#### Scenario: 商务负责人完成支付并生成项目启动通知
- **WHEN** 商务负责人在项目预付款支付节点选择完成支付
- **AND** 前端完成用户确认
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 系统 MUST 生成 workflow generated file `contract_kickoff_notice`，业务名为 `项目启动通知`
- **AND** 生成记录 MUST NOT 绑定 C25 / `4.1` stage document
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
- **AND** 系统 MUST NOT 在申请等待时生成项目启动通知

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
- **AND** 系统 MUST 生成 workflow generated file `contract_kickoff_notice`，业务名为 `项目启动通知`
- **AND** 生成记录 MUST NOT 绑定 C25 / `4.1` stage document
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 放行后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 总经理已付款通过并生成项目启动通知
- **WHEN** 总经理选择已付款通过
- **AND** 前端完成用户确认
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 系统 MUST 生成 workflow generated file `contract_kickoff_notice`，业务名为 `项目启动通知`
- **AND** 生成记录 MUST NOT 绑定 C25 / `4.1` stage document
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 通过后系统 MUST NOT 继续返回总经理放行权限

#### Scenario: 生成失败不得部分完成预付款最终动作
- **WHEN** 任一预付款最终动作触发项目启动通知生成
- **AND** 生成文件或文件存储失败
- **THEN** 系统 MUST 拒绝该最终动作并返回明确错误
- **AND** 系统 MUST NOT 将 `advance_payment` 节点置为完成
- **AND** 系统 MUST NOT 写入有效 `contract_kickoff_notice` 生成文件
- **AND** 系统 MUST NOT 推进到详细设计阶段

#### Scenario: 生成后可下载项目启动通知
- **WHEN** 合同 workflow `contract_kickoff_notice` 项目启动通知已由预付款最终动作生成成功
- **THEN** 有合同 workflow 查看权限且后端授权的用户 MUST 能下载当前生成文件
- **AND** 下载接口 MUST 返回 generated file 的文件名、MIME 类型和文件内容
- **AND** 未生成、生成失败或生成文件存储缺失时 MUST 拒绝下载并返回明确错误
- **AND** 前端和 DTO MUST NOT 将该下载结果展示为 C25

#### Scenario: 未执行最终确认不能手工推进
- **WHEN** 用户手工请求推进合同签订阶段
- **AND** 项目预付款支付节点尚未完成任一最终动作或 `contract_kickoff_notice` 尚未生成
- **THEN** 系统 MUST 拒绝推进到详细设计阶段
- **AND** 系统 MUST 在门禁详情中返回 `项目启动通知未生成完成` 或等价阻塞原因
- **AND** 系统 MUST NOT 通过 C25 / `4.1`、普通资料卡片、旧独立节点、前端状态或 C24 发票资料判断该门禁

#### Scenario: 旧笼统放行入口不能代替总经理选择
- **WHEN** 系统收到旧的笼统总经理放行动作
- **THEN** 系统 MUST 拒绝该动作并返回 409 或 410
- **AND** 错误信息 MUST 提示总经理改用未付款并通过或已付款通过
- **AND** 系统 MUST NOT 将旧动作默认映射为未付款并通过
- **AND** 系统 MUST NOT 改变 `advance_payment` 节点状态、`paymentFlow.status`、生成文件或项目当前阶段

#### Scenario: 合同阶段主流程只有三个节点
- **WHEN** 系统初始化或查询合同签订 workflow
- **THEN** 系统 MUST 只返回准备协议和合同、签订协议和合同、项目预付款支付三个主流程节点
- **AND** 系统 MUST NOT 返回独立项目启动通知主流程节点
- **AND** 系统 MUST NOT 返回旧蓝图节点作为合同主流程节点

#### Scenario: 项目启动通知不占用 C25
- **WHEN** 系统生成合同项目启动通知
- **THEN** 系统 MUST 使用 workflow generated file 标识 `contract_kickoff_notice`
- **AND** 系统 MUST NOT 映射、完成或改名 C25 / `4.1`
- **AND** C25 / `4.1` MUST 保持详细设计阶段 `项目启动书` 资料项
- **AND** 系统 MUST NOT 新增资料项或改变 v20260629 71 项资料总数

#### Scenario: 项目启动通知项目名称使用组合展示值
- **WHEN** 系统生成合同项目启动通知文件
- **THEN** 模板内项目名称字段 MUST 使用 `项目编号+客户名称-项目名`
- **AND** 项目编号、客户名称和项目名均存在时 MUST 生成类似 `KRF25037金风-智能力矩扳手项目` 的展示值
- **AND** 缺客户名时 MUST 使用 `项目编号-项目名`
- **AND** 缺项目编号时 MUST 使用 `客户名称-项目名`
- **AND** 只剩项目名时 MUST 使用项目名
- **AND** 全缺时 MUST 使用 `未命名项目`
- **AND** 系统 MUST 去除首尾空白并避免多余 `-`
