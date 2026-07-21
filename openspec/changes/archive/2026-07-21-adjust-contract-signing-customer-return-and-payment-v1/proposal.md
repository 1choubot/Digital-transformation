## Why

合同签订阶段当前把扫描件处理表达为“线下签署结果通过/不通过”，但业务实际需要商务负责人在客户退回源合同文件时显式退回对应准备线，并在两份扫描件齐备后统一点击完成。预付款等待总经理放行时也需要区分“客户仍未付款但允许继续”和“等待期间客户已付款”两种通过结果，便于后续状态和日志审计。

## What Changes

- 调整合同签订阶段 `contract_signing` 节点：
  - 新增商务负责人客户退回动作：退回技术协议、退回销售合同。
  - 客户退回只重走对应准备线，另一条已通过准备线保持不变。
  - 源文件被客户退回时，对应扫描件失效，避免旧扫描件继续满足签订完成条件。
  - 删除扫描件“确认线下签署结果通过/不通过”的业务语义和前端按钮。
  - 新增签订完成动作：两份扫描件均已上传且没有待重走准备线时，商务负责人点击“完成”进入预付款节点。
- 调整项目预付款支付节点：
  - 保留商务负责人完成支付、未完成支付待总经理审批两个动作。
  - 总经理等待状态下拆成“未付款并通过”和“已付款通过”两个动作。
  - “未付款并通过”继续使用 `released` 语义，“已付款通过”复用 `completed` 状态。
- 调整 DTO、权限、工作台待办和 operation log：
  - 新增签订节点权限 `canReturnTechnicalAgreementForCustomer`、`canReturnSalesContractForCustomer`、`canCompleteSigning`。
  - 新增预付款权限 `canApprovePaymentReleaseUnpaid`、`canApprovePaymentReleasePaid`。
  - 不再向前端暴露扫描件审核通过/不通过按钮权限。
  - 日志区分客户退回、签订完成、总经理未付款放行和总经理已付款通过。
- 调整前端合同节点页面按钮顺序：
  - 签订协议和合同页面顶部为两个客户退回按钮，中间为扫描件上传区，底部为完成按钮。
  - 项目预付款支付页面在总经理等待状态展示两个明确通过按钮。
- 不改变立项、方案设计、详细设计，不改变 8 大阶段数量和 71 项资料数量，不重新引入蓝图节点或非主流程资料区。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整合同签订 workflow 的签订节点状态机、预付款总经理审批结果和 DTO 权限。
- `project-core-frontend`: 调整合同签订阶段前端按钮和交互顺序，移除扫描件通过/不通过按钮。
- `technical-architecture`: 明确这是合同专用 workflow 内部状态调整，不新增第二套流程或数据库资料项。
- `business-operation-log`: 新增客户退回、签订完成、总经理两种通过结果日志口径。
- `stage-document-checklist`: 明确 C21/C23 由签订节点完成动作派生完成，客户退回时对应扫描件完成结果失效。

## Impact

- Backend:
  - `digital-platform-api/src/repositories/projects/contractSigningWorkflowRepository.js`
  - `digital-platform-api/src/domain/contractSigningWorkflow.js`
  - `digital-platform-api/src/routes/projects.js`
  - `digital-platform-api/src/routes/projectRouteHandlers.js`
  - `digital-platform-api/src/repositories/operationLogRepository.js`
  - `digital-platform-api/test/projects/contractSigningWorkflow.test.js`
- Frontend:
  - `digital-platform-web/src/api/projects.js`
  - `digital-platform-web/src/composables/project-stage/contract-signing/useContractSigningWorkflow.js`
  - `digital-platform-web/src/components/project-workspace/contract-signing/ContractUploadSlots.vue`
  - `digital-platform-web/src/pages/project-node/contract-signing/ContractSigningPage.vue`
  - `digital-platform-web/src/pages/project-node/contract-signing/ContractAdvancePaymentPage.vue`
  - `digital-platform-web/src/components/project-detail/stageDocumentViewHelpers.js`
- OpenSpec:
  - Delta specs for `project-core`, `project-core-frontend`, `technical-architecture`, `business-operation-log`, `stage-document-checklist`.
