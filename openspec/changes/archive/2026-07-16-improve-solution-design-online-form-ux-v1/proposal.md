## Why

方案设计阶段的在线表单和节点推进仍存在人工二次点击、缺项提示不直观、C07-C14 豁免备注负担、C15/C16 实施计划无结构化联动以及报价结果处理入口不清晰的问题。该 change 统一收口这些交互，降低技术负责人和商务负责人的重复操作，并保持现有方案设计 workflow、资料数量和阶段边界稳定。

## What Changes

- C05 项目方案分析表、C15 内部方案评审记录表、C16 客户方案评审记录表提交并生成文件成功后，后端自动尝试提交当前节点。
- C05 若仍缺产品功能框图等其他必需资料，系统只保存/提交在线表单并返回缺项提示，不阻止表单提交。
- C15/C16 在线表单提交并生成成功后，在无其他门禁时直接进入待研发中心负责人审批。
- 前端点击 C05/C15/C16 在线表单“提交表单”时弹确认框，并按后端返回展示成功、自动推进或缺项提示。
- 复核 C18 报价单在线表单是否已符合提交生成和后续节点推进口径；必要时仅补齐提示和回归测试。
- C07-C14 “无需上传”改为点击按钮即可豁免，前端移除备注输入框，后端允许空 `exemption_reason`。
- C15/C16 “项目实施计划”改为结构化输入：由项目需求分析、项目目标描述、项目风险评估、项目方案建议按非空来源条目生成需求/目标/风险/建议计划项，用户必须逐项填写实施计划内容。
- C15/C16 生成 Excel 时，将结构化实施计划拼接写入模板当前“项目实施计划”单元格。
- C18 报价单前端实时预览报价明细行金额、总金额和人民币大写金额，提交和生成文件仍以后端重算金额为准。
- 报价结果处理从下拉选择改为三个明确按钮：客户接受报价、结束项目、审批不通过；按钮映射到现有 accepted、rejected + end_project、rejected + return_to_rd_cost payload。
- 本 change 不改变立项阶段后端、不改变 8 阶段或 71 项资料数量、不改变合同签订阶段、不处理无关 untracked；归档和提交在实现完成、review 通过后执行，不 push。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整方案设计在线表单提交后节点自动推进、C07-C14 无需上传豁免备注、C15/C16 结构化实施计划、报价结果按钮语义。
- `project-core-frontend`: 调整 C05/C15/C16 提交确认和提示、C07-C14 无备注豁免入口、C15/C16 结构化实施计划控件、报价结果三按钮 UI。
- `technical-architecture`: 约束在线表单提交事务边界、自动节点提交复用门禁、结构化 payload normalize、豁免空备注和报价结果按钮 payload 映射。

## Impact

- Backend areas:
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflowRepository.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/formPayloads.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/formDtos.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/permissions.js`
  - `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/quotationForms.js`
  - `digital-platform-api/src/domain/solutionDesignWorkflow.js`
  - `digital-platform-api/src/repositories/operationLogRepository.js`
  - `digital-platform-api/test/projects/solutionDesignWorkflow.test.js`
- Frontend areas:
  - `digital-platform-web/src/pages/project-node/solution-design/*`
  - `digital-platform-web/src/components/project-workspace/solution-design/*`
  - `digital-platform-web/src/composables/project-stage/solution-design/*`
  - `digital-platform-web/src/api/projects.js`
- OpenSpec/spec areas:
  - `project-core`
  - `project-core-frontend`
  - `technical-architecture`
- Non-goals:
  - 不改立项阶段后端。
  - 不新增或删除 8 大阶段。
  - 不新增或删除 71 项资料。
  - 不改合同签订阶段业务。
  - 不改旧关口审批。
  - 不处理无关 untracked。
