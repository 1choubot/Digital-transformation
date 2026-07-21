## MODIFIED Requirements

### Requirement: 合同签订 workflow 架构
技术架构 MUST 由数字化平台内的合同签订 workflow 后端模块承载合同签订业务，并 MUST 通过仓储、DTO、API、导航、工作台待办、生成文件和 operation log 集成实现；合同项目启动通知 MUST 作为合同 workflow 自有 generated file，不得占用 C25 / `4.1` 详细设计项目启动书资料项。

#### Scenario: 专用模块和 API
- **WHEN** 实现合同签订阶段业务
- **THEN** 后端 MUST 使用 `contractSigningWorkflow` 专用模块
- **AND** API MUST 返回合同节点、上传槽、current file、generated file、revision、审批状态、退回原因、阻塞原因和权限
- **AND** API MUST 提供按 slot 下载 current file 的只读接口，并按合同 workflow 权限校验下载人
- **AND** API MUST 为签订协议和合同节点提供客户退回技术协议、客户退回销售合同和签订完成动作
- **AND** API MUST NOT 为前端继续提供扫描件确认通过/确认不通过权限作为签订节点主动作
- **AND** API MUST 为项目预付款支付节点提供合同 workflow 命名空间内的完成支付、申请总经理放行、总经理未付款并通过、总经理已付款通过动作
- **AND** API MUST 在三个预付款最终动作中生成 `contract_kickoff_notice` 项目启动通知文件
- **AND** API MUST 提供合同 workflow 项目启动通知 generated file 下载接口
- **AND** API MUST 在 DTO 中返回 `paymentFlow.status`、申请人、申请时间、放行人、放行时间、预付款权限、合同项目启动通知生成文件状态和阻塞原因
- **AND** 前端 MUST 以该 DTO 作为合同阶段节点导航和节点页面唯一来源

#### Scenario: 正式 migration
- **WHEN** 调整项目启动通知生成能力
- **THEN** 实现 MUST 复用 `project_stage_document_generated_files` 保存合同 workflow generated file 版本、状态、源快照和模板信息
- **AND** 本 change MUST 增加正式 migration，将 `project_stage_document_generated_files.stage_document_id` 改为 nullable，支持 workflow generated file 不绑定 stage document
- **AND** 实现 MUST 复用现有 `project_contract_signing_nodes`、`project_contract_signing_upload_slots`、`project_contract_signing_upload_files` 和 `project_contract_signing_payment_flows`
- **AND** 实现 MUST NOT 因本 change 新增资料项、阶段或第二套流程表
- **AND** schema ensure MUST 与正式 migration 保持一致

#### Scenario: workflow 状态和资料完成分开建模
- **WHEN** 合同 workflow 上传、审批、客户退回、签订完成、预付款最终动作或项目启动通知生成成功
- **THEN** 后端 MUST 在合同 workflow 表中保存业务状态
- **AND** 后端 MUST 从准备线和签订完成状态派生或同步 C20/C21/C22/C23 资料完成结果
- **AND** 后端 MUST NOT 从合同项目启动通知 generated file 派生或同步 C25 / `4.1` 完成结果
- **AND** 后端 MUST NOT 以普通资料卡片状态替代合同 workflow 状态

#### Scenario: 事务一致性和失败回滚
- **WHEN** 预付款最终动作触发项目启动通知生成
- **THEN** 预付款状态、`contract_kickoff_notice` generated file、工作台待办、operation log 和自动阶段推进 MUST 保持事务一致
- **AND** 生成文件或存储失败时，系统 MUST 回滚预付款最终动作和合同 workflow generated file
- **AND** 失败时系统 MUST NOT 推进到详细设计阶段

#### Scenario: 阶段导航来源
- **WHEN** 后端返回合同签订阶段导航或工作区
- **THEN** 合同阶段 children MUST 只包含 3 个 contract workflow 主节点
- **AND** 后端 MUST NOT 将旧蓝图节点作为可点击主流程节点返回
- **AND** 后端 MUST NOT 返回独立项目启动通知节点造成双入口

#### Scenario: 合同阶段主流程和普通资料分离
- **WHEN** 后端返回合同签订阶段工作区 DTO
- **THEN** `nodes` / navigation children MUST 只包含准备协议和合同、签订协议和合同、项目预付款支付 3 个主节点
- **AND** 旧蓝图节点和 71 项资料 MUST NOT 被提升为合同阶段主流程节点
- **AND** C20、C22、C21、C23 MUST 由 contract workflow 状态派生或同步资料完成结果
- **AND** C25 / `4.1` MUST NOT 由 contract workflow 状态派生或同步资料完成结果
- **AND** C24 `发票（预付款）` MUST 保留在后端资料体系中作为普通/条件性资料项，且 MUST NOT 成为合同 workflow 节点
- **AND** 合同 workflow 页面是否展示 C24 MUST NOT 由后端 workflow DTO 主节点承担；本 change 前端不消费 C24 作为合同页面辅助区

#### Scenario: 项目启动通知生成文件
- **WHEN** 任一预付款最终动作触发项目启动通知生成
- **THEN** 后端 MUST 使用后端模板渲染生成文件
- **AND** 生成记录 MUST 关联项目、`document_code=contract_kickoff_notice`、`template_key=contract_kickoff_notice_docx`、模板版本或 hash、生成用户、生成时间、源数据 hash 和源快照
- **AND** 生成记录 `stage_document_id` MUST 为空，并 MUST NOT 关联 C25 对应 stage document
- **AND** 源快照 MUST 在 `project.projectDisplayName` 中记录用于模板渲染的组合项目名称
- **AND** 源快照 MUST 保留原始 `projectCode`、`customerName` 和 `projectName` 便于审计追溯
- **AND** 模板渲染 MUST 优先使用 `sourceSnapshot.project.projectDisplayName`
- **AND** 生成失败 MUST 返回明确错误并保留可审计失败原因或失败日志
- **AND** 生成成功 MUST 作为合同 workflow 当前有效 generated file 并提供下载入口

#### Scenario: 项目启动通知生成后自动推进
- **WHEN** 预付款最终动作成功生成合同 workflow 项目启动通知
- **THEN** 后端 MUST 调用统一阶段门禁推进到详细设计阶段
- **AND** 后端 MUST NOT 跳过合同阶段完成状态或直接手写项目阶段字段绕过门禁
- **AND** 阶段资料派生 MUST 支持 C20/C21/C22/C23 目标编码和当前运行资料编码 `3.1`、`3.2`
- **AND** 阶段资料派生 MUST NOT 包含 C25 或当前运行资料编码 `4.1`

#### Scenario: 合同阶段手工推进附加门禁
- **WHEN** 后端执行合同签订阶段的手工 `advanceProjectStage`
- **THEN** 后端 MUST 在当前阶段资料齐套检查之外，确认 `advance_payment` 节点已完成、`paymentFlow.status` 已 finalized、`contract_kickoff_notice` 已有当前有效 generated file
- **AND** 未满足时 MUST 在 `incompleteRequiredDocuments` 或同等门禁详情中返回 `项目启动通知未生成完成`
- **AND** 该门禁 MUST NOT 查询或依赖 C25 / `4.1`、C24 发票、前端 DTO、本地拼接节点、旧独立项目启动通知节点或普通资料卡片状态
