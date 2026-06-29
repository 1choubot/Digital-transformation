## MODIFIED Requirements

### Requirement: 在线平台内部完成规则优先

在线平台 MUST 先完成项目编号后置、`completionMode`、资料提交/审核、精准返工、`1.2 项目立项审批表` 专用多节点审批、审核待办和阶段推进闭环，不得通过文件平台或复杂流程引擎绕开这些规则。

#### Scenario: 不解决 1.2 多节点在线审批

- **WHEN** 系统处理 `1.2 项目立项审批表` 的审批 NO
- **THEN** 精准返工能力本身 MUST 仅处理审批 NO 后对 `1.1` 的固定返工目标
- **AND** `1.2` 的商务评价、技术评价、总经理多节点在线审批 MUST 由 `add-initiation-multi-review-flow-v1` 专用规划覆盖
- **AND** 系统 MUST NOT 因该专用规划引入通用审批流引擎

#### Scenario: 1.2 专用多节点审批不绕开 completionMode

- **WHEN** 系统规划或实现 `1.2 项目立项审批表` 多节点审批
- **THEN** `1.2` MUST 仍保留在当前 64 项资料模板和 `approval_required` 统计中
- **AND** 系统 MUST 通过专用派生完成规则补充 `completionMode` 判断，而不是改变总体完成规则数量口径

### Requirement: 查看权限与业务操作权限分离

系统 MUST 在权限架构上分离项目查看、阶段资料查看、附件查看/下载、业务日志查看与业务操作授权，后续实现不得把查看 helper 与操作 helper 合并为同一授权入口；`1.2` 多节点审批操作不得因全量查看而放宽。

#### Scenario: 查看权限不授予 1.2 节点审批

- **WHEN** 总经理助理、中心负责人、项目创建人或项目经理因查看规则能看到 `1.2 项目立项审批表` 多节点状态
- **THEN** 系统 MUST NOT 因查看权限授予商务评价、技术评价或总经理审批节点操作权限
- **AND** 节点审批操作 MUST 使用独立业务操作授权判断

#### Scenario: 操作 helper 不得因 1.2 规划放宽

- **WHEN** 系统判断资料提交、资料审核、资料退回、精准返工退回、责任人分配、适用性管理、附件上传、附件删除、阶段推进、项目编号填写或 `1.2` 节点审批
- **THEN** 系统 MUST NOT 将“可查看项目”或“可查看 `1.2` 节点状态”作为充分授权条件

## ADDED Requirements

### Requirement: 1.2 专用多节点审批架构

系统 MUST 使用专用架构规划 `1.2 项目立项审批表` 多节点审批，不得复用 legacy 阶段审批流作为当前主路径，也不得引入通用审批流引擎。

#### Scenario: 使用专用节点结构

- **WHEN** 后续实现 `1.2 项目立项审批表` 多节点审批
- **THEN** 系统 SHOULD 新增 `project_initiation_review_nodes` 或等价专用结构保存节点状态
- **AND** 节点结构 MUST 能表达商务评价、技术评价和总经理审批状态

#### Scenario: 节点状态枚举不引入节点提交状态

- **WHEN** 后续实现 `1.2 项目立项审批表` 专用节点状态
- **THEN** 节点状态 MUST 至少能表达 `waiting_document_submission`
- **AND** 节点状态 MUST 能表达 `pending`
- **AND** 节点状态 MUST 能表达 `approved`
- **AND** 节点状态 MUST 能表达 `returned_blocked_by_rework`
- **AND** 节点状态 MUST 能表达 `not_started` 或 `waiting_prerequisite`
- **AND** 节点状态 MAY 能表达 `invalidated`，用于总经理节点因商务或技术退回而失效
- **AND** 节点状态 MUST NOT 使用需要前端 `1.2` 节点提交按钮才能继续审批的 `submitted` 状态
- **AND** `submitted_by_user_id` / `submitted_at` 若保留，MUST 只作为普通 `1.2` 资料提交触发多节点激活的追溯字段

#### Scenario: 既有项目幂等初始化 1.2 审批节点

- **WHEN** 后续 migration 或幂等初始化逻辑处理既有项目中适用的 `1.2 项目立项审批表`
- **THEN** 系统 MUST 为其创建 `business_review`、`technical_review` 和 `general_review` 三类专用节点
- **AND** 当 `1.2 status = not_submitted` 时，`business_review` 和 `technical_review` MUST 等待资料提交且不得生成审批待办
- **AND** 当 `1.2 status = submitted` 时，`business_review` 和 `technical_review` MUST 初始化为待处理或可处理状态
- **AND** 当既有 `1.2 status = confirmed` 时，系统 MUST 将其作为资料已提交过的兼容输入，使 `business_review` 和 `technical_review` 初始化为待处理或可处理状态
- **AND** 当 `1.2 status = returned` 时，`business_review` 和 `technical_review` MUST 等待普通 `1.2` 资料重新提交且不得生成审批待办
- **AND** `general_review` MUST 初始化为未开始或等待前置状态，直到商务评价和技术评价均通过
- **AND** 既有普通 `1.2 status = confirmed` MUST NOT 被回填或解释为多节点最终通过
- **AND** 旧 confirmed 状态 MUST NOT 绕过第 1 阶段推进或项目编号门禁

#### Scenario: 普通资料提交激活 1.2 节点

- **WHEN** 普通 `1.2 项目立项审批表` 资料提交或上传使基础状态达到 `submitted`
- **THEN** 系统 MUST 激活 `business_review` 和 `technical_review` 并进入并行待审批
- **AND** 第一版 MUST NOT 新增独立节点提交按钮或独立节点提交流程

#### Scenario: 不复用 legacy 阶段审批主路径

- **WHEN** 系统实现 `1.2` 多节点审批
- **THEN** 系统 MUST NOT 将 legacy 阶段审批流作为当前主路径
- **AND** legacy 阶段审批历史不得成为第 1 阶段推进或项目编号门禁依据

#### Scenario: 不做通用审批流引擎

- **WHEN** 系统实现 `1.2` 多节点审批
- **THEN** 系统 MUST 将能力限定为 `1.2 项目立项审批表` 专用流程
- **AND** 系统 MUST NOT 新增 BPM、可视化流程编排、任意节点配置器或通用审批流引擎

#### Scenario: 项目阶段资料状态仍保留

- **WHEN** 系统保存 `1.2` 多节点审批状态
- **THEN** `project_stage_documents.status` MUST 仍保留资料基础状态
- **AND** `1.2` 最终完成 MUST 由基础状态、多节点状态和精准返工状态共同派生

#### Scenario: 文件平台仍暂停

- **WHEN** 系统处理 `1.2` 多节点审批、节点日志、精准返工或阶段推进门禁
- **THEN** 系统 MUST NOT 调用文件管理平台 API
- **AND** 系统 MUST NOT 恢复文件平台 folder mapping、归档状态或文件平台下载入口

#### Scenario: 已确认规则必须按本 change 实现

- **WHEN** 后续实现 `1.2 项目立项审批表` 多节点审批
- **THEN** 系统 MUST 按本 change 已确认规则实现商务/技术并行、营销中心负责人商务审批、研发中心负责人技术审批、总经理待办后置生成和退回节点及后续节点重跑
- **AND** 系统 MUST NOT 因这些固定规则引入通用审批流引擎
