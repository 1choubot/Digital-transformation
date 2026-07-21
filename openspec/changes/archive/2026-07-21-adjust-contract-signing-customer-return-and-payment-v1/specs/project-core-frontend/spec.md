## MODIFIED Requirements

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
- **THEN** 前端 MUST 在页面顶部按后端权限展示退回技术协议和退回销售合同动作
- **AND** 前端 MUST 在中间展示技术协议扫描件和销售合同扫描件上传槽
- **AND** 前端 MUST 在页面底部按后端权限展示签订完成动作
- **AND** 前端 MUST 只在后端返回 `canCompleteSigning` 时展示完成按钮
- **AND** 前端 MUST NOT 展示扫描件确认通过或确认不通过按钮
- **AND** 操作日志展示 MUST 将扫描件上传、客户退回和签订完成 action type 映射为中文文案

#### Scenario: 预付款支付页面
- **WHEN** 用户打开项目预付款支付节点
- **THEN** 前端 MUST 为商务负责人展示完成支付和未完成支付待总经理审批动作
- **AND** 前端 MUST 在总经理放行等待状态展示等待提示
- **AND** 前端 MUST 只在后端权限允许时向总经理展示未付款并通过和已付款通过两个动作
- **AND** 前端 MUST 以 DTO 的 `canCompletePayment`、`canRequestGeneralManagerRelease`、`canApprovePaymentReleaseUnpaid` 和 `canApprovePaymentReleasePaid` 控制按钮
- **AND** 前端 MUST 展示后端返回的 `等待总经理审批预付款放行` 阻塞原因
- **AND** 完成支付、未付款放行或已付款通过后，前端 MUST 不再展示重复预付款处理按钮

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
