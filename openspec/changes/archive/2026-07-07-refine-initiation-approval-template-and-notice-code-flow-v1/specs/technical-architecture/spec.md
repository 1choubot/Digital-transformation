## MODIFIED Requirements

### Requirement: 后端统一模板文件生成治理
技术架构 MUST 继续由后端统一治理模板注册、mapping manifest、模板渲染、文件记录、内部存储、权限检查和下载接口，并 MUST 适配新版 `1.2` 模板和 `1.3` 累计通知。

#### Scenario: 1.2 模板 registry 使用新版版本
- **WHEN** 后端解析 `1.2 项目立项审批表` 模板
- **THEN** 模板 registry MUST 指向 `智能制造项目管理文件模板/项目立项审批表-模板.xlsx`
- **AND** registry SHOULD 记录新版 template version，例如 `20260707-initiation-approval-v1`
- **AND** 业务接口 MUST NOT 接收任意模板路径

#### Scenario: 1.2 manifest 显式映射新版字段
- **WHEN** 后端渲染新版 `1.2` 审批表
- **THEN** manifest MUST 显式声明新版表头、商务评分项、技术评分项和意见区目标位置
- **AND** manifest MUST 显式映射 `1.2` 项目开展模式字段到新版模板目标位置
- **AND** manifest MUST 根据字段值勾选自研模式或供应链模式
- **AND** 项目开展模式勾选 MUST 保留模板富文本 run 和字体，仅替换 checkbox 符号 run
- **AND** renderer MUST NOT 用整格 Unicode 复选框文本替换 `D20/G20`
- **AND** manifest MUST NOT 将项目开展模式绑定到系统项目模式、`projects.project_mode` 或项目主数据项目模式字段
- **AND** manifest MUST NOT 通过字段名猜测单元格位置
- **AND** manifest MUST NOT 映射项目编号

#### Scenario: DOCX 表格支持多行数据渲染
- **WHEN** 后端渲染 `1.3 项目立项通知`
- **THEN** renderer MUST support manifest-declared multi-row table rendering
- **AND** renderer MUST clone the template data row for each cumulative project row
- **AND** renderer MUST remove unused empty template rows
- **AND** renderer MUST preserve table style, borders, widths, fonts, and paragraph formatting

#### Scenario: 生成失败不回滚 1.3 提交
- **WHEN** `1.3` 提交已成功写入项目编号但通知文件生成失败
- **THEN** 系统 MUST 记录生成失败状态
- **AND** 系统 MUST NOT 回滚在线表单提交结果或 `projects.project_code`

#### Scenario: 项目编号写入路径统一治理
- **WHEN** 后端处理项目编号写入
- **THEN** `1.3 项目立项通知` 提交 MUST 是立项流程项目写入 `projects.project_code` 的唯一业务入口
- **AND** 独立项目编号更新接口 MUST NOT 对存在 `1.3` 资料项的项目写入 `projects.project_code`
- **AND** 任何保留的遗留写入路径 MUST 复用同一项目编号命名锁或等价并发保护策略
- **AND** 业务错误 MUST NOT 落成 500

### Requirement: 内部存储和源快照审计
技术架构 MUST 为历史生成文件保存生成时源快照、源 hash、审批快照和模板 hash；`1.3` 累计通知的源快照 MUST 覆盖累计项目清单输入。

#### Scenario: 1.3 累计清单进入源快照
- **WHEN** 系统生成 `1.3 项目立项通知`
- **THEN** 源快照 MUST 包含本次用于渲染的累计项目清单
- **AND** 源快照 MUST 包含当前项目 `1.3` 提交时间 cutoff
- **AND** 源 hash MUST 覆盖 cutoff 以及每行的序号、项目编号、项目名称、客户单位和立项日期
- **AND** 历史生成文件 MUST NOT 只依赖当前可变项目表解释清单内容

#### Scenario: 1.3 重试生成不得引入未来项目
- **WHEN** 系统重试生成旧项目的 `1.3 项目立项通知`
- **THEN** 累计清单查询 MUST 使用该项目原始 `1.3` 提交时间 cutoff
- **AND** 查询 MUST NOT 包含 cutoff 之后提交的项目

#### Scenario: 新版 1.2 模板 hash 可追溯
- **WHEN** 系统生成新版 `1.2 项目立项审批表`
- **THEN** 文件记录 MUST 保存新版模板 hash 或等价模板版本信息
- **AND** 审计时 MUST 能区分旧模板生成文件和新版模板生成文件
