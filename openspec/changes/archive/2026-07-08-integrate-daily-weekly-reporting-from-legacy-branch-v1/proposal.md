## Why

同事分支 `feat/weekly-report-prefill-from-daily` 已实现日报、周报、中心日报、周报审批和从日报预填周报能力，但该分支基于旧 `origin/main@80ccaeb`，当前主线已推进到 `main@3c4203c` 并包含立项阶段模板文件生成与编号流程调整。直接 merge 旧分支会带回旧入口、冲突 migration 编号和可能覆盖当前立项流程的风险。

本 change 先固化安全移植方案：把日报/周报能力按模块移植到当前主线，而不是整体合并旧分支或导入旧 SQL dump。

## What Changes

- 新增日报、周报、中心日报、周报审批和周报从日报预填能力的移植规划。
- 规划后端模块、前端页面/API、测试和文档从旧分支按当前主线结构重接入。
- 规划数据库 migration 重排策略，避免沿用旧分支 `013-027` 编号覆盖当前主线 `013-016` 立项相关 migration。
- 明确 `digital_platform_with_data.sql` 只能作为日报/周报样本数据参考，不能覆盖当前数据库。
- 明确后续实现不得回退当前项目、立项阶段、模板文件生成、71 项资料模板和文件平台边界。

## Capabilities

### New Capabilities

- `daily-weekly-reporting`: 覆盖日报、周报、中心日报、周报审批、周报从日报确定性预填、附件、前端页面入口和核心验证口径；AI 预填、复杂评分和导出在本切片暂缓。

### Modified Capabilities

- `technical-architecture`: 补充旧分支功能移植的数据库 migration、SQL dump、路由接入、错误处理、权限适配和回归边界要求。

## Impact

- 后端后续可能移植 `digital-platform-api/src/domain/*Reports*.js`、`repositories/*Report*.js`、`routes/*Reports*.js`、`services/*Report*.js`、`storage/dailyReportAttachmentStorage.js`，并接入当前 `app.js`、`env.js`、`errorHandler.js`、`me/users` 路由和 `userRepository`。
- 前端后续可能移植 `dailyReports`、`weeklyReports`、`centerDailyReports` API、报表常量、日报/周报/中心日报页面，并接入当前 `router.js`、`App.vue`、导航和样式。
- 数据库后续需要在当前主线 migration 序列之后重新生成日报/周报 migration，不能直接复制旧分支编号。
- 验证需覆盖 API check、Web build、OpenSpec strict/all、日报/周报测试和现有立项阶段 smoke 回归。
