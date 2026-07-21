## Context

合同签订 workflow 已完成准备协议和合同、签订协议和合同、项目预付款支付、项目启动通知 4 节点实现。新的业务口径要求项目启动通知不再作为独立主节点，而是由项目预付款支付节点的最终确认动作生成并完成 C25。平台已有阶段资料 generated file 体系，适合承载 C25 生成文件、版本、源快照、模板信息和下载状态；本 change 补正式 migration 将 `project_stage_document_generated_files` 固化到部署链路。

## Goals / Non-Goals

**Goals:**

- 合同阶段主流程只保留 3 个节点：准备协议和合同、签订协议和合同、项目预付款支付。
- 在项目预付款支付节点的 3 个最终动作中生成 C25 项目启动通知文件。
- 生成文件归属既有 C25 资料项，存入现有 generated file 体系。
- 生成成功后完成 C25、完成合同阶段，并通过统一阶段门禁自动推进到详细设计阶段。
- 前端预付款页面展示确认弹窗、生成状态、下载入口和结果，不再展示独立项目启动通知节点页。

**Non-Goals:**

- 不新增合同 workflow 节点。
- 不保留独立项目启动通知节点作为主流程入口。
- 不新增资料项，不改变 8 大阶段和 71 项资料数量。
- 不改立项、方案设计、详细设计业务流程。
- 不改采购合同、生产制作合同、通用付款或发票流程。
- 不接入通用 BPM 或外部文件平台归档。

## Decisions

### Decision 1: 三节点主流程

合同 workflow 主导航只返回 3 个节点：`contract_preparation`、`contract_signing`、`advance_payment`。项目启动通知仍是 C25 资料结果，但不再作为独立 node key、前端页面或导航 children 出现。这样预付款最终动作和项目启动通知生成保持在同一业务上下文内。

### Decision 2: 预付款最终动作生成 C25

3 个最终动作均以“确认后执行”为准：

- 商务负责人确认完成支付。
- 总经理确认未付款并通过。
- 总经理确认已付款通过。

动作成功时，后端在同一事务内更新预付款状态、生成项目启动通知文件、完成 C25 资料结果、完成合同阶段并调用统一阶段门禁自动推进。未确认时前端不得调用最终动作 API；后端收到最终动作请求即视为用户已确认。

### Decision 3: 复用 generated file 体系，不写合同上传槽

C25 项目启动通知生成结果存入 `project_stage_document_generated_files`，并关联项目、C25 对应 stage document、document code、template key、version、storage key、source snapshot、source hash、模板版本或 hash。它不写入 `project_contract_signing_upload_files`，也不创建 `project_kickoff_notice` 上传槽。

### Decision 4: 项目启动通知项目名称展示值

项目启动通知模板内的项目名称字段 MUST 使用 `项目编号 + 客户名称 + - + 项目名` 的展示值。项目编号、客户名称或项目名缺失时，生成逻辑去除空白并避免多余分隔符：缺客户名时使用 `项目编号-项目名`，缺项目编号时使用 `客户名称-项目名`，只剩项目名时使用项目名，全缺时使用 `未命名项目`。source snapshot MUST 同时保留 `projectDisplayName` 以及原始 `projectCode`、`customerName`、`projectName`，用于模板渲染和审计追溯。

### Decision 5: 失败回滚

预付款最终动作、生成文件、C25 完成和自动推进必须保持一致。若项目启动通知生成失败或文件存储失败，最终动作不得部分提交预付款完成或放行状态，不得完成 C25，不得推进详细设计。实现可以在事务内先记录失败日志，也可以回滚后返回明确错误；但不能产生“预付款完成但 C25 未生成”的成功状态。

### Decision 6: 阶段门禁依赖 C25 generated file

合同阶段手工推进兜底必须确认 C25 项目启动通知已有当前有效 generated file，并且合同 workflow 的 `advance_payment` 已完成。不得依赖前端状态、旧独立节点、普通资料卡片或 C24 发票判断该门禁。

## Risks / Trade-offs

- [Risk] 删除独立节点会影响旧前端 deep link。 -> Mitigation: 前端移除映射并让导航以后端 3 节点 DTO 为准；旧入口落回预付款节点或空白页都不得形成第二主入口。
- [Risk] 生成失败使预付款最终动作无法完成。 -> Mitigation: 返回明确生成失败原因，并保持节点仍在可处理状态，用户可修复后重试。
- [Risk] 模板字段映射不清晰。 -> Mitigation: 实现前盘点模板和字段，测试覆盖生成文件内容、source snapshot 和下载。
- [Risk] 当前 C25 运行资料编码仍可能是 `4.1`。 -> Mitigation: materialization 同时识别 C25 和 `4.1`，测试覆盖 71 项数量和无双入口。

## Migration Plan

- 不新增资料项或阶段。
- 移除新项目初始化中的独立 `project_kickoff_notice` 节点和上传槽；历史库若已有该节点，查询 DTO 不再把它作为主节点返回，完成口径以预付款节点和 C25 generated file 为准。
- 复用既有 generated file 体系；本 change 新增正式 migration，将 `project_stage_document_generated_files` 表结构固化到正式部署链路，并与现有 schema ensure 保持一致。
- 旧项目启动通知上传接口删除或禁用为 409/410，不得继续完成 C25 或推进阶段。

## Open Questions

- None. 项目启动通知模板文件、字段映射和生成文件存储路径已在实现中确认；本 change 复用既有 generated file 体系，并新增正式 migration 固化 `project_stage_document_generated_files`。
