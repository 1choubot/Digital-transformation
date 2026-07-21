## Why

合同签订 workflow 当前把 `项目启动通知` 设计为独立第 4 个节点，但业务上启动通知应是预付款最终处理结果的一部分：商务负责人或总经理确认预付款最终动作后，系统即可生成 C25 项目启动通知并推进详细设计。收口到预付款节点可以减少一个重复入口，避免“预付款已结束但还要进入另一个启动通知节点”的割裂体验。

## What Changes

- 合同签订阶段主 workflow 从 4 个节点收口为 3 个节点：
  - 准备协议和合同
  - 签订协议和合同
  - 项目预付款支付
- 删除独立 `项目启动通知` 主节点和前端节点页；C25 `项目启动通知` 不再作为合同阶段第 4 个可点击主流程节点出现。
- 项目预付款支付节点的 3 个最终动作在用户确认后生成 C25 项目启动通知文件：
  - 商务负责人确认完成支付
  - 总经理确认未付款并通过
  - 总经理确认已付款通过
- 后端在同一事务内完成预付款状态、生成 C25 项目启动通知文件、完成 C25 资料结果、完成合同阶段并通过统一阶段门禁自动推进详细设计。
- 前端在项目预付款支付页面展示确认弹窗、生成状态、下载入口和生成结果；不再跳转或展示独立项目启动通知节点页。
- operation log 记录预付款最终动作、项目启动通知生成结果和自动推进详细设计。
- 不改变立项、方案设计、详细设计流程；不改变 8 大阶段和 71 项资料数量；不新增第 72 项资料；不恢复 C24 非主流程资料区。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 合同 workflow 从 4 个主节点调整为 3 个主节点，预付款最终动作生成 C25 并触发自动推进。
- `project-core-frontend`: 项目预付款支付页面承载 C25 生成状态、下载入口和确认交互；删除独立项目启动通知节点页入口。
- `technical-architecture`: 复用 `project_stage_document_generated_files` 存储 C25 生成文件，并新增正式 migration 固化表结构；明确事务、下载、失败回滚和阶段门禁。
- `business-operation-log`: 调整项目启动通知日志为“预付款最终动作触发生成 / 自动推进”口径。
- `stage-document-checklist`: 明确 C25 仍映射既有资料项，生成文件不改变资料数量。

## Impact

- Backend:
  - `digital-platform-api/src/domain/contractSigningWorkflow.js`
  - `digital-platform-api/src/repositories/projects/contractSigningWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/contractSigningWorkflowMaterialization.js`
  - `digital-platform-api/src/repositories/projects/stageAdvanceRepository.js`
  - `digital-platform-api/src/routes/projects.js`
  - `digital-platform-api/src/routes/projectRouteHandlers.js`
  - `digital-platform-api/src/repositories/operationLogRepository.js`
  - Contract signing workflow tests
- Frontend:
  - `digital-platform-web/src/api/projects.js`
  - `digital-platform-web/src/composables/project-stage/contract-signing/useContractSigningWorkflow.js`
  - `digital-platform-web/src/pages/project-node/contract-signing/ContractAdvancePaymentPage.vue`
  - `digital-platform-web/src/config/nodePages.js`
  - Operation log display mapping
- OpenSpec:
  - Delta specs for `project-core`, `project-core-frontend`, `technical-architecture`, `business-operation-log`, and `stage-document-checklist`.
