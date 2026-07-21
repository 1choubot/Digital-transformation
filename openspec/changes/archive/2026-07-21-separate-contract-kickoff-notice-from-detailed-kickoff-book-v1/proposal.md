## Why

合同 workflow 生成的 `项目启动通知` 当前复用了 C25 / `4.1` 资料编码，导致它和详细设计阶段的 `项目启动书` 混在同一个资料项上。需要把合同生成文件和详细设计资料项拆开，避免合同流程完成时误完成详细设计启动资料。

## What Changes

- 合同签订阶段流程不变：仍为 3 个主节点，预付款最终动作仍生成 `项目启动通知` 并自动推进详细设计。
- 合同 workflow 生成的 `项目启动通知` 改为合同 workflow 自有 generated file，不再写入 C25 / `4.1` 资料行。
- C25 / `4.1` 回归详细设计阶段 `项目启动书` 语义，后续由详细设计 workflow 的 `项目启动会` 节点接管。
- `project_stage_document_generated_files.stage_document_id` 允许为空，以支持 workflow 级生成文件不绑定 71 项资料。
- 合同 workflow 资料派生范围从 C20/C21/C22/C23/C25 收口为 C20/C21/C22/C23。
- 合同阶段推进门禁改为检查合同 workflow 预付款已完成、paymentFlow finalized、合同项目启动通知 generated file 已生成，不再伪装为 C25 阻塞项。
- 不做 7.20 全量资料清单重构，不开始实现详细设计 workflow，不改变 8 阶段和 71 项资料数量。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 合同阶段推进门禁和 generated file 语义从 C25 资料项切换为合同 workflow 自有项目启动通知。
- `project-core-frontend`: 合同预付款页面继续展示项目启动通知生成状态和下载入口，但不得展示 C25。
- `technical-architecture`: workflow 级 generated file 允许不绑定 stage document，C25 不再由合同 workflow 派生完成。
- `business-operation-log`: 合同预付款日志继续记录生成项目启动通知，但 details 不再写 C25。
- `stage-document-checklist`: C25 / `4.1` 回归详细设计阶段 `项目启动书`，合同 workflow 资料映射移除 C25。

## Impact

- Backend:
  - `digital-platform-api/src/domain/stageDocumentTemplateItemsV20260629.js`
  - `digital-platform-api/src/db/stageDocumentSchema.js`
  - `digital-platform-api/src/repositories/projects/contractSigningWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/stageAdvanceRepository.js`
  - `digital-platform-api/src/repositories/stageDocuments/shared.js`
  - `digital-platform-api/scripts/check-stage-document-ownership.js`
  - `digital-platform-api/migrations/032_allow_workflow_generated_files_without_stage_document.sql`
  - Contract workflow and solution design tests
- Frontend:
  - Contract prepayment page and workflow composable/API only if C25 labels or fields need removal from display.
- OpenSpec:
  - Delta specs for `project-core`, `project-core-frontend`, `technical-architecture`, `business-operation-log`, and `stage-document-checklist`.
