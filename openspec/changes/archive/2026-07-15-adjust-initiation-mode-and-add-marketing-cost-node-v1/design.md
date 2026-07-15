## Context

### Current State

| Area | Current behavior | Target behavior |
| --- | --- | --- |
| 立项项目开展模式 | `projectExecutionMode` 当前在 `1.2 项目立项审批表` 在线表单中由商务负责人填写，且是商务部分必填字段。 | 商务负责人不再负责填写项目开展模式；总经理审批通过 `1.2` 时必须选择项目开展模式。 |
| 1.2 生成文件 | 模板 manifest 从 `form.projectExecutionMode` 勾选自研模式或供应链模式，该字段只用于生成 `1.2` 审批表。 | 总经理选择后仍写回 `form.projectExecutionMode`，继续作为生成/查看 `1.2` 审批表的唯一来源。 |
| 项目主数据模式 | 现有规格要求 `projectExecutionMode` 不写入 `projects.project_mode`。 | 保持不写入 `projects.project_mode`，不影响系统项目模式、阶段、筛选或齐套。 |
| 总经理审批入口 | 后端入口为 `approveInitiationReviewNode`，当前 payload 只接收 comment。 | 总经理审批通过时 payload 必须包含 `projectExecutionMode`；审批不通过时不得要求该字段。 |
| 总经理审批不通过 | 总经理退回当前触发 `1.1` 返工并阻断后续立项推进。 | 保持退回/返工语义，不因为缺少项目开展模式阻断退回。 |
| 1.3 通知模板 | 当前 `1.3 项目立项通知` 旧注册模板是 `关于确定项目名称及编号的通知-模板.docx`。 | 实现时切换为新版 `项目立项通知-模板.docx`，避免和旧模板名混用。 |
| 1.3 通知表格 | 当前 `1.3` 通知生成累计项目清单，清单来自 `selectNoticeProjectList()`，不是只生成当前项目一行。 | 新版模板表格列为：序号、项目编号、项目名称、客户单位、开展模式、立项日期；每行开展模式使用该行项目自己的 `projectExecutionMode`。 |
| 方案设计成本链路 | 当前链路为研发成本估算、制造成本估算、财务成本估算。 | 链路调整为研发成本估算、制造成本估算、营销成本估算、财务成本估算。 |
| C17 派生 | C17“成本估算表”由研发、制造、财务三段节点均 approved 且三个 current 文件齐套派生完成。 | C17 仍是一个资料项，但由研发、制造、营销、财务四段均 approved 且四个 current 文件齐套派生完成。 |
| 上传槽 | 当前成本上传槽为 `rd_cost_estimation_file`、`manufacturing_cost_estimation_file`、`finance_cost_estimation_file`。 | 新增 `marketing_cost_estimation_file`，由商务负责人上传，营销中心负责人审批。 |

### Constraints

- 保持 8 大阶段不变。
- 保持 71 项资料数量不变，C17 不拆成多个资料项。
- 不改变合同签订阶段业务。
- 不改变报价单在线表单字段、生成和下载规则。
- 不处理旧关口审批下线。
- 本 change 按 Batch 1/2/3 分批实施；归档和提交在实现与校验完成后按 tasks 收尾执行。

## Goals / Non-Goals

**Goals:**

- 将 `1.2` 项目开展模式决策点移动到总经理审批通过动作。
- 明确总经理退回 `1.2` 时不要求项目开展模式。
- 明确总经理选择写回 `1.2` 表单数据，继续服务模板生成，但不写入项目主数据模式。
- 在方案设计 C17 成本估算链路中增加营销成本估算节点和上传槽。
- 明确制造、营销、财务之间的流转、退回、重提、工作台待办、operation log、C17 派生和自动推进影响。

**Non-Goals:**

- 不改变 8 大阶段。
- 不改变 71 项资料数量。
- 不改合同签订阶段。
- 不改报价单在线表单。
- 不处理旧关口审批下线。
- 不处理无关 untracked。
- 归档和提交按 tasks 收尾执行。

## Decisions

### Decision 1: 项目开展模式由总经理最终审批通过时选择

商务负责人 `1.2` 协同填写仍负责商务评分项和商务信息；`projectExecutionMode` 从商务必填字段中移除。总经理审批通过 `1.2` 时必须提交 `projectExecutionMode`，值只能是自研模式或供应链模式。总经理审批不通过时不展示、不校验、不要求该字段。

Rationale: 项目开展模式属于最终立项决策，不应由商务负责人在并行评价阶段提前确定。

### Decision 2: 总经理选择写回 1.2 表单数据但不写入 projects.project_mode

总经理审批通过时，后端在同一事务内写回 `1.2` 在线表单 `formData.projectExecutionMode`，然后完成总经理审批通过和后续模板生成触发。生成 `项目立项审批表-模板.xlsx` 时继续从 `form.projectExecutionMode` 勾选模板中的自研模式或供应链模式。

该字段仍不得写入 `projects.project_mode`，也不得改变阶段推进、资料状态机、适用性、项目筛选或其他业务逻辑。

Rationale: 复用现有模板 manifest 的字段来源，避免引入第二套模板字段，同时保持系统项目模式边界。

### Decision 3: 1.2 被退回重走时旧总经理选择失效

如果 `1.2` 因总经理退回或并行评价退回导致重新走审批，上一轮总经理选择的 `projectExecutionMode` 必须失效。重新进入总经理审批通过时必须重新选择，并覆盖写回最新表单数据。失效可以通过清空表单字段、记录 revision/审批轮次或在生成时只接受当前总经理审批轮次字段实现，但不能复用旧轮次选择绕过本轮审批。

Rationale: 项目开展模式是总经理本轮最终审批结论的一部分，不能跨返工轮次自动沿用。

### Decision 4: 1.3 立项通知切换新版模板并携带开展模式列

实现时必须将 `INITIATION_TEMPLATE_KEY.NOTICE` 注册模板切换为 `项目立项通知-模板.docx`，避免继续使用旧模板名 `关于确定项目名称及编号的通知-模板.docx`。

`1.3` 表单展示只读 `projectExecutionMode` 字段，来源于对应项目已通过的 `1.2` 总经理选择。`1.3` 提交/生成时应把当前项目的 `projectExecutionMode` 写入 `1.3` 表单快照。生成累计项目清单时，每一行使用该行项目自己的 `projectExecutionMode`，不得把当前项目的开展模式套到所有项目行。

历史测试数据没有开展模式时可以为空，不做复杂迁移兼容；当前新流程项目必须有值。`projectExecutionMode` 仍不得写入 `projects.project_mode`。

新版 `智能制造项目管理文件模板/项目立项通知-模板.docx` 属于运行环境模板库文件，该目录当前被 `.gitignore` 忽略。部署和测试环境必须手动确认该模板存在，不需要把模板文件纳入本次提交。

Rationale: 新版通知模板已经增加“开展模式”列，数据来源必须和总经理最终审批结论一致，并且累计清单按项目逐行取值。

### Decision 5: 营销成本估算作为 C17 内部节点，不新增资料项

新增节点：

- `marketing_cost_estimation`
- 名称：营销成本估算
- 顺序：制造成本估算之后，财务成本估算之前

新增上传槽：

- `marketing_cost_estimation_file`
- 名称：营销中心成本估算表
- 上传人：商务负责人
- 审批人：营销中心负责人

C17 仍为“成本估算表”一个主资料项，不新增资料项，不改变 8 阶段和 71 项资料数量。

Rationale: 营销成本估算是 C17 内部协作段落，不是新的阶段资料。

### Decision 6: 成本链路流转调整为研发 -> 制造 -> 营销 -> 财务

制造成本估算审批通过后激活营销成本估算；营销成本估算审批通过后激活财务成本估算。营销中心负责人审批不通过时停留在营销成本估算节点，商务负责人整改后重提。退回后旧 current file 可复用的规则与研发、制造、财务成本估算一致。

财务总经理退回到成本链路时，重置/重提范围必须包含研发、制造、营销、财务四段。报价被拒后返回成本链路时也必须包含营销成本估算。

Rationale: 营销成本估算位于制造成本输入之后、财务汇总之前，财务和报价返工必须覆盖完整成本链路。

### Decision 7: C17 完成和自动推进消费四段统一结果

C17 完成条件改为：研发、制造、营销、财务四段成本节点都审批完成，且 `rd_cost_estimation_file`、`manufacturing_cost_estimation_file`、`marketing_cost_estimation_file`、`finance_cost_estimation_file` 四个 current 文件齐套。

阶段齐套、自动推进、工作台待办和 C17 派生必须消费同一四段结果。未完成营销成本估算不得派生 C17 完成，不得触发方案设计阶段自动推进。

Rationale: 避免后端提交门禁、派生资料、工作台待办和自动推进出现不同完成口径。

### Decision 8: 需要正式 migration 扩展 MySQL enum

方案设计节点和上传槽当前使用 MySQL enum 约束，需要新增正式 migration 扩展：

- `project_solution_design_nodes.node_key`
- `project_solution_design_upload_slots.node_key`
- `project_solution_design_upload_slots.slot_key`
- `project_solution_design_upload_files.slot_key`

实现不能只改 `ensureSolutionDesignWorkflowSchema()`；旧库必须通过 migration 获得新 enum 值。

Rationale: 真实环境不会在 API 启动路径自动执行 schema ensure，仅改 ensure 会导致旧库插入新节点/槽位时报 enum 错误。

### Decision 9: 旧方案设计 workflow 测试数据不做兼容迁移

当前库中的旧方案设计 workflow 数据是测试模拟数据，没有业务保留价值。本 change 不兼容旧的 9 节点方案设计 workflow 持久化数据，也不做旧测试数据的批量修复。

部署或测试时，如果已存在旧 9 节点方案设计测试项目，应删除/重建测试项目，或清空该项目的方案设计 workflow 数据后重新初始化。实现不得为了旧测试数据增加运行时代码复杂度：不增加节点 order 修复逻辑，不写旧 9 节点自动升级为 10 节点的兼容路径，也不新增“旧 9 节点自动升级”的回归测试。

Rationale: 营销成本估算改变的是 C17 内部 workflow 结构；测试模拟数据可重建，运行时保留旧结构兼容会增加状态机复杂度并弱化新流程的 10 节点/17 槽位单一口径。

### Decision 10: 方案设计导航使用专用 workflow 作为唯一流程节点来源

方案设计阶段的左侧导航和工作区节点展示必须以 `SOLUTION_DESIGN_NODES` / solution design workflow 为单一来源。项目未进入方案设计阶段时也展示同一套 10 个专属节点，但节点状态为未开始且不可操作；进入方案设计阶段后使用持久化 workflow 状态展示当前、待审、退回和完成状态。

旧资料模板蓝图节点 `cost_price_estimation`、`quotation`、`tender` 不再作为可点击流程节点暴露。C17、C18、C19 仍保留为 71 项资料体系中的资料项和派生完成归属，不因导航收口新增或删除资料项。

如果 URL 指向已下线或不存在的方案设计 nodeKey，前端不得静默回退到方案设计准备节点；应保留或提示该 nodeKey 无效，等待 workflow 加载完成后再按有效节点展示。

Rationale: 方案设计已经由专用 workflow 接管流程状态，继续暴露旧蓝图节点会形成两套可点击流程入口，并导致营销成本估算等新节点点击后被前端回退。

## Risks / Trade-offs

- [Risk] 总经理审批 payload 变更影响现有前端调用。 -> Mitigation: 只在总经理审批通过 `1.2` 时要求 `projectExecutionMode`，退回动作和非总经理节点保持兼容。
- [Risk] 表单数据写回和模板生成不在同一事务可能导致生成文件缺字段。 -> Mitigation: 审批通过事务内先写回表单，再提交审批；生成任务只读取已提交的最新表单数据。
- [Risk] MySQL enum migration 遗漏会导致旧库插入失败。 -> Mitigation: Batch 2 必须新增正式 migration 并在测试/手工库上验证。
- [Risk] C17 四段完成口径漏改工作台或自动推进。 -> Mitigation: 回归测试必须覆盖 C17 派生、报价拒绝返回、总经理退回、自动推进和待办。

## Migration Plan

1. Batch 1 调整立项项目开展模式和 `1.3` 通知模板：后端审批 payload、表单写回、`1.3` 表单快照、模板注册切换、模板生成字段、前端总经理审批弹层和 initiation workflow 测试。
2. Batch 2 调整方案设计成本链路：正式 migration、节点/槽位定义、权限、流转、派生、待办、前端和 solution design workflow 测试。该 migration 只扩展 enum，不迁移旧 9 节点测试/模拟 workflow 数据；旧测试项目需要重建或清空并重新初始化方案设计 workflow 数据。
3. Batch 3 跑完整验证并收尾。

Rollback strategy: Batch 1 可回退审批 payload 和表单字段责任；Batch 2 回退时必须同步回退 enum migration 前后的数据策略，生产库若已创建营销成本节点，需要先迁移或清理对应 workflow 数据再回退代码。

## Resolved Decisions

- 第一版项目开展模式仍使用现有两个值：自研模式、供应链模式。
- 第一版营销成本估算上传人使用商务负责人，审批人使用营销中心负责人。
- C17 不新增资料项，不改变 8 阶段和 71 项资料数量。
- 本 change 不兼容旧 9 节点方案设计 workflow 持久化测试数据；旧测试项目应删除/重建或重新初始化 workflow，不增加运行时兼容逻辑。
- 方案设计导航使用专用 workflow 作为唯一可点击流程节点来源，旧蓝图节点只保留资料归属，不作为流程节点展示。
