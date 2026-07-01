# Digital Platform API

数字化管理平台后端服务 —— 基于 Node.js + Express + MySQL 构建，为项目全生命周期管理、日报/周报协同及组织治理提供 RESTful API。

## 功能概览

### 1. 基础平台与认证

- **登录/退出/会话恢复**：基于 Token 的会话管理，可配置 TTL（默认 12 小时）
- **接口鉴权中间件**：`requireAuth` 统一拦截未登录请求
- **用户身份模型**：`organizationRole`（组织角色）、`department`（部门）、`role`（岗位描述）、`isPlatformAdmin`（平台管理员标识）
- **系统管理员入口控制**：仅 `system_admin + isPlatformAdmin` 可见用户管理功能

### 2. 用户与组织角色管理

| 操作 | 接口 | 权限要求 |
|------|------|----------|
| 用户列表 | `GET /api/users` | 系统管理员 |
| 用户详情 | `GET /api/users/:id` | 系统管理员 |
| 新增用户 | `POST /api/users` | 系统管理员 |
| 编辑用户 | `PATCH /api/users/:id` | 系统管理员 |
| 启用/禁用 | `POST /api/users/:id/enable` / `disable` | 系统管理员 |
| 重置密码 | `POST /api/users/:id/reset-password` | 系统管理员 |
| 责任人候选 | `GET /api/users/responsibility-candidates` | 已登录 |

组织角色枚举：`general_manager`（总经理）、`system_admin`（系统管理员）、`general_manager_assistant`（总经理助理）、`center_manager`（中心负责人）、`employee`（员工）。

部门枚举：`operations_center`（运营中心）、`marketing_center`（营销中心）、`manufacturing_center`（制造中心）、`rd_center`（研发中心）。

保底机制：系统始终至少保留一个启用且满足 `organizationRole = system_admin`、`isPlatformAdmin = true` 的账号。

### 3. 项目主数据

- 项目 CRUD：创建、列表、详情
- 项目模式：`self_developed`（自研）/ `outsourced`（供应链/外包）
- 项目经理用户关联（`projectManagerUserId` 为权威字段）
- 参与部门枚举数组（`participatingDepartments`）
- 项目编号后置填写：立项审批通过并收到立项通知后可填写非空唯一编号
- 按用户角色控制项目可见范围

### 4. 项目阶段与资料管理

- **自动初始化**：项目创建时自动建立 8 个标准阶段，加载 20260625 版 64 项资料清单
- **8 阶段定义**：立项 → 方案设计 → 详细设计 → 采购与生产 → 厂内调试 → 出厂验收 → 现场安装调试 → 项目结题
- **资料状态流转**：`not_submitted` → `submitted` → `confirmed`；支持 `returned` 退回与重新提交
- **资料适用性**：标记不适用 / 恢复适用，记录完整追溯
- **责任人分配**：手工分配资料责任人，支持变更追溯
- **资料附件**：上传、列表、下载、软删除，50MB 单文件限制
- **齐套摘要**：基于 `completionMode`（`submit_only` / `approval_required` / `conditional_submit`）和适用性判断的门禁级齐套率计算

### 5. 阶段审批与立项多节点审批

- **阶段级审批**：提交 / 通过 / 退回 / 重新提交，含完整审批历史
- **立项多节点审批**：按审批节点逐项通过/退回，支持精准返工标记与恢复
- **阶段推进**：适用资料齐套后可推进至下一阶段，末阶段推进完成即项目完成

### 6. 我的工作台

- 资料责任待办：当前用户负责的适用资料项
- 资料审核待办：`approval_required` 模式下待审核资料
- 阶段推进待办：当前阶段已齐套、当前用户有推进权限的阶段
- 资料任务列表：`GET /api/me/stage-document-tasks`，支持状态和项目筛选

### 7. 项目总览与业务日志

- 跨项目汇总指标：总数、进行中、已完成、风险/延期项目数
- 项目维度筛选：项目状态、当前阶段、关键字
- 当前阶段齐套率与未完成资料数量
- 业务操作日志：项目创建、资料提交/确认/退回、责任人变更、附件操作、阶段推进、项目完成等

### 8. 日报模块

- 日报 CRUD：列表、详情、新增、编辑、删除
- 支持多项目关联与搜索
- 附件上传、列表、下载、删除
- Excel 导出（基于 ExcelJS）

### 9. 周报模块

- 周报 CRUD：新增（绑定自然周）、编辑、删除
- 日报明细对比表
- 周报汇总及考评
- AI/规则评分、最终评分、等级、评语、评审人记录
- Excel 导出
- 单休/双休工作日模式锚点配置
- 分层权限：员工写个人周报、中心负责人汇总/评分本中心、总经理/助理全局汇总/评分

### 10. 中心日报汇总

- 按中心 + 日期维度查询日报
- 部门范围控制：中心负责人管本中心，系统管理员可配置全部中心
- Excel 导出
- 定时排程：`CENTER_DAILY_SCHEDULER_ENABLED` 控制自动生成

### 11. 数据库迁移体系

23 个 SQL 迁移文件，覆盖项目核心、认证、阶段资料、状态流转、适用性、业务日志、用户管理、责任人、附件、组织角色、阶段审批、精准返工、立项审批节点、日报、日报事项、日报计划、日报附件、周报、周报总结、周报计划、周休息模式、中心日报排程、周报终评。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 运行时 | Node.js >= 20 |
| 框架 | Express 4.x |
| 数据库 | MySQL，通过 mysql2 连接池管理 |
| 认证 | 自建 Token-based Session（无第三方 Passport） |
| 文件上传 | Busboy（multipart/form-data 解析） |
| Excel 导出 | ExcelJS |
| 配置管理 | dotenv |
| 代码检查 | `node --check` 语法校验 |

## 项目结构

```
digital-platform-api/
├── migrations/          # SQL 迁移脚本（按编号顺序执行）
├── scripts/             # 初始化与数据修复脚本
├── src/
│   ├── app.js           # Express 应用组装入口
│   ├── server.js        # 服务启动入口
│   ├── routes/          # 路由层（auth, users, projects, me, dailyReports, weeklyReports, centerDailyReports）
│   ├── repositories/    # 数据访问层
│   │   ├── projects/    # 项目相关（核心、阶段、推进、审批、总览、可见性）
│   │   ├── stageDocuments/  # 阶段资料（清单、状态、适用性、责任人、工作台、任务、立项审核）
│   │   ├── dailyReportRepository.js
│   │   ├── weeklyReportRepository.js
│   │   ├── centerDailyReportRepository.js
│   │   ├── userRepository.js
│   │   ├── sessionRepository.js
│   │   ├── operationLogRepository.js
│   │   └── stageDocumentAttachmentRepository.js
│   ├── services/        # 业务服务（日报导出、周报导出、周报评分、中心日报导出、定时排程）
│   ├── middleware/       # 中间件（鉴权、错误处理、平台管理员校验）
│   ├── domain/          # 领域常量与校验
│   ├── db/              # 数据库连接与 Schema 校验
│   └── storage/         # 附件本地存储
├── tests/               # 集成测试
├── .env.example         # 环境变量模板
└── package.json
```

## 快速开始

### 前置条件

- Node.js >= 20
- MySQL 5.7+ 或 8.0+
- npm

### 安装

```bash
# 1. 克隆仓库后进入目录
cd digital-platform-api

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，至少修改数据库连接信息和初始化用户密码
```

### 数据库初始化

按编号顺序执行迁移脚本：

```bash
# 执行迁移（在 MySQL 客户端或工具中依次执行）
mysql -u root -p digital_platform < migrations/001_project_core.sql
mysql -u root -p digital_platform < migrations/002_basic_users_auth.sql
# ... 依次执行至 022_alter_weekly_reports_add_final_review.sql
```

也可以一次性执行全部迁移（全新环境）：

```bash
for f in migrations/*.sql; do mysql -u root -p digital_platform < "$f"; done
```

### 初始化数据

```bash
# 初始化认证表与首个系统管理员账号
npm run init-auth

# 初始化 20260625 版阶段资料清单模板
npm run init-stage-documents
```

### 启动

```bash
# 开发模式（文件变更自动重启）
npm run dev

# 生产模式
npm start
```

服务默认监听 `http://localhost:3001`。验证启动：

```bash
curl http://localhost:3001/health
# 预期响应: {"status":"ok"}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3001` |
| `DB_HOST` | MySQL 主机 | `127.0.0.1` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | MySQL 用户 | `root` |
| `DB_PASSWORD` | MySQL 密码 | — |
| `DB_NAME` | 数据库名 | `digital_platform` |
| `DB_CONNECTION_LIMIT` | 连接池大小 | `10` |
| `AUTH_SESSION_TTL_HOURS` | 登录态有效小时数 | `12` |
| `STAGE_DOCUMENT_ATTACHMENT_STORAGE_DIR` | 附件存储目录 | `storage/stage-document-attachments` |
| `INITIAL_USER_ACCOUNT` | 初始化账号 | `admin` |
| `INITIAL_USER_PASSWORD` | 初始化密码 | `Admin@123456` |
| `INITIAL_USER_DISPLAY_NAME` | 初始化用户姓名 | `系统管理员` |
| `REPORT_TEMPLATE_ROOT` | 报表模板目录 | `E:\Digital-transformation\docs` |
| `REPORT_EXPORT_ROOT` | 报表导出目录 | `E:\Digital-transformation\daily_and_weekly_files` |
| `APP_TIMEZONE` | 应用时区 | `Asia/Shanghai` |
| `REPORT_DEFAULT_WEEKLY_REST_MODE` | 默认周休息模式 | `double_rest` |
| `CENTER_DAILY_SCHEDULER_ENABLED` | 中心日报定时排程开关 | `true` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（周报评分用） | — |
| `DEEPSEEK_API_BASE` | DeepSeek API 地址 | `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | DeepSeek 模型 | `deepseek-chat` |

## API 使用示例

### 登录获取 Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"admin","password":"Admin@123456"}'
```

成功后响应：

```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "account": "admin",
    "name": "系统管理员",
    "organizationRole": "system_admin",
    "department": null,
    "role": "系统管理员",
    "isEnabled": true,
    "isPlatformAdmin": true
  }
}
```

### 创建项目

```bash
TOKEN="<登录获取的 token>"

curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "KRF-001 智能托盘产线",
    "customerName": "KRF 科技",
    "projectMode": "self_developed",
    "projectManagerUserId": 5,
    "participatingDepartments": ["rd_center", "manufacturing_center"],
    "plannedStartDate": "2026-07-01",
    "plannedEndDate": "2026-12-31",
    "remark": "首批自动化产线项目"
  }'
```

### 查看项目列表

```bash
curl http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

### 查看项目总览

```bash
curl "http://localhost:3001/api/projects/overview-dashboard?status=normal&keyword=KRF" \
  -H "Authorization: Bearer $TOKEN"
```

### 查看阶段资料清单

```bash
curl "http://localhost:3001/api/projects/1/stage-document-checklist" \
  -H "Authorization: Bearer $TOKEN"
```

### 标记资料已提交

```bash
curl -X POST http://localhost:3001/api/projects/1/stage-documents/10/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 推进当前阶段

```bash
curl -X POST http://localhost:3001/api/projects/1/stages/advance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 新增日报

```bash
curl -X POST http://localhost:3001/api/daily-reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDate": "2026-06-30",
    "projectIds": [1, 2],
    "dailyItems": [
      {"content": "完成托盘结构设计评审"},
      {"content": "启动 PLC 程序开发"}
    ],
    "dailyPlans": [
      {"content": "完成电气原理图绘制"}
    ],
    "summary": "项目进展顺利，按计划推进中"
  }'
```

### 查看我的资料任务

```bash
curl "http://localhost:3001/api/me/stage-document-tasks?status=pending&projectId=1" \
  -H "Authorization: Bearer $TOKEN"
```

## 权限模型

系统采用基于 `organizationRole` 的分层权限模型：

| 操作 | 总经理 | 系统管理员 | 总经理助理 | 中心负责人 | 员工 |
|------|--------|------------|------------|------------|------|
| 用户管理 | — | 全部 | — | — | — |
| 创建项目 | 全部 | — | — | 本中心 | — |
| 查看项目 | 全部 | 所负责项目 | 全部（只读） | 本中心相关 | 所负责资料 |
| 资料确认/退回 | — | — | — | 本中心 | — |
| 资料责任人分配 | 全部 | — | — | 本中心 | — |
| 适用性标记 | 全部 | — | — | 本中心 | — |
| 阶段推进 | 全部 | — | — | 本中心 | — |
| 写日报 | — | — | — | — | 是 |
| 周报评分 | 全部 | — | 全部 | 本中心 | — |

> **注意**：系统管理员仅管理账号与基础配置，不默认获得业务项目权限。所有权限以 `FORBIDDEN_OPERATION`（HTTP 403）为拒绝统一错误码，后端为保证安全边界，前端隐藏入口只是体验优化。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（文件变更自动重启） |
| `npm start` | 启动生产服务器 |
| `npm run init-auth` | 初始化认证表与系统管理员账号 |
| `npm run init-stage-documents` | 初始化 20260625 版 64 项阶段资料模板 |
| `npm run check` | 语法校验（检查全部源文件） |
| `npm run migrate-online-platform-internal-flow` | 补齐 `project_code` 和 `completion_mode` 字段 |
| `npm run migrate-stage-document-precise-rework` | 精准返工字段迁移 |
| `npm run migrate-project-initiation-review-nodes` | 立项审批节点迁移 |
| `npm run reset-stage-documents-v20260625` | 重置为 20260625 版资料（仅模拟数据） |

## 错误处理

统一错误响应格式：

```json
{
  "error": {
    "code": "FORBIDDEN_OPERATION",
    "message": "当前用户无权执行此操作"
  }
}
```

主要错误码：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未登录或登录已过期 |
| `FORBIDDEN_OPERATION` | 403 | 无权限执行当前操作 |
| `PROJECT_NOT_FOUND` | 404 | 项目不存在 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `STAGE_DOCUMENT_NOT_FOUND` | 404 | 资料项不存在 |
| `INVALID_PARAMS` | 400 | 请求参数校验失败 |
| `LAST_ENABLED_SYSTEM_ADMIN_REQUIRED` | 400 | 操作会导致无启用系统管理员 |
| `PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED` | 400 | 项目经理用户无效 |
| `STAGE_DOCUMENT_NOT_APPLICABLE` | 400 | 资料已标记为不适用 |
| `ATTACHMENT_FILE_MISSING` | 500 | 附件记录存在但物理文件丢失 |

## 贡献指南

### 代码规范

1. **模块组织**：路由层（`routes/`）只做参数提取和响应封装；业务逻辑在 `repositories/` 中实现；公共能力在 `services/` 中沉淀
2. **错误处理**：所有数据库操作使用 `try/catch`，通过 `next(error)` 传递给统一错误中间件
3. **事务保证**：涉及多表写入的业务操作（如资料提交 + 业务日志写入）必须在同一事务中完成——日志写入失败时业务操作回滚
4. **安全用户模型**：所有返回用户信息的接口不得包含 `password_hash` 或 `passwordHash` 字段
5. **参数校验**：路由入口统一校验参数合法性与完整性，非法请求尽早返回 400
6. **命名一致性**：前端使用 `displayName` 提交，后端存 `display_name`，响应使用 `name`；`completionMode`、`isApplicable` 等字段保持前后端一致

### 添加新功能的步骤

1. **数据库变更**：在 `migrations/` 中创建新的 SQL 迁移文件，按递增编号命名
2. **仓储层**：在 `src/repositories/` 中创建或扩展对应模块，实现数据访问逻辑
3. **路由层**：在 `src/routes/` 中添加新的路由处理器
4. **注册路由**：在 `src/app.js` 中 `app.use()` 注册新路由
5. **语法检查**：运行 `npm run check` 确认无语法错误
6. **更新 README**：在本文档的 API 章节中补充新接口说明

### 数据库迁移规范

- 迁移文件按 `编号_描述.sql` 命名，编号递增
- 每个迁移必须可幂等执行（使用 `IF NOT EXISTS`、`IF EXISTS` 等）
- 新增字段使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`（注意 MySQL 5.7 兼容性）
- 迁移不应回填历史数据，由独立脚本处理数据修复
- 重要迁移需在 README 中补充执行说明

### 环境要求

- Node.js >= 20（`engines` 字段已声明）
- MySQL 5.7+ 或 8.0+
- 建议开发环境使用 `nodemon` 或 Node.js 22+ 内置 `--watch` 实现热重载

## License

Private — 重庆凯尔夫智能测控技术有限责任公司内部使用。
