# CODEX 执行计划：周报自动汇总填写优化（计划关联、日报状态、规则草稿与 AI 整理）

**版本**：v1.1  
**状态**：待执行  
**适用仓库**：`Digital-transformation`  
**目标模块**：个人日报、个人周报  
**建议分支**：`feat/weekly-report-prefill-from-daily`  
**执行原则**：按 Plan 0 → Plan 8 顺序执行；每个 Plan 达到测试与人工验收门槛后再进入下一项。

> **v1.1 修订**：明确“执行本周计划”的可选计划列表必须先按日报主表 `project_id` 筛选；仅显示当前用户、上一周周报、当前工作周且同项目的计划。项目切换或跨周日期切换时必须清空/重验关联任务标识；后端须以同一规则二次校验。

---

## 0. 已确认的业务结论（本计划的固定输入）

### 0.1 周期口径

员工在周一填写的是**刚刚结束的上一自然周**周报。

以员工在 **2026-06-29（周一）**打开周报填写页为例：

```text
本次周报周期 W：2026-06-22 ～ 2026-06-28
用于自动汇总的日报：2026-06-22 ～ 2026-06-28
计划基线：2026-06-15 ～ 2026-06-21 周报中的“下周工作计划”
```

因此：

```text
上一周周报 W-1 的下周工作计划
             +
本周 W 内当前用户已提交日报的“今日工作完成情况”
             ↓
本周 W 的“本周工作总结”草稿
```

**不得**把 W-1 的日报作为 W 周报的实际完成证据。  
**不得**把 W-1 的计划日期误写为 W 周报的实际完成日期。

### 0.2 日报是考评证据

- 周报自动汇总仅使用 `daily_reports.status = submitted` 的日报。
- 草稿日报、日报的“明日工作计划”均不得进入本周工作总结的实际完成证据。
- 对一条来源于上周计划的任务，若本周没有任何关联的已提交日报，周报默认生成 `not_completed`（未完成）。
- 页面必须明确提示“本周未发现关联的已提交日报，按考评规则暂记未完成”，并提供“补填日报”入口。
- 员工补填并提交日报后，返回周报页面可刷新规则草稿；刷新不会静默覆盖已经手工编辑的内容。

### 0.3 日报任务使用二维状态

日报“今日工作完成情况”每一条明细必须区分：

```text
任务来源：
- weekly_plan：执行上周周报中的下周工作计划
- ad_hoc：新增临时工作
- legacy_unknown：历史数据兼容值，仅系统内部使用，不在新建页面中提供

执行状态：
- completed：已完成
- in_progress：进行中
- not_completed：未完成
```

“新增”是任务来源，而非执行状态；“新增且已完成”必须能同时表达为：

```text
sourceType = ad_hoc
executionStatus = completed
```

### 0.4 员工必须明确选择来源计划

对**新建或提交**日报的每条“今日工作完成情况”：

- 选择“执行本周计划”时，必须从系统列出的可用周计划中选择一项；
- 选择“新增临时工作”时，不能携带计划任务标识；
- 提交日报时必须填写任务来源与执行状态；
- 草稿日报可允许暂未选择来源和状态，避免阻塞逐步填写；
- 旧数据仍可作为历史记录保留，不强行反写、猜测或改变考评结果。

### 0.5 可用周计划必须按日报项目筛选

日报一张主表对应一个已选择的日报项目；日报明细选择“执行本周计划”时，**不得**展示当前用户全部周计划，也不得仅按任务文本匹配。

选择顺序固定为：

```text
1. 先选择日报项目（以日报主表 project_id 为准）
2. 再选择任务来源
3. 选择“执行本周计划”后，系统只列出该项目在当前工作周可执行的周计划
4. 员工必须从该列表中显式选择一项；不能由系统静默自动选择
```

设日报日期为 `D`，日报所在自然周为 `W`，日报主表项目为 `P`。可用周计划必须同时满足：

```text
- 计划属于当前登录用户；
- 父周报周期为 W-1（week_start = W.weekStart - 7 天）；
- 计划日期 planned_date 落在 W.weekStart ～ W.weekEnd；
- weekly_report_plans.project_id = P；
- task_key 有效且非空；
- 父周报状态可为 draft 或 submitted，但必须随接口返回状态并在前端提示；
- 不返回其他项目、其他用户、其他工作周的计划。
```

UI 仅展示“当前项目 + 当前工作周”范围内的全部可执行计划，按 `planned_date` 升序、`sort_order` 升序排列；**不按日报当天精确过滤**，因为一项计划可能跨多天推进。下拉项至少显示：`计划日期｜工作目标｜当前关联日报状态`。

若当前项目没有可用计划，系统必须显示“当前项目在本周没有可关联的周计划，请选择新增临时工作”，不得回退展示其他项目的计划。

当用户切换日报项目时：

```text
- 立即清空所有日报明细中已选的 sourcePlanTaskKey；
- 若当前来源为 weekly_plan，保留来源类型但要求重新选择计划；
- 重新拉取新项目的可用周计划；
- 禁止保留跨项目 taskKey。
```

当日报日期跨周调整时，也必须重新校验现有 `sourcePlanTaskKey` 是否仍属于新日期所在工作周；不再有效时清空并要求重选。

后端必须按上述同一规则再次校验 `project_id`、当前用户、工作周、计划父周报和 `task_key`，不得仅依赖前端筛选。

### 0.6 AI 的角色边界

本计划中的 AI 仅用于**生成或优化周报草稿文字**，不用于评分。

AI 可以：

- 合并同一任务在多天日报中的进度与成果；
- 基于已确定的计划、状态、日期和日报证据生成 `workTarget`、`completionDescription`；
- 对历史未关联日报提出“可能关联的周计划”建议，供员工确认。

AI 不可以：

- 改写项目、计划任务标识、任务来源、执行状态、计划日期、完成日期；
- 将无日报证据的计划改为已完成；
- 创造日报、项目、成果、百分比、完成日期或结论；
- 调用、触发或写入现有周报评分数据。

本计划默认**不调用** `/api/weekly-reports/:reportId/evaluate`，不写入 `weekly_reports.ai_score`、`ai_evaluated_at`、`ai_evaluation_source`、`ai_evaluation_error`。现有评分/评审模块不删除、不改动业务逻辑；若后续需要整体停用评分，应另立变更计划。

---

## 1. 当前代码基线与不得破坏的行为

### 1.1 已确认的现有实现

当前代码中：

- `digital-platform-web/src/pages/WeeklyReportPage.vue`
  - 默认计算“上一自然周”；
  - 先查询本周期周报，若已存在则加载；
  - 若不存在，则读取上一周周报并调用 `prefillSummariesFromPreviousPlans`，将上周“下周计划”直接复制为本周“工作总结”；
  - 旧逻辑会默认填入 `completionStatus = completed`，且将计划日期作为完成日期，必须替换。

- `digital-platform-api/src/repositories/dailyReportRepository.js`
  - 已有 `getDailyReportPlanSuggestion`；
  - 其查询条件为“当前用户 + 项目 ID + 日报日期精确等于计划日期”；
  - 它仅适合旧的文本带入，无法支持一个跨多天执行的计划任务，也无法记录日报与计划的稳定关系。

- `digital-platform-api/src/repositories/weeklyReportRepository.js`
  - 更新周报时会删除并重建 `weekly_report_summaries`、`weekly_report_plans` 子表行；
  - 因此不能直接把 `weekly_report_plans.id` 作为日报的长期来源外键；
  - 必须增加可跨“删除后重建”保留的稳定计划任务标识。

- `digital-platform-api/migrations/023_add_report_row_project_ids.sql`
  - 已为日报、周报明细补充 `project_id`；
  - 新计划必须继续使用 `project_id` 作为任务来源选择、校验和汇总的第一层范围限定。

### 1.2 不得破坏

- 日报与周报的现有 CRUD、权限、项目可见性校验、附件、导出、中心日报、周报对照、人工评分与评分缓存失效逻辑；
- 同一用户、同一日期、同一项目的一份日报唯一约束；
- 同一用户、同一自然周的一份周报唯一约束；
- 官方 Excel 模板字段与版式；
- 既有 `GET /api/daily-reports/plan-suggestion` 接口的行为，除非在兼容条件下扩展返回字段；
- 历史日报/周报数据的可读、可导出能力。

---

## 2. 总体架构

```text
上一周周报 W-1 的“下周工作计划”
        │（每条计划拥有稳定 taskKey）
        ▼
本周 W 的日报填写
        │
        ├─ 来源：weekly_plan + sourcePlanTaskKey
        └─ 状态：completed / in_progress / not_completed
        ▼
本周 W 周报首次填写
        │
        ├─ 规则聚合：事实、状态、日期、来源
        ├─ 规则草稿：可在 AI 不可用时独立使用
        └─ AI 整理：只优化文字，不修改事实字段
        ▼
员工审核、编辑、保存本周周报
```

### 2.1 汇总优先级

1. **直接关联优先**：日报 `sourcePlanTaskKey` 与周计划 `taskKey` 相同。
2. **新增工作单独汇总**：日报 `sourceType = ad_hoc`。
3. **历史兼容，不自动确认**：`legacy_unknown` 只作为低置信度候选，不自动挂靠到任何周计划。
4. **无已提交日报的计划**：默认生成 `not_completed`，标记 `missingDailyEvidence = true`。

### 2.2 状态结论规则

对同一 `taskKey` 在 W 周内的多条已提交日报，按：

```text
report_date 升序
sort_order 升序
daily_report_items.id 升序
```

取最后一条关联日报的 `execution_status` 作为该计划任务在本周的最终状态。

| 最后一条关联日报状态 | 周报生成状态 | 周报完成日期 |
|---|---|---|
| `completed` | `completed` | 该日报的 `report_date` |
| `in_progress` | `in_progress` | `null` |
| `not_completed` | `not_completed` | `null` |
| 无关联已提交日报 | `not_completed` | `null` |

不要以 `completion_progress` 文本（例如 `100%`）作为新的主判定来源。它仍保留为展示信息和历史兼容字段，但结构化 `execution_status` 才是新流程的唯一状态依据。

---

# Plan 0：实施前侦察、分支与约束记录

## 目标

在改代码前确认迁移执行方式、测试数据库、当前表结构和真实周报流程，避免把计划写成与运行环境不一致的假设。

## 执行步骤

1. 新建功能分支：
   ```bash
   git checkout -b feat/weekly-report-prefill-from-daily
   ```

2. 在仓库新增或更新：
   ```text
   docs/reports/weekly-report-prefill-implementation-notes.md
   ```

3. 在文档中记录：
   - 当前数据库中已执行迁移的最高编号；
   - `weekly_report_plans`、`daily_report_items`、`weekly_report_summaries` 现有字段与索引；
   - 当前迁移运行命令、测试数据库连接方式；
   - 当前周报页首次打开的真实调用顺序；
   - 当前日报页加载“计划推荐”的调用顺序；
   - 当前 `updateWeeklyReport`、`replaceDailyReportRows` 的“删除并重建”行为；
   - 已确认的业务规则（第 0 节）。

4. 确认本次新迁移编号从 `024` 开始；若目标分支已新增更高编号，保持逻辑顺序并改为下一个可用编号。

5. 运行现有基线检查：
   ```bash
   cd digital-platform-api
   npm run check
   node --test test/dailyReports/dailyReports.integration.test.js \
     test/reports/weeklyReports.integration.test.js \
     test/reports/weeklyReports.test.js

   cd ../digital-platform-web
   npm run check
   ```

6. 不要使用全量 SQL Dump 重建数据；只使用项目既有迁移和测试清理策略。

## 验收门槛

- 基线检查通过，或失败项已在实现说明中逐条记录为既有问题；
- 已确认迁移序号；
- 已确认测试数据库不是生产库；
- 已确认任务来源链接不能直接依赖 `weekly_report_plans.id`。

---

# Plan 1：数据库迁移与稳定任务标识

## 目标

为计划、日报完成项、周报总结建立稳定且可追溯的任务关联能力，同时兼容已有数据。

## 1.1 新增迁移文件

建议新增：

```text
024_add_weekly_report_plan_task_keys.sql
025_add_daily_report_item_task_tracking.sql
026_add_weekly_report_summary_task_tracking.sql
```

所有迁移遵循当前仓库的防重复执行风格：使用 `INFORMATION_SCHEMA` 检查字段、索引与约束是否存在；不得假设空数据库；不得删除历史数据。

## 1.2 迁移 024：为周计划增加稳定 `task_key`

目标表：`weekly_report_plans`

新增字段：

```sql
task_key CHAR(36) NULL COMMENT '计划任务稳定标识，UUID'
```

迁移步骤：

1. 若不存在则新增可空字段；
2. 对已有计划行执行：
   ```sql
   UPDATE weekly_report_plans
   SET task_key = UUID()
   WHERE task_key IS NULL OR task_key = '';
   ```
3. 检查无空值后改为：
   ```sql
   task_key CHAR(36) NOT NULL
   ```
4. 增加唯一索引：
   ```sql
   UNIQUE KEY uk_weekly_report_plans_task_key (task_key)
   ```
5. 增加查询索引：
   ```sql
   KEY idx_weekly_report_plans_owner_window
   ```
   索引不能跨表建立；应在现有可组合字段中选择合适索引，例如保留已有 `(project_id, planned_date)`，并新增 `task_key` 唯一索引即可。不要重复创建无收益的大索引。

### 关键说明

- `task_key` 是业务稳定标识。
- 周报编辑时，前端回传已有 `taskKey`，后端删除并重建计划行时必须把原 `taskKey` 写入新行。
- 新增计划没有 `taskKey` 时，只能由服务端用 `node:crypto` 的 `randomUUID()` 生成。
- 不让浏览器自行生成并作为可信来源。
- 不建立 `daily_report_items.source_plan_task_key → weekly_report_plans.task_key` 的数据库外键。原因是当前周报更新会删除并重建计划子行；外键会阻塞编辑或破坏历史关联。关联有效性由服务端事务校验保证。

## 1.3 迁移 025：日报完成项增加来源和执行状态

目标表：`daily_report_items`

新增字段：

```sql
source_type ENUM('weekly_plan', 'ad_hoc', 'legacy_unknown')
  NOT NULL DEFAULT 'legacy_unknown'
  COMMENT '任务来源：周计划/临时新增/历史未知',

source_plan_task_key CHAR(36) NULL
  COMMENT '关联周计划的 task_key；新增任务为空',

execution_status ENUM('completed', 'in_progress', 'not_completed') NULL
  COMMENT '实际执行状态；历史数据可为空'
```

新增索引：

```sql
KEY idx_daily_report_items_source_task (source_plan_task_key, daily_report_id),
KEY idx_daily_report_items_execution_status (execution_status)
```

同时将：

```sql
daily_report_items.completed_at
```

改为可空。新语义：

- `completed`：必填；
- `in_progress`：可空；
- `not_completed`：可空；
- 历史数据：保持原值或空值，不强制改写。

**不得**根据历史 `completion_progress` 自行批量推断并写入执行状态；如 `100%`、`已完成`、`80%` 等文本无法保证业务含义准确。

## 1.4 迁移 026：周报总结记录来源属性

目标表：`weekly_report_summaries`

新增字段：

```sql
source_type ENUM('weekly_plan', 'ad_hoc', 'legacy_unknown')
  NOT NULL DEFAULT 'legacy_unknown'
  COMMENT '总结任务来源',

source_plan_task_key CHAR(36) NULL
  COMMENT '来源周计划 task_key；新增任务为空'
```

新增索引：

```sql
KEY idx_weekly_report_summaries_source_task (source_plan_task_key, weekly_report_id)
```

同时将：

```sql
weekly_report_summaries.completed_date
```

改为可空。新语义：

- `completed`：必须有 `completed_date`；
- `in_progress`：`completed_date = null`；
- `not_completed`：`completed_date = null`；
- 历史行保留原值。

### 关于旧 `added` 状态

历史 `completion_status = added` 不做数据迁移、不删除枚举值。

从本计划上线后：

```text
新增工作不再使用 completion_status = added 表达；
改为 source_type = ad_hoc + 实际 execution/completion status。
```

后端读取历史数据时仍必须兼容 `added`；新建/保存的周报总结不应再主动写入 `added`。

## 1.5 迁移后核验 SQL

Codex 必须在测试库执行并记录：

```sql
SHOW COLUMNS FROM weekly_report_plans;
SHOW COLUMNS FROM daily_report_items;
SHOW COLUMNS FROM weekly_report_summaries;

SHOW INDEX FROM weekly_report_plans;
SHOW INDEX FROM daily_report_items;
SHOW INDEX FROM weekly_report_summaries;

SELECT COUNT(*) AS blank_task_key_count
FROM weekly_report_plans
WHERE task_key IS NULL OR task_key = '';
```

## 验收门槛

- 所有既有周计划均有唯一 `task_key`；
- 旧日报、旧周报仍能读取；
- 迁移可重复执行；
- 测试中所有直接向 `weekly_report_plans` 插入数据的 SQL fixture 已补齐 `task_key`；
- 官方导出不因空 `completed_at` / `completed_date` 崩溃，空值应显示为空白。

---

# Plan 2：后端日报“来源计划 + 执行状态”能力

## 目标

让员工填写日报时能显式标记本条工作来自哪一项周计划，或标记为临时新增；服务端在提交日报时强制校验。

## 2.1 涉及文件

```text
digital-platform-api/src/domain/dailyReports.js
digital-platform-api/src/repositories/dailyReportRepository.js
digital-platform-api/src/routes/dailyReports.js
digital-platform-api/test/dailyReports/dailyReports.integration.test.js
```

如需共享日期工具，复用：

```text
digital-platform-api/src/domain/reportWorkdays.js
```

不得在多个文件各自手写“周一至周日”的计算。

## 2.2 新增日报 API 合同

保留旧接口：

```http
GET /api/daily-reports/plan-suggestion?reportDate=&projectId=
```

不删除、不改变其“按日报日期精确匹配计划日期”的既有语义。

新增接口：

```http
GET /api/daily-reports/source-plans?reportDate=YYYY-MM-DD&projectId=123
```

### 权限

- 仅通过现有 `requireDailyReportWriter` 的员工角色；
- 仅查询当前登录用户自己的周计划；
- 不接受 `userId` 参数；
- 复用项目可见性与“项目未完成”校验。

### 查询范围与筛选规则

设日报日期为 `D`，其所在自然周为 `W`：

```text
W = D 所在周的周一至周日
previousWeekStart = W.weekStart - 7 天
previousWeekEnd = W.weekStart - 1 天
```

先验证 `projectId` 是当前用户可填写日报的未完成项目；再查询当前用户上一周周报中的计划。可用计划必须同时满足：

```text
weekly_reports.user_id = currentUser.id
AND weekly_reports.week_start = previousWeekStart
AND weekly_reports.week_end = previousWeekEnd
AND weekly_reports.status IN ('draft', 'submitted')
AND weekly_report_plans.project_id = 当前日报 projectId
AND weekly_report_plans.planned_date BETWEEN W.weekStart AND W.weekEnd
AND weekly_report_plans.task_key IS NOT NULL
AND weekly_report_plans.task_key <> ''
```

接口**只返回当前日报项目对应的计划**，绝不返回同一用户其他项目的计划。返回的是当前工作周中该项目的全部可执行计划，不按 `D` 当天精确过滤；一项计划可以被同一周多天、多条日报关联。

排序规则：

```text
weekly_report_plans.planned_date ASC
weekly_report_plans.sort_order ASC
weekly_report_plans.id ASC
```

建议同时返回计划所属周报状态，供前端提示“计划来自已提交周报/草稿周报”，以及该计划在本周已关联日报的摘要状态，供下拉项展示。

### 响应示例

```json
{
  "data": {
    "weekStart": "2026-06-22",
    "weekEnd": "2026-06-28",
    "projectId": 123,
    "items": [
      {
        "taskKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "weeklyReportId": 88,
        "weeklyReportStatus": "submitted",
        "projectId": 123,
        "workTask": "项目编号 / 项目名称",
        "workTarget": "完成接口联调",
        "plannedDate": "2026-06-23",
        "linkedDailySummary": {
          "linkedItemCount": 1,
          "latestExecutionStatus": "in_progress",
          "latestReportDate": "2026-06-23"
        }
      }
    ]
  }
}
```

不返回数据库物理路径、其他用户计划或任何评分信息。

## 2.3 日报 payload 扩展

每条 `items[]` 增加：

```json
{
  "workContent": "完成接口联调与异常修复",
  "completionProgress": "100%",
  "completedAt": "17:30",
  "sourceType": "weekly_plan",
  "sourcePlanTaskKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "executionStatus": "completed",
  "responsiblePerson": "员工姓名",
  "deviationAndCorrectiveAction": "无偏差"
}
```

### 后端校验规则

#### 草稿日报

草稿允许：

- `sourceType` 为空；
- `sourcePlanTaskKey` 为空；
- `executionStatus` 为空；
- `completedAt` 为空。

但草稿中若已填写来源字段，字段组合必须合法。

#### 提交日报

对每一条非空 `items[]`：

| 条件 | 要求 |
|---|---|
| 所有状态 | `workContent`、`completionProgress`、`sourceType`、`executionStatus` 必填 |
| `sourceType = weekly_plan` | `sourcePlanTaskKey` 必填 |
| `sourceType = ad_hoc` | `sourcePlanTaskKey` 必须为 `null` |
| `executionStatus = completed` | `completedAt` 必填 |
| `executionStatus = in_progress` | `completedAt` 可为空 |
| `executionStatus = not_completed` | `completedAt` 必须为空；`deviationAndCorrectiveAction` 必填 |

新增错误码建议：

```text
DAILY_REPORT_INVALID_SOURCE_TYPE
DAILY_REPORT_INVALID_EXECUTION_STATUS
DAILY_REPORT_SOURCE_PLAN_REQUIRED
DAILY_REPORT_SOURCE_PLAN_FORBIDDEN
DAILY_REPORT_SOURCE_PLAN_NOT_AVAILABLE
DAILY_REPORT_COMPLETED_TIME_REQUIRED
DAILY_REPORT_NOT_COMPLETED_REASON_REQUIRED
```

### 服务端来源计划校验

在创建/更新日报的事务中，写入子表前调用新校验方法，例如：

```text
assertDailyReportItemSources(connection, {
  user,
  reportDate,
  projectId,
  items
})
```

对 `sourceType = weekly_plan` 的每一个不同 `sourcePlanTaskKey`：

1. 查询 `weekly_report_plans.task_key`；
2. 确认计划属于当前登录用户；
3. 确认计划父周报属于当前登录用户，且周期恰为日报所在工作周的上一自然周；
4. 确认父周报状态为 `draft` 或 `submitted`；
5. 确认计划项目与日报主表项目相同；若日报明细仍保存 `project_id`，还必须与主表项目保持一致；
6. 确认计划日期处于日报日期所在的自然周；
7. 确认计划任务存在、taskKey 有效且未被非法篡改；
8. 不信任前端传来的计划名称、计划日期、周报 ID 或关联状态摘要。

查询不到或不符合范围时必须返回 409，不得悄悄改为新增任务。特别是：不得接受其他项目、其他用户、周期外计划或已因切换日报项目而失效的 taskKey。

## 2.4 Repository 改造

### `mapDailyReportItem`

增加返回：

```js
sourceType: row.source_type,
sourcePlanTaskKey: row.source_plan_task_key,
executionStatus: row.execution_status
```

`completedAt` 为 `null` 时，API 返回 `null`，不得返回字符串 `"null"`。

### `replaceDailyReportRows`

插入 `daily_report_items` 时新增字段：

```text
source_type
source_plan_task_key
execution_status
```

并保持当前“先删再写、排序连续”的行为。

### 旧数据兼容

- `legacy_unknown` 仅用于数据库已有行和历史 API 返回；
- 新建日报不可用 `legacy_unknown` 规避提交校验；
- 编辑历史日报时，页面必须展示“历史记录尚未关联计划”的提示；
- 不要求一次性修复所有旧日报；历史项只在用户主动重新编辑并提交时才引导补齐来源和执行状态。

## 验收门槛

- 可按“日报日期所在周 + 项目”获取可关联计划；
- 员工不能关联他人的计划、其他项目计划或周期外计划；
- 新提交日报必须选择来源与状态；
- 新增任务和计划任务都能提交；
- 状态不合法、计划不存在、完成时间规则不合法时返回明确错误；
- 旧 `plan-suggestion` 测试仍通过。

---

# Plan 3：日报填写页改造

## 目标

让员工能够在日报填写时明确标记任务来源与执行状态，并为周报自动汇总提供可靠数据。

## 3.1 涉及文件

```text
digital-platform-web/src/api/dailyReports.js
digital-platform-web/src/pages/DailyReportPage.vue
digital-platform-web/src/App.vue
```

`App.vue` 需要把当前 `route` 传给 `DailyReportPage`，以支持从周报“补填日报”跳转后的预填参数。

## 3.2 API 客户端

在 `src/api/dailyReports.js` 新增：

```js
getDailyReportSourcePlans({ reportDate, projectId }, authToken)
```

保留 `getDailyReportPlanSuggestion`，不要删除。

## 3.3 每条日报完成项新增 UI

在“今日工作完成情况”每一行加入：

1. **任务来源**
   ```text
   ○ 执行本周计划
   ○ 新增临时工作
   ```

2. **关联本周计划**
   - 当来源为“执行本周计划”时显示；
   - 进入该选择前必须已选择日报主表项目；未选项目时禁用选择控件并提示“请先选择日报项目”；
   - 下拉框选项来自 `/source-plans?reportDate=&projectId=`；
   - 仅显示“当前日报项目 + 当前工作周”的可用计划，不显示其他项目、其他用户或其他工作周的计划；
   - 显示：计划日期 + 工作目标 + 当前关联日报状态；
   - 同一计划可在本周多天、多条日报中被选择，不因已关联而从列表中隐藏；
   - 仅存 `sourcePlanTaskKey`；
   - 员工必须显式选择一项，即使当前项目只有一条可用计划，也不得静默自动选中；
   - 当前项目没有可用计划时，显示空状态并引导改选“新增临时工作”；不得回退显示其他项目计划；
   - 项目变化时必须立即清空所有已选 `sourcePlanTaskKey`，并重新请求新项目计划；日期跨周变化后若现有 key 不再属于可选集合，也必须清空并显示提示。

3. **执行状态**
   ```text
   已完成 / 进行中 / 未完成
   ```

4. **实际完成时间**
   - 已完成：显示且必填；
   - 进行中：显示但可选，页面文案改为“实际完成时间（已完成时必填）”；
   - 未完成：禁用并清空。

5. **偏差及纠偏措施**
   - 未完成时显示必填标识；
   - 进行中时建议填写但不强制；
   - 已完成时沿用现有可选逻辑。

## 3.4 推荐的默认交互

- 用户先选择日报项目；尚未选择项目时，不加载也不展示“执行本周计划”的列表；
- 选择日报日期和项目后，按 `日报日期所在工作周 + 日报项目` 加载来源计划清单；
- 选择“执行本周计划”后，员工必须从当前项目的可用列表中显式选择一项；即使仅有一项也不得自动代选；
- 多条计划时不得按文本相似度或计划日期自动猜测；
- 没有可用计划时，不显示其他项目计划，只允许用户改选“新增临时工作”；
- 切换日报项目时，立即清空已选计划 key，重新加载新项目范围内的计划，并显示“已更换项目，原关联计划已取消，请重新选择”；
- 切换日期但仍在同一工作周时可保留现有 key，但必须重新校验该 key 是否仍可用；日期跨周时无条件重新校验，失效则清空；
- 草稿保存不弹出阻塞提示；
- 点击正式提交时显示字段级错误。

## 3.5 补填日报深链

从周报中点击“补填日报”时，跳转目标建议为：

```text
#/daily-report?reportDate=2026-06-24&projectId=123&sourcePlanTaskKey=<uuid>
```

实现要求：

1. `App.vue` 把 `route` 传入 `DailyReportPage`；
2. `DailyReportPage` 首次创建新日报时读取 query；
3. 预填报告日期、项目 ID、第一行 `sourceType=weekly_plan`、`sourcePlanTaskKey`；
4. 页面仍必须重新请求 `/source-plans` 并确认该 `taskKey` 当前有效；
5. 查询参数无效、过期或越权时不能提交，并提示用户重新选择；
6. 已有 `reportId` 的编辑页不应用深链预填覆盖。

## 验收门槛

- 新日报可选择周计划或新增任务；
- 任务来源、状态、完成时间、未完成原因的前后端规则一致；
- 切换项目/日期不残留错误的计划 key；
- 从周报跳转后可正确预填；
- 现有日报附件、导出和草稿保存行为不回归。

---

# Plan 4：周计划稳定任务标识的读写改造

## 目标

确保周报计划在“删除旧行、重建新行”的现有保存策略下仍保留稳定任务标识。

## 4.1 涉及文件

```text
digital-platform-api/src/domain/weeklyReports.js
digital-platform-api/src/repositories/weeklyReportRepository.js
digital-platform-web/src/pages/WeeklyReportPage.vue
digital-platform-api/test/reports/weeklyReports.integration.test.js
digital-platform-api/test/dailyReports/dailyReports.integration.test.js
```

## 4.2 后端改造

### `weeklyReports.js`

- 为计划行支持可选 `taskKey`；
- 格式必须是合法 UUID；
- 新建周报没有 `taskKey` 时允许为空，由 repository 生成；
- 更新周报带回的已有 `taskKey` 必须保留；
- 不接受重复 task key；重复时返回明确业务错误。

### `weeklyReportRepository.js`

1. `mapPlanRow` 返回：
   ```js
   taskKey: row.task_key
   ```

2. 新增服务端生成逻辑：
   ```js
   import { randomUUID } from 'node:crypto';
   ```

3. 在创建/更新写入前，确保每个计划行都有 `taskKey`：
   - payload 有合法 key：保留；
   - payload 无 key：生成；
   - 同一 payload 内重复 key：拒绝；
   - 不要覆盖已有 key。

4. `insertWeeklyReportPlans` 写入 `task_key`。

5. 因 `updateWeeklyReport` 当前会先删除 `weekly_report_plans`，再插入新行：
   - 前端必须回传每条现有计划的 `taskKey`；
   - 后端不得在更新时无条件生成新 key；
   - 删除某条计划时，计划 key 可能仍被历史日报引用；因为无数据库 FK，不阻塞更新；
   - 后续周报汇总若找不到被删计划，只能将该日报作为“历史关联缺失”提示，不能伪造新计划。

## 4.3 前端改造

`WeeklyReportPage.vue`：

- `blankPlan()` 的 `taskKey` 为空；
- `applyReport()` 回填 `taskKey`；
- `buildPayload()` 上传 `taskKey`；
- 用户从 UI 新增的计划无需前端创建 UUID；
- 保存成功后应用后端返回的计划数据，以拿到新生成的 `taskKey`。

## 验收门槛

- 新周计划保存后得到 taskKey；
- 编辑、排序、修改文字、保存后 taskKey 不变；
- 删除一个计划再保存，剩余计划 taskKey 不变；
- 日报可继续引用未被修改的计划 key；
- 集成测试的手写 SQL fixture 均显式提供合法 UUID。

---

# Plan 5：周报规则草稿服务与接口

## 目标

在周报首次填写、且本周周报记录不存在时，基于上一周计划和本周已提交日报生成确定性草稿。

## 5.1 新增服务与改造文件

建议新增：

```text
digital-platform-api/src/services/weeklyReportPrefillService.js
```

并改造：

```text
digital-platform-api/src/domain/weeklyReports.js
digital-platform-api/src/repositories/weeklyReportRepository.js
digital-platform-api/src/routes/weeklyReports.js
digital-platform-api/test/reports/weeklyReports.integration.test.js
digital-platform-api/test/reports/weeklyReports.test.js
```

## 5.2 API

新增：

```http
GET /api/weekly-reports/prefill-suggestion?weekStart=YYYY-MM-DD
```

**路由注册位置必须在** `/:reportId` 动态路由之前，避免把 `prefill-suggestion` 误当作 reportId。

### 权限

- 仅复用既有 `requireWeeklyReportWriter`；
- 只处理当前登录用户自己的周报；
- 不接收 `userId`；
- employee 和 center_manager 均可调用；
- center_manager 无日报时，计划无证据将按本计划规则显示未完成，不得伪造日报。

### 请求校验

- `weekStart` 必须为周一；
- 服务端推导 `weekEnd = weekStart + 6 天`；
- 不信任浏览器传入 `weekEnd`；
- 日期计算复用既有 `reportWorkdays` 工具与固定业务时区约定。

### 响应行为

1. 若该用户该周期周报已存在（草稿或已提交）：

```json
{
  "data": {
    "shouldPrefill": false,
    "reason": "WEEKLY_REPORT_ALREADY_EXISTS",
    "existingReportId": 123
  }
}
```

不返回可覆盖现有周报的自动草稿。

2. 若不存在：

```json
{
  "data": {
    "shouldPrefill": true,
    "weekStart": "2026-06-22",
    "weekEnd": "2026-06-28",
    "previousWeek": {
      "weekStart": "2026-06-15",
      "weekEnd": "2026-06-21",
      "reportId": 88,
      "status": "submitted"
    },
    "basisHash": "<server-generated hash>",
    "stats": {
      "plannedTaskCount": 4,
      "submittedDailyReportCount": 5,
      "submittedDailyItemCount": 8,
      "missingDailyEvidenceTaskCount": 1,
      "adHocTaskCount": 2,
      "legacyUnknownItemCount": 0
    },
    "suggestions": []
  }
}
```

## 5.3 服务端取数

### 上周计划基线

设本周为 W：

```text
previousWeekStart = W.weekStart - 7 天
previousWeekEnd = W.weekStart - 1 天
```

取当前用户 `week_start = previousWeekStart` 的周报计划，且：

```text
weekly_report_plans.planned_date BETWEEN W.weekStart AND W.weekEnd
```

计划所属上周周报若为草稿，也可以作为填写参考，但必须在响应中携带 `previousWeek.status`，前端显示“计划来自草稿周报”的非阻塞提示。不得把草稿周报当成已审核事实。

### 本周日报实际证据

查询：

```text
daily_reports.user_id = currentUser.id
AND daily_reports.status = submitted
AND daily_reports.report_date BETWEEN W.weekStart AND W.weekEnd
```

联查：

```text
daily_report_items
projects
```

只读取 `daily_report_items`，不读取 `daily_report_plans`。

返回给内部聚合服务的数据至少包括：

```text
dailyReportId
dailyItemId
reportDate
sortOrder
projectId
projectCode
projectName
workContent
completionProgress
completedAt
sourceType
sourcePlanTaskKey
executionStatus
deviationAndCorrectiveAction
```

## 5.4 规则聚合实现

### 计划任务

对每条计划任务：

1. 按 `source_plan_task_key = plan.task_key` 找到本周已提交日报明细；
2. 有关联证据时：
   - `sourceType = weekly_plan`
   - `sourcePlanTaskKey = plan.taskKey`
   - `workTask = plan.workTask`
   - `workTarget = plan.workTarget`
   - `plannedDate = plan.plannedDate`
   - 状态由最后一条日报 `executionStatus` 决定；
   - `completionDescription` 用规则格式列出日期、工作内容、进度与状态；
   - `completedDate` 仅在最终状态为 `completed` 时填写。
3. 无关联证据时：
   - `completionStatus = not_completed`
   - `completedDate = null`
   - `missingDailyEvidence = true`
   - `completionDescription = "本周未发现关联的已提交日报，按考评规则暂记未完成。请补填日报或手工补充未完成原因。"`
   - 返回一个可供前端构建深链的 `dailyFillContext`。

### 新增工作

把本周 `sourceType = ad_hoc` 的日报明细按以下安全规则分组：

```text
projectId + 标准化 workContent
```

标准化仅做基础处理：

- 去首尾空格；
- 统一多余空白；
- 小写化英文；
- 不做 AI 自动合并；
- 不把语义相近但文本不同的工作强行合成一项。

每组生成一个 `sourceType = ad_hoc` 的周报总结草稿。其状态采用组内最后一条日报状态，描述按日报日期顺序合并。

### 历史未知项

对 `sourceType = legacy_unknown` 或 `executionStatus = null` 的已提交日报：

- 不自动挂靠到某条计划；
- 在响应中作为 `legacyCandidates` 返回；
- 可给出“需要人工确认”的提示；
- 本期不让规则层自行把历史日报视作计划已完成的证据；
- AI 可在 Plan 6 中提出候选计划，但不能自动写入关联。

## 5.5 `basisHash`

为防止用户打开页面后日报或上周计划已被修改，服务端要对预填依据生成稳定 hash，输入至少包含：

```text
weekStart
previous weekly report id + updatedAt
previous plan taskKey + updatedAt/业务字段
本周 submitted daily report id + updatedAt
本周 submitted daily item id + 业务字段
```

建议使用 Node `createHash('sha256')`。

该 hash 用于 AI 整理接口的乐观一致性校验，不作为安全授权凭证。

## 5.6 不修改评分逻辑

本 Plan 不改动：

```text
listWeeklyDailyEvidence
buildWeeklyComparisonRows
getWeeklyReportComparisonTable
evaluateWeeklyReportScore
saveWeeklyReportEvaluation
```

可以在后续独立需求中利用新的结构化来源提高“周 vs 日”对照准确性，但本次不混入评分改造，避免改变现有考评结果。

## 验收门槛

- 只有本周周报不存在时才返回 `shouldPrefill=true`；
- 上周计划与本周日报的周期严格正确；
- 草稿日报不进入证据；
- 无关联提交日报的计划默认未完成；
- 新增临时工作生成独立摘要；
- 历史未知项不被静默误关联；
- 规则草稿不依赖 DeepSeek，AI Key 缺失时仍可使用。

---

# Plan 6：周报填写页接入规则草稿与补填提示

## 目标

替换“直接复制上一周计划”的旧逻辑，使用后端规则草稿；明确展示缺失日报和新增工作；保护用户手工编辑内容。

## 6.1 涉及文件

```text
digital-platform-web/src/api/weeklyReports.js
digital-platform-web/src/pages/WeeklyReportPage.vue
digital-platform-web/src/App.vue
```

## 6.2 API 客户端

在 `src/api/weeklyReports.js` 新增：

```js
getWeeklyReportPrefillSuggestion({ weekStart }, authToken)
composeWeeklyReportPrefillWithAi({ weekStart, basisHash }, authToken)
```

## 6.3 替换旧预填流程

删除或停止调用：

```text
prefillSummariesFromPreviousPlans(previousReport)
```

新的 `loadInitialReport()` 顺序必须是：

```text
1. 初始化默认上一自然周 W
2. 查询 W 是否已有当前用户周报
3. 有记录：加载记录并结束；绝不自动覆盖
4. 无记录：调用 GET /prefill-suggestion?weekStart=W.weekStart
5. shouldPrefill=true：将规则建议转换为 summaries 表单行
6. 无上周计划、无日报时：保留一个空白总结行，并展示说明
```

不再由前端自行查询上一周详情并复制计划内容。计划、日报、状态判定均以服务端聚合结果为准。

## 6.4 表单数据结构扩展

每个 `form.summaries[]` 除既有字段外保存 UI 级辅助属性：

```js
{
  localId,
  sourceType,
  sourcePlanTaskKey,
  missingDailyEvidence,
  dailyEvidence,
  dailyFillContext,
  generation: 'rule' | 'ai' | 'manual'
}
```

保存 payload 仅传后端业务字段：

```js
{
  sourceType,
  sourcePlanTaskKey,
  projectId,
  workTask,
  workTarget,
  plannedDate,
  completionStatus,
  completionDescription,
  completedDate
}
```

`dailyEvidence`、`dailyFillContext`、`generation` 仅用于前端显示，不写入周报表。

## 6.5 页面表现

### 自动草稿提示条

示例：

```text
已根据上一周工作计划和本周已提交日报生成 5 条工作总结草稿。
其中 1 条计划未发现关联日报，已按考评规则标记为未完成。
```

### 每行来源标识

- `执行周计划`
- `新增临时工作`
- `历史待确认`
- `缺少日报证据`

### 缺失日报行动

当 `missingDailyEvidence = true` 时显示：

```text
本周未发现关联的已提交日报，暂记未完成。
[补填日报] [刷新日报数据]
```

“补填日报”跳转到 Plan 3 定义的深链。  
“刷新日报数据”必须遵守覆盖保护。

### 刷新/重新生成覆盖保护

规则：

- 首次打开、未编辑、未保存：可自动应用规则草稿；
- 用户修改任一 summary 字段后，设置 `prefillDirty = true`；
- 点击“刷新日报数据”或“重新生成草稿”时：
  - 若 `prefillDirty = false`，可直接刷新；
  - 若 `prefillDirty = true`，必须弹出确认框；
  - 确认后只替换自动生成区域；手工新增行要么保留，要么在确认文案中明确说明将被移除，禁止静默丢失；
- 已保存草稿或已提交周报不自动重新生成；用户必须主动选择“基于最新日报生成建议”，且默认在预览中比较，不直接覆盖。

### 完成日期展示

- `completed`：展示并允许编辑完成日期；
- `in_progress` / `not_completed`：完成日期为空，页面展示“未完成/进行中无需填写实际完成日期”；
- 提交验证与后端一致。

## 6.6 上周计划草稿提示

若响应显示上一周周报 `status = draft`：

```text
当前计划基线来自上一周未提交草稿，仅用于填写参考。
```

该提示不阻止填写，不把草稿周报标记为已审核。

## 验收门槛

- 页面不再将计划日期自动写为完成日期；
- 页面不再将所有计划默认写为已完成；
- 已存在周报不会被预填逻辑覆盖；
- 漏填日报任务明确显示未完成与补填入口；
- 手工编辑不被刷新操作静默覆盖；
- `npm run check` 通过。

---

# Plan 7：AI 草稿生成与准确性增强

## 目标

在规则已确定事实字段的前提下，让 AI 将多日日报整理为更可读的周报文字；AI 不改变业务事实、不参与评分。

## 7.1 新增文件

建议新增：

```text
digital-platform-api/src/services/weeklyReportPrefillAiService.js
```

改造：

```text
digital-platform-api/src/routes/weeklyReports.js
digital-platform-api/src/services/weeklyReportPrefillService.js
digital-platform-api/test/reports/weeklyReports.integration.test.js
digital-platform-api/test/reports/weeklyReports.test.js
digital-platform-web/src/api/weeklyReports.js
digital-platform-web/src/pages/WeeklyReportPage.vue
```

可复用现有：

```text
digital-platform-api/src/config/env.js
DEEPSEEK_API_KEY
DEEPSEEK_API_BASE
DEEPSEEK_MODEL
```

不要复用评分服务的 prompt、评分 schema、`ai_score` 写入方法。

## 7.2 AI 接口

新增：

```http
POST /api/weekly-reports/prefill-suggestion/ai-compose
```

请求体：

```json
{
  "weekStart": "2026-06-22",
  "basisHash": "<GET prefill 返回的 hash>"
}
```

禁止前端直接上传任意员工日报全文、用户 ID、项目 ID 列表或任意 task key 列表作为 AI 输入。

### 服务端执行步骤

1. 基于当前登录用户和 `weekStart` 重新执行规则草稿服务；
2. 重新计算 `basisHash`；
3. 若请求的 hash 与当前 hash 不同，返回：
   ```text
   409 WEEKLY_PREFILL_BASIS_CHANGED
   ```
   同时附带新的规则草稿，要求前端刷新预览；
4. 仅把规则服务生成的结构化任务发送给 AI；
5. AI 返回结构化文字结果；
6. 后端严格验证 key、数量、字段类型、长度；
7. 只替换允许 AI 更新的两个字段；
8. 返回完整草稿，不写数据库。

## 7.3 允许输入给 AI 的字段

每条任务输入：

```json
{
  "suggestionKey": "plan:<taskKey>",
  "sourceType": "weekly_plan",
  "projectLabel": "项目编号 / 项目名称",
  "plannedTask": "工作任务",
  "plannedTarget": "工作目标",
  "plannedDate": "2026-06-23",
  "executionStatus": "completed",
  "completedDate": "2026-06-25",
  "dailyEvidence": [
    {
      "date": "2026-06-23",
      "workContent": "完成联调环境配置",
      "completionProgress": "40%",
      "executionStatus": "in_progress",
      "deviationAndCorrectiveAction": null
    }
  ],
  "missingDailyEvidence": false
}
```

发送前对单条文本长度、任务数和日报证据条数设上限，防止意外大请求。建议：

```text
最多 50 条任务
每条最多 20 条日报证据
每个文本字段最多 1000 字符
```

## 7.4 AI 输出 schema

AI 只能返回：

```json
{
  "items": [
    {
      "suggestionKey": "plan:<taskKey>",
      "workTarget": "完成接口联调、异常处理及回归验证。",
      "completionDescription": "完成联调环境配置、接口联调和异常修复，并完成回归验证，相关功能已闭环。"
    }
  ]
}
```

后端必须验证：

- 每个 `suggestionKey` 都存在于本次服务端规则草稿；
- 不允许新增、删除、合并、拆分任务；
- `workTarget`、`completionDescription` 非空且长度在数据库限制内；
- 不接受 `completionStatus`、`completedDate`、`projectId`、`sourceType`、`sourcePlanTaskKey` 等字段；
- 输出异常时丢弃 AI 文本，保留规则草稿。

## 7.5 Prompt 约束

系统提示必须强调：

```text
- 只能基于提供的计划和日报证据总结；
- 不得臆造、补全或推测未提供的事实；
- 不得改变任何任务状态、日期、项目或来源；
- 无日报证据的任务必须保留“未完成/缺少日报证据”的事实；
- 返回严格 JSON，不返回 Markdown。
```

## 7.6 失败降级

AI 请求失败、超时、返回非法 JSON、输出不符合 schema 时：

- HTTP 可返回 200；
- 返回规则草稿；
- `ai.applied = false`；
- 返回可展示的简短提示，例如“AI 整理暂不可用，已保留规则草稿。”；
- 服务端日志记录脱敏错误，不记录 API Key 和完整个人日报内容；
- 不阻断周报填写、保存或提交。

## 7.7 前端交互

- 首次进入先展示规则草稿，不自动调用 AI；
- 提供按钮：
  ```text
  AI 整理草稿
  ```
- AI 返回后在页面预览中替换文本字段，并显示：
  ```text
  已使用 AI 整理表述，请核对后保存。
  ```
- 用户可继续编辑；
- AI 不自动保存；
- AI 按钮请求中禁用，避免重复扣费与竞态；
- AI 返回后仍保留每条任务的来源、状态、缺失日报提示和补填入口。

## 验收门槛

- 没有 DeepSeek Key 时规则草稿仍可完整使用；
- AI 不调用评分接口；
- AI 不写 `ai_score`；
- AI 无法改变状态、日期、项目或来源；
- AI 输出异常不会阻塞填写；
- 规则依据变更后，AI 请求被 409 拦截并要求刷新。

---

# Plan 8：测试、回归、上线与验收

## 8.1 后端单元/集成测试

扩展或新增：

```text
digital-platform-api/test/dailyReports/dailyReports.integration.test.js
digital-platform-api/test/reports/weeklyReports.integration.test.js
digital-platform-api/test/reports/weeklyReports.test.js
```

### 日报来源计划测试

1. 当前用户可获取“上一周周报中、计划日期落在本周、本项目”的来源计划；
2. 列表返回当前项目本周的全部可执行计划，不按日报当天精确过滤；
3. 不可获取其他用户计划；
4. 不可获取其他项目计划；
5. 不可获取父周报不属于 W-1、计划日期不属于 W 或 taskKey 为空的计划；
6. 当前项目没有可用计划时，响应 `items=[]`，不得回退返回其他项目计划；
7. 切换日报项目后，用旧项目 taskKey 提交必须被后端拒绝；
8. `weekly_plan` 提交日报必须带合法 taskKey；
9. `ad_hoc` 提交日报不得带 taskKey；
10. `completed` 必须有完成时间；
11. `not_completed` 必须有偏差和纠偏措施；
12. 草稿允许来源未选择；
13. 旧 `plan-suggestion` 精确日期匹配行为不变。

### 任务 key 保留测试

1. 创建周报时服务端生成 taskKey；
2. 更新周报后原计划 taskKey 不变；
3. 新增计划得到新 taskKey；
4. payload 内重复 key 被拒绝；
5. 直接 SQL fixture 插入计划时提供 key。

### 规则草稿测试

以 W=`2026-06-22` 为例：

1. W-1 的计划、W 的关联日报 → 生成 completed；
2. 同一计划三天日报 → 合并为一条结果，状态取最后一条；
3. W 内只有草稿日报 → 不计入证据；
4. W-1 计划在 W 内无关联 submitted 日报 → `not_completed + missingDailyEvidence=true`；
5. `ad_hoc` 日报 → 生成新增任务总结；
6. `legacy_unknown` 日报 → 不自动匹配；
7. W 已存在周报 → `shouldPrefill=false`；
8. 周期、用户、项目范围不得串数据；
9. 周日/周一边界严格正确。

### AI 草稿测试

1. 注入假的 AI client，验证仅文字字段变化；
2. AI 尝试返回状态/日期/项目字段 → 后端忽略或拒绝；
3. AI 返回未知 `suggestionKey` → 返回规则草稿；
4. AI 异常/超时 → 返回规则草稿，不写库；
5. basisHash 不一致 → 409 + 最新规则草稿；
6. 断言本流程不调用 `saveWeeklyReportEvaluation`，不更新 `ai_score`。

## 8.2 前端人工验收

### 场景 A：计划已完成

- 上周周报有下周计划；
- 本周日报关联该计划并逐日更新；
- 打开周报时自动生成一条工作总结；
- 状态、实际完成日期、来源日报正确；
- 点击 AI 后仅文本更自然，状态不变。

### 场景 B：漏填日报

- 上周计划存在；
- 本周未提交关联日报；
- 周报默认未完成；
- 点击补填日报能预填日期、项目和来源计划；
- 补填并提交后返回周报刷新，状态更新。

### 场景 C：新增临时工作

- 本周日报选择“新增临时工作”；
- 周报自动产生新增来源的总结；
- 已完成/进行中/未完成状态正确。

### 场景 D：保护已编辑内容

- 周报草稿生成后手工修改；
- 再点击刷新；
- 页面必须弹出确认；
- 不得静默覆盖人工内容。

### 场景 E：既有周报

- W 周已有草稿或已提交周报；
- 再次打开页面；
- 加载既有记录，不自动重新生成。

## 8.3 导出回归

对日报和周报分别执行：

- 含 `completedAt = null` 的日报导出；
- 含 `completedDate = null` 的周报导出；
- 当前模板版式、合并单元格、日期、样式不崩坏；
- Excel 中空值显示为空白，不显示 `null`、`undefined` 或非法日期；
- 没有新增“来源/状态”字段时，不擅自改变官方模板列结构。

## 8.4 最终命令

```bash
cd digital-platform-api
npm run check
node --test \
  test/dailyReports/dailyReports.integration.test.js \
  test/reports/weeklyReports.integration.test.js \
  test/reports/weeklyReports.test.js \
  test/dailyReports/dailyReportExport.test.js

cd ../digital-platform-web
npm run check
```

在测试库执行新迁移后再运行上述测试。

## 8.5 上线顺序

1. 备份目标数据库（结构与必要业务数据）；
2. 先执行 024～026 迁移；
3. 部署后端；
4. 部署前端；
5. 用测试账号创建一份下周计划；
6. 在对应周内提交“周计划任务”和“新增临时工作”两类日报；
7. 打开周报填写页验证规则草稿；
8. 验证漏填日报默认未完成与补填跳转；
9. 验证 AI Key 缺失时规则草稿仍可用；
10. 再开放 AI 整理按钮。

不得先部署依赖新字段的前端，再执行数据库迁移。

---

## 9. 完成定义

本功能仅在以下条件同时满足时视为完成：

- 新日报提交具有明确来源与执行状态；
- 日报选择“执行本周计划”前必须先选日报项目，且只能从“当前项目 + 当前工作周”的可用计划中显式选择；
- 切换日报项目或跨周切换日报日期后，失效的 sourcePlanTaskKey 必须被清空，后端也必须拒绝跨项目、跨用户、跨周期 taskKey；
- 计划任务用稳定 taskKey 关联，不依赖周计划物理行 ID；
- 周报首次填写严格使用“上周计划 + 本周已提交日报”；
- 漏填日报的计划默认未完成，并可跳转补填；
- 新增工作可进入周报总结；
- 自动生成不覆盖现有周报或用户手工编辑内容；
- AI 仅生成/优化文字，不评分、不改事实、不写评分缓存；
- 旧日报/周报仍可读、可导出；
- 后端测试、前端构建、导出回归和人工验收全部通过。
