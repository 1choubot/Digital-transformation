## Context

当前后端项目核心和阶段资料相关能力已经覆盖项目创建、列表、详情、8 阶段初始化、阶段资料清单、资料状态流转、资料适用性、齐套摘要、阶段推进、业务日志、责任人分配、我的资料任务、项目总览看板和阶段资料附件。`stageDocumentRepository.js`、`projectRepository.js` 和 `routes/projects.js` 已经成为多职责聚合文件，后续继续加入文件管理平台联动、在线表单和权限扩展会放大回归风险。

本 change 是行为保持型后端结构治理。目标是改善模块边界和可维护性，不改变任何对外业务契约，不新增业务能力，不调整数据库结构。

## Goals / Non-Goals

**Goals:**

- 将阶段资料相关仓储职责拆分为更小的模块，并保持既有导出函数或调用点兼容。
- 将项目核心相关仓储职责拆分为更小的模块，并保持项目创建、查询、阶段推进和项目总览行为不变。
- 整理 `routes/projects.js` 内部 handler/helper，使路由层只负责参数解析、登录态/中间件绑定和调用领域/仓储能力。
- 保持所有 API 路径、请求字段、响应字段、错误码、HTTP 状态码、权限边界、事务边界和业务日志规则不变。
- 通过后端 check、前端 build、OpenSpec validate 和 HTTP/MySQL smoke 覆盖关键链路，证明重构没有行为回退。

**Non-Goals:**

- 不新增业务功能。
- 不新增数据库迁移，不修改表结构、字段、索引、初始化数据或历史数据。
- 不修改接口路径、请求/响应字段、错误码、权限模型或业务状态机。
- 不做文件管理平台联动、在线表单、表单草稿、表单归档文件、附件预览、版本管理或病毒扫描。
- 不做消息提醒、超期提醒、项目成员权限、资料责任人权限或复杂权限。
- 不重构前端 UI，不修改 `define-digital-platform-v1`。

## Decisions

### 拆分阶段资料仓储职责

建议将 `stageDocumentRepository.js` 按能力拆分为若干内部模块，例如：

- `stageDocumentChecklistRepository.js`：阶段资料模板、项目级资料清单初始化、阶段资料清单查询。
- `stageDocumentCompleteness.js` 或等价 helper：阶段齐套摘要和缺失适用必填资料计算。
- `stageDocumentStatusRepository.js`：资料提交、确认、退回和状态机相关事务。
- `stageDocumentApplicabilityRepository.js`：标记不适用、恢复适用和适用性追溯。
- `stageDocumentResponsibilityRepository.js`：责任人分配、清空、责任人查询映射和责任人变更日志。
- `stageDocumentTaskRepository.js`：我的资料任务查询、筛选和排序。

阶段资料附件能力已经有独立仓储和存储模块，第一版保持独立；实现时如需共享资料项查询或 ID 校验 helper，只能做最小范围抽取，并不得改变附件上传、列表、下载、删除、文件校验、事务和日志规则。

### 拆分项目核心仓储职责

建议将 `projectRepository.js` 按能力拆分为若干内部模块，例如：

- `projectCoreRepository.js`：项目创建、项目列表、项目详情和项目基础映射。
- `projectStageRepository.js`：标准 8 阶段初始化、阶段查询和当前阶段选择。
- `projectStageAdvanceRepository.js`：阶段推进门禁、阶段状态事务、项目完成事务和推进日志。
- `projectOverviewDashboardRepository.js`：项目总览筛选、汇总指标、项目卡片和当前阶段齐套摘要聚合。

拆分后可以保留原 `projectRepository.js` 作为兼容聚合出口，也可以统一更新调用点。选择标准是降低一次性改动风险：优先保持 public export 兼容，再逐步迁移内部实现。

### 路由层保持薄而稳定

`routes/projects.js` 可以整理内部 handler/helper，但必须保持路由注册路径和中间件边界不变。静态路由仍必须先于动态 `/:projectId` 路由注册，例如 `/overview-dashboard` 不能被项目详情动态路由吞掉。附件、资料状态、适用性、责任人、阶段推进和业务日志接口的 `requireAuth` / 非管理员边界保持不变。

### 导出兼容优先

第一版实现建议采用“兼容出口 + 内部拆分”的方式：

1. 新增小模块并迁移纯函数、SQL 查询和事务函数。
2. 在原仓储文件中 re-export 或薄封装既有函数名，降低路由和其他模块同步改动量。
3. 待 smoke 验证通过后，再按需要精简原文件内容。

这样可以控制改动面，并让失败时更容易回退到上一个模块边界。

### 不改变事务和日志边界

所有已有事务边界必须保持：项目创建与 `project.created` 日志同事务，资料状态/适用性/责任人变更与对应日志同事务，阶段推进与 `stage.advanced` / `project.completed` 日志同事务，附件上传/删除与附件日志同事务。拆分后的模块不得把日志写入移出事务，也不得让失败操作写日志。

### 回归验证策略

验证不只依赖语法检查。实现阶段必须覆盖：

- 后端 `npm run check`。
- 前端 `npm run build`，确认对外 API 和前端调用未被破坏。
- OpenSpec change 和全量 strict validate。
- HTTP/MySQL smoke 覆盖项目、阶段资料、业务日志、责任人、我的资料任务、项目总览和附件的关键链路。
- 源码检查确认没有新增迁移、没有新增业务入口、没有修改权限模型或错误码。

## Risks / Trade-offs

- **风险：拆分过程中遗漏导出或循环依赖。** 缓解：先梳理当前导出函数和调用点，优先使用兼容聚合出口，逐批迁移并在每批后运行 check。
- **风险：事务边界被拆散。** 缓解：事务入口函数保持清晰归属，日志写入仍接收同一个 connection/executor，smoke 覆盖日志失败回滚路径的代码审查。
- **风险：路由顺序或中间件边界改变。** 缓解：迁移前后对照 `routes/projects.js` 路由表，smoke 覆盖静态路由、未登录 401 和非管理员可访问接口。
- **风险：共享 helper 抽取过度导致业务规则被意外合并。** 缓解：只抽取纯映射、纯校验和齐套摘要等稳定逻辑，不将不同业务状态机合并成过宽抽象。
- **风险：一次性大改难以定位回归。** 缓解：分批迁移阶段资料、项目核心、路由层，每批保持可运行和可回滚。

## Migration Plan

1. 梳理 `stageDocumentRepository.js`、`projectRepository.js`、`routes/projects.js` 当前导出函数、内部 helper、SQL 查询、事务入口和调用点。
2. 建立新模块目录或文件命名约定，优先保留原仓储文件作为兼容出口。
3. 分批迁移阶段资料能力：清单/初始化和齐套摘要优先，其次状态、适用性、责任人、我的资料任务。
4. 分批迁移项目核心能力：项目基础读写和阶段初始化优先，其次阶段推进和项目总览看板。
5. 整理 `routes/projects.js` handler/helper，确认所有路径、中间件和注册顺序保持不变。
6. 运行 check/build/OpenSpec validate 和 HTTP/MySQL smoke。

回滚策略：由于不涉及数据库迁移和外部接口变更，若出现回归，可回退拆分后的模块文件和 import 调整，恢复原仓储聚合实现；数据库和用户数据无需回滚。

## Open Questions

- 实现时是否保留原 `projectRepository.js` 和 `stageDocumentRepository.js` 作为长期兼容出口，还是在本 change 内统一更新所有调用点后将其收缩为 re-export 文件？建议第一版保留兼容出口，降低风险。
- 新模块命名和目录层级是否采用 `repositories/project/*.js` / `repositories/stage-documents/*.js` 子目录，还是平铺在 `repositories` 下？建议以现有代码风格和 import 简洁性为准，避免引入过深目录。
