## ADDED Requirements

### Requirement: 报表导出架构
技术架构 MUST 支持日报、周报和中心日报 Excel 导出，并 MUST 将导出限制在数字化平台内部能力边界内。

#### Scenario: Excel 导出依赖显式声明
- **WHEN** 实现报表 Excel 导出
- **THEN** 所需 npm 依赖 MUST 显式写入 `package.json` 和 lockfile
- **AND** 实现 MUST NOT 依赖未声明的本机全局包或旧分支 node_modules

#### Scenario: 导出模板路径受控
- **WHEN** 报表导出需要模板文件
- **THEN** 后端 MUST 从受控配置或白名单解析模板根目录和模板文件
- **AND** 业务请求 MUST NOT 传入任意本地模板路径
- **AND** 无权限或失败响应 MUST NOT 泄露本地绝对路径

#### Scenario: 导出文件生命周期
- **WHEN** 后端生成报表导出文件
- **THEN** 文件 MUST 写入受控临时目录或内部导出目录
- **AND** 下载后 SHOULD 清理临时文件
- **AND** 导出 MUST NOT 写入文件平台或阶段资料生成文件表

### Requirement: 报表 AI 配置治理
技术架构 MUST 通过环境配置控制 AI 周报预填整理和 AI 评分能力，并 MUST 在未配置时安全降级。

#### Scenario: AI 配置不入库不入代码
- **WHEN** 配置 AI endpoint、model、key 或开关
- **THEN** 配置 MUST 来自环境变量或等价部署配置
- **AND** API key MUST NOT 写死在代码、测试快照或 OpenSpec 文档中

#### Scenario: AI 默认安全
- **WHEN** 部署环境未显式配置 AI
- **THEN** AI 入口 MUST 默认不可用或禁用
- **AND** 普通日报、周报、中心日报和导出流程 MUST 继续可用

#### Scenario: AI 能力状态不泄露配置
- **WHEN** 前端查询周报 AI 能力状态
- **THEN** 后端 MUST 要求已认证会话
- **AND** 响应 MUST 只包含能力布尔值和用户可读提示
- **AND** 响应 MUST NOT 返回 AI endpoint、model、key 或等价敏感配置

#### Scenario: AI 输出隔离
- **WHEN** AI 返回预填整理或评分内容
- **THEN** 后端 MUST 限制可接受字段范围
- **AND** AI MUST NOT 修改项目、日期、审批状态、提交状态或权限相关事实

### Requirement: 报表评分架构
技术架构 MUST 将周报 AI/规则评分和最终人工评审作为周报审批后的受控业务能力。

#### Scenario: 评分状态门禁
- **WHEN** 后端处理评分或最终评审请求
- **THEN** 后端 MUST 校验周报提交状态、审批状态、评分人权限和目标用户角色
- **AND** 后端 MUST NOT 只依赖前端隐藏按钮

#### Scenario: 评分数据可追踪
- **WHEN** 后端保存评分结果
- **THEN** 结果 MUST 包含评分来源、评分时间、总分/等级和失败原因或空失败原因
- **AND** 最终人工评分 MUST 包含评审人和评审时间

#### Scenario: 内容变化后评分失效
- **WHEN** 周报被打回、编辑、再提交或审批状态回到待处理
- **THEN** 后端 MUST 清除或失效旧评分/最终评审字段
- **AND** 列表和详情 MUST NOT 把旧评分展示为当前版本最终评分

## MODIFIED Requirements

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

#### Scenario: AI、导出和评分路由受控启用
- **WHEN** 团队移植旧分支日报/周报剩余能力
- **THEN** 本切片 MAY 挂载报表导出、AI 预填整理、周报评分和最终评分路由
- **AND** 这些路由 MUST 复用当前认证、权限、状态门禁和错误处理
- **AND** 前端 MUST NOT 调用未配置或无权限的 AI/评分能力

#### Scenario: 中心日报受控调度
- **WHEN** 部署环境启用中心日报计划检查
- **THEN** 后端 MUST 通过可关闭的进程内调度器执行受控检查
- **AND** 本切片 MUST NOT 在调度器中生成报表文件或接入外部文件平台

### Requirement: 报表移植验证边界
技术架构 MUST 要求日报/周报移植同时验证报表功能和当前立项阶段核心回归。

#### Scenario: 报表验证
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行 API check、Web build、OpenSpec strict/all 和日报/周报相关自动化测试
- **AND** 团队 SHOULD 手动验证日报填写、日报补录、周报预填、周报审批、中心日报查询、导出、AI 不可用/可用状态、评分和最终评审

#### Scenario: 立项回归
- **WHEN** 报表移植实现完成
- **THEN** 团队 MUST 运行或等价覆盖立项阶段 smoke
- **AND** 验证 MUST 确认 `1.1 / 1.2 / 1.3` 模板文件生成、项目编号流程和 v20260629 / 71 项数量未回退
