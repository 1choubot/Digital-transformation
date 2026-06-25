## ADDED Requirements

### Requirement: 20260625 阶段资料完成规则

系统 MUST 为阶段资料模板规划完成规则字段，例如 `completionMode`，用于表达资料项是提交即完成、需要确认/审批、条件触发后提交，或未来可扩展的条件触发后确认/审批。

#### Scenario: 模板包含 completionMode
- **WHEN** 系统后续定义 20260625 阶段资料模板或项目级资料快照
- **THEN** 每个资料项 MUST 包含稳定 `completionMode`
- **AND** `completionMode` MUST 使用 `submit_only`、`approval_required`、`conditional_submit` 或 `conditional_approval`

#### Scenario: 不默认所有资料走审核
- **WHEN** 系统根据 20260625 流程图解释阶段资料完成规则
- **THEN** 系统 MUST NOT 默认所有资料都需要提交审核并确认通过

#### Scenario: submit_only 完成口径
- **WHEN** 资料项 `completionMode = submit_only`
- **THEN** 该资料项 MUST 在提交或上传后计为完成

#### Scenario: approval_required 完成口径
- **WHEN** 资料项 `completionMode = approval_required`
- **THEN** 该资料项 MUST 在确认或审批通过后计为完成

#### Scenario: conditional_submit 完成口径
- **WHEN** 资料项 `completionMode = conditional_submit`
- **AND** 条件尚未触发
- **THEN** 该资料项 MUST 不计入缺失或阶段推进阻塞
- **AND** 条件触发后 MUST 在提交或上传后计为完成

#### Scenario: conditional_approval 完成口径
- **WHEN** 资料项 `completionMode = conditional_approval`
- **AND** 条件尚未触发
- **THEN** 该资料项 MUST 不计入缺失或阶段推进阻塞
- **AND** 条件触发后 MUST 在确认或审批通过后计为完成

#### Scenario: 当前模板未使用 conditional_approval
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** 当前 64 项中 `conditional_approval` 数量 MUST 为 0

#### Scenario: 当前模板完成规则统计
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** `submit_only` 数量 MUST 为 33
- **AND** `approval_required` 数量 MUST 为 24
- **AND** `conditional_submit` 数量 MUST 为 7
- **AND** `conditional_approval` 数量 MUST 为 0

### Requirement: 20260625 资料主线与条件性判断

系统 MUST 区分主线必产资料的 NO 回退和真正条件触发资料，不得将带 NO 回退的主线资料误判为条件性资料。

#### Scenario: 主线 NO 回退仍是主线必产
- **WHEN** 流程图中主线资料经过确认节点且 NO 回退到前序修改节点
- **THEN** 该资料 MUST 仍标记为主线必产
- **AND** 系统 MUST 要求其按完成规则重新提交或重新确认

#### Scenario: NO 回退目标不自动变成审批资料
- **WHEN** 审查或评审节点 NO 回退到上游产出文件
- **THEN** 系统 MUST NOT 仅因该文件是 NO 回退目标就将其设为 `approval_required`
- **AND** 系统 MUST 继续按该文件自身节点是否存在 YES/NO 或 YES-only 判断 `completionMode`
- **AND** 若审查或评审节点有独立记录类产出，则该记录类产出 MUST 按流程图节点设置为 `approval_required`

#### Scenario: 图纸审查资料完成规则
- **WHEN** 系统定义 20260625 当前 64 项普通资料模板
- **THEN** `4.14 产品平面图` MUST 使用 `submit_only`
- **AND** `4.15 产品零部件清单` MUST 使用 `submit_only`
- **AND** `4.16 图纸审查记录` MUST 使用 `approval_required`

#### Scenario: 设计变更资料是条件触发
- **WHEN** 厂内安装调试不通过并触发设计变更
- **THEN** `3D模型（设计变更）`、`产品平面图（设计变更）`、`零部件清单（设计变更）` 和 `技术通知单（设计变更）` MUST 标记为条件触发资料
- **AND** 在未确认独立审批节点前，这四项 MUST 使用 `conditional_submit`

#### Scenario: 客户要求资料是条件触发
- **WHEN** 客户要求提供工艺时序图、节拍表或演示动画
- **THEN** 对应资料 MUST 按 `conditional_submit` 处理

#### Scenario: 发票资料按普通产出完成
- **WHEN** 系统处理 `发票（预付款）`、`发票（发货款）` 或 `发票（尾款）`
- **AND** 20260625 流程图没有为该发票资料标出明确 YES/NO 或 YES-only 节点
- **THEN** 系统 MUST 使用 `submit_only`
- **AND** 系统 MUST NOT 因发票资料而新增付款流、发票审批流或额外确认前置

#### Scenario: 排除过程节点
- **WHEN** 资料服务器核查或随机资料移交尚未被确认为独立文件产出
- **THEN** 系统 MUST NOT 将 `7.P1 随机资料移交` 或 `8.P1 资料服务器核查` 纳入普通 64 项资料模板

### Requirement: 20260625 阶段资料齐套摘要

系统 MUST 将阶段资料齐套摘要从统一 `confirmed` 口径调整为按资料项完成规则计算。

#### Scenario: 齐套摘要按完成规则计算
- **WHEN** 系统计算阶段资料齐套摘要
- **THEN** 系统 MUST 对每个适用资料按其 `completionMode` 判断是否完成

#### Scenario: 缺失列表包含完成规则
- **WHEN** 系统返回缺失资料列表
- **THEN** 每个缺失资料 MUST 包含资料编号、资料名称、当前状态和完成规则

#### Scenario: 非触发条件资料不计缺失
- **WHEN** 条件资料尚未触发
- **THEN** 系统 MUST 不将该资料纳入缺失资料列表

#### Scenario: 归档状态不代替完成状态
- **WHEN** 后续文件平台联动返回资料归档状态
- **THEN** 系统 MUST NOT 仅因文件已归档而将资料视为按 `completionMode` 完成
