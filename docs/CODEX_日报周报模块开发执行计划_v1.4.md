# 日报 / 周报模块 — Codex 开发执行计划

**版本**：v1.4  
**适用对象**：在现有“数字化管理平台”代码仓中执行开发的 Codex  
**目标**：在不破坏项目生命周期管理既有功能的前提下，完成日报、周报、中心日报 P0 功能；项目日报作为独立 P2 收尾里程碑。  
**Codex 工作空间**：`E:\Digital-transformation`（Windows，具备 `E:` 盘访问权限）。

---

## 0. 输入依据、边界与必须遵守的结论

### 0.1 本计划的权威输入

1. `daily-report-requirement-checklist.md`：日报/周报业务规则、权限、页面、API、导出格式和 P0/P2 优先级。
2. `digital_platform.sql`：当前 MySQL 8.0 数据库结构快照。
3. 三份正式 Excel 样式参考模板，位于开发电脑本地目录 `E:\Digital-transformation\docs`。它们是个人日报、个人周报、中心日报 P0 导出的样式验收基准。

### 0.1.1 已确认的 Excel 模板资产（P0）

> Codex 必须将模板目录配置化；**不可将本机绝对路径硬编码进业务代码或提交真实模板副本到仓库，除非项目已有用于受控模板管理的目录和 Git LFS 约定。**

建议在 `.env.example` 中增加：

```bash
# Codex 与应用均在可访问 E: 盘的 Windows 环境中运行
REPORT_TEMPLATE_ROOT=E:\Digital-transformation\docs
REPORT_EXPORT_ROOT=E:\Digital-transformation\daily_and_weekly_files

# “北京时间”在 IANA 时区库中的有效标识为 Asia/Shanghai；不得使用 Asia/Beijing
APP_TIMEZONE=Asia/Shanghai

# 人工单双休锚点前没有配置时，按双休计算
REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest

# DeepSeek 密钥仅部署到后端运行环境；.env.example 中保持为空
DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

模板映射如下。模板文件中的日期、姓名、中心仅为样式样例，导出时必须按实际报告数据替换，不得把“陈芋如”或样例日期遗留在最终导出文件中。

| 导出/参考类型 | 模板绝对路径 | 输出命名规范 | 说明 |
|---|---|---|---|
| 个人日报 | `E:\Digital-transformation\docs\项目工作日报-陈芋如20260616.xlsx` | `项目工作日报-{姓名}{YYYYMMDD}.xlsx` | P0 必须按此模板复刻 |
| 中心日报 | `E:\Digital-transformation\docs\部门工作日报-研发中心20260618.xlsx` | `部门工作日报-{中心名}{YYYYMMDD}.xlsx` | P0 必须按此模板复刻 |
| 个人周报 | `E:\Digital-transformation\docs\周绩效考核表-研发中心陈芋如20260621.xlsx` | `周绩效考核表-{中心名}{姓名}{YYYYMMDD}.xlsx` | P0 必须按此模板复刻 |
| 周vs日对照表 | `E:\Digital-transformation\docs\周vs日对照表.xlsx` | 不单独导出，作为周报详情内对照表字段参考 | M5 起作为 AI/规则评分的主要输入视图 |

模板处理规则：

1. 模板原件为只读输入；导出前复制或加载模板并另存为目标文件，绝不覆盖模板原件。
2. 先在 M0 记录每个文件的 SHA-256、工作表名称、打印设置、合并区域、列宽、行高、冻结窗格、公式、图片和签字区位置。
3. 优先使用“以模板工作簿为基底写入数据”的方式保留样式；若当前 Excel 库不能无损保留模板的关键特性，须在 M0 选择可满足要求的库或实施方案，并用快照测试证明。
4. 输出的数据行多于模板预留行时，复制相邻明细行的完整样式、边框、公式和行高；合并区域要随区块扩展，不得因简单追加行破坏版式。
5. 字段映射、起止行和动态行扩展策略必须沉淀到 `docs/reports/template-mapping.md`，禁止把单元格坐标散落在控制器中。

**已确认的运行与落盘约束**：

- Codex 在本机 Windows 工作空间 `E:\Digital-transformation` 执行，模板目录可直接访问。
- 开发、测试、生产环境均使用 `REPORT_EXPORT_ROOT=E:\Digital-transformation\daily_and_weekly_files`。
- 因三套环境复用同一输出根目录，**同一类型、同一业务对象、同一日期的重复导出采用“最新一次授权导出原子覆盖”规则**：先写入同目录临时文件，再原子重命名为规范文件名；不得在最终命名规则中追加环境名、随机后缀或版本号。
- 服务账户必须对该目录及其子目录拥有创建、修改和删除临时文件的权限；模板目录仅需读取权限。

### 0.2 已确认的既有数据库事实

- `users` 已有：`department`、`organization_role`、`role`、`is_enabled`、`is_platform_admin`；**不得新建 `roles` 或 `departments` 表**。
- `projects` 已有：`project_code`、`project_name`、`project_manager_user_id`、`participating_departments`、`status`；项目状态为 `normal / risk / paused / delayed / completed`。
- 当前数据库没有 `daily_reports`、`daily_report_items`、`daily_report_plans`、`daily_report_attachments`、`weekly_reports`、`weekly_report_summaries`、`weekly_report_plans`。
- 当前结构中没有 `project_members` 表。因此日报“我负责的项目”P0 先采用**全部非已完成项目 + 项目编号/名称搜索**；不得假设该表存在。

### 0.3 不在本次 P0 范围内

- 不建设项目成员管理能力，也不修改项目生命周期审批、阶段资料、组织管理的业务规则。
- 不新建中心/部门管理页面或 CRUD API；中心代码来自 `users.department`，中文展示使用统一映射。
- 不将日报周报对比单独做成页面；它是周报详情页内的第三个子功能。
- 不在 P0 实现项目日报页面与导出；此项列入 P2，且必须在 P0 稳定后单独执行。

### 0.4 数据和安全红线

1. **绝不执行** `digital_platform.sql` 全量 Dump 作为迁移；其中含 `DROP TABLE` 和示例/测试数据。
2. 所有写操作使用既有登录鉴权上下文中的用户 ID，不得信任前端传入的 `user_id`、`department`、`organization_role`。
3. 迁移必须可重复安全执行（对 `job_title` 使用条件检查，或沿用项目既有迁移机制）；禁止无条件破坏已有数据。
4. 报表导出目录只允许来自绝对路径环境变量 `REPORT_EXPORT_ROOT`；路径组成部分必须清洗，禁止路径穿越。
5. DeepSeek Key 只从服务端环境变量读取，绝不返回给浏览器、绝不写入日志或导出文件。
6. 所有查询均按权限过滤，不能以“前端隐藏菜单”代替后端授权。

---

## 1. Codex 执行协议

### 1.1 执行顺序

严格按里程碑 M0 → M7 执行。每完成一个里程碑，必须先运行该里程碑的测试和人工验收点，再进入下一里程碑。不要一次性大规模改完后再排错。

### 1.2 首次进入仓库的侦察任务（M0，必须先做）

**目的**：将此计划映射到真实代码结构，而不是猜测框架、目录或中间件。

Codex 必须先完成以下检查并把结论写入 `docs/reports/implementation-notes.md`：

- 前端与后端的实际根目录、启动命令、构建命令、测试命令。
- 后端框架（Express / Nest / Koa / 其他）、路由注册、控制器/服务/仓储约定、请求校验方式、错误响应格式。
- 当前身份认证中“当前用户”的获取方式，以及既有 RBAC/权限工具的实现位置。
- 当前 MySQL 连接、迁移执行工具、事务封装、时区配置。
- 已使用的文件上传、对象/本地存储、静态文件下载、定时任务和 Excel 生成库；优先复用已有组件。
- 现有项目查询、项目列表、用户管理、导航/路由守卫的实现位置。
- 确认 Codex 当前工作空间为 `E:\Digital-transformation`，并读取 `REPORT_TEMPLATE_ROOT=E:\Digital-transformation\docs`、`REPORT_EXPORT_ROOT=E:\Digital-transformation\daily_and_weekly_files`；验证模板目录和导出根目录均可访问、导出根目录可创建子目录与临时文件。
- 验证以下三个文件在**Codex 实际运行环境**中存在且可读：
  - `项目工作日报-陈芋如20260616.xlsx`
  - `周绩效考核表-研发中心陈芋如20260621.xlsx`
  - `部门工作日报-研发中心20260618.xlsx`
- 使用脚本生成模板结构清单：文件 SHA-256、工作表名称、有效区域、打印设置、合并区域、列宽、行高、冻结窗格、图片、公式、样式统计与签字区位置。
- 读取当前 Excel 库的读写能力；用一份模板做“读取→不修改另存为→重新检查”的保真试验，确认关键样式/合并/图片不会丢失。

**M0 产出与门禁**：

- 输出上述技术映射、模板真实路径和模板结构清单。
- 新建 `docs/reports/template-mapping.md`：列出日报、周报、中心日报的字段→单元格/区块映射、动态明细行的起止位置与扩展规则。
- 若 Codex 运行环境无法读取 `E:\Digital-transformation\docs`，在 `implementation-notes.md` 标为 **阻塞项：模板路径未挂载到 Codex 执行环境**；数据和导出骨架可继续，但不得进入“模板样式已验收”的完成状态。
- 建立功能分支；保证现有 lint、构建、已有测试通过。

### 1.3 统一业务常量

建立一个前后端共享或各自对应的常量模块，禁止在多处散落字符串：

```ts
export const OrganizationRole = {
  GENERAL_MANAGER: 'general_manager',
  CENTER_MANAGER: 'center_manager',
  EMPLOYEE: 'employee',
  GENERAL_MANAGER_ASSISTANT: 'general_manager_assistant',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export const DepartmentLabels = {
  sales_center: '营销中心',
  rd_center: '研发中心',
  manufacturing_center: '制造中心',
  operations_center: '运营中心',
} as const;

export const ReportStatus = { DRAFT: 'draft', SUBMITTED: 'submitted' } as const;
```

备注：`users.department` 是代码值，不是 `department_id`。所有本模块的新 API 以 `department` 为参数名；不能沿用需求文档中已经过时的 `department_id` 表述。

### 1.4 时间、工作日与自动汇总约定

- 业务时区固定为“北京时间”；代码和配置必须使用有效 IANA 标识 `Asia/Shanghai`。`Asia/Beijing` 不是本项目可使用的时区标识。
- 一律使用 `APP_TIMEZONE=Asia/Shanghai` 计算“今天”“上周一~上周日”、日报补填日期、周报默认周期和中心日报自动汇总的到点时刻；不得依赖 Windows 主机默认时区。
- API 日期使用 `YYYY-MM-DD`；时间字段使用 `HH:mm`；导出文件名使用 `YYYYMMDD`。
- 周报默认周期为“当前业务日期所在周的上一个自然周，周一至周日”。
- **日报填写率分母**不是固定 7 天，而是该考核周期内“应填写日报的工作日数”。当前人工日历规则：
  - 双休周：周一至周五为工作日，分母为 **5**；
  - 单休周：周一至周六为工作日，分母为 **6**；
  - 本期不处理节假日、调休工作日或个别人员排班等逐日例外；这些日期仍按该周已设置的单双休模式计算。
- 填写率的分子为员工在“应工作日期集合”内存在至少一份**已提交**日报的不同日期数；同一天即使关联多个项目也只计 1 天；草稿和非工作日提交均不增加填写率分子。评分公式为 `submittedExpectedWorkdayCount / expectedWorkdayCount × 30`，最高 30 分。
- **本计划 P0/P1 固定使用人工单双休周配置作为唯一判定来源，不接入钉钉考勤，不创建钉钉应用、用户绑定、事件订阅、同步任务或钉钉环境变量。**总经理或平台管理员设置某个以周一为起点的周为 `single_rest` 或 `double_rest` 后，该设置成为一个**单双休交替锚点**：锚点周采用所设模式；向后的第 1 周自动采用相反模式；第 2 周恢复锚点模式；以后每周持续交替。例：将 2026-06-15 所在周设为 `single_rest`，则 2026-06-22 为 `double_rest`，2026-06-29 为 `single_rest`，依此类推。若将锚点设为 `double_rest`，同样按“双休→单休→双休”交替。目标周的实际模式由“不晚于目标周的最近锚点”与相隔周数的奇偶性解析；没有任何历史锚点时，按 `REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest` 独立计算，即默认双休、分母 5 天，不从默认值自动推导交替序列。后续若单独立项接入钉钉，再通过独立变更方案替换该数据来源，不得在本次开发中预埋未使用的钉钉调用。
- 中心日报自动任务按自然日运行。生产环境默认每个中心在 18:00 自动导出；中心负责人可仅调整**本中心**的启用状态和生成时间。自动任务在无已提交日报时仍生成模板格式的“暂无已提交日报”文件，保证每日归档完整。

---

## 2. 目标架构与数据模型

### 2.1 新迁移文件（按仓库现有编号机制调整名称，不得覆盖历史迁移）

建议在实际迁移目录增加以下 **10 个**迁移：

```text
010_alter_users_add_job_title.sql
011_create_daily_reports.sql
012_create_daily_report_items.sql
013_create_daily_report_plans.sql
014_create_daily_report_attachments.sql
015_create_weekly_reports.sql
016_create_weekly_report_summaries.sql
017_create_weekly_report_plans.sql
018_create_report_weekly_rest_mode_anchors.sql
019_create_center_daily_report_schedules.sql
```

若当前项目已经存在 `010` 之后的迁移，保留本计划的逻辑顺序，改用下一个可用序号。

### 2.2 迁移 010：补充岗位字段

```sql
ALTER TABLE users
  ADD COLUMN job_title VARCHAR(100) NULL DEFAULT NULL COMMENT '岗位名称';
```

实现时要保证迁移工具不会在字段已存在时失败。不得更改 `department`、`organization_role`、`role` 的含义和历史数据。

### 2.3 日报表

#### `daily_reports`

```sql
CREATE TABLE daily_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  report_date DATE NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_reports_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_reports_user_date_project (user_id, report_date, project_id),
  KEY idx_daily_reports_date_status_user (report_date, status, user_id),
  KEY idx_daily_reports_project_date_status (project_id, report_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `daily_report_items`（今日工作完成情况）

```sql
CREATE TABLE daily_report_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  work_content TEXT NOT NULL,
  completion_progress VARCHAR(100) NOT NULL,
  completed_at TIME NOT NULL,
  responsible_person VARCHAR(128) NULL,
  deviation_and_corrective_action TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_items_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_items_order (daily_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `daily_report_plans`（明日工作计划）

```sql
CREATE TABLE daily_report_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  planned_work_content TEXT NULL,
  responsible_person VARCHAR(128) NULL,
  planned_complete_at TIME NULL,
  collaborating_center VARCHAR(128) NULL,
  collaboration_item TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_plans_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_plans_order (daily_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `daily_report_attachments`（进展照片）

```sql
CREATE TABLE daily_report_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id BIGINT UNSIGNED NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_report_attachments_report
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_daily_report_attachments_uploader
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_daily_report_attachments_storage_key (storage_key),
  KEY idx_daily_report_attachments_report (daily_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

附件限制：只允许图片 MIME 类型；单文件最大 50 MB；真实文件类型需由服务端检测或通过现有上传组件校验，不只相信浏览器扩展名。

### 2.4 周报表

#### `weekly_reports`

```sql
CREATE TABLE weekly_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  ai_score JSON NULL COMMENT 'AI或规则评分结果缓存',
  ai_evaluated_at DATETIME NULL,
  ai_evaluation_source ENUM('ai','fallback_rule') NULL,
  ai_evaluation_error VARCHAR(1000) NULL,
  final_score DECIMAL(5,2) NULL COMMENT '考核人最终评分，以人工填写为准',
  final_grade VARCHAR(20) NULL COMMENT '按最终评分或人工口径确认的等级',
  final_comment TEXT NULL COMMENT '考核人最终评语',
  final_reviewed_by_user_id BIGINT UNSIGNED NULL,
  final_reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_weekly_reports_final_reviewer
    FOREIGN KEY (final_reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_reports_user_week (user_id, week_start, week_end),
  KEY idx_weekly_reports_week_status_user (week_start, status, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> `ai_evaluated_at`、`ai_evaluation_source`、`ai_evaluation_error` 为工程可观测性字段；它们不改变需求中的 `ai_score` 作为评分结果缓存的核心约束。如团队明确要求“严格仅 7 张业务表 + 最小字段”，这三个字段可改为仅保留 `ai_score`，但错误日志仍必须记录在应用日志中。
> `final_score`、`final_grade`、`final_comment`、`final_reviewed_by_user_id`、`final_reviewed_at` 是 M5 新增的人工最终评分字段。AI 或规则评分只作为参考，不得覆盖最终评分；最终进入周报考核结果和列表展示的分数以考核人填写的 `final_score` 为准。已执行到 021 的环境需新增后续迁移（建议 022）补齐这些字段，不得改写历史迁移。

#### `weekly_report_summaries`（工作总结）

```sql
CREATE TABLE weekly_report_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  work_task VARCHAR(500) NOT NULL,
  work_target TEXT NOT NULL,
  planned_date DATE NOT NULL,
  completion_status ENUM('completed','in_progress','not_completed','added') NOT NULL,
  completion_description VARCHAR(500) NOT NULL,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_summaries_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_report_summaries_order (weekly_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

说明：需求将“完成情况说明”描述为“下拉/文本”。因此同时保存标准枚举 `completion_status` 和用户的必填文本 `completion_description`，既满足统计也保留自由说明。

#### `weekly_report_plans`（下周工作计划）

```sql
CREATE TABLE weekly_report_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekly_report_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  work_task VARCHAR(500) NOT NULL,
  work_target TEXT NOT NULL,
  planned_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_report_plans_report
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  UNIQUE KEY uk_weekly_report_plans_order (weekly_report_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.5 单双休交替锚点与中心自动生成配置

> 这是由“人工单双休决定日报填写率、中心负责人自设生成时间”新增的两张**配置表**，不属于角色、部门或项目成员表；仍不得新建 `roles`、`departments`、`project_members`。钉钉考勤不属于本次计划范围。

#### `report_weekly_rest_mode_anchors`（公司单双休交替锚点）

```sql
CREATE TABLE report_weekly_rest_mode_anchors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_start DATE NOT NULL COMMENT '锚点周周一',
  rest_mode ENUM('single_rest','double_rest') NOT NULL COMMENT '锚点周休息模式',
  note VARCHAR(500) NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_weekly_rest_mode_anchors_updater
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_report_weekly_rest_mode_anchors_week_start (week_start),
  KEY idx_report_weekly_rest_mode_anchors_week_start (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

锚点解析与维护规则：

1. P0 只支持“按周设置单双休交替锚点”，不提供逐日调休、法定节假日、排班或钉钉考勤维护功能。管理端传入 `week_start`（必须为周一）与 `rest_mode`：
   - `double_rest`：锚点周为双休，周一~周五为应填日报日，分母为 5；
   - `single_rest`：锚点周为单休，周一~周六为应填日报日，分母为 6。
2. 总经理和平台管理员可设置或更新任意周的锚点；中心负责人、员工、总经理助理无权修改，以保证全公司使用同一考评口径。
3. **解析算法（唯一权威实现）**：针对目标 `weekStart`，查询 `week_start <= weekStart` 的最近一条锚点。设该锚点为 `anchorWeekStart`、`anchorRestMode`，`weekOffset = weeksBetween(anchorWeekStart, weekStart)`：
   - `weekOffset` 为偶数：目标周模式 = `anchorRestMode`；
   - `weekOffset` 为奇数：目标周模式 = `opposite(anchorRestMode)`；
   - 若不存在锚点：目标周采用 `REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest`，来源为 `default_double_rest`，并且默认值**不生成自动交替序列**。
4. 锚点的影响范围从其 `week_start` 开始，持续到下一条更晚锚点的前一周。后设置或更新的锚点覆盖其生效周及之后的交替模式，直至下一锚点；锚点不可通过“删除”改回默认，以免历史评分口径不可追溯。需要修正时，直接更新该周锚点模式或在更晚周新增锚点。
5. 设置或修改锚点后，服务端必须找出受影响区间 `[weekStart, nextAnchorWeekStart)`；对该区间内所有已存在的 `weekly_reports` 清空 `ai_score`（或设置等价的待重新评估标记），并在 API 响应中返回受影响周范围与失效报告数量。不得继续展示旧评分。
6. 周报评估结果必须保存和展示：`resolvedRestMode`、`restModeAnchorWeekStart`（没有锚点时为 `null`）、`workdaySource`。有锚点时 `workdaySource` 固定为 `alternating_manual_rest_mode`；无锚点时为 `default_double_rest`。
7. 本期已知限制：国家法定节假日、调休补班和个别人员排班不单独修正；若未来需要纳入，作为后续“工作日例外/钉钉考勤集成”独立需求评估。

#### `center_daily_report_schedules`（中心日报自动生成计划）

```sql
CREATE TABLE center_daily_report_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(128) NOT NULL COMMENT '中心代码，如 rd_center',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  run_at TIME NOT NULL DEFAULT '18:00:00',
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_center_daily_report_schedules_updater
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  UNIQUE KEY uk_center_daily_report_schedules_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

迁移后为 `sales_center`、`rd_center`、`manufacturing_center`、`operations_center` 创建默认记录：`is_enabled=1`、`run_at='18:00:00'`。中心负责人只能更新本人 `department` 的记录；平台管理员可管理任意合法中心；时区统一读取 `APP_TIMEZONE`，不得逐中心自定义时区。

### 2.6 写入策略与一致性

- 创建或更新日报/周报主表、明细、计划时，使用单一数据库事务。
- 采用“删除该报告旧明细并批量重建”的方式保存动态表格行，或采用明确差量更新；无论选择哪种，必须保证 `sort_order` 连续、无重复。
- 日报保存：至少有一条“今日工作完成情况”；草稿允许计划为空。提交时，今日工作项的 `work_content`、`completion_progress`、`completed_at` 均必填。
- 周报保存：草稿可保留未完成行；提交时，总结和计划两组均至少一行，且每一项的所有业务字段均必填。
- 修改已提交周报后必须清空 `ai_score` 与相关评估元数据；前端提示“周报内容已变更，请重新评估”。
- 日报和周报的删除仅允许草稿删除；若产品方要求已提交记录也可删除，必须增加审计日志且先确认后再实现。默认采取更安全的草稿限定。

---

## 3. 权限与范围规则（后端必须实现）

| 能力 | employee | center_manager | general_manager | general_manager_assistant | system_admin / `is_platform_admin=1` |
|---|---:|---:|---:|---:|---:|
| 写个人日报 | 本人 | 否 | 否 | 否 | 否 |
| 看/导出个人日报 | 本人 | 否 | 否 | 否 | 否 |
| 写、看、导出自己的周报 | 是 | 是 | 否 | 否 | 否 |
| 看自己的周报历史 | 本人 | 本人 | 否 | 否 | 否 |
| 看周报 AI/规则参考结果 | 否 | 本中心员工，不含本人 | 否，中心负责人不写日报 | 否，仅查看中心负责人周报内容 | 否 |
| 触发周报 AI/规则参考评估 | 否 | 本中心员工，不含本人 | 否，中心负责人不写日报 | 否 | 否 |
| 填写周报最终评分 | 否 | 本中心员工，不含本人 | 各中心负责人 | 否，仅查看 | 否 |
| 看/导出中心日报 | 否 | 仅本中心 | 全部 | 全部 | 全部 |
| 配置本中心日报自动生成时间 | 否 | 仅本中心 | 否 | 否 | 全部 |
| 维护单双休交替锚点 | 否 | 否 | 全部 | 否 | 全部 |
| 看/导出项目日报（P2） | 否 | 全部 | 全部 | 全部 | 全部 |

实施细则：

- `is_platform_admin=1` 可作为平台管理员的等价授权条件；保留 `organization_role=system_admin` 兼容。
- 中心负责人访问中心日报或对比总览时，后端从当前用户 `department` 推导范围；传入其他中心代码时返回 403，而不是悄悄返回空数据。
- 普通员工完全不可见 AI 对比考评入口、AI/规则参考分与最终评分录入入口；员工只能填写/导出自己的周报，并在周报列表查看自己的历史周报。
- 中心负责人可填写/导出自己的周报，但不用写日报、不能被周vs日对照或 AI/规则参考评分；其个人周报由总经理仅查看周报内容后手动填写最终评分并点击确认，总经理助理只能查看。
- 中心负责人只能查看、详情打开、触发参考评分、填写最终评分其本人 `department` 下 employee 的周报；不得访问其他中心，也不得评估 center_manager 自己。
- 总经理本阶段只查看各中心负责人的周报内容并手动填写最终评分；总经理助理本阶段只查看各中心负责人的周报内容和最终评分，不可填写最终评分。两者均不查看普通员工周报全量列表，也不填写个人周报。
- 总经理考核中心负责人周报时，不查询日报、不生成周vs日对照表、不触发 AI/规则参考评分；最终分数完全以总经理人工输入并保存的 `final_score` 为准。
- 系统管理员本阶段不作为业务考核角色，不在前端展示周报考评入口；如后续需要排障型只读能力，必须另行确认。
- 总经理、总经理助理、平台管理员不允许冒充员工或中心负责人填写日报/周报。
- 用户禁用 (`is_enabled=0`) 时沿用现有全局认证规则；若全局规则未拦截，本模块必须拒绝其新建、修改、提交操作。

---

## 4. API 合同与实现任务

所有响应沿用项目既有响应包装和错误码。下面是业务语义，非强制要求改变已有 URL 风格。

### 4.1 日报 API（M2）

1. `GET /api/projects/my-active?q=&limit=`
   - 仅 employee 可调用。
   - P0 查询：`projects.status <> 'completed'`，按 `project_code` / `project_name` 模糊检索，返回最少 `id, projectCode, projectName, status`。
   - 不得声称“只返回本人项目”；响应可给出 `selectionMode: 'all_active_projects_fallback'`，方便未来替换为成员表逻辑。
   - 若未来新增 `project_members`，只替换服务层查询，不改前端和 API 结构。

2. `POST /api/daily-reports`
   - 创建或按 `(currentUserId, reportDate, projectId)` 返回冲突提示。
   - 支持 `status: draft | submitted`。
   - 服务端校验项目存在、未完成，且当前用户角色为 employee。

3. `GET /api/daily-reports?dateFrom=&dateTo=&status=&page=&pageSize=`
   - 只查询当前 employee 本人。
   - 返回项目名称、编号、报告日期、状态、条目数量、创建/更新时间。

4. `GET /api/daily-reports/:id`、`PUT /api/daily-reports/:id`、`DELETE /api/daily-reports/:id`
   - 仅报告创建人且角色为 employee。
   - `PUT` 支持草稿和正式提交；提交校验见 2.6。
   - `DELETE` 默认只允许草稿；已提交返回明确错误信息。

5. 附件 API（如果现有项目采用独立上传端点）
   - `POST /api/daily-reports/:id/attachments`
   - `DELETE /api/daily-reports/:id/attachments/:attachmentId`
   - 仅报告所有者，限制图片、50 MB、唯一安全 storage key。

6. `POST /api/daily-reports/:id/export`
   - 仅报告所有者。
   - 成功返回下载信息（文件名、受控下载 URL 或流式下载），不得返回服务器物理绝对路径。

### 4.2 周报 API（M4）

1. `POST /api/weekly-reports`、`GET /api/weekly-reports`、`GET /api/weekly-reports/:id`、`PUT /api/weekly-reports/:id`
   - 写入权限：employee、center_manager；默认只操作本人。
   - 相同 `(user_id, week_start, week_end)` 不可重复创建；前端首次进入可先 GET 当前/上周记录，存在则编辑。
   - 后端验证 `week_start` 是周一且 `week_end = week_start + 6 天`；禁止伪造任意区间。

2. `POST /api/weekly-reports/:id/export`
   - 仅所有者可导出个人周报。

3. `GET /api/weekly-reports/:id/comparison-table`
   - 返回周报详情内“周vs日对照表”数据，字段先按 `周vs日对照表.xlsx` 的一般字段设计：
     `date`、`weekday`、`weeklyTask`、`weeklySummaryText`、`dailyProjectName`、`dailyWorkContent`、`dailyCompletionProgress`、`dailyCompletedAt`、`weeklyCompletedDate`、`matchStatus`、`matchReason`。
   - 对照口径固定为：周报“本周工作总结”对比同一用户、同一周期内、`status=submitted` 的日报“今日工作完成情况”；不得纳入周报工作计划或日报明日计划。
   - 一天内多条周报总结或多条日报完成项均展开为多行，后端可按日期、项目、关键词匹配给出 `matchStatus` 初判。

4. `POST /api/weekly-reports/:id/evaluate`
   - 仅被授权考核人可触发；普通员工不可触发、不可见。
   - center_manager 仅能评估本中心 employee 的已提交周报，不含自己的周报。
   - general_manager 与 general_manager_assistant 不触发中心负责人周报 AI/规则评估，因为中心负责人不用写日报，没有周vs日对照评分输入。
   - AI/规则评分输入以 `comparison-table` 的规范化行数据为主，仍可附带周报总结与日报完成项原文作为解释上下文。
   - 允许 `force=true` 重新评估；普通调用在已有有效 `ai_score` 时直接返回缓存；AI/规则评分只能作为参考评分，不得写入最终评分字段。

5. `PUT /api/weekly-reports/:id/final-review`
   - 仅被授权考核人可写入最终评分：center_manager 可写本中心 employee 周报，general_manager 可写 center_manager 周报；general_manager_assistant 只读不可写。
   - 请求体：`{ finalScore: number, finalGrade?: string, finalComment?: string }`。
   - 最终评分保存到 `weekly_reports.final_score` 等人工评分字段；列表、详情、总览优先展示最终评分。员工周报可同时展示 AI/规则参考评分；中心负责人周报不展示 AI/规则参考评分区。

6. `GET /api/weekly-reports/comparison-overview?weekStart=&department=`
   - center_manager 仅能查询本人中心 employee 周报，不含本人；general_manager、general_manager_assistant 仅能查询 center_manager 周报，其中 general_manager_assistant 只读；system_admin 本阶段不展示业务考评入口。
   - 返回用户姓名、中心、周报状态、AI/规则参考分（仅 employee 周报可能存在）、最终评分、最终评语、评分人、评分时间；不返回 DeepSeek 原始提示词或密钥。

### 4.3 中心日报 API（M6）

1. `GET /api/center-daily-reports?date=YYYY-MM-DD&department=rd_center`
   - 只聚合已提交日报。
   - 当前中心负责人只能访问自身 `department`；GM/总助/管理员可访问任意合法中心。
   - 返回今日完成、明日计划，并按员工分组；每个工作项应包含项目编号、项目名称、工作内容、完成进度、责任人、偏差分析和纠偏措施。
   - 当日无数据返回 200 + 明确的空结果，不应 404。

2. `POST /api/center-daily-reports/export`
   - 请求体或 query 使用 `date` + `department`；权限同上。
   - 使用同一聚合服务，避免“页面数据”和“Excel 数据”不一致。

3. `GET /api/center-daily-report-schedules/:department`
   - center_manager 仅可读取本人中心；platform admin 可读取任意合法中心。
   - 返回 `department, isEnabled, runAt, timezone`，其中 `timezone` 固定来自 `APP_TIMEZONE`。

4. `PUT /api/center-daily-report-schedules/:department`
   - center_manager 仅可更新本人中心；platform admin 可更新任意合法中心。
   - 请求体：`{ isEnabled: boolean, runAt: "HH:mm" }`。
   - 不允许前端提交或覆盖时区；保存后下一次轮询立即生效。

5. `GET /api/report-weekly-rest-mode-anchors?weekStart=YYYY-MM-DD&previewWeeks=8`
   - general_manager、platform admin 可读取；其他角色不可访问。
   - 返回请求周的已解析模式、最近生效锚点、工作日集合、`workdaySource`，以及从请求周开始的交替预览（默认 8 周，服务端限制最大 26 周）。

6. `PUT /api/report-weekly-rest-mode-anchors`
   - general_manager、platform admin 可设置或更新某周的单双休交替锚点：
     `{ weekStart: "YYYY-MM-DD", restMode: "single_rest" | "double_rest", note?: "..." }`。
   - 服务端不得展开写入 7 条每日记录；必须按“最近锚点 + 周偏移奇偶性”实时解析。
   - 成功后返回 `affectedFromWeekStart`、`affectedUntilWeekStartExclusive`、`invalidatedWeeklyReportCount` 和更新后的交替预览；P0 不提供逐日覆盖或锚点删除接口。

### 4.4 P2 项目日报 API（M7，最后执行）

- `GET /api/project-daily-reports?date=&projectId=`
- `POST /api/project-daily-reports/export`
- 仅聚合已提交日报，按项目及员工展示；所有管理角色可见。
- 模板格式尚未确认：先实现数据 API 与基础导出服务，最终 Excel 样式必须在得到正式模板后验收。

---

## 5. 业务服务设计

### 5.1 DailyReportService

职责：日期校验、项目可选性、报告所有权、动态行保存、附件生命周期、导出 DTO。

提交校验：

```text
- reportDate、projectId、status 必填
- items.length >= 1
- 每条 item：workContent、completionProgress、completedAt 必填
- completedAt 为有效 HH:mm 时间
- plans 可为空；有值时仅按字段类型校验
- project.status != completed
```

### 5.2 WeeklyReportService

职责：上周周期计算、唯一性、全字段提交校验、修改后评分失效、导出 DTO。

提交校验：

```text
- summaries.length >= 1 且 plans.length >= 1
- summary 每行：workTask、workTarget、plannedDate、completionStatus、completionDescription、completedDate 必填
- plan 每行：workTask、workTarget、plannedDate 必填
- 每个日期字段合法
```

### 5.3 WeeklyEvaluationService

职责：构造标准化评分输入、AI 调用、JSON 验证、规则评分降级、评分缓存。

**输入归一化**：

```json
{
  "employee": { "id": 123, "name": "姓名", "department": "rd_center" },
  "period": { "start": "2026-06-15", "end": "2026-06-21" },
  "weeklySummaries": [
    {
      "id": 1,
      "workTask": "项目名称/任务",
      "workTarget": "目标",
      "completionStatus": "completed",
      "completionDescription": "完成说明",
      "completedDate": "2026-06-18"
    }
  ],
  "comparisonRows": [
    {
      "date": "2026-06-16",
      "weekday": "周二",
      "weeklyTask": "KRF26033燃烧窑温度监测项目",
      "weeklySummaryText": "估计上位机成本，完成成本估算表",
      "dailyProjectName": "燃烧窑温度监测",
      "dailyWorkContent": "完成上位机成本估算表并同步项目组",
      "dailyCompletionProgress": "已完成",
      "dailyCompletedAt": "16:30",
      "weeklyCompletedDate": "2026-06-16",
      "matchStatus": "matched",
      "matchReason": "项目名称与工作内容关键词均命中"
    }
  ],
  "dailyRecords": [
    {
      "reportDate": "2026-06-16",
      "projectCode": "KRF26033",
      "projectName": "燃烧窑温度监测",
      "workContent": "...",
      "completionProgress": "已完成",
      "completedAt": "16:30"
    }
  ],
  "submittedDailyReportDates": ["2026-06-16", "2026-06-17"],
  "expectedWorkDates": ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19"],
  "workdaySource": "alternating_manual_rest_mode",
  "resolvedRestMode": "double_rest",
  "restModeAnchorWeekStart": "2026-06-15"
}
```

**DeepSeek 调用要求**：

- 从 `DEEPSEEK_API_KEY`、`DEEPSEEK_API_BASE` 读取配置；模型默认 `deepseek-chat`，可通过 `DEEPSEEK_MODEL` 覆盖。
- 请求超时 30 秒；禁止无限重试。最多 1 次可控重试或按项目既有 HTTP 重试策略。
- `temperature=0.3`，要求 JSON 对象输出；把返回值 JSON parse 后再使用。
- 以运行时 schema 校验返回对象：`totalScore 0..100`、`grade A/B/C/D`、三个维度分数分别不超 40/30/30、`itemAnalysis` 是数组、评语为字符串。
- 任一 AI 网络/解析/schema 失败，记录不含敏感信息的失败原因，执行规则评分，并返回 `evaluationSource: "fallback_rule"`。
- AI 的主要判断输入为 `comparisonRows`，即“周vs日对照表”规范化行；`weeklySummaries` 与 `dailyRecords` 只作为解释和追溯上下文，不得把周报工作计划或日报明日计划传入评分。
- AI/规则输出均为参考评分，保存到 `ai_score`；最终考核结果必须由授权考核人在页面输入并保存到人工最终评分字段。

**规则评分降级定义（必须可测试、可重复）**：

1. 填写率：先取得考核周期的 `expectedWorkDates`；统计其中存在已提交日报的不同日期数。`submittedExpectedWorkdayCount / expectedWorkdayCount * 30`，四舍五入为整数，最高 30 分。同一天多项目日报只计 1 天；草稿和非工作日不计分。双休周通常分母为 5，单休周通常分母为 6。
2. 先按单双休交替锚点解析考核周模式：有最近锚点时，以锚点周与目标周的相隔周数奇偶性决定 `single_rest` 或 `double_rest`，并写入 `workdaySource: "alternating_manual_rest_mode"`、`resolvedRestMode` 和 `restModeAnchorWeekStart`；不存在任何历史锚点时，按 `REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest` 临时推导 5 个应工作日，并写入 `workdaySource: "default_double_rest"`、`resolvedRestMode: "double_rest"`、`restModeAnchorWeekStart: null`。本期不产生钉钉来源。
3. 完成度：优先使用 `comparisonRows.dailyCompletionProgress`，经大小写/空格归一化后包含“已完成”或等价约定值的条目数 / 有日报实际工作内容的对照行数 × 30；无日报实际工作内容时为 0。
4. 吻合度：以 `comparisonRows` 为主。每行根据 `weeklyTask`、`weeklySummaryText` 与 `dailyProjectName`、`dailyWorkContent` 的项目名和有效关键词交集生成 `matchStatus`；`matched / 有周报总结内容的对照行数 × 40`。无周报总结内容时为 0。
5. 总分 = 三项之和，等级映射：90+ A、75~89 B、60~74 C、0~59 D。
6. 结果 JSON 结构必须与 AI 正常结果结构一致，并在顶层有 `evaluationSource`、`evaluatedAt`、`expectedWorkdayCount`、`submittedExpectedWorkdayCount`、`workdaySource`、`resolvedRestMode`、`restModeAnchorWeekStart`。

> 注意：规则降级不应伪装成 AI 结果。前端必须明确展示“AI评分”或“规则评分（AI暂不可用）”。

### 5.4 CenterDailyReportService

- 输入：`date`、`department`。
- 查询：`daily_reports.status='submitted'` + `daily_reports.report_date=?` + `users.department=?`，关联用户、项目、items、plans。
- 输出按 `users.display_name` 分组；组内保持 `daily_reports` 和 `sort_order` 的稳定排序。
- 定时任务只调用该服务和导出服务，不写另一套聚合 SQL。
- 由每分钟轮询任务读取 `center_daily_report_schedules` 中到点且启用的中心；同一“中心 + 业务日期”使用数据库锁或等价分布式锁防重，防止多实例重复导出。
- 计划生成与手动导出都必须采用“临时文件 → 原子重命名”的方式写入 `REPORT_EXPORT_ROOT`，确保重复生成不产生半写入的 xlsx。

---

## 6. Excel 导出实现方案

### 6.1 基础约束

- 优先使用仓库已有 Excel 库；未使用时采用 `exceljs`。
- 导出必须通过服务端生成并保存至 `REPORT_EXPORT_ROOT`。环境示例：

```bash
REPORT_TEMPLATE_ROOT=E:\Digital-transformation\docs
REPORT_EXPORT_ROOT=E:\Digital-transformation\daily_and_weekly_files
APP_TIMEZONE=Asia/Shanghai
REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest

# 仅写在未提交的后端 .env 或部署环境的机密变量中
DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 生产默认启用；开发/测试可显式设为 false，避免产生测试归档
CENTER_DAILY_SCHEDULER_ENABLED=true
CENTER_DAILY_SCHEDULER_POLL_CRON=* * * * *
```

- 启动时校验 `REPORT_EXPORT_ROOT` 是绝对路径，必要时创建子目录；不将其直接暴露为静态公网目录。下载必须走鉴权端点或项目已有受控文件访问机制。
- 文件名中项目编号、项目名称、中心名、姓名只可保留安全字符；非法字符替换为 `_`，但页面展示与 Excel 内容保持原值。

### 6.2 文件路径和名称（必须严格实现）

```text
{REPORT_EXPORT_ROOT}/daily/{YYYY}/{MM}/项目工作日报-{姓名}{YYYYMMDD}.xlsx
{REPORT_EXPORT_ROOT}/weekly/{YYYY}/{MM}/周绩效考核表-{中心名}{姓名}{YYYYMMDD}.xlsx
{REPORT_EXPORT_ROOT}/department/{YYYY}/{MM}/部门工作日报-{中心名}{YYYYMMDD}.xlsx
{REPORT_EXPORT_ROOT}/project/{YYYY}/{MM}/{项目编号}-{项目名称}{YYYYMMDD}.xlsx   # P2
```

### 6.3 导出器分层

```text
ReportExportService
├── DailyReportWorkbookBuilder
├── WeeklyReportWorkbookBuilder
├── CenterDailyReportWorkbookBuilder
└── ProjectDailyReportWorkbookBuilder (P2)
```

每个 Builder 接收已完成权限过滤和数据聚合的 DTO，不直接执行 SQL。每个 Builder 均要有以下自动测试：文件可打开、工作表名正确、关键合并单元格正确、标题/表头/数据行内容正确、命名和存储目录正确。

### 6.4 模板驱动导出的实现与验收

三份 P0 模板已确认在开发电脑路径 `E:\Digital-transformation\docs`。实现顺序如下：

1. M0 使用模板检查脚本建立字段/单元格映射，明确标题区、表头、动态明细区、签字区、图片区和打印区域。
2. 导出器从相应模板创建工作簿副本，写入实际数据，保留模板的样式、合并单元格、列宽、行高、边框、对齐、字体、填充、打印设置和签字区布局。
3. 将模板中的样例姓名、中心、项目、日期、明细内容全部替换或清空，避免输出遗留示例数据。
4. 对动态行复制模板行的完整格式；数据少于预留明细行时清空多余示例值但保留版式；数据为零时保持模板结构并按需求显示空态文字。
5. 为三类导出分别建立模板快照测试：逐项校验合并区域、列宽、关键行高、字体、边框、对齐、填充、冻结窗格、打印设置、签字区与关键单元格值。针对图片或复杂绘图等库不支持的对象，M0 必须记录并选择能保留的实现方案。

若 Codex 实际运行环境无法访问以上目录，仍可开发业务功能和导出服务，但将“模板像素级复刻验收”标为外部阻塞项；不能将其标记为 P0 完成。

---

## 7. 前端实施计划

使用现有前端组件库、请求封装、路由格式和状态管理；不要平行引入第二套 UI 框架。

### M3：日报页面

1. `#/daily-report`
   - employee 专属；非 employee 从路由层和 API 层双重拒绝。
   - 默认业务当天；允许选择过去日期并显示“补填”标签。
   - 项目异步搜索：输入项目编号或名称关键字，调用 `GET /api/projects/my-active?q=`。
   - 今日完成、明日计划均可增删行；今日完成最少一行。今日完成的完成时间控件必填。
   - 支持暂存草稿、正式提交、保存后继续编辑、附件上传预览/删除。
   - 导出按钮仅在报告已存在时显示。

2. `#/daily-reports`
   - 仅显示当前用户日报；支持日期范围与状态筛选；打开编辑、删除草稿、导出。

### M5：周报页面

1. `#/weekly-report`
   - employee + center_manager 专属。
   - 默认展示上一自然周；如该周期已存在报告，加载后允许编辑。
   - 普通员工只显示两个明确区域或 Tab：
     1. 标准填写（工作总结、工作计划）
     2. 标准表格导出
   - 普通员工完全不显示“AI 对比考评”、参考评分、最终评分或考评总览入口。
   - 中心负责人在自己的 `#/weekly-report` 只填写和导出个人周报，不显示自己的 AI 对比考评；其个人周报由总经理评分，总经理助理只读查看。
   - 工作总结、计划可分别增删行，最少一行。
   - 提交时对所有必填字段逐行高亮；不可只弹一个笼统错误。

2. `#/weekly-reports`
   - employee：仅显示本人历史周报、周期、状态、导出入口和“详情/编辑”按钮；草稿/已提交均进入同一个 `#/weekly-report/:id`，员工可继续编辑自己的周报。
   - center_manager：显示本人历史周报，同时显示本中心 employee 周报考评列表；列表中必须有“详情”按钮进入员工周报只读详情，可触发 AI/规则参考评分并填写最终评分，但不可编辑员工周报。
   - general_manager：仅显示 center_manager 周报考评列表；可进入中心负责人周报只读详情，查看周报内容并手动填写最终评分；不显示周vs日对照表、不显示 AI/规则参考评分区、不显示普通员工周报全量列表。
   - general_manager_assistant：仅显示 center_manager 周报只读列表和详情；可查看中心负责人周报内容和最终评分，但不可触发评估、不可填写最终评分；不显示周vs日对照表、不显示 AI/规则参考评分区、不显示普通员工周报全量列表。
   - system_admin：本阶段不展示周报业务考评页面。
   - 个人历史列表和考评列表均应显示最终评分；无最终评分时显示“待最终评分”，AI/规则评分仅作为参考标签。

3. 周报只读考评详情
   - 当考核对象是 employee 时，详情顶部先展示“周vs日对照表”，字段按 `周vs日对照表.xlsx` 一般字段设计：日期、星期、周报的任务、周报工作总结、日报的任务/项目名称、日报实际工作内容、完成进度、实际完成时间、周报完成时间、匹配状态/说明。
   - 当考核对象是 employee 时，对照表下方展示 AI/规则参考评分区：未评估、评分中、AI评分完成、规则评分完成、请求失败五种清晰状态；展示参考总分、等级、三维度、逐条分析和综合评语；支持授权考核人重新评估。
   - 当考核对象是 center_manager 时，不展示周vs日对照表和 AI/规则参考评分区；详情只展示该中心负责人的周报内容、导出入口（如有权限）和最终评分信息。
   - 详情底部按权限提供最终评分输入框、最终等级、最终评语和保存按钮；最终保存分数以考核人输入为准。总经理助理访问中心负责人周报时只能查看这些字段，不显示保存按钮。

### M6：中心日报页面

`#/center-daily-report`

- GM/中心负责人/总经理助理/平台管理员可见。
- 日期默认当天；中心负责人固定/仅可选择本人中心，其他获授权角色可切换合法中心。
- 按员工折叠分组展示今日完成和明日计划；无数据时显示“暂无已提交日报”。
- 一键导出调用中心日报导出 API。

### M7：项目日报页面（P2）

`#/project-daily-report`：仅在项目日报 API、正式模板和 P0 回归通过后实现。

### 导航与路由守卫

按 `organization_role` 和 `is_platform_admin` 显示：

```text
employee: 我的日报、我的周报、周报列表、项目总览
center_manager: 我的周报、周报列表、中心日报、项目日报(P2)、项目总览
general_manager: 周报列表、中心日报、项目日报(P2)、项目总览
general_manager_assistant: 周报列表、中心日报、项目日报(P2)、项目总览
system_admin / is_platform_admin: 用户管理、中心日报、项目日报(P2)、项目总览
```

不要为本模块增加“中心管理”菜单。

---

## 8. 分阶段工作分解与验收门禁

### M0 — 仓库侦察与基线

**改动**：仅文档、必要的测试/构建修复；不做业务功能。  
**验收**：见 1.2；现有构建、lint、测试成功。

### M1 — 数据库、共享常量、授权基础

**任务**：迁移 010~019；数据访问模型；角色和中心常量；单双休交替锚点、中心自动生成计划、统一权限守卫；环境变量样例。  
**验收**：

- 空库迁移成功；已迁移库重复执行按现有机制安全处理。
- 外键、唯一索引、级联删除行为通过集成测试。
- 任一非 employee 不能创建日报；GM/总助不能创建周报；center_manager 不能访问他中心的中心日报。
- 不创建 `roles`、`departments`、`project_members`。

### M2 — 日报后端

**任务**：日报 CRUD、项目搜索、附件、导出 DTO 和服务端权限。  
**验收**：

- 同一员工、同一天、同一项目重复创建被拒绝；不同项目允许多份日报。
- 提交日报缺少完成时间/完成进度/工作内容时被拒绝。
- 草稿不被中心日报聚合；正式提交才会被聚合。
- 员工 A 不能读取、修改、删除、导出员工 B 日报。
- `completed` 项目不可新建日报。

### M3 — 日报前端与日报 Excel

**任务**：日报填写页、列表页、动态行、项目搜索、补填标识、附件 UI、导出。  
**验收**：

- e2e：employee 登录 → 新建两份同日不同项目日报 → 保存草稿 → 提交其中一份 → 列表可见并能导出。
- 字段和按钮与 4.2~4.4 完整对应。
- 导出的 xlsx 能被库重新读取，且文件路径、名称准确。
- 对个人日报模板完成快照测试；若执行环境未挂载模板目录，保留“模板路径未挂载”阻塞项。

### M4 — 周报后端、AI 评分与周报 Excel

**任务**：周报 CRUD、上周默认周期、提交校验、单双休交替锚点解析接入、周vs日对照表 DTO、DeepSeek 适配器、规则降级、参考评分缓存、最终人工评分字段、对比总览、Excel。  
**验收**：

- 相同用户相同周只能有一份周报。
- 周报提交时任一总结/计划必填字段缺失均被拒绝。
- AI 正常响应、超时、非 JSON、schema 不合法四类测试均覆盖；后三类返回规则评分且不报 500。
- 锚点设为单休后下一周自动双休、下下周自动单休；锚点设为双休后下一周自动单休；无锚点周默认双休 5 天；在新的锚点前，修改锚点导致受影响区间评分失效；同日多项目只计 1 天、草稿不计分的填写率测试均覆盖。
- 修改周报后 AI 缓存失效；重新评估可覆盖旧结果。
- 评分输入以周vs日对照表为主，且不包含“周报工作计划”和“日报明日计划”。
- AI/规则评分只保存为参考评分；最终评分字段只能由授权考核人填写。
- 导出文件名与路径严格正确；有签字区；周报模板快照测试通过。

### M5 — 周报前端与考评展示

**任务**：周报填写、列表、导出、员工无考评入口、中心负责人/总经理/总助只读详情、周vs日对照表、AI/规则参考评分区、最终评分录入、考评总览。  
**验收**：

- 前端将每个未填字段定位并高亮。
- 评分中有加载状态；规则评分有明确降级标签。
- employee 只能填写、导出、查看自己的历史周报，完全看不到 AI 对比考评、参考评分和最终评分入口。
- center_manager 可填写/导出自己的周报；可查看本中心 employee 周报详情、周vs日对照表、触发参考评分并录入最终评分；不可编辑员工周报，不可评估自己。
- general_manager 可查看 center_manager 周报内容并手动填写最终评分，不展示周vs日对照表或 AI/规则参考评分；general_manager_assistant 仅能查看 center_manager 周报内容与最终评分，不可触发评估或填写最终评分；二者均不显示普通员工周报全量列表。
- 周报列表每条记录必须提供详情按钮；有最终评分时优先展示最终评分，无最终评分时显示“待最终评分”。

### M6 — 中心日报自动汇总与导出

**任务**：聚合查询、查看页、导出、中心负责人可配置的自动生成时间、每分钟轮询任务与防重锁。  
**验收**：

- 不同中心日报严格隔离；中心负责人无法越权选择其他中心。
- 同一中心当日多员工、多项目日报按员工分组正确汇总。
- 草稿和非本中心日报不进入汇总。
- 无已提交日报返回空态而非异常。
- 手动导出与页面数据一致。
- 生产环境自动任务默认开启；每个中心初始生成时间为业务时区 `Asia/Shanghai` 的 18:00，中心负责人修改后仅影响本中心。
- 自动任务每日到点调用与手动导出相同的聚合/导出代码；无已提交日报时仍生成模板格式的“暂无已提交日报”文件。
- 多实例或重复轮询不会重复并发写入同一中心、同一日期的文件。
- 中心日报模板快照测试通过。

### M7 — P2 项目日报（最后执行）

**前置条件**：M0~M6 的全部测试通过，且项目日报最终模板已确认。  
**任务**：项目聚合 API、页面、导出、权限、测试。  
**验收**：按项目聚合已提交日报；管理角色均可访问；员工不可访问；文件名和目录严格符合规范。

---

## 9. 测试策略与必测用例

### 9.1 单元测试

- 角色与中心范围授权。
- 上周周期计算（跨月、跨年）。
- 日报/周报提交校验。
- `completed` 项目过滤。
- 周vs日对照表：同日多条周报总结、多条日报完成项、周报有日报无、日报有周报无、项目名相似、关键词匹配/不匹配、完成日期不一致。
- 规则评分：无日报、单休锚点周 6 个应工作日、单休锚点下一周自动双休 5 天、下下周恢复单休 6 天、双休锚点下一周自动单休 6 天、无锚点周按默认双休 5 天、插入/更新锚点后的受影响区间、同日多项目日报只计 1 天、草稿/非工作日不计填写率、基于周vs日对照表的事项有/无匹配、完成进度各类文本。
- 文件名清洗和绝对路径限制。
- AI JSON schema 校验与降级。

### 9.2 API 集成测试

最低覆盖以下矩阵：

```text
employee      : 只可管理本人日报、本人周报；不可访问 AI 对比考评、最终评分、中心/项目汇总
center_manager: 可管理自己周报；仅看本中心 employee 周报详情、周vs日对照表、参考评分与最终评分；不可考核自己
general_manager: 可看 center_manager 周报详情和最终评分，并可手动填写最终评分；不看中心负责人周vs日对照表或参考评分；不可填写个人日报/周报，不看普通员工全量周报
general_manager_assistant: 仅看 center_manager 周报详情和最终评分；不可触发评估、不可填写最终评分、不可填写个人日报/周报，不看普通员工全量周报
platform admin: 不参与周报业务考核页面；不可因管理员身份填写个人日报/周报
```

### 9.3 导出测试

- 以固定 fixture 生成日报、周报、中心日报。
- 断言文件存在、扩展名为 `.xlsx`、工作簿可打开、标题和关键字段正确。
- 断言输出路径和文件名。
- 对三份已确认模板：断言合并范围、列宽、关键行高、字体、边框、对齐、填充、冻结窗格、打印设置、签字区与模板一致；同时断言样例姓名、日期、项目和明细内容均未遗留在导出文件中。
- 使用“明细少于模板预留行”“恰好预留行”“明细多于模板预留行”三类 fixture 测试动态区块扩展与样式继承。

### 9.4 浏览器 e2e 测试

- 员工日报从新建到导出。
- 员工周报从草稿到提交、导出、历史列表详情；确认员工页面完全不显示 AI 对比考评。
- 中心负责人进入本中心员工周报详情，查看周vs日对照表，触发 AI 正常/降级参考评分，填写最终评分并保存；确认不可编辑员工周报、不可评估本人。
- 总经理进入中心负责人周报详情，查看周报内容后手动输入分数并保存最终评分；总经理助理进入中心负责人周报详情只读查看，确认无周vs日对照表、无 AI/规则评估触发、无最终评分保存入口；确认二者均不显示普通员工周报全量列表。
- 中心负责人查看本中心汇总并导出。
- 权限路由被直接输入 URL 时仍拦截。

---

## 9.5 已确认配置、仍待业务确认项

### 已确认（Codex 必须直接执行）

| # | 已确认项 | 执行规则 |
|---|---|---|
| C1 | Codex 运行环境 | Windows，本地工作空间 `E:\Digital-transformation`，可读模板目录 `E:\Digital-transformation\docs`。 |
| C2 | 导出根目录 | 开发、测试、生产均为 `E:\Digital-transformation\daily_and_weekly_files`；同名报表采用最新一次原子覆盖。 |
| C3 | 已提交后的修改 | 日报、周报已提交后仍可编辑并重新提交；仅草稿可删除；周报任何实质修改都使 AI 评分缓存失效。 |
| C4 | 时区 | 业务语言称“Asia/Beijing/北京时间”，代码配置固定使用有效 IANA 值 `APP_TIMEZONE=Asia/Shanghai`。 |
| C5 | 中心日报自动生成 | 生产默认每日自动生成，初始时间 18:00；中心负责人可设置本中心启用状态与时间；无数据仍输出“暂无已提交日报”的归档文件。 |
| C6 | 日报填写率 | 当前计划固定由总经理或平台管理员设置单双休交替锚点决定：锚点周采用设定模式，之后每周自动单双休交替；无任何锚点周默认双休 5 天。P0/P1 不接入钉钉考勤。 |
| C7 | 日报项目范围 | P0 使用“全部未完成项目 + 项目编号/名称搜索”；不得创建 `project_members`。 |
| C8 | DeepSeek 密钥 | 只在后端私有 `.env` 或部署机密环境变量中配置，绝不提交到 Git、绝不写入前端。 |

### 已解决的工作日规则（不再阻塞开发）

| # | 已确认项 | Codex 执行规则 |
|---|---|---|
| W1 | 工作日来源 | P0/P1 使用人工单双休**交替锚点**；不接入钉钉考勤。 |
| W2 | 配置权限 | 仅总经理或平台管理员可设置某周为 `single_rest` 或 `double_rest` 锚点。 |
| W3 | 自动交替 | 锚点周采用设定模式；第 1 个后续周采用相反模式；第 2 个后续周恢复锚点模式，之后持续交替。 |
| W4 | 示例 | 设置当前周 `single_rest` 后：当前周 6 天、下一周自动 `double_rest` 为 5 天、下下周自动 `single_rest` 为 6 天。设置 `double_rest` 锚点时同理反向交替。 |
| W5 | 默认值 | 历史上不存在任何锚点时，`REPORT_DEFAULT_WEEKLY_REST_MODE=double_rest`，按 5 个应填日报工作日计算，且默认值本身不自动交替。 |
| W6 | 评分重算 | 新增或更新某周锚点后，清空从该周起至下一锚点前一周的全部受影响周报 `ai_score` 或标记为待重新评估；不得继续展示旧分数。 |


## 10. 交付物与完成定义

完成 P0 时，Codex 必须交付：

1. 迁移脚本（010~019）及回滚/执行说明。
2. 后端路由、控制器、服务、数据访问层、鉴权策略、文件存储、单双休交替锚点与中心自动生成定时任务。
3. 六个 P0 页面中的五个：日报填写、日报列表、周报填写/详情、周报列表、中心日报；项目日报页面留在 P2。
4. 个人日报、个人周报、中心日报三个 Excel 导出器。
5. DeepSeek 适配器、规则降级实现、评分结果缓存与展示。
6. 单元、集成、e2e、导出测试；测试数据不进入生产迁移。
7. `docs/reports/implementation-notes.md`，包含：真实代码路径映射、环境变量、迁移命令、测试命令、模板状态、已知限制。
8. 变更摘要：按里程碑列出改动文件、已完成验收用例、尚未完成的 P2/外部依赖。

**P0 完成判定**：M0~M6 全部通过；无越权漏洞；迁移可执行；核心 API 和页面可用；AI 在失败时能稳定降级；单双休交替锚点计算正确；中心负责人仅能调整本中心自动生成时间；三份已确认模板均可被 Codex 运行环境读取；三类导出通过模板快照测试且无样例数据遗留.若模板目录未挂载到 Codex 执行环境，只能标记为“功能完成、模板像素级复刻待验收”，不能标记为完全完成。

---

## 11. 本版修订记录（v1.4）

- 保留 Codex 的 Windows 工作空间、模板目录、统一导出根目录、`Asia/Shanghai` 时区、已提交可编辑/草稿可删除、中心日报自动生成、DeepSeek 服务端密钥隔离等既定规则。
- 保留当前 P0/P1 不接入钉钉、不实现节假日/调休/个人排班逐日例外的范围边界。
- 将原“每周单独手工设置单双休、未设置周固定双休”升级为**单双休交替锚点规则**：总经理或平台管理员设置某周模式后，自该周起自动按单双休交替；设置单休锚点时“单休→双休→单休→…”，设置双休锚点时“双休→单休→双休→…”。
- 新增/更新锚点后，以该锚点至下一锚点前一周为受影响区间，清空该区间内已有周报 AI 评分并要求重新评估。
- 迁移 018 从每日 `report_workday_calendars` 改为 `report_weekly_rest_mode_anchors`；不再将每周展开写入 7 条日期记录，避免自动交替的历史维护错误。
- 将管理 API、前端预览、规则评分返回字段、测试矩阵和 Codex 指令均更新为锚点解析算法。

## 12. 可直接交给 Codex 的执行指令

```text
请在当前数字化管理平台代码仓中实现“日报/周报模块”。

先读取并严格遵循以下开发计划：CODEX_日报周报模块开发执行计划_v1.4.md。
同时以 daily-report-requirement-checklist.md 为业务需求、digital_platform.sql 为现有数据库结构依据。

执行规则：
1. 先完成 M0 仓库侦察并写入 docs/reports/implementation-notes.md；不得猜测框架或创建平行工程。
2. 不执行 digital_platform.sql Dump；只新增安全迁移。
3. 必须复用 users.department 和 users.organization_role；不得新建 roles、departments、project_members 表。
4. 严格按 M1 到 M6 分阶段实施；每阶段运行相关测试后再继续。迁移除日报/周报表外，还必须包含单双休交替锚点与中心日报自动生成计划。
5. 后端授权必须是最终防线；不要只依赖前端菜单隐藏。
6. DeepSeek 调用必须有 30 秒超时、JSON schema 校验、规则评分降级，且密钥只保存在服务端私有环境变量；填写率必须按人工单双休**交替锚点**计算：锚点周采用设定模式，之后每周自动采用相反/原模式交替；无任何锚点时默认双休 5 天。不得固定以 7 天为分母。P0/P1 不得接入钉钉，也不得实现逐日调休覆盖。
7. P0 模板目录由 `REPORT_TEMPLATE_ROOT` 指定；本地开发默认读取 `E:\Digital-transformation\docs` 中的三个已确认模板。先做模板保真试验和 `docs/reports/template-mapping.md`，再编写导出器；不得覆盖模板原件，也不得把模板样例姓名或日期遗留在导出文件。
8. 若 Codex 运行环境无法读取模板目录，请在 implementation-notes.md 中标记模板复刻为阻塞项；可继续完成结构化导出，但不得声称已完全复刻。
9. 生产默认按 `Asia/Shanghai` 每日生成中心日报，初始时间 18:00；中心负责人仅可配置本中心时间。使用轮询任务 + 数据库/分布式锁防重，生成文件采用临时写入后原子重命名。
10. P2 项目日报不要在 P0 中提前实现。

完成后输出：变更文件清单、迁移/运行/测试命令、测试结果、P0 验收项状态、尚未解决的外部依赖。
```
