## Why

`daily-weekly-reporting` 现有规格仍写着“已提交日报只读”，但当前后端实现和测试已经将日报定义为无审批流、已提交后仍可编辑。该冲突会误导后续实现或 review，把当前事实错误回退。

## What Changes

- 将日报规格对齐当前实现：日报无审批流，已提交日报仍允许编辑，编辑后保持 `submitted`，提交时间保留首次提交时间。
- 明确日报附件上传/删除遵循当前 `assertDailyReportEditable` 规则：草稿和已提交日报均允许，其他状态拒绝。
- 明确周报与日报不同：周报有审批流，草稿/退回可编辑，待审批/已通过不可编辑。
- 明确周报退回、编辑和再提交时旧 AI 评分、最终人工评审必须清空、失效或重新生成。
- 记录中心日报汇总、周报预填、日报编辑 operation log 等当前实现事实，不新增业务行为。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `daily-weekly-reporting`: 对齐日报已提交后可编辑的当前事实，并补强周报审批编辑边界。

## Impact

- OpenSpec only:
  - `openspec/changes/align-report-editability-spec-v1/specs/daily-weekly-reporting/spec.md`
  - `openspec/specs/daily-weekly-reporting/spec.md` 后续归档时同步
- Investigation references:
  - `digital-platform-api/src/domain/dailyReports.js`
  - `digital-platform-api/src/repositories/dailyReportRepository.js`
  - `digital-platform-api/src/domain/weeklyReports.js`
  - `digital-platform-api/src/repositories/weeklyReportRepository.js`
  - `digital-platform-api/src/repositories/centerDailyReportRepository.js`
  - `digital-platform-api/src/services/weeklyReportPrefillService.js`
  - `digital-platform-api/test/reports/**`
- Non-Goals:
  - 不改业务代码。
  - 不改前端。
  - 不改 migration。
  - 不改周报审批逻辑。
  - 不新增 operation log。
  - 不改中心日报汇总逻辑。
  - 不改周报预填逻辑。
  - 本轮规划不归档、不提交、不 push。
