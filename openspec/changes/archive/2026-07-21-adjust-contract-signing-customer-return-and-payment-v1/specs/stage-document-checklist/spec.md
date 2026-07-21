## MODIFIED Requirements

### Requirement: 合同 workflow 资料清单映射
阶段资料清单能力 MUST 支持合同签订专用 workflow 与 v20260629 既有 71 项资料的映射，并 MUST 保持资料总数不变。

#### Scenario: 准备和签订资料映射
- **WHEN** 合同 workflow 同步准备协议和合同、签订协议和合同结果
- **THEN** 技术协议准备线 MUST 映射到既有 C20 稳定资料编码
- **AND** C20 展示名 MUST 修正为 `技术协议`
- **AND** 销售合同准备线 MUST 映射到既有 C22 稳定资料编码
- **AND** C22 展示名 MUST 修正为 `销售合同`
- **AND** 技术协议扫描件 MUST 映射到既有技术协议客户侧成品或扫描件资料编码
- **AND** 销售合同扫描件 MUST 映射到既有销售合同客户侧成品或扫描件资料编码
- **AND** C21/C23 MUST 在签订协议和合同节点完成动作成功后派生为完成
- **AND** 客户退回技术协议或销售合同时，对应 C21 或 C23 扫描件完成结果 MUST 失效，直到重新上传扫描件并完成签订节点
- **AND** 系统 MUST NOT 为准备线和扫描件线新增资料项
- **AND** C20/C22 旧元数据名中的“草稿” MUST 只作为命名修正来源，不得作为最终展示名、上传槽名或 workflow 文案

#### Scenario: 项目启动通知命名收口
- **WHEN** 合同 workflow 同步项目启动通知结果
- **THEN** 系统 MUST 映射到既有 C25 稳定资料编码
- **AND** C25 展示名 MUST 从旧名 `项目启动书` 修正为 `项目启动通知`
- **AND** 业务展示、上传槽、资料清单和 workflow 节点 MUST 使用 `项目启动通知`
- **AND** 合同 workflow 的 `project_kickoff_notice` 上传动作 MUST 能完成 C25 资料完成结果
- **AND** 系统 MUST NOT 新增资料项
- **AND** 若当前运行资料行仍使用旧稳定编码 `4.1`，系统 MUST 将其识别为 C25 对应资料并由合同 workflow 派生完成

#### Scenario: 71 项资料数量不变
- **WHEN** 系统初始化或校验 v20260629 新项目资料模板
- **THEN** 系统 MUST 继续保持 71 项资料数量
- **AND** 合同签订 workflow 不得新增第 72 项资料
- **AND** 合同签订 workflow 不得改变立项、方案设计、生产制作、预验收、终验收或结题阶段资料数量

#### Scenario: C25 不形成双入口
- **WHEN** 用户查看合同签订阶段或详细设计阶段资料主流程入口
- **THEN** C25 MUST 由合同 workflow `project_kickoff_notice` 节点承载
- **AND** C25 MUST NOT 在详细设计阶段另行暴露第二个主流程入口
- **AND** 阶段资料清单 MUST 保持 C25 与合同 workflow 状态一致
- **AND** `4.1` 运行资料编码 MUST NOT 被当作合同阶段非主流程资料入口重复展示

#### Scenario: 预付款发票不成为通用付款流程
- **WHEN** 项目预付款支付节点进入完成支付或总经理放行路径
- **THEN** 既有预付款发票资料项 MUST NOT 被扩展为通用付款审批或发票流转状态机
- **AND** C24 `发票（预付款）` MUST 保持普通/条件性资料项
- **AND** C24 MUST NOT 出现在合同 workflow 4 个主流程节点中，也不得成为第 5 个合同 workflow 节点
- **AND** 本 change 的合同 workflow 页面 MUST NOT 为 C24 提供非主流程资料辅助区入口
- **AND** 后续如需关联预付款发票，MUST 通过独立 change 明确资料责任人、适用性和完成口径
