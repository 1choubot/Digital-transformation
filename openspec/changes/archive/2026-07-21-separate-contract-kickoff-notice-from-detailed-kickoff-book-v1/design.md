## Context

合同签订 workflow 已收口为 3 个主节点：准备协议和合同、签订协议和合同、项目预付款支付。当前预付款最终动作会生成 `项目启动通知` 并自动推进详细设计，但生成文件仍复用 C25 / `4.1` 资料项，导致合同通知和详细设计阶段 `项目启动书` 被混成同一个资料结果。

本 change 只拆分资料映射和 generated file 归属：合同流程不变，预付款最终动作仍生成 `项目启动通知` 并自动推进详细设计；C25 / `4.1` 回归详细设计阶段 `项目启动书`，后续由详细设计 workflow 的 `项目启动会` 节点接管。

## Goals / Non-Goals

**Goals:**
- 合同 `项目启动通知` 使用 workflow 自有 generated file 标识，不再占用 C25。
- C25 / `4.1` 恢复为详细设计阶段 `项目启动书`，不由合同 workflow 派生完成。
- `project_stage_document_generated_files.stage_document_id` 允许为空，以承载不绑定 71 项资料的 workflow 生成文件。
- 合同阶段推进门禁改为检查预付款完成、payment flow finalized、合同项目启动通知生成文件已生成。
- 保持合同 workflow 3 个主节点、8 大阶段和 71 项资料总数不变。

**Non-Goals:**
- 不改变合同签订阶段业务流程、权限按钮或三种预付款最终动作。
- 不新增合同项目启动通知独立节点。
- 不实现详细设计 workflow 或项目启动会页面。
- 不做 7.20 全量资料清单重构。
- 不把 C24 发票纳入合同 workflow。

## Decisions

### Decision 1: 合同项目启动通知使用 workflow generated file code

预付款最终动作生成的文件继续命名为 `项目启动通知`，但 generated file 记录使用 `document_code = contract_kickoff_notice`、`template_key = contract_kickoff_notice_docx`、`stage_document_id = NULL`。DTO 和下载接口继续在项目预付款支付节点展示生成状态和下载入口。

替代方案是继续写 C25 并用额外字段区分来源；这会让资料齐套、详细设计入口和日志仍需要长期判断同一个 C25 的双重语义，因此不采用。

### Decision 2: C25 / 4.1 回归详细设计资料项

v20260629 模板中 C25 恢复为 `项目启动书`，阶段为详细设计，节点为 `project_kickoff_meeting` / `项目启动会`，责任人和部门保持制造中心负责人相关口径。合同 workflow 派生完成资料只包含 C20、C21、C22、C23。

后续详细设计 workflow 可以接管 C25 完成口径；本 change 只恢复资料定义，不开始实现详细设计流程。

### Decision 3: generated file 表允许无 stage document 绑定

新增正式 migration `032_allow_workflow_generated_files_without_stage_document.sql`，将 `project_stage_document_generated_files.stage_document_id` 改为 nullable，保留外键并允许空值。测试库 schema ensure 同步改为 nullable。这样 workflow 级生成文件可以复用版本、状态、模板 hash、源快照和下载能力，不需要新表。

### Decision 4: 合同阶段门禁检查 workflow 生成文件

合同阶段手工推进和预付款最终动作后的自动推进都必须通过统一阶段推进逻辑。合同阶段附加门禁不再查询 C25 generated file，而是检查 `advance_payment` 节点已完成、`paymentFlow.status` 已 finalized、`contract_kickoff_notice` 当前有效 generated file 已生成。

阻塞原因仍返回 `项目启动通知未生成完成`，但不得伪装成 C25 未完成资料。

### Decision 5: 日志不写 C25 误导

预付款最终动作和自动推进日志继续表达“生成项目启动通知”，但 details 使用 `generatedFileCode=contract_kickoff_notice`、`documentName=项目启动通知`、template key/version/hash 和 generated file version；不得再写 `documentCode=C25` 表示合同通知。

## Risks / Trade-offs

- [Risk] 历史测试和旧数据可能仍把合同通知视为 C25。 -> Mitigation: 本 change 只更新当前生成和派生逻辑，测试覆盖 generated file 不绑定 C25、C25 名称回归和 71 项总数不变。
- [Risk] `stage_document_id` 变为 nullable 后查询需要避免 inner join 丢失 workflow 文件。 -> Mitigation: 合同 workflow 下载和 DTO 直接按 `project_id + document_code + template_key` 查询 generated file。
- [Risk] C25 暂时回到普通资料语义后详细设计完成口径尚未专用化。 -> Mitigation: 明确后续详细设计 workflow 单独规划，本 change 不自动完成 C25。

## Migration Plan

1. 增加 `032_allow_workflow_generated_files_without_stage_document.sql`，将 generated files 表的 `stage_document_id` 改为 nullable 并保留外键。
2. 更新 schema ensure，保持测试库和正式 migration 字段一致。
3. 更新 C25 模板定义、合同 generated file 写入、合同阶段门禁、资料派生、ownership check 和日志 details。
4. 更新前端合同预付款页面展示口径，继续展示项目启动通知生成状态和下载，不显示 C25。
5. 运行合同 workflow、方案设计、前后端 check、OpenSpec validate 和 `git diff --check`。

## Data Compatibility

当前库均为模拟数据，本 change 不回迁旧模拟 generated file。既有 C25 / `4.1` 项目启动通知生成记录可废弃；模拟项目如需新口径，重新初始化或重建即可。正式真实数据上线前如果已经存在旧 C25 项目启动通知生成记录，再通过独立 change 补充数据迁移。

## Open Questions

None. 详细设计 workflow 如何完成 C25 将由后续独立 change 决定。
