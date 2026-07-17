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
- **AND** 合同签订阶段专用 workflow MUST 仅覆盖本 change 定义的合同准备、签订、预付款放行和项目启动通知节点

### Requirement: 方案设计阶段自动推进门禁
系统 MUST 在报价/投标通过后将第 2 阶段齐套视为满足，并 MUST 由配置的写操作触发自动推进到第 3 阶段；manual fallback API 仅作为 API / 运维兜底能力。

#### Scenario: 报价投标通过后自动推进
- **WHEN** 方案设计 workflow 已满足 C04-C19 派生完成规则，且报价/投标节点已 `approved`
- **THEN** 系统 MUST 将第 2 阶段齐套视为满足
- **AND** 配置的报价接受或投标通过写操作 MUST 调用统一阶段门禁并在满足时自动推进到第 3 阶段
- **AND** 系统 MUST NOT 要求用户再执行手工阶段推进动作
- **AND** 系统 MUST NOT 跳阶段或回退阶段

#### Scenario: 进入合同签订阶段后初始化合同 workflow
- **WHEN** 第 2 阶段齐套满足或 `canAdvanceToContract=true`
- **THEN** 系统 MUST 只将该状态解释为允许进入合同签订阶段
- **AND** 项目进入第 3 阶段时系统 MUST 初始化或返回合同签订专用 workflow
- **AND** 系统 MUST NOT 将该状态解释为合同签订阶段业务已完成

## ADDED Requirements

### Requirement: 合同签订阶段专用 workflow
项目核心能力 MUST 为合同签订阶段提供专用 workflow，并 MUST 以该 workflow 表达准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知的节点状态、权限、阻塞原因和资料完成派生。

#### Scenario: 合同 workflow 节点定义
- **WHEN** 系统初始化或查询合同签订阶段 workflow
- **THEN** 系统 MUST 返回 `contract_preparation`、`contract_signing`、`advance_payment`、`project_kickoff_notice` 4 个节点
- **AND** 节点名称 MUST 分别为准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知
- **AND** 节点顺序 MUST 固定为准备协议和合同 -> 签订协议和合同 -> 项目预付款支付 -> 项目启动通知

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
- **AND** 系统 MUST 只返回准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知 4 个主流程节点
- **AND** 系统 MUST NOT 将旧蓝图节点、C20/C21/C22/C23/C25 资料项或 C24 发票资料项作为合同阶段主流程节点返回

#### Scenario: 合同 workflow 派生既有资料完成结果
- **WHEN** 合同 workflow 写操作完成准备、签订或项目启动通知相关业务结果
- **THEN** 系统 MUST 将 C20、C22、C21、C23、C25 作为既有资料编码派生或同步完成结果
- **AND** 系统 MUST NOT 为这些业务结果新增资料项或改变 71 项资料总数
- **AND** C24 `发票（预付款）` MUST 保持普通/条件性资料项，不得进入合同 workflow 主流程

#### Scenario: 已结束项目禁止合同写操作
- **WHEN** 项目已结束
- **THEN** 系统 MUST 拒绝合同 workflow 的上传、提交、审批、退回、签署确认、预付款处理、总经理放行和项目启动通知上传写操作

### Requirement: 准备协议和合同节点
合同签订 workflow MUST 在 `contract_preparation` 节点支持技术协议和销售合同两条并行准备线。

#### Scenario: 准备节点最终展示名
- **WHEN** 系统返回准备协议和合同节点 DTO、上传槽、日志上下文或前端展示文案
- **THEN** 技术协议线的业务文件名 MUST 为 `技术协议`
- **AND** 销售合同线的业务文件名 MUST 为 `销售合同`
- **AND** 系统 MUST NOT 将 C20/C22 旧元数据名中的“草稿”作为最终展示名、上传槽名或 workflow 文案
- **AND** 系统 MUST 保留 C20/C22 稳定编码，不得新增资料项或改变 71 项资料总数

#### Scenario: 技术协议上传和审批
- **WHEN** 项目位于准备协议和合同节点
- **THEN** 技术负责人 MUST 能上传技术协议
- **AND** 研发中心负责人 MUST 能审批通过或不通过技术协议
- **AND** 研发中心负责人 MUST 能在审批前下载当前技术协议文件
- **AND** 技术协议不通过后 MUST 停留在技术协议准备线并允许技术负责人重新上传重提

#### Scenario: 销售合同上传和审批
- **WHEN** 项目位于准备协议和合同节点
- **THEN** 商务负责人 MUST 能上传销售合同
- **AND** 营销中心负责人 MUST 能审批通过或不通过销售合同
- **AND** 营销中心负责人 MUST 能在审批前下载当前销售合同文件
- **AND** 商务负责人 MUST 能下载自己上传的当前销售合同文件
- **AND** 销售合同不通过后 MUST 停留在销售合同准备线并允许商务负责人重新上传重提

#### Scenario: 准备节点权限和阻塞原因按 slot 状态返回
- **WHEN** 技术协议或销售合同已提交待审
- **THEN** DTO MUST NOT 继续返回对应上传/提交权限
- **AND** DTO MUST 返回对应审批人可审批、可退回和可下载 current file 的权限
- **WHEN** 技术协议或销售合同被退回
- **THEN** DTO MUST 恢复对应负责人上传权限
- **AND** 节点阻塞原因 MUST 明确等待对应负责人整改并重新上传

#### Scenario: 两条准备线都通过后进入签订节点
- **WHEN** 技术协议和销售合同都已审批通过
- **THEN** 系统 MUST 将准备协议和合同节点置为完成
- **AND** 系统 MUST 激活签订协议和合同节点

#### Scenario: 单线未通过不能进入签订节点
- **WHEN** 技术协议已通过但销售合同未通过
- **THEN** 系统 MUST NOT 激活签订协议和合同节点
- **AND** 销售合同线 MUST 继续显示为待整改或待审批状态

### Requirement: 签订协议和合同节点
合同签订 workflow MUST 在 `contract_signing` 节点支持商务负责人上传扫描件并确认线下签署结果。

#### Scenario: 上传扫描件
- **WHEN** 项目位于签订协议和合同节点
- **THEN** 商务负责人 MUST 能上传技术协议扫描件
- **AND** 商务负责人 MUST 能上传销售合同扫描件
- **AND** 商务负责人 MUST 能下载已上传的技术协议扫描件和销售合同扫描件 current file
- **AND** 已确认通过的扫描件 MUST NOT 再展示重复上传或重复确认入口

#### Scenario: 确认线下签署结果
- **WHEN** 两个扫描件已上传
- **THEN** 商务负责人 MUST 能分别确认技术协议扫描件和销售合同扫描件的线下签署结果为通过或不通过
- **AND** 系统文案和日志 MUST 使用确认线下签署结果，不得表述为商务负责人审批自己上传的文件
- **AND** 只有对应扫描件存在且处于可确认状态时，DTO MUST 返回确认线下签署结果权限

#### Scenario: 技术协议扫描件不通过只退回技术准备线
- **WHEN** 商务负责人确认技术协议扫描件不通过且销售合同扫描件通过
- **THEN** 系统 MUST 只退回技术协议准备线
- **AND** 销售合同准备线 MUST 保持已通过状态

#### Scenario: 销售合同扫描件不通过只退回销售准备线
- **WHEN** 商务负责人确认销售合同扫描件不通过且技术协议扫描件通过
- **THEN** 系统 MUST 只退回销售合同准备线
- **AND** 技术协议准备线 MUST 保持已通过状态

#### Scenario: 两个扫描件都不通过退回两条准备线
- **WHEN** 商务负责人确认技术协议扫描件和销售合同扫描件都不通过
- **THEN** 系统 MUST 同时退回技术协议准备线和销售合同准备线

#### Scenario: 两个扫描件都通过进入预付款节点
- **WHEN** 商务负责人确认技术协议扫描件和销售合同扫描件都通过
- **THEN** 系统 MUST 将签订协议和合同节点置为完成
- **AND** 系统 MUST 激活项目预付款支付节点

### Requirement: 项目预付款支付节点
合同签订 workflow MUST 在 `advance_payment` 节点支持商务负责人处理预付款完成或申请总经理放行。

#### Scenario: 商务负责人完成支付
- **WHEN** 商务负责人在项目预付款支付节点选择完成支付
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 激活项目启动通知节点
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `completed`
- **AND** 完成后系统 MUST NOT 继续返回完成支付或申请总经理放行权限

#### Scenario: 未完成支付等待总经理放行
- **WHEN** 商务负责人在项目预付款支付节点选择未完成支付，待总经理审批
- **THEN** 系统 MUST 进入总经理放行等待状态
- **AND** 项目 MUST 停留在项目预付款支付节点直到总经理通过
- **AND** 系统 MUST 将 `advance_payment` 节点状态和 `paymentFlow.status` 置为 `waiting_general_manager`
- **AND** 节点阻塞原因 MUST 显示 `等待总经理审批预付款放行`

#### Scenario: 只有总经理可放行
- **WHEN** 项目处于总经理放行等待状态
- **THEN** 只有总经理 MUST 能执行放行通过动作
- **AND** 非总经理用户 MUST NOT 能绕过该等待状态进入项目启动通知节点
- **AND** 总经理放行权限 MUST 只在 `advance_payment` 和 `paymentFlow` 均处于 `waiting_general_manager` 时返回

#### Scenario: 总经理放行后进入项目启动通知
- **WHEN** 总经理通过预付款放行
- **THEN** 系统 MUST 将项目预付款支付节点置为完成
- **AND** 系统 MUST 激活项目启动通知节点
- **AND** 系统 MUST 将 `paymentFlow.status` 置为 `released`
- **AND** 放行后系统 MUST NOT 继续返回总经理放行权限

### Requirement: 项目启动通知节点
合同签订 workflow MUST 在最后一个业务节点 `project_kickoff_notice` 支持商务负责人上传项目启动通知，并在上传成功后自动推进到详细设计阶段。

#### Scenario: 上传项目启动通知
- **WHEN** 项目位于项目启动通知节点
- **THEN** 商务负责人 MUST 能上传业务文件 `项目启动通知`
- **AND** 上传槽、workflow 节点和资料展示名称 MUST 使用 `项目启动通知`
- **AND** 系统 MUST 将 C25 展示名修正为 `项目启动通知`
- **AND** 系统 MUST 仅在项目处于合同签订阶段、项目未结束、`project_kickoff_notice` 节点为 `pending`、上传槽尚未存在 current file 时允许上传
- **AND** 非商务负责人、节点未激活、重复上传或已结束项目 MUST 被拒绝

#### Scenario: 上传后自动推进详细设计
- **WHEN** 商务负责人成功上传项目启动通知
- **THEN** 系统 MUST 将项目启动通知节点置为完成
- **AND** 系统 MUST 将项目启动通知上传槽置为完成
- **AND** 系统 MUST 将合同签订阶段置为完成
- **AND** 系统 MUST 自动推进项目到详细设计阶段
- **AND** 自动推进 MUST 调用统一阶段门禁，不得直接手写项目阶段字段绕过门禁

#### Scenario: 手工推进不得绕过项目启动通知
- **WHEN** 用户手工请求推进合同签订阶段
- **AND** 当前合同阶段资料清单已齐套
- **AND** `project_kickoff_notice` 节点尚未 `approved`
- **THEN** 系统 MUST 拒绝推进到详细设计阶段
- **AND** 系统 MUST 直接检查 `project_contract_signing_nodes` 中的 `project_kickoff_notice` 节点状态
- **AND** 系统 MUST 在门禁详情中返回 `项目启动通知未上传完成` 阻塞原因
- **AND** 系统 MUST NOT 通过普通资料卡片、前端状态或 C24 发票资料判断该门禁

#### Scenario: 项目启动通知不新增资料项
- **WHEN** 系统同步项目启动通知到阶段资料完成结果
- **THEN** 系统 MUST 映射到既有 C25 稳定资料编码
- **AND** 系统 MUST NOT 新增资料项或改变 v20260629 71 项资料总数
- **AND** 系统 MUST NOT 新增第 72 项资料

#### Scenario: 项目启动通知不形成双入口
- **WHEN** 系统返回合同签订阶段或详细设计阶段主流程导航
- **THEN** `project_kickoff_notice` MUST 只作为合同 workflow 最后一个业务节点出现
- **AND** C25 MUST NOT 作为详细设计阶段另一套主流程节点出现
- **AND** 阶段导航主流程 MUST 以合同 workflow DTO 为准
- **AND** 系统 MUST 同时识别目标编码 C25 和运行资料编码 `4.1`，避免旧编码资料行在合同页面辅助区或主流程入口形成第二入口
