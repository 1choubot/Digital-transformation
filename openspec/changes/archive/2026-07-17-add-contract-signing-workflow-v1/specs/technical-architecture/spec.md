## MODIFIED Requirements

### Requirement: 文件管理平台简单归档边界

当前 20260625 在线平台内部资料闭环阶段 MUST 暂停数字化平台与文件管理平台归档联动；在线平台 MUST 自己负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要、阶段推进状态和已启用的专用阶段 workflow，且当前职责不包含泛化阶段关口审批。

#### Scenario: 当前阶段文件平台职责暂停
- **WHEN** 当前阶段处理项目、阶段、资料、附件、精准返工或阶段推进
- **THEN** 系统 MUST NOT 要求文件管理平台负责目录、归档、文件列表、下载权限、文件日志或返工状态

#### Scenario: 数字化平台职责
- **WHEN** 数字化平台处理阶段资料
- **THEN** 数字化平台必须负责项目、阶段、资料项、适用性、责任人、资料完成状态、精准返工状态、资料审核待办、齐套摘要、阶段推进状态和已启用的专用阶段 workflow
- **AND** 数字化平台 MUST NOT 把泛化阶段关口审批作为当前在线平台内部资料闭环的阶段推进前置

#### Scenario: 不通过文件平台实现复杂业务流
- **WHEN** 系统处理合同签订 workflow、合同审核记录表、采购申请表、采购合同审核记录表、发票、设计变更资料、随机资料移交、资料服务器核查或精准返工
- **THEN** 系统不得通过文件管理平台实现合同签订 workflow、采购审批流、付款流、发票流转、设计变更流程引擎、随机资料移交流程、资料服务器核查流程或返工流转

#### Scenario: 后续文件平台集成独立实施
- **WHEN** 后续实现文件管理平台联动
- **THEN** 系统 MUST 通过独立 change 规划和实现文件夹绑定、归档、文件列表、下载权限和文件日志
- **AND** 后续联动不得反向改变本 change 的精准返工状态归属

### Requirement: 文件平台继续保持文件职责边界

系统 MUST 保持文件管理平台只承担文件能力，不得因 20260625 资料完成规则变化而把文件平台扩展成项目流程或资料审批系统；合同签订专用 workflow MUST 由数字化平台后端模块承载。

#### Scenario: 文件平台不判断资料完成
- **WHEN** 数字化平台向文件平台归档或读取文件
- **THEN** 文件平台 MUST NOT 判断资料是否完成、是否确认、是否满足阶段推进或是否触发条件

#### Scenario: 数字化平台负责完成规则
- **WHEN** 系统判断资料是否完成、阶段是否齐套或是否允许阶段推进
- **THEN** 判断 MUST 由数字化平台根据项目、阶段、资料适用性、资料状态、`completionMode` 和已启用的专用阶段 workflow 完成

#### Scenario: 不新增无关复杂业务流
- **WHEN** 系统处理合同、采购、付款、发票、设计变更、随机资料移交或资料服务器核查相关产出
- **THEN** 技术架构 MUST NOT 因本规划新增采购审批流、通用付款流、发票流转、设计变更流程引擎、随机资料移交流程或资料服务器核查流程
- **AND** 合同签订阶段 MAY 使用本 change 定义的数字化平台专用 workflow

## ADDED Requirements

### Requirement: 合同签订 workflow 架构
技术架构 MUST 新增数字化平台内的合同签订 workflow 后端模块，并 MUST 通过正式 migration、仓储、DTO、API、导航、工作台待办和 operation log 集成实现。

#### Scenario: 专用模块和 API
- **WHEN** 实现合同签订阶段业务
- **THEN** 后端 MUST 新增或等价实现 `contractSigningWorkflow` 专用模块
- **AND** API MUST 返回合同节点、上传槽、current file、revision、审批状态、退回原因、阻塞原因和权限
- **AND** API MUST 提供按 slot 下载 current file 的只读接口，并按合同 workflow 权限校验下载人
- **AND** API MUST 为签订协议和合同节点提供扫描件线下签署结果确认动作，且该动作 MUST 使用确认语义，不得复用审批自己上传文件的表述
- **AND** API MUST 为项目预付款支付节点提供合同 workflow 命名空间内的完成支付、申请总经理放行和总经理放行通过动作
- **AND** API MUST 在 DTO 中返回 `paymentFlow.status`、申请人、申请时间、放行人、放行时间、预付款权限和阻塞原因
- **AND** 前端 MUST 以该 DTO 作为合同阶段节点导航和节点页面唯一来源

#### Scenario: 正式 migration
- **WHEN** 实现合同 workflow 持久化
- **THEN** 实现 MUST 新增正式 migration
- **AND** migration MUST 覆盖 `project_contract_signing_nodes`、`project_contract_signing_upload_slots`、`project_contract_signing_upload_files`
- **AND** 如支付放行独立建模，migration MUST 覆盖 `project_contract_signing_payment_flows`
- **AND** schema ensure MUST 与正式 migration 保持一致，不得只改 ensure schema

#### Scenario: workflow 状态和资料完成分开建模
- **WHEN** 合同 workflow 上传、审批、退回、签署确认、预付款放行或项目启动通知上传成功
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
