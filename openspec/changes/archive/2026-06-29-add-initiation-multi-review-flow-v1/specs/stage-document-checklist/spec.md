## MODIFIED Requirements

### Requirement: 资料项基础状态

系统 MUST 保存项目级资料项基础状态，并 MUST 区分基础状态、业务完成状态、精准返工标记和 `1.2 项目立项审批表` 专用多节点审批状态；业务完成状态 MUST 由 `completionMode`、`status`、`isApplicable`、`revision_required` 和特殊资料规则派生。

#### Scenario: 1.2 基础 confirmed 不等于最终完成

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `confirmed`
- **AND** 商务评价审批、技术评价审批或总经理审批尚未全部最终通过
- **THEN** 系统 MUST 将该资料业务完成状态派生为未完成或待审批
- **AND** 系统 MUST NOT 将其计入阶段齐套完成

#### Scenario: 1.2 未提交时多节点不进入审批

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `not_submitted`
- **THEN** 系统 MAY 预创建 `business_review`、`technical_review` 和 `general_review`
- **AND** `business_review` 和 `technical_review` MUST 处于等待资料提交或不可审批状态
- **AND** 系统 MUST NOT 将其纳入商务评价或技术评价审批待办

#### Scenario: 1.2 普通提交激活商务技术节点

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 普通资料提交或上传使其基础状态达到 `submitted`
- **THEN** 系统 MUST 将 `business_review` 和 `technical_review` 激活为待审批或可审批状态
- **AND** `general_review` MUST 继续保持未开始或等待前置状态

#### Scenario: 1.2 returned 重新提交前不进入审批

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** 该资料基础状态为 `returned`
- **THEN** 系统 MUST 等待普通 `1.2` 资料重新提交
- **AND** 系统 MUST NOT 在重新提交前将 `business_review` 或 `technical_review` 纳入审批待办

#### Scenario: 1.2 相关阻塞覆盖完成状态

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** `1.1 项目需求表` 存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 业务完成状态派生为未完成或需返工
- **AND** `1.2` 自身 MUST 通过节点状态、基础状态或专用多节点状态表达待审、退回或未通过，不得作为返工目标写入 `revision_required`

### Requirement: 阶段资料齐套摘要

系统 MUST 为每个阶段分组返回适用资料齐套摘要，并 MUST 只基于当前项目级阶段资料项、`completionMode`、基础状态、现有 `isApplicable` 适用性、`revision_required` 返工标记和特殊资料完成规则判断计算。

#### Scenario: 1.2 按多节点最终通过计入齐套

- **WHEN** 系统计算第 1 阶段齐套摘要
- **AND** 当前阶段包含适用的 `1.2 项目立项审批表`
- **THEN** 系统 MUST 只有在 `business_review approved`、`technical_review approved`、`general_review approved` 且 `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required` 后，才将 `1.2` 计入已完成数量

#### Scenario: 1.2 未最终通过进入缺失列表

- **WHEN** `1.2 项目立项审批表` 未完成所有必需审批节点
- **THEN** 系统 MUST 将 `1.2` 计入 `incompleteRequiredDocuments` 或等价未完成资料列表
- **AND** 列表项 MUST 能表达未完成原因是 `1.2` 多节点审批未最终通过

#### Scenario: 1.2 商务技术并行未全通过不完成

- **WHEN** `business_review` 或 `technical_review` 任一节点未 `approved`
- **THEN** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 系统 MUST NOT 因另一并行节点已通过而将 `1.2` 计入齐套完成

#### Scenario: 1.2 总经理未通过不完成

- **WHEN** `business_review` 和 `technical_review` 均已 `approved`
- **AND** `general_review` 尚未 `approved`
- **THEN** 系统 MUST 将 `1.2` 派生为未完成

#### Scenario: 1.2 返工未清除进入缺失列表

- **WHEN** `1.2` 退回触发的 `1.1` 精准返工尚未清除
- **THEN** 系统 MUST 将相关阻塞原因返回到第 1 阶段齐套摘要或缺失资料列表
- **AND** 前端 MUST 能展示为需返工阻塞，而不是普通未提交

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 按 `completionMode` 限定提交、确认和退回动作；`1.2 项目立项审批表` 的普通资料确认/退回接口不得继续承载审批，必须使用专用多节点审批状态机。

#### Scenario: 1.2 普通确认接口必须拒绝

- **WHEN** 用户通过普通资料确认接口对 `1.2 项目立项审批表` 执行确认
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 提示调用方使用 `1.2` 专用多节点审批能力
- **AND** 系统 MUST NOT 将 `1.2` 派生为最终完成

#### Scenario: 1.2 普通退回接口必须拒绝

- **WHEN** 用户通过普通资料退回接口对 `1.2 项目立项审批表` 执行退回
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 提示调用方使用 `1.2` 专用多节点审批能力
- **AND** 系统 MUST NOT 通过普通资料退回接口触发 `1.1 revision_required`

#### Scenario: 1.2 节点退回触发固定 1.1 返工

- **WHEN** `1.2 项目立项审批表` 的商务评价、技术评价或总经理审批节点退回
- **THEN** 系统 MUST 要求非空退回原因
- **AND** 系统 MUST 按 A 类精准返工规则只允许选择 `1.1 项目需求表` 作为上游返工目标
- **AND** 系统 MUST 只将 `1.1` 标记为 `revision_required`
- **AND** 系统 MUST NOT 将 `1.2` 自身标记为 `revision_required`
- **AND** 系统 MUST NOT 将 `1.2` 对应的 `project_stage_documents.status` 置为 `returned`
- **AND** 节点退回 MUST 只更新专用节点状态，例如 `returned_blocked_by_rework`，并标记 `1.1 revision_required`
- **AND** 系统 MUST NOT 整阶段退回或自动退回全部前置资料

#### Scenario: 1.1 返工未清除前不得通过退回节点

- **WHEN** `1.2` 任一节点退回后已标记 `1.1 revision_required = true`
- **AND** `1.1 revision_required` 尚未清除
- **THEN** 系统 MUST 拒绝该退回节点的审批通过动作
- **AND** 系统 MUST NOT 将 `1.2` 派生为最终完成

#### Scenario: 1.1 返工清除后退回节点自动回到待审批

- **WHEN** `1.1 revision_required` 已清除
- **AND** `1.2` 存在被退回节点
- **THEN** 后端 MUST 自动将被退回节点回到待审批或可审批状态
- **AND** 该节点 MUST 回到对应节点审批人的待办
- **AND** 系统 MUST NOT 仅因 `1.1` 返工清除就直接将该节点视为通过
- **AND** 第一版 MUST NOT 新增 `1.2` 重提按钮或单独重提待办

#### Scenario: 重跑节点及下游重新满足后才可完成

- **WHEN** 被退回节点已自动回到待审批或可审批状态
- **AND** 该节点由对应节点审批人重新审批通过
- **THEN** 系统 MUST 继续检查该节点下游节点是否按确认规则重新满足
- **AND** 只有重跑节点及其下游节点均重新满足后，`1.2` 才可恢复最终完成判断

### Requirement: 资料状态按 completionMode 完成

系统 MUST 按资料项 `completionMode`、基础状态、适用性、`revision_required` 和特殊资料规则判断资料是否完成、是否进入审核待办以及是否阻塞阶段推进。

#### Scenario: 1.2 approval_required 使用专用完成规则

- **WHEN** 资料项为 `1.2 项目立项审批表`
- **AND** `completionMode = approval_required`
- **THEN** 系统 MUST 使用专用多节点审批完成规则判断其是否完成
- **AND** 系统 MUST NOT 只按普通 `approval_required + confirmed` 规则判定完成

#### Scenario: 1.2 多节点全部通过后完成

- **WHEN** `1.2 项目立项审批表` `business_review approved`
- **AND** `technical_review approved`
- **AND** `general_review approved`
- **AND** `1.1` 不存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 将 `1.2` 派生为完成

### Requirement: 精准返工固定分类

系统 MUST 将审批 NO 后的返工处理固定分为 A 类固定候选返工、B 类单份退回和 C 类厂内安装调试特殊处理，并 MUST 保持当前 64 项 `completionMode` 统计不变；`1.2` 多节点审批 NO 仍复用 A 类固定候选 `1.1`。

#### Scenario: 1.2 多节点 NO 仍只返工 1.1

- **WHEN** `1.2 项目立项审批表` 的商务评价、技术评价或总经理审批节点审批 NO
- **THEN** A 类返工候选 MUST 仅为 `1.1 项目需求表`
- **AND** 系统 MUST 只把 `1.1` 标记为 `revision_required`
- **AND** `1.2` 自身 MUST 通过节点状态、基础状态或专用多节点状态阻塞，不得作为返工目标写 `revision_required`
- **AND** 系统 MUST NOT 允许自由勾选第 1 阶段全部资料

#### Scenario: 1.2 多节点不改变 completionMode 数量

- **WHEN** 系统规划或实现 `1.2 项目立项审批表` 多节点审批
- **THEN** `1.2` MUST 仍保留在当前 64 项普通资料模板中
- **AND** `submit_only 33`、`approval_required 24`、`conditional_submit 7`、`conditional_approval 0` MUST 保持不变

## ADDED Requirements

### Requirement: 1.2 项目立项审批表完成状态

系统 MUST 为 `1.2 项目立项审批表` 提供区别于普通 `approval_required` 的派生完成状态。

#### Scenario: 必需节点全部通过才完成

- **WHEN** 系统派生 `1.2` 完成状态
- **THEN** 系统 MUST 校验 `business_review approved`、`technical_review approved` 和 `general_review approved`
- **AND** 任一节点待审、未开始、退回或未通过时，`1.2` MUST 派生为未完成

#### Scenario: 前置退回后总经理失效则不完成

- **WHEN** `business_review` 或 `technical_review` 退回
- **THEN** 系统 MUST 将 `general_review` 视为失效、未开始或等待前置
- **AND** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 已通过的并行另一侧节点 MUST 保留通过结果

#### Scenario: 总经理退回后前置通过仍不完成

- **WHEN** `general_review` 退回
- **AND** `business_review` 和 `technical_review` 已通过结果保留
- **THEN** 系统 MUST 将 `1.2` 派生为未完成
- **AND** 直到 `general_review` 重新通过后才可恢复完成判断
- **AND** 已通过的 `business_review` 和 `technical_review` MUST 保留通过结果

#### Scenario: 返工未清除时不能完成

- **WHEN** `1.2` 的所有审批节点均已通过
- **AND** `1.1` 仍存在由 `1.2` NO 触发且未清除的 `revision_required`
- **THEN** 系统 MUST 继续将 `1.2` 派生为未完成
- **AND** 系统 MUST NOT 要求或依赖 `1.2 revision_required` 表达该阻塞

#### Scenario: 1.3 仍按 submit_only

- **WHEN** 系统判断第 1 阶段资料完成状态
- **THEN** `1.3 项目立项通知` MUST 继续按 `submit_only` 提交或上传完成规则判断
- **AND** 系统 MUST NOT 因 `1.2` 多节点审批改变 `1.3` 的完成规则
