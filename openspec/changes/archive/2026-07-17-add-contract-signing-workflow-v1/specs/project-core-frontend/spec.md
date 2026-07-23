## MODIFIED Requirements

### Requirement: 简单资料闭环前端边界

前端 MUST 将项目详情体验表达为阶段资料收集、按 `completionMode` 提交/审核、在线平台附件保存、阶段推进和已规划的专用阶段 workflow，不得展示文件平台归档状态，不得把采购、发票、设计变更等特殊资料项展示为独立复杂流程，也不得把泛化阶段关口审批通过表达为阶段推进前置。合同签订阶段 MUST 使用后端合同 workflow DTO 作为专用流程入口。

#### Scenario: 项目详情体验边界
- **WHEN** 页面展示项目详情
- **THEN** 页面 MUST 表达当前体验由阶段资料收集、资料提交/审核、在线平台附件保存、阶段推进和已启用的专用阶段 workflow 组成
- **AND** 页面 MUST NOT 将文件平台归档状态展示作为当前体验组成部分

#### Scenario: 不展示文件平台归档状态
- **WHEN** 页面展示阶段资料、附件区域、阶段汇总或项目详情
- **THEN** 页面 MUST NOT 展示 `not_archived`、`archived` 或 `archive_failed`
- **AND** 页面 MUST NOT 展示文件平台文件列表、文件平台下载入口、归档失败重试入口、文件平台目录 ID 或文件平台日志入口

#### Scenario: 特殊资料项按资料项展示
- **WHEN** 页面展示采购申请表、采购合同审核记录表、发票或设计变更资料
- **THEN** 页面必须按普通或条件性资料项展示其适用性、责任人、附件、`completionMode` 和资料项状态

#### Scenario: 不展示无关复杂流程入口
- **WHEN** 页面展示采购申请表、采购合同审核记录表、发票或设计变更资料
- **THEN** 页面不得提供采购审批流、付款流、发票流转、发票审批流、设计变更流程引擎或额外流程状态机入口
- **AND** 合同签订阶段专用 workflow MUST 仅通过后端 `contractSigningWorkflow` DTO 暴露

#### Scenario: 阶段齐套说明
- **WHEN** 页面展示阶段齐套摘要或阶段阻塞原因
- **THEN** 页面必须说明阶段推进需要当前阶段适用资料按 `completionMode` 完成
- **AND** 页面 MUST NOT 说明阶段推进还需要泛化阶段关口审批通过
- **AND** 页面 MUST NOT 说明阶段推进需要所有资料均为 `confirmed`

### Requirement: 自动推进后阶段展示和历史方案设计查看
项目核心前端 MUST 以后端当前阶段为准展示自动推进结果；报价/投标完成后如后端已自动推进，前端 MUST 展示新的当前阶段，并且用户查看历史方案设计节点时仍 MUST 展示方案设计专用 workflow 面板。

#### Scenario: 报价投标完成后展示后端当前阶段
- **WHEN** 方案设计报价/投标节点通过，且后端返回 `canAdvanceToContract=true`
- **AND** 后端当前阶段已自动推进到合同签订阶段或后续阶段
- **THEN** 前端 MUST 展示新的当前阶段
- **AND** 前端 MUST NOT 展示通过手工动作进入合同签订阶段的主流程提示
- **AND** 前端 MUST 通过后端合同 workflow DTO 展示合同签订阶段节点和状态

#### Scenario: 历史方案设计节点仍展示专用面板
- **WHEN** 项目当前阶段已进入合同签订阶段或后续阶段
- **AND** 用户点击历史方案设计阶段下的方案设计专用 workflow 节点
- **THEN** 前端 MUST 渲染方案设计专用 workflow 面板并定位对应节点内容
- **AND** 前端 MUST NOT 落入通用节点兜底开发中页面

#### Scenario: 仍在方案设计阶段时显示自动推进口径
- **WHEN** 方案设计报价/投标节点通过但后端当前阶段仍为方案设计阶段
- **THEN** 前端 MAY 展示阶段齐套满足、系统将在配置触发点完成后自动推进的提示
- **AND** 前端 MUST NOT 暗示需要用户执行手工推进操作

## ADDED Requirements

### Requirement: 合同签订 workflow 前端
项目核心前端 MUST 为合同签订阶段展示后端驱动的专用 workflow，并 MUST 按后端返回的节点、上传槽、权限、状态、退回原因和阻塞原因渲染页面。

#### Scenario: 合同阶段导航来自后端
- **WHEN** 用户打开合同签订阶段
- **THEN** 前端 MUST 从后端合同 workflow DTO 读取节点列表
- **AND** 前端 MUST 展示准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知 4 个节点
- **AND** 前端 MUST NOT 将旧蓝图节点或本地常量作为合同阶段主流程节点来源

#### Scenario: 合同页面不展示非主流程资料辅助区
- **WHEN** 用户查看合同签订阶段
- **THEN** 前端 MUST NOT 将 C20、C21、C22、C23、C25 或旧蓝图节点作为另一套主流程节点展示
- **AND** C24 `发票（预付款）` MUST NOT 出现在 4 个合同 workflow 主流程节点中
- **AND** 前端合同 workflow 页面 MUST NOT 渲染 C24 或运行时旧编码 `3.4` 的非主流程资料辅助区
- **AND** 前端 MUST NOT 通过本地 helper 将 C24 或 `3.4` 拼成合同 workflow 节点、合同页面卡片或另一套入口
- **AND** C24 后续展示或与预付款节点关联 MUST 通过独立 change 规划

#### Scenario: 准备协议和合同页面
- **WHEN** 用户打开准备协议和合同节点
- **THEN** 前端 MUST 展示技术协议和销售合同两条上传/审批线
- **AND** 前端 MUST 按后端权限展示技术负责人上传、商务负责人上传、研发中心负责人审批和营销中心负责人审批动作
- **AND** 前端 MUST 按后端 `canDownload` 展示 current file 下载入口，确保审批人可下载待审文件
- **AND** 当前文件已提交待审或已通过时，前端 MUST NOT 因节点仍可处理而继续展示重复上传入口
- **AND** 文件退回时，前端 MUST 展示后端返回的整改重传阻塞原因
- **AND** 前端展示名、上传槽名和操作文案 MUST 使用 `技术协议`、`销售合同`
- **AND** 前端 MUST NOT 将 C20/C22 旧元数据名中的“草稿”显示为最终业务文件名

#### Scenario: 签订协议和合同页面
- **WHEN** 用户打开签订协议和合同节点
- **THEN** 前端 MUST 展示技术协议扫描件和销售合同扫描件上传槽
- **AND** 前端 MUST 为商务负责人展示分别确认线下签署结果通过或不通过的动作
- **AND** 前端 MUST 只在后端返回扫描件可确认权限时展示确认线下签署结果动作
- **AND** 已确认通过的扫描件 MUST 不再展示重复上传或重复确认入口
- **AND** 操作日志展示 MUST 将扫描件上传和线下签署确认 action type 映射为中文文案

#### Scenario: 预付款支付页面
- **WHEN** 用户打开项目预付款支付节点
- **THEN** 前端 MUST 为商务负责人展示完成支付和未完成支付待总经理审批动作
- **AND** 前端 MUST 在总经理放行等待状态展示等待提示
- **AND** 前端 MUST 只在后端权限允许时向总经理展示放行通过动作
- **AND** 前端 MUST 以 DTO 的 `canCompletePayment`、`canRequestGeneralManagerRelease` 和 `canApprovePaymentRelease` 控制按钮
- **AND** 前端 MUST 展示后端返回的 `等待总经理审批预付款放行` 阻塞原因
- **AND** 完成支付或总经理放行后，前端 MUST 不再展示重复预付款处理按钮

#### Scenario: 项目启动通知页面
- **WHEN** 用户打开项目启动通知节点
- **THEN** 前端 MUST 为商务负责人展示业务文件 `项目启动通知` 上传入口
- **AND** 上传成功后前端 MUST 刷新项目阶段和合同 workflow 状态
- **AND** 前端 MUST 使用 C25 修正后的展示名 `项目启动通知`
- **AND** 操作日志展示 MUST 将项目启动通知上传 action type 映射为中文文案

#### Scenario: 项目启动通知不形成双入口
- **WHEN** 用户查看合同签订阶段或详细设计阶段导航
- **THEN** 前端 MUST 将 `project_kickoff_notice` 作为合同 workflow 最后一个业务节点展示
- **AND** 前端 MUST NOT 同时展示合同阶段 `项目启动通知` 主入口和详细设计阶段旧名 `项目启动书` 主入口
- **AND** C25 MUST NOT 作为另一套主流程节点出现

#### Scenario: 已结束项目只读
- **WHEN** 项目已结束
- **THEN** 前端 MUST NOT 展示合同 workflow 写操作按钮
- **AND** 前端 MAY 展示历史上传、审批、确认和放行状态
