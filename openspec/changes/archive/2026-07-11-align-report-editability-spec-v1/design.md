## Context

本 change 只对齐 OpenSpec 规格，不实现代码。调查范围覆盖日报/周报 domain、repository、报表测试、中心日报汇总和周报预填服务。

### 当前日报实现事实

- `dailyReports.js` 的 `assertDailyReportEditable(status)` 允许 `draft` 和 `submitted`，测试 `submitted daily reports remain editable because daily reports have no approval flow` 明确覆盖该事实。
- 日报无审批流，持久化状态只使用 `ReportStatus.DRAFT` / `ReportStatus.SUBMITTED`。
- `updateDailyReport()` 在当前记录已是 `submitted` 时强制 `nextReport.status = submitted`，不会允许改回 `draft`。
- `updateDailyReport()` 对 `submitted_at` 使用 `COALESCE(submitted_at, NOW())`，因此已提交日报再次编辑会保留原提交时间；如果历史提交记录缺失提交时间，则补当前时间。
- `updateDailyReport()` 对 `submitted_by_user_id` 使用当前 `user.id` 写入提交人字段；由于日报更新按 owner 查询，当前实现保持“当前日报提交人/所有者”语义。
- 日报附件上传/删除调用 `assertDailyReportEditable()`，因此草稿和已提交日报都允许上传/删除附件；其他非法状态会被拒绝。
- 当前代码没有日报编辑时间窗口限制。
- `dailyReportRepository.js` 没有调用 operation log 写入；日报编辑当前不记录项目 operation log。

### 当前周报实现事实

- 周报持久化状态仍是 `draft` / `submitted`，审批状态单独使用 `WeeklyApprovalStatus.NOT_SUBMITTED` / `PENDING` / `APPROVED` / `RETURNED`。
- 新建或更新为 `submitted` 的周报会进入 `pending` 审批状态。
- `assertWeeklyReportEditable(existing)` 只允许 `status === draft` 或 `approvalStatus === returned` 的周报编辑；`pending` 和 `approved` 不可编辑。
- 周报提交或重新提交时写入新的 `submitted_at = NOW()`，与日报保留首次提交时间不同。
- `updateWeeklyReport()` 会清空 `ai_score`、`ai_evaluated_at`、`ai_evaluation_source`、`ai_evaluation_error`、`final_score`、`final_grade`、`final_comment`、`final_reviewed_by_user_id`、`final_reviewed_at`。
- `reviewWeeklyReportApproval()` 在退回时同样清空上述 AI 评分和最终评审字段。
- 现有权限矩阵保持不变：中心负责人审批同中心员工周报；总经理审批中心负责人周报；总经理助理对中心负责人周报是只读场景。

### 当前联动和汇总事实

- 中心日报汇总 `getCenterDailyReportDto()` 查询当前数据库中 `status = submitted` 的日报和明细，并读取前一日计划、当日完成项和次日计划；当前是实时读取，不是固化快照。
- 周报预填 `buildWeeklyReportPrefillSuggestion()` 查询请求时已提交日报作为预填 basis；如果当前周已有周报且未传 `force`，返回 `shouldPrefill: false`，不会自动覆盖已保存周报。
- 周报从日报预填后，日报再次编辑不会自动联动更新已保存周报；用户显式 force 或重新请求预填才会基于当前日报生成新建议。

## Goals / Non-Goals

**Goals:**

- 让 `daily-weekly-reporting` 规格准确表达当前日报可编辑事实。
- 保持日报和周报规则分离，避免把“日报无审批流”误套到周报。
- 明确周报审批状态、编辑门禁、评分/最终评审失效规则。
- 记录当前未定义或当前不联动的调查项，避免隐式新增行为。

**Non-Goals:**

- 不改业务代码。
- 不改前端。
- 不改 migration。
- 不改周报审批逻辑。
- 不新增 operation log。
- 不改中心日报汇总逻辑。
- 不改周报预填逻辑。
- 本轮规划不归档、不提交、不 push。

## Decisions

### 1. 只修改 `daily-weekly-reporting` 规格

本次是报表行为规格对齐，不引入新架构规则，因此不新增 `technical-architecture` delta。

### 2. 日报提交后可编辑，但不可回退状态

规格按当前实现表达：已提交日报可更新内容和附件，但保存后仍是 `submitted`，并保留首次提交时间。这样避免把“可编辑”误解为“可撤回提交”。

### 3. 周报审批流保持独立

周报必须继续保留审批语义，`pending` 和 `approved` 不可编辑；退回后可编辑并可重新提交。周报编辑和退回对 AI 评分/最终评审的清理规则写入规格，以保护现有审批质量门禁。

## Risks / Trade-offs

- 规格仍与旧前端文案不一致 -> 本 change 只对齐后端事实；如前端存在旧只读文案，后续应另开实现 change。
- 日报附件允许已提交后修改可能影响导出结果 -> 当前导出读取实时附件，规格明确该行为，不新增快照语义。
- 周报预填不自动联动可能让用户看到旧周报内容 -> 当前实现按显式预填请求生成建议，规格记录为“不自动覆盖已保存周报”。

## Open Questions

- 是否需要新增日报编辑 operation log，当前未定义且本 change 不新增。
- 是否未来需要日报编辑时间窗口，当前未定义且本 change 不新增。
