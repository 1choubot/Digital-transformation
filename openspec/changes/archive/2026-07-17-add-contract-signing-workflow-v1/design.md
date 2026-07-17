## Context

当前代码和规格盘点：

- `digital-platform-api/src/domain/projectProcessTemplates.js` 的自研模式 8 阶段中包含 `contract` 合同签订阶段，但只有立项阶段配置了专用节点，合同签订阶段 `nodes` 为空。
- 代码中未发现 `contractSigningWorkflow`、`project_contract_signing_*` 或同类合同签订专用 workflow 模块。
- 当前合同签订阶段主要依赖 v20260629 蓝图资料/普通资料卡片表达，尚未具备独立状态机、上传槽、审批、退回、待办和日志编排。
- v20260629 资料模板中合同相关项当前包含 C20 旧元数据名 `技术协议草稿（合同签订阶段）`、C21 `技术协议（客户侧成品）`、C22 旧元数据名 `销售合同草稿`、C23 `销售合同（客户侧成品）`、C24 `发票（预付款）`；C25 旧展示名为 `项目启动书`，位于详细设计阶段，蓝图另有合同阶段过程节点 `project_start_notice / 项目启动通知` 且当前不形成目标资料。这些旧名需要在本 change 实现时收口为合同 workflow 的最终业务展示名。
- 现有规格中仍有旧边界：方案设计自动推进只记录进入合同门禁，不创建合同业务数据；文件平台和前端不得实现合同审批流。这些限制需要在本 change 中收口为“禁止通用 BPM/文件平台承载，允许合同签订专用 workflow”。

## Goals / Non-Goals

**Goals:**

- 建立合同签订阶段专用 workflow，覆盖准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知 4 个节点。
- 沿用方案设计阶段的技术负责人、商务负责人分配结果，避免在合同阶段重新做人事分配。
- 由后端统一返回合同阶段导航节点、上传槽、状态、权限、阻塞原因和待办信息。
- 复用方案设计阶段成熟的上传、current file、revision、审批、退回、operation log、待办和资料完成派生模式。
- 明确 workflow 状态和 71 项资料完成状态分开存储，但由 workflow 同步/派生相关资料完成结果。
- 上传项目启动通知后自动完成合同签订阶段并推进到详细设计阶段。

**Non-Goals:**

- 不重新做人事分配。
- 不修改立项阶段。
- 不修改方案设计阶段流程。
- 不改变 8 大阶段数量。
- 不改变 71 项资料数量。
- 不引入通用 BPM、可视化流程编排器或任意节点配置器。
- 不实现采购合同流程、生产制作阶段合同流程、发票审批流或通用付款审批流。
- 不处理无关 untracked。
- 本 change 分批实施；实现范围按 `tasks.md` 分批收口，归档和提交仅在全部实现、校验和 review 完成后执行。

## Decisions

### Decision 1: 使用合同签订专用 workflow 模块

实现时新增 `contractSigningWorkflow` 后端模块，而不是把合同流程硬塞进普通资料卡片或前端本地拼节点。该模块负责节点定义、上传槽定义、权限、状态流转、DTO、工作台待办、operation log 和资料完成派生。

Alternatives considered:

- 继续使用普通资料卡片：无法表达并行技术/销售准备线、扫描件局部退回、预付款总经理放行等待态。
- 引入通用 BPM：超出当前项目复杂度，也会破坏现有阶段资料闭环的稳定边界。

### Decision 2: 合同阶段导航以后端 workflow DTO 为唯一来源

合同签订阶段进入前后，前端都应从后端 `contractSigningWorkflow` DTO 获取同一套节点。前端不得继续展示旧蓝图节点作为主流程节点，也不得本地拼接 `contract_preparation` 等节点。

合同签订阶段主导航只能包含 `contract_preparation`、`contract_signing`、`advance_payment`、`project_kickoff_notice` 4 个 workflow 节点。旧蓝图节点和 v20260629 71 项资料不得再作为合同阶段可点击主流程节点使用，只保留资料归档、资料齐套、普通/条件资料展示和 workflow 派生完成结果职责。

C20 `技术协议`、C22 `销售合同`、C21 `技术协议（客户侧成品）`、C23 `销售合同（客户侧成品）`、C25 `项目启动通知` 的完成状态由合同 workflow 对应上传、审批、签署确认和项目启动通知上传动作派生或同步。C24 `发票（预付款）` 不进入合同 workflow 主导航，不成为第 5 个 workflow 节点；它继续保留在后端资料体系中作为普通/条件性资料项，但合同 workflow 页面只展示 4 个 workflow 主节点，不再提供非主流程资料区或 C24 辅助入口。

### Decision 3: 沿用方案设计 role assignment

技术负责人、商务负责人来自方案设计阶段分配结果。研发中心负责人、营销中心负责人、总经理按组织角色动态解析。合同阶段不新增人员分配节点，避免同一项目重复分配角色。

### Decision 4: 正式 migration 和 ensure schema 必须同步

必须新增正式 migration，不能只依赖 schema ensure。建议表：

- `project_contract_signing_nodes`
- `project_contract_signing_upload_slots`
- `project_contract_signing_upload_files`
- `project_contract_signing_payment_flows`，用于记录未付款申请、等待总经理放行、总经理放行通过等支付放行事件。

也可以将支付等待态放进 `advance_payment` 节点扩展 JSON，但正式实现必须说明取舍：独立表便于审计和查询，节点 JSON 改动更小但查询和日志关联弱。无论选择哪种方式，都必须有正式 migration。

### Decision 5: 准备协议和合同节点使用两条并行文件线

`contract_preparation` 包含技术协议和销售合同两条线。技术协议由技术负责人上传、研发中心负责人审批；销售合同由商务负责人上传、营销中心负责人审批。任一线退回只影响本线；两条线都 approved 后节点完成并激活 `contract_signing`。

准备节点的最终业务文件名、前端展示名、上传槽名和 workflow 文案必须是 `技术协议`、`销售合同`，不得使用“草稿”作为最终展示名。现有 v20260629 元数据中的 C20 旧名 `技术协议草稿（合同签订阶段）`、C22 旧名 `销售合同草稿` 只作为现状和修正来源；实现时必须把 C20/C22 展示名修正为 `技术协议`、`销售合同`，保留 C20/C22 稳定编码，不新增资料项，不改变 71 项资料总数。

准备节点上传后必须提供 current file 下载接口，确保研发中心负责人和营销中心负责人审批前可以查看对应技术协议或销售合同，避免盲审。DTO 中的 `canUpload` / `canSubmit` / 节点级上传权限必须与后端实际可上传状态一致：只有待上传或退回状态才显示上传/提交入口，已提交待审和已通过状态不得继续展示重复上传入口。退回后即使 current file 仍存在，阻塞原因也必须按 slot 状态显示“等待整改并重新上传”，不得只因存在 current file 而误判为无阻塞。

下载权限需要对称覆盖准备线：技术协议 current file 允许技术负责人和研发中心负责人下载，销售合同 current file 允许商务负责人和营销中心负责人下载；无关用户不得下载。

### Decision 6: 签订协议和合同节点表达线下签署确认，不写成自审

`contract_signing` 由商务负责人上传技术协议扫描件和销售合同扫描件。商务负责人随后分别确认线下签署结果，文案和日志必须写作“确认线下签署结果”，不得写成“商务负责人审批自己上传的文件”。

扫描件 current file 下载权限随签订节点同步提供，商务负责人可以下载已上传的技术协议扫描件和销售合同扫描件。扫描件上传后 slot 进入可确认状态；DTO 只有在扫描件存在且处于可确认状态时展示确认线下签署结果动作，已确认通过后不得继续展示重复上传或重复确认入口。

退回规则：

- 技术协议扫描件不通过：只退回技术协议准备线。
- 销售合同扫描件不通过：只退回销售合同准备线。
- 两个都不通过：两条准备线都退回。
- 两个都通过：进入 `advance_payment`。

### Decision 7: 预付款节点只建模本流程放行，不做通用付款审批

`advance_payment` 支持商务负责人两个动作：

- 完成支付：直接进入 `project_kickoff_notice`。
- 未完成支付，待总经理审批：进入总经理放行等待状态。

总经理只有“通过”动作，通过后进入 `project_kickoff_notice`。总经理不操作时项目停留在该等待状态。该节点不替代财务系统，不新增发票审批流，也不把 C24 `发票（预付款）` 扩展成通用付款状态机。

状态和 DTO 权限必须收敛到后端单一来源：`advance_payment` 初始激活后为 `pending` 且 `paymentFlow.status=pending`，商务负责人仅在该状态看到 `canCompletePayment` 和 `canRequestGeneralManagerRelease`；申请总经理放行后节点状态为 `waiting_general_manager` 且 `paymentFlow.status=waiting_general_manager`，阻塞原因显示 `等待总经理审批预付款放行`，只有总经理看到 `canApprovePaymentRelease`；完成支付后 `paymentFlow.status=completed`，总经理放行后 `paymentFlow.status=released`，两种成功路径都将 `advance_payment` 置为完成并激活 `project_kickoff_notice`，且不再展示重复操作入口。三类写动作必须记录 operation log：预付款完成、未付款申请总经理放行、总经理放行通过。

C24 `发票（预付款）` 在本 change 中继续按普通/条件性资料项处理，不纳入合同 workflow DTO 的接管资料集合；如后续需要与预付款节点形成只读关联，应通过独立规划明确资料责任人、适用性和完成口径。

合同 workflow 页面只展示 `contract_preparation`、`contract_signing`、`advance_payment`、`project_kickoff_notice` 4 个主节点内容，不展示非主流程资料区，也不为 C24 或运行时旧编码 `3.4` 提供合同页面辅助入口。后端可以继续返回资料体系需要的 `stage.supplementalDocuments`，但本 change 的前端合同 workflow 页面不消费该字段；不得新增付款审批、发票审批或将 C24 变成 `advance_payment` 节点内部业务状态。

### Decision 8: 项目启动通知完成后自动推进到详细设计阶段

`project_kickoff_notice` 由商务负责人上传项目启动通知。上传成功后后端必须在同一业务编排中：

- 将合同 workflow 节点置为完成。
- 派生/同步相关资料完成结果。
- 记录项目启动通知上传日志。
- 调用统一阶段门禁将项目从合同签订阶段推进到详细设计阶段。
- 记录自动推进到详细设计阶段日志。

实现时项目启动通知上传必须复用合同 workflow 上传命名空间，只允许项目位于合同签订阶段、项目未结束、`project_kickoff_notice` 节点为 `pending`、上传槽尚无 current file 且操作者为商务负责人时执行。上传成功后 `project_kickoff_notice` 上传槽和节点均置为 `approved`，并由阶段资料派生层把 C25 `项目启动通知` 视为完成。重复上传、节点未激活、非商务负责人和已结束项目必须拒绝。

自动推进日志可以复用统一 `stage.advanced` action type，但 details 必须包含 `triggerAction=contract_signing.project_kickoff_notice_uploaded`、`nodeKey=project_kickoff_notice`、`slotKey=project_kickoff_notice` 和 C25/file/revision 上下文，确保审计上能看出由合同 workflow 项目启动通知触发，而不是手写项目阶段字段绕过门禁。

合同阶段的手工阶段推进兜底也必须受 `project_kickoff_notice` 完成门禁约束。即使当前合同阶段资料清单齐套，后端在 `advanceProjectStage` 中仍必须直接检查 `project_contract_signing_nodes.project_kickoff_notice.status=approved`；未完成时返回 `项目启动通知未上传完成` 等明确阻塞原因，并放入阶段推进门禁详情。上传项目启动通知后的自动推进继续走统一阶段门禁，此时该节点已 approved，应通过该附加门禁。

### Decision 9: C25 项目启动通知命名、阶段归属和单入口收口

`project_kickoff_notice` 是合同 workflow 最后一个业务节点。商务负责人上传的文件业务名为 `项目启动通知`，该上传动作驱动 C25 资料完成结果。

本 change 的明确决策：

- 不改变 8 大阶段数量和 71 项资料总数。
- 保留 C25 稳定编码。
- 将 C25 旧展示名 `项目启动书` 统一修正为 `项目启动通知`。
- C25 的完成由合同 workflow 的 `project_kickoff_notice` 上传动作驱动。
- 阶段导航主流程以合同 workflow DTO 为准。
- 前端不得为 C25 再额外暴露第二个主流程入口，不得同时出现合同阶段 `项目启动通知` 主入口和详细设计阶段旧名 `项目启动书` 主入口。
- 实现层必须同时识别目标编码 C25 和当前运行资料编码 `4.1`，避免 C25 旧稳定编码在资料清单、合同页面辅助区或主流程入口形成第二入口。

本规划不以改变 C25 `stageOrder` 作为目标；实现层应优先保留 C25 稳定编码并通过合同 workflow 派生其完成结果。如果实现层必须调整 C25 元数据阶段归属以消除双入口或对齐合同 workflow，必须在同一 change 中以测试证明不会改变 71 项总数、不会产生双入口、不会破坏上传项目启动通知后自动推进详细设计。

### Decision 10: 已结束项目阻断所有合同阶段写操作

任何合同 workflow 上传、提交、审批、退回、签署确认、预付款放行和项目启动通知上传写操作都必须在事务开始前校验项目未结束。已结束项目只能读取历史状态。

## Risks / Trade-offs

- [Risk] 合同 workflow 和资料完成状态双写可能产生不一致。 -> Mitigation: 所有状态更新、资料完成派生和 operation log 在同一事务内完成，并以 workflow 状态作为派生来源。
- [Risk] C20/C22 旧元数据名包含“草稿”，可能继续泄漏到前端或日志。 -> Mitigation: C20/C22 保留稳定编码，但展示名、上传槽名和 workflow 文案统一修正为 `技术协议`、`销售合同`，并补测试断言最终 UI/DTO 不出现旧名。
- [Risk] 项目启动通知与 C25 旧展示名 `项目启动书` 命名不一致，可能形成合同阶段和详细设计阶段双入口。 -> Mitigation: 保留 C25 稳定编码和 71 项总数，统一 C25 展示名为 `项目启动通知`，合同阶段导航只消费 contract workflow DTO，并补测试断言无双入口。
- [Risk] 预付款节点被误用成通用付款审批。 -> Mitigation: 规格限制为合同签订阶段放行动作，不建通用付款/发票审批流。
- [Risk] 前端本地节点配置和后端 workflow DTO 发生分叉。 -> Mitigation: 合同阶段导航只消费后端 DTO，前端不维护第二套节点顺序。

## Migration Plan

- 新增正式 migration 建表并补充 ensure schema。
- 新项目进入合同签订阶段时初始化 4 个合同 workflow 节点和对应上传槽。
- 实现时修正 C20/C22/C25 元数据展示名，并用测试证明稳定编码和 71 项资料总数不变。
- 旧测试/模拟项目如已进入合同阶段但无 workflow 数据，可删除/重建测试项目或重新初始化合同 workflow；不为旧模拟数据增加运行时复杂兼容逻辑，除非后续实现评估存在真实业务保留价值。
- 部署后通过后端测试验证 8 大阶段数量和 71 项资料数量不变。

## Open Questions

- C24 `发票（预付款）` 后续是否需要与预付款节点形成只读关联仍待业务确认；当前 change 不接管 C24、不新增通用付款审批或发票流程。
