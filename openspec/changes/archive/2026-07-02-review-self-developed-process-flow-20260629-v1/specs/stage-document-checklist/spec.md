## ADDED Requirements

### Requirement: 20260629 流程图资料模板评审边界

阶段资料清单能力 MUST 将 20260629 自研模式流程图视为后续资料模板和节点映射评审输入；当前系统 MUST 继续以 20260625 64 项资料模板和既有 completionMode 统计作为运行基线，除非后续独立 change 修改。

#### Scenario: 当前模板统计不因流程图评审改变
- **WHEN** 系统初始化或校验当前 active 阶段资料模板
- **THEN** 普通资料项数量 MUST 继续为 64 项
- **AND** `submit_only` 数量 MUST 继续为 33
- **AND** `approval_required` 数量 MUST 继续为 24
- **AND** `conditional_submit` 数量 MUST 继续为 7
- **AND** `conditional_approval` 数量 MUST 继续为 0

#### Scenario: 67 和 71 只作为分析口径
- **WHEN** 团队评审 20260629 自研模式流程图
- **THEN** 团队 MAY 将 PDF 图面红色产出统计为 67 项
- **AND** 团队 MAY 将业务修正后的逻辑产出候选统计为 71 项
- **AND** 系统 MUST NOT 因 67 或 71 的分析口径改变当前 64 项模板初始化

#### Scenario: 疑似新增资料不得自动进入模板
- **WHEN** 20260629 流程图中出现 `投标书`、`技术协议草稿（合同签订阶段）`、`销售合同草稿`、`技术协议草稿（生产制作阶段）`、`技术协议（生产制作阶段/供应商侧成品）`、`采购合同草稿`、`合格供应商评价表`、`生产记录表`、`资料移交清单` 或其他当前 64 项未包含的产出
- **THEN** 系统 MUST NOT 自动将其加入项目级阶段资料清单初始化
- **AND** 团队 MUST 通过后续独立 change 确认资料名称、阶段、必填性、责任人、completionMode 和迁移影响

#### Scenario: 准备和签订节点不得长期伪多对一
- **WHEN** 后续迁移合同签订阶段或生产制作阶段中准备技术协议、签订技术协议、准备销售合同、签订销售合同、准备采购合同或签订采购合同节点
- **THEN** 团队 MUST 将准备节点优先建模为草稿产出候选，将签订节点建模为成品产出
- **AND** 系统 MUST NOT 长期要求准备节点和签订节点共用同一个成品资料项表达不同业务状态

#### Scenario: 成本估算表允许多节点协作同一产出
- **WHEN** 后续迁移方案设计阶段成本估算和价格估算节点
- **THEN** 团队 MAY 将 `成本估算表` 作为多人或多节点协作同一表处理
- **AND** 该例外 MUST NOT 被扩展为技术协议、销售合同或采购合同的通用伪多对一规则

#### Scenario: 疑似改名或阶段移动需要独立确认
- **WHEN** 20260629 流程图中的产出名称、阶段位置或责任中心与当前 20260625 模板不完全一致
- **THEN** 系统 MUST 继续按当前模板返回既有资料项
- **AND** 系统 MUST NOT 因本规划 change 改名、移动或删除既有资料项

#### Scenario: completionMode 变化需要独立确认
- **WHEN** 20260629 流程图中的 YES/NO、审批、签收、总经理批准或回退关系暗示某资料 completionMode 可能变化
- **THEN** 系统 MUST 继续使用当前资料项已定义的 completionMode
- **AND** 任何 completionMode 调整 MUST 通过后续独立 change 补齐规格、实现、smoke 和迁移策略
