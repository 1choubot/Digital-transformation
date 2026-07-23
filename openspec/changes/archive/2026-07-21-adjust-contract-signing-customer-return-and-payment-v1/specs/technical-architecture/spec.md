## MODIFIED Requirements

### Requirement: 合同签订 workflow 架构
技术架构 MUST 由数字化平台内的合同签订 workflow 后端模块承载合同签订业务，并 MUST 通过仓储、DTO、API、导航、工作台待办和 operation log 集成实现；本 change 仅调整既有合同 workflow 内部状态机，不新增第二套流程或资料项。

#### Scenario: 专用模块和 API
- **WHEN** 实现合同签订阶段业务
- **THEN** 后端 MUST 使用 `contractSigningWorkflow` 专用模块
- **AND** API MUST 返回合同节点、上传槽、current file、revision、审批状态、退回原因、阻塞原因和权限
- **AND** API MUST 提供按 slot 下载 current file 的只读接口，并按合同 workflow 权限校验下载人
- **AND** API MUST 为签订协议和合同节点提供客户退回技术协议、客户退回销售合同和签订完成动作
- **AND** API MUST NOT 为前端继续提供扫描件确认通过/确认不通过权限作为签订节点主动作
- **AND** API MUST 为项目预付款支付节点提供合同 workflow 命名空间内的完成支付、申请总经理放行、总经理未付款并通过、总经理已付款通过动作
- **AND** API MUST 在 DTO 中返回 `paymentFlow.status`、申请人、申请时间、放行人、放行时间、预付款权限和阻塞原因
- **AND** 前端 MUST 以该 DTO 作为合同阶段节点导航和节点页面唯一来源

#### Scenario: 旧总经理笼统放行接口不改变 workflow
- **WHEN** 旧 `POST /api/projects/:projectId/contract-signing-workflow/payment/approve-release` 被调用
- **THEN** 后端 MUST 返回明确的弃用错误，状态码 SHOULD 为 410
- **AND** 错误详情 MUST 提供 `/payment/approve-release-unpaid` 和 `/payment/approve-release-paid` 两个替代接口
- **AND** 旧接口 MUST NOT 默认调用未付款并通过动作
- **AND** 旧接口 MUST NOT 修改合同 workflow 节点、`paymentFlow` 或 operation log

#### Scenario: 正式 migration
- **WHEN** 调整合同 workflow 状态机
- **THEN** 实现 MUST 复用现有 `project_contract_signing_nodes`、`project_contract_signing_upload_slots`、`project_contract_signing_upload_files` 和 `project_contract_signing_payment_flows`
- **AND** 实现 MUST NOT 因本 change 新增资料项、阶段或第二套流程表
- **AND** schema ensure MUST 与正式 migration 保持一致

#### Scenario: workflow 状态和资料完成分开建模
- **WHEN** 合同 workflow 上传、审批、客户退回、签订完成、预付款放行或项目启动通知上传成功
- **THEN** 后端 MUST 在合同 workflow 表中保存业务状态
- **AND** 后端 MUST 从 workflow 状态派生或同步既有 71 项资料完成结果
- **AND** 后端 MUST NOT 以普通资料卡片状态替代合同 workflow 状态

#### Scenario: 合同资料元数据展示名修正
- **WHEN** 后端返回合同 workflow DTO 或阶段资料清单
- **THEN** C20 展示名 MUST 为 `技术协议`
- **AND** C22 展示名 MUST 为 `销售合同`
- **AND** C25 展示名 MUST 为 `项目启动通知`
- **AND** 后端 MUST 保留 C20/C22/C25 稳定编码并保持 71 项资料总数不变
- **AND** 后端 MUST NOT 将 C20/C22 旧元数据名中的“草稿”作为上传槽名、DTO 文案或最终展示名

#### Scenario: 事务一致性
- **WHEN** 合同 workflow 写操作成功
- **THEN** 节点状态、上传槽 current file、revision、资料完成派生、工作台待办和 operation log MUST 在同一事务内保持一致

#### Scenario: 阶段导航来源
- **WHEN** 后端返回合同签订阶段导航或工作区
- **THEN** 合同阶段 children MUST 使用合同 workflow 节点定义
- **AND** 后端 MUST NOT 将旧蓝图节点作为可点击主流程节点返回
- **AND** 后端 MUST NOT 同时返回合同 workflow `project_kickoff_notice` 和另一套 C25 主流程节点造成双入口

#### Scenario: 合同阶段主流程和普通资料分离
- **WHEN** 后端返回合同签订阶段工作区 DTO
- **THEN** `nodes` / navigation children MUST 只包含 4 个 contract workflow 主节点
- **AND** 旧蓝图节点和 71 项资料 MUST NOT 被提升为合同阶段主流程节点
- **AND** C20、C22、C21、C23、C25 MUST 由 contract workflow 状态派生或同步资料完成结果
- **AND** C24 `发票（预付款）` MUST 保留在后端资料体系中作为普通/条件性资料项，且 MUST NOT 成为 `advance_payment` 外的第 5 个 workflow 节点
- **AND** 合同 workflow 页面是否展示 C24 MUST NOT 由后端 workflow DTO 主节点承担；本 change 前端不消费 C24 作为合同页面辅助区

#### Scenario: 项目启动通知自动推进
- **WHEN** 商务负责人成功上传项目启动通知
- **THEN** 后端 MUST 将该上传动作映射到 C25 稳定资料编码并完成 C25 资料完成结果
- **AND** 后端 MUST 调用统一阶段门禁推进到详细设计阶段
- **AND** 后端 MUST NOT 跳过合同阶段完成状态或直接手写项目阶段字段绕过门禁
- **AND** 后端 MUST 在同一事务内写入 current file/revision、将 `project_kickoff_notice` 上传槽和节点置为 `approved`、记录上传日志并触发阶段推进
- **AND** 阶段资料派生 MUST 同时支持 C20/C21/C22/C23/C25 目标编码和当前运行资料编码 `3.1`、`3.2`、`4.1`

#### Scenario: 合同阶段手工推进附加门禁
- **WHEN** 后端执行合同签订阶段的手工 `advanceProjectStage`
- **THEN** 后端 MUST 在当前阶段资料齐套检查之外，查询 `project_contract_signing_nodes` 中 `project_kickoff_notice` 节点状态
- **AND** 只有该节点为 `approved` 时才允许推进到详细设计阶段
- **AND** 未完成时 MUST 在 `incompleteRequiredDocuments` 或同等门禁详情中返回 `项目启动通知未上传完成`
- **AND** 该门禁 MUST NOT 查询或依赖 C24 发票、前端 DTO、本地拼接节点或普通资料卡片状态
