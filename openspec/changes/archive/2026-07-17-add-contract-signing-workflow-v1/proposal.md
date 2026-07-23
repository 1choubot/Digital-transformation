## Why

当前项目进入合同签订阶段后仍主要依赖普通资料卡片和蓝图占位节点，无法表达技术协议、销售合同、签署扫描件、预付款放行和项目启动通知之间的真实顺序、权限和返工关系。方案设计阶段已具备较成熟的专用 workflow、上传槽、审批、退回、待办和日志模式，合同签订阶段需要按同样口径建模，避免继续把关键合同流程塞进普通资料项。

## What Changes

- 新增合同签订阶段专用 workflow，阶段节点由后端 `contractSigningWorkflow` DTO 提供，不由前端本地拼接。
- 合同签订阶段人员沿用方案设计阶段 role assignment：技术负责人、商务负责人来自方案设计分配结果；研发中心负责人、营销中心负责人、总经理仍按组织角色动态判断。
- 新增 4 个合同签订 workflow 节点：
  - `contract_preparation`：准备协议和合同。
  - `contract_signing`：签订协议和合同。
  - `advance_payment`：项目预付款支付。
  - `project_kickoff_notice`：项目启动通知。
- 准备协议和合同节点包含两条并行文件线：
  - 技术协议由技术负责人上传、研发中心负责人审批，不通过则退回技术负责人重提。
  - 销售合同由商务负责人上传、营销中心负责人审批，不通过则退回商务负责人重提。
  - 两条线都审批通过后进入签订协议和合同节点。
- 准备节点业务文件名、前端展示名、上传槽名和 workflow 文案必须使用 `技术协议`、`销售合同`，不得使用“草稿”作为最终展示名；如现有 v20260629 元数据仍为 C20 `技术协议草稿（合同签订阶段）`、C22 `销售合同草稿`，本 change 实现时必须作为元数据命名口径修正，保留 C20/C22 稳定编码，不新增资料项。
- 签订协议和合同节点由商务负责人上传技术协议扫描件和销售合同扫描件，并分别确认线下签署结果。
  - 技术协议扫描件不通过时只退回技术协议准备线。
  - 销售合同扫描件不通过时只退回销售合同准备线。
  - 两个都不通过时两条准备线都退回。
  - 两个都通过时进入项目预付款支付节点。
- 项目预付款支付节点支持商务负责人“完成支付”直接进入项目启动通知，或“未完成支付，待总经理审批”进入总经理放行等待状态；总经理通过后进入项目启动通知。
- `project_kickoff_notice` 是合同 workflow 最后一个业务节点，由商务负责人上传业务文件 `项目启动通知`；上传成功后合同签订阶段完成并自动推进项目到详细设计阶段。
- 合同 workflow 状态和 71 项资料完成状态分开建模，但 workflow 必须派生/同步相关资料完成结果。
- 合同阶段主导航只来自 `contractSigningWorkflow` DTO；旧蓝图节点和 71 项资料不再作为主流程节点使用，C20/C22/C21/C23/C25 由合同 workflow 派生完成，C24 `发票（预付款）` 保留在资料体系中且不进入合同 workflow 主节点；合同 workflow 页面不展示非主流程资料区。
- 当前资料模板中存在命名差异：C25 旧展示名为 `项目启动书`，合同流程业务节点为 `项目启动通知`；本 change 实现时必须将 C25 展示名修正为 `项目启动通知`，保留 C25 稳定编码和 71 项总数，不新增第 72 项资料。
- 合同 workflow 可以完成 C25 的资料完成结果；前端不得同时展示一个合同阶段 `项目启动通知` 主入口和一个详细设计阶段旧名 `项目启动书` 主入口造成双入口，阶段导航主流程以合同 workflow DTO 为准。
- 修改既有“不得实现合同审批流/不得创建合同阶段业务数据”的旧规格口径：禁止通用 BPM、文件平台承载和无关采购/生产合同流程，但允许本 change 的合同签订专用 workflow。

## Non-Goals

- 不重新做人事分配。
- 不改立项阶段。
- 不改方案设计阶段流程。
- 不改变 8 大阶段数量。
- 不改变 71 项资料数量。
- 不引入通用 BPM、可视化流程编排器或任意节点配置器。
- 不处理采购合同流程。
- 不处理生产制作阶段合同流程。
- 不处理无关 untracked。
- 本 change 分批实施；归档、提交和 push 按 `tasks.md` 收尾边界执行。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 新增合同签订阶段专用 workflow、节点流转、权限、资料完成派生和自动推进详细设计要求，并修改旧“合同业务未实现”边界。
- `project-core-frontend`: 新增合同阶段后端驱动节点导航、节点页面、权限按钮、阻塞原因和待办展示要求，并修改旧“不得展示合同业务已初始化”边界。
- `technical-architecture`: 规划 `contractSigningWorkflow` 后端模块、正式 migration、仓储/DTO/API、资料完成派生、阶段导航和工作台集成边界。
- `business-operation-log`: 新增合同签订 workflow 上传、审批、签署确认、预付款、总经理放行、项目启动通知和自动推进日志要求。
- `stage-document-checklist`: 明确合同 workflow 与 v20260629 71 项资料的映射、命名口径和数量不变要求。

## Impact

- Backend areas:
  - `digital-platform-api/src/domain/contractSigningWorkflow.js`
  - `digital-platform-api/src/db/contractSigningWorkflowSchema.js`
  - `digital-platform-api/src/repositories/projects/contractSigningWorkflowRepository.js`
  - `digital-platform-api/src/routes/projects.js`
  - `digital-platform-api/src/services/navigationService.js`
  - `digital-platform-api/src/repositories/operationLogRepository.js`
  - `digital-platform-api/src/repositories/workbenchRepository.js`
  - `digital-platform-api/migrations/*_add_contract_signing_workflow.sql`
  - `digital-platform-api/test/projects/contractSigningWorkflow.test.js`
- Frontend areas:
  - `digital-platform-web/src/pages/project-node/contract-signing/*`
  - `digital-platform-web/src/components/project-workspace/contract-signing/*`
  - `digital-platform-web/src/composables/project-stage/contract-signing/*`
  - `digital-platform-web/src/api/projects.js`
  - project detail navigation / workspace shell integration for the `contract` stage.
- Data model areas:
  - `project_contract_signing_nodes`
  - `project_contract_signing_upload_slots`
  - `project_contract_signing_upload_files`
  - optional `project_contract_signing_payment_flows`, or payment state stored in node extension JSON.
- Spec areas:
  - `project-core`
  - `project-core-frontend`
  - `technical-architecture`
  - `business-operation-log`
  - `stage-document-checklist`
