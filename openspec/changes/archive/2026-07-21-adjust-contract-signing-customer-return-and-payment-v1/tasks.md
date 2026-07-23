## 1. OpenSpec Planning

- [x] 1.1 创建 change `adjust-contract-signing-customer-return-and-payment-v1`。
- [x] 1.2 编写 proposal、design、project-core、project-core-frontend、technical-architecture、business-operation-log、stage-document-checklist delta specs。
- [x] 1.3 校验 OpenSpec change 可通过 strict validate。

## 2. Backend Contract Signing State Machine

- [x] 2.1 新增商务负责人客户退回技术协议动作，只退回技术协议准备线。
- [x] 2.2 新增商务负责人客户退回销售合同动作，只退回销售合同准备线。
- [x] 2.3 客户退回源文件时失效对应扫描件 current file、slot 状态和完成派生依据。
- [x] 2.4 新增签订节点完成动作，要求两个扫描件已上传且两条准备线均 approved。
- [x] 2.5 签订完成后完成 `contract_signing` 节点，派生 C21/C23 完成并激活 `advance_payment`。
- [x] 2.6 DTO 新增 `canReturnTechnicalAgreementForCustomer`、`canReturnSalesContractForCustomer`、`canCompleteSigning`。
- [x] 2.7 DTO 不再暴露扫描件确认通过/不通过权限。
- [x] 2.8 更新签订节点阻塞原因，覆盖缺扫描件和客户退回后待重走准备线。

## 3. Backend Payment Actions

- [x] 3.1 将总经理等待状态下的放行动作拆成未付款并通过和已付款通过。
- [x] 3.2 未付款并通过复用 `released` 状态并进入项目启动通知节点。
- [x] 3.3 已付款通过复用 `completed` 状态并进入项目启动通知节点。
- [x] 3.4 DTO 新增或调整 `canApprovePaymentReleaseUnpaid`、`canApprovePaymentReleasePaid`。
- [x] 3.5 工作台待办基于 DTO 权限继续生成总经理预付款待办。

## 4. Routes, Logs, and Frontend API

- [x] 4.1 增加客户退回技术协议、客户退回销售合同、签订完成 API 路由和 handler。
- [x] 4.2 增加总经理未付款并通过、已付款通过 API 路由和 handler。
- [x] 4.3 增加 operation log action type 和后端日志写入：客户退回技术协议、客户退回销售合同、签订完成、总经理未付款并通过、总经理已付款通过。
- [x] 4.4 更新前端 API 方法。
- [x] 4.5 更新前端 operation log 中文映射。

## 5. Frontend Contract Pages

- [x] 5.1 调整签订协议和合同页面：顶部显示两个客户退回按钮。
- [x] 5.2 调整扫描件上传区，移除扫描件确认通过/不通过 UI。
- [x] 5.3 在签订页面底部显示完成按钮，并仅依赖 `canCompleteSigning`。
- [x] 5.4 调整预付款页面，总经理等待状态显示未付款并通过、已付款通过两个按钮。
- [x] 5.5 确认合同阶段仍只有 4 个 workflow 主节点，不引入蓝图节点或 C24 非主流程资料区。

## 6. Tests

- [x] 6.1 后端测试：技术协议客户退回后只重走技术协议线，销售合同不受影响。
- [x] 6.2 后端测试：销售合同客户退回后只重走销售合同线，技术协议不受影响。
- [x] 6.3 后端测试：退回后未重新审批通过前不能完成签订节点。
- [x] 6.4 后端测试：两个扫描件都上传后，点击完成才能进入预付款节点并派生 C21/C23。
- [x] 6.5 后端测试：旧扫描件审核通过/不通过权限不再暴露。
- [x] 6.6 后端测试：总经理未付款并通过后进入项目启动通知并记录 released。
- [x] 6.7 后端测试：总经理已付款通过后进入项目启动通知并记录 completed。
- [x] 6.8 后端测试：operation log 覆盖新增动作。
- [x] 6.9 前端构建或轻量校验：页面不再出现扫描件审核通过/不通过旧按钮。

## 7. Validation

- [x] 7.1 运行 `cmd /c npm.cmd run test:contract-signing-workflow`。
- [x] 7.2 运行 `cmd /c npm.cmd run test:solution-design`。
- [x] 7.3 运行 `cmd /c npm.cmd run check` in `digital-platform-api`。
- [x] 7.4 运行 `cmd /c npm.cmd run check` in `digital-platform-web`。
- [x] 7.5 运行 `cmd /c openspec validate adjust-contract-signing-customer-return-and-payment-v1 --strict`。
- [x] 7.6 运行 `cmd /c openspec validate --all --strict`。
- [x] 7.7 运行 `git diff --check`。
- [x] 7.8 停在 review 前，不归档、不提交、不 push，并确认无关 untracked 未处理。

## 8. Review Fixes

- [x] 8.1 禁用旧 `/payment/approve-release` 总经理笼统放行入口，返回 410 并提示使用 unpaid/paid 两个新接口。
- [x] 8.2 禁用旧 `approveContractSigningPaymentRelease` repository 方法，确认不会默认走未付款并通过。
- [x] 8.3 从聚合 repository 和常规 route handler 命名中移除旧总经理放行导出/handler，只保留 deprecated 拒绝 handler。
- [x] 8.4 补后端测试覆盖旧 repository 方法和旧 handler 拒绝后不改变 workflow 状态。
