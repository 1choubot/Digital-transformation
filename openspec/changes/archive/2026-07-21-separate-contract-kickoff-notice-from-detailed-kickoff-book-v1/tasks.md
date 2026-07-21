## 1. OpenSpec Planning

- [x] 1.1 新建 `separate-contract-kickoff-notice-from-detailed-kickoff-book-v1` change。
- [x] 1.2 编写 proposal，明确合同流程不改、合同项目启动通知不再占用 C25、C25 回归详细设计项目启动书。
- [x] 1.3 编写 design，明确 workflow generated file、nullable `stage_document_id`、门禁、派生和日志口径。
- [x] 1.4 编写 project-core、project-core-frontend、technical-architecture、business-operation-log、stage-document-checklist delta specs。

## 2. Document Checklist Metadata

- [x] 2.1 将 v20260629 C25 恢复为详细设计阶段 `项目启动书`。
- [x] 2.2 将 C25 归属恢复为 `project_kickoff_meeting` / `项目启动会`。
- [x] 2.3 删除或修正 C25 由合同 workflow 完成的备注。
- [x] 2.4 保持 8 大阶段和 71 项资料总数不变。

## 3. Generated File Schema

- [x] 3.1 新增 migration `032_allow_workflow_generated_files_without_stage_document.sql`，允许 `project_stage_document_generated_files.stage_document_id` 为空。
- [x] 3.2 同步修改 `stageDocumentSchema.js` 的 generated files ensure 结构。
- [x] 3.3 不修改已提交的 031 migration。

## 4. Contract Workflow Repository

- [x] 4.1 将合同项目启动通知 generated file 改为 `document_code=contract_kickoff_notice`。
- [x] 4.2 生成记录不再绑定 C25 stage document，`stage_document_id` 写空。
- [x] 4.3 DTO 继续在项目预付款支付节点返回项目启动通知生成状态、失败原因和下载入口。
- [x] 4.4 下载逻辑继续支持合同项目启动通知，但不暴露 C25。
- [x] 4.5 日志 details 使用 `generatedFileCode=contract_kickoff_notice` 和 `documentName=项目启动通知`，不再写 `documentCode=C25`。

## 5. Stage Gate and Derived Completion

- [x] 5.1 合同阶段推进门禁改为检查 `advance_payment` 完成、`paymentFlow` finalized、`contract_kickoff_notice` 已生成。
- [x] 5.2 门禁阻塞原因保留 `项目启动通知未生成完成`，但不得伪装成 C25。
- [x] 5.3 合同 workflow 资料派生范围从 C20/C21/C22/C23/C25 收口为 C20/C21/C22/C23。
- [x] 5.4 C25 不再由合同 workflow 派生完成。

## 6. Ownership and Frontend

- [x] 6.1 ownership/check 脚本移除 C25 合同 workflow ownership。
- [x] 6.2 ownership/check 脚本确认 C25 名称和归属恢复为详细设计 `项目启动书`。
- [x] 6.3 前端合同预付款页面继续展示项目启动通知生成状态和下载入口。
- [x] 6.4 前端合同预付款页面不显示 C25 或详细设计 `项目启动书` 口径。

## 7. Tests

- [x] 7.1 后端测试覆盖预付款三个最终动作仍生成项目启动通知。
- [x] 7.2 后端测试覆盖 generated file 不再绑定 C25，`stage_document_id` 为空。
- [x] 7.3 后端测试覆盖合同阶段仍能自动推进详细设计。
- [x] 7.4 后端测试覆盖 C25 不再被合同 workflow 派生完成。
- [x] 7.5 后端测试覆盖 C25 名称为 `项目启动书`。
- [x] 7.6 后端测试覆盖 8 大阶段和 71 项资料数量不变。
- [x] 7.7 后端测试覆盖没有合同项目启动通知和详细设计 C25 双入口。
- [x] 7.8 更新方案设计 workflow 测试中进入详细设计后的 C25 / `4.1` 名称断言。

## 8. Validation

- [x] 8.1 在 `digital-platform-api` 运行 `cmd /c npm.cmd run test:contract-signing-workflow`。
- [x] 8.2 在 `digital-platform-api` 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 8.3 在 `digital-platform-api` 运行 `cmd /c npm.cmd run check`。
- [x] 8.4 在 `digital-platform-web` 运行 `cmd /c npm.cmd run check`。
- [x] 8.5 在根目录运行 `cmd /c openspec validate separate-contract-kickoff-notice-from-detailed-kickoff-book-v1 --strict`。
- [x] 8.6 在根目录运行 `cmd /c openspec validate --all --strict`。
- [x] 8.7 在根目录运行 `git diff --check`。

## 9. Finish Boundary

- [x] 9.0 明确模拟数据不做旧 generated file 回迁。
- [x] 9.1 Review 后归档 OpenSpec change。
- [x] 9.2 提交本 change 相关实现和归档结果。
- [x] 9.3 不 push。
- [x] 9.4 不处理无关 untracked。
