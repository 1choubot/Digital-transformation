## 1. Planning and Spec Rewrite

- [x] 1.1 创建 change `generate-contract-kickoff-notice-v1`。
- [x] 1.2 重写 proposal，明确项目启动通知由项目预付款支付节点最终动作生成，不再作为独立第 4 节点。
- [x] 1.3 重写 design，明确合同主流程只保留 3 个节点，C25 生成文件存入现有 generated file 体系。
- [x] 1.4 重写 project-core、project-core-frontend、technical-architecture、business-operation-log、stage-document-checklist delta specs。
- [x] 1.5 运行 `cmd /c openspec validate generate-contract-kickoff-notice-v1 --strict`。

## 2. Backend Generated File Foundation

- [x] 2.1 盘点项目启动通知模板文件、字段映射和生成文件存储路径。
- [x] 2.2 确认复用 `project_stage_document_generated_files` generated file 体系，并以正式 migration 固化部署表结构。
- [x] 2.3 实现 C25 项目启动通知生成源快照构建，覆盖项目基础信息、角色、合同签订状态和预付款最终动作结果。
- [x] 2.4 实现项目启动通知模板渲染和生成文件存储。
- [x] 2.5 实现生成失败回滚和错误返回，避免预付款最终动作部分完成。
- [x] 2.6 新增正式 migration `031_create_stage_document_generated_files.sql`，创建 `project_stage_document_generated_files`，避免正式环境缺表。
- [x] 2.7 项目启动通知模板中的项目名称改为 项目编号+客户名称-项目名，并在 source snapshot 保留组合展示名。

## 3. Backend Three-Node Workflow

- [x] 3.1 将合同 workflow 节点定义和初始化收口为 3 个主节点：准备协议和合同、签订协议和合同、项目预付款支付。
- [x] 3.2 移除或隐藏独立项目启动通知节点、上传槽和导航输出。
- [x] 3.3 DTO 在预付款节点返回 C25 项目启动通知 generated file 状态、下载信息、失败原因和权限。
- [x] 3.4 合同阶段导航只返回 3 个 workflow 主节点，不返回旧蓝图节点或独立项目启动通知节点。
- [x] 3.5 工作台待办不再生成独立项目启动通知上传待办。

## 4. Backend Payment Final Actions

- [x] 4.1 商务负责人完成支付时生成 C25 项目启动通知、完成 C25 并自动推进详细设计。
- [x] 4.2 总经理未付款并通过时生成 C25 项目启动通知、完成 C25 并自动推进详细设计。
- [x] 4.3 总经理已付款通过时生成 C25 项目启动通知、完成 C25 并自动推进详细设计。
- [x] 4.4 三个最终动作完成后不再返回重复操作权限。
- [x] 4.5 非授权用户、未到预付款节点、已结束项目、重复最终动作必须拒绝。
- [x] 4.6 旧项目启动通知上传入口删除或禁用，确保不能改变 workflow 状态。

## 5. Stage Gate and C25 Mapping

- [x] 5.1 预付款最终动作成功后在同一事务内完成 C25 资料派生、合同阶段完成和自动推进。
- [x] 5.2 手工推进合同阶段时，未执行预付款最终确认或 C25 未生成必须失败。
- [x] 5.3 阶段门禁不得依赖旧独立节点、前端状态、普通资料卡片或 C24 发票。
- [x] 5.4 保持 C25 和运行资料编码 `4.1` 映射一致，不形成详细设计第二主入口。
- [x] 5.5 确认不新增资料项，不改变 8 大阶段和 71 项资料数量。

## 6. API and Frontend

- [x] 6.1 增加或调整 C25 项目启动通知 generated file 下载 API。
- [x] 6.2 更新前端 projects API 和 contract signing composable。
- [x] 6.3 调整 `ContractAdvancePaymentPage.vue`，在三个预付款最终动作前展示确认弹窗。
- [x] 6.4 在预付款页面展示项目启动通知生成状态、生成结果、失败原因和下载入口。
- [x] 6.5 删除独立 `ContractKickoffNoticePage.vue` 页面和 `nodePages` 路由映射。
- [x] 6.6 前端不再展示项目启动通知手工上传入口或独立节点入口。
- [x] 6.7 操作成功后刷新合同 workflow、workspace/navigation 和当前阶段。

## 7. Logs

- [x] 7.1 调整预付款完成日志，包含生成 C25 项目启动通知上下文。
- [x] 7.2 调整总经理未付款并通过日志，包含生成 C25 项目启动通知上下文。
- [x] 7.3 调整总经理已付款通过日志，包含生成 C25 项目启动通知上下文。
- [x] 7.4 自动推进详细设计日志 details 标明由 `contract_signing.advance_payment_generated_kickoff_notice` 触发。
- [x] 7.5 前端 operation log 中文映射同步新增或调整 action type。

## 8. Tests

- [x] 8.1 后端测试：合同阶段导航只返回 3 个主节点。
- [x] 8.2 后端测试：商务负责人完成支付后生成 C25、可下载并自动进入详细设计。
- [x] 8.3 后端测试：总经理未付款并通过后生成 C25、可下载并自动进入详细设计。
- [x] 8.4 后端测试：总经理已付款通过后生成 C25、可下载并自动进入详细设计。
- [x] 8.5 后端测试：生成失败时预付款最终动作不改变状态、不完成 C25、不推进阶段。
- [x] 8.6 后端测试：未执行最终确认或 C25 未生成时手工推进失败。
- [x] 8.7 后端测试：旧项目启动通知上传入口不能改变 workflow 状态。
- [x] 8.8 后端测试：8 大阶段和 71 项资料数量不变，不新增第 72 项资料，不形成 C25 双入口。
- [x] 8.9 后端测试：operation log 覆盖三个预付款最终动作生成 C25 和自动推进。
- [x] 8.10 前端校验：页面不再展示独立项目启动通知节点页或手工上传主入口。

## 9. Validation and Delivery

- [x] 9.1 运行 `cmd /c npm.cmd run test:contract-signing-workflow` in `digital-platform-api`。
- [x] 9.2 运行 `cmd /c npm.cmd run test:solution-design` in `digital-platform-api`。
- [x] 9.3 运行 `cmd /c npm.cmd run check` in `digital-platform-api`。
- [x] 9.4 运行 `cmd /c npm.cmd run check` in `digital-platform-web`。
- [x] 9.5 运行 `cmd /c openspec validate generate-contract-kickoff-notice-v1 --strict`。
- [x] 9.6 运行 `cmd /c openspec validate --all --strict`。
- [x] 9.7 运行 `git diff --check`。
- [x] 9.8 review 实现和规格，确认未改 8 阶段/71 项资料数量，未改其它阶段流程。
- [x] 9.9 归档 OpenSpec change。
- [x] 9.10 提交实现。
- [x] 9.11 不 push，并确认无关 untracked 未处理。
