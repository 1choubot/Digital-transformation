## ADDED Requirements

### Requirement: 旧分支功能移植边界
技术架构 MUST 将 `feat/weekly-report-prefill-from-daily` 视为功能来源分支，而不是可直接整体合并到当前主线的变更。

#### Scenario: 不直接 merge 旧分支
- **WHEN** 团队实现日报/周报移植
- **THEN** 团队 MUST NOT 直接 merge 整个旧分支到当前 `main`
- **AND** 团队 MUST 以当前主线文件为基底手工接入报表模块

#### Scenario: 保留当前主线立项能力
- **WHEN** 团队接入日报、周报、中心日报或周报审批能力
- **THEN** 实现 MUST NOT 回退当前立项阶段模板文件生成、项目编号由 `1.3` 确定、新版 `1.2` 审批表或生成文件权限下载能力

### Requirement: 日报周报 migration 重排
技术架构 MUST 重新生成日报/周报数据库 migration 编号，避免旧分支 migration 与当前主线 migration 冲突。

#### Scenario: 不沿用旧分支 013-027 编号
- **WHEN** 团队实现日报/周报数据库结构
- **THEN** 团队 MUST NOT 直接复制旧分支 `013-027` migration 文件编号
- **AND** 团队 MUST 在当前主线最新 migration 之后重新编号和整理日报/周报 migration

#### Scenario: 保留 SQL 语义但适配当前 schema
- **WHEN** 团队从旧分支移植日报/周报表结构
- **THEN** 团队 SHOULD 参考旧分支 SQL 语义
- **AND** 团队 MUST 检查每个表、索引、外键和用户字段依赖是否适配当前主线 schema
- **AND** 日报表 MUST 记录提交人和提交时间
- **AND** 日报草稿明细完成时间 MUST 支持空值
- **AND** 周报表 MUST 记录提交人和提交时间，并通过周报 DTO 暴露

### Requirement: SQL dump 使用边界
技术架构 MUST 将 `digital_platform_with_data.sql` 作为只读样本数据参考，不得用于覆盖当前数据库。

#### Scenario: 不导入完整 SQL dump
- **WHEN** 团队实现或验证日报/周报移植
- **THEN** 团队 MUST NOT 将 `digital_platform_with_data.sql` 直接导入当前开发库、测试库或生产库以覆盖现有 schema
- **AND** 团队 MUST NOT 用该 dump 替代正式 migration

#### Scenario: 样本数据需独立脚本
- **WHEN** 团队确需使用 dump 中的日报/周报样本数据
- **THEN** 团队 MUST 编写独立测试数据导入脚本
- **AND** 该脚本 MUST 只导入测试库需要的报表样本数据
- **AND** 该脚本 MUST NOT 删除或覆盖当前主线已有项目、阶段资料、在线表单或生成文件数据

### Requirement: 后端报表模块接入当前架构
技术架构 MUST 要求后端报表模块接入当前主线的 Express app、认证、错误处理、用户和组织角色模型。

#### Scenario: 路由接入当前 app
- **WHEN** 团队移植日报、周报或中心日报路由
- **THEN** 路由 MUST 接入当前主线 `app.js` 和当前认证中间件
- **AND** 路由 MUST NOT 覆盖当前项目、阶段资料、立项在线表单或生成文件路由

#### Scenario: 错误处理保持当前协议
- **WHEN** 报表 API 返回业务错误
- **THEN** 后端 MUST 使用当前主线错误处理中间件和业务错误响应格式
- **AND** 业务校验失败 MUST NOT 落成 500

#### Scenario: 用户字段依赖需适配
- **WHEN** 报表模块依赖职位、中心、审批人或责任人信息
- **THEN** 实现 MUST 明确这些字段与当前用户、组织角色和权限模型的映射
- **AND** 实现 MUST NOT 直接用旧分支用户 schema 覆盖当前用户表
- **AND** 本切片 MUST NOT 新增或依赖 `users.job_title`

#### Scenario: 暂缓 AI、导出和复杂评分路由
- **WHEN** 团队移植旧分支日报/周报能力
- **THEN** 本切片 MUST NOT 挂载 AI 预填、周报评分、最终评分保存或报表导出路由
- **AND** 前端 MUST NOT 调用这些暂缓接口

#### Scenario: 中心日报受控调度
- **WHEN** 部署环境启用中心日报计划检查
- **THEN** 后端 MUST 通过可关闭的进程内调度器执行受控检查
- **AND** 本切片 MUST NOT 在调度器中生成报表文件或接入外部文件平台

### Requirement: 前端报表模块接入当前架构
技术架构 MUST 要求前端报表页面接入当前主线 router、App shell、导航、HTTP 客户端和样式体系。

#### Scenario: 当前 app shell 为基底
- **WHEN** 团队移植日报、周报、周报审批或中心日报页面
- **THEN** 团队 MUST 以当前主线 `router.js`、`App.vue` 和导航结构为基底手工接入
- **AND** 团队 MUST NOT 用旧分支 app shell 覆盖当前项目工作区体验

#### Scenario: HTTP 客户端冲突单独 review
- **WHEN** 团队移植报表 API 客户端
- **THEN** `digital-platform-web/src/api/http.js` MUST 单独 review 登录态、错误处理和拦截器差异
- **AND** 实现 MUST 保留当前主线已有项目和立项接口行为

### Requirement: 报表移植验证边界
技术架构 MUST 要求日报/周报移植同时验证报表功能和当前立项阶段核心回归。

#### Scenario: 报表验证
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行 API check、Web build、OpenSpec strict/all 和日报/周报相关自动化测试
- **AND** 团队 SHOULD 手动验证日报填写、日报补录、周报预填、周报审批和中心日报查询

#### Scenario: 立项回归
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行或等价覆盖立项阶段 smoke
- **AND** 验证 MUST 确认 `1.1 / 1.2 / 1.3` 模板文件生成、项目编号流程和 v20260629 / 71 项数量未回退
