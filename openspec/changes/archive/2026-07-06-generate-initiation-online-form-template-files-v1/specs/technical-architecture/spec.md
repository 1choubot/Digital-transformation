## ADDED Requirements

### Requirement: 文件生成能力可复用

技术架构 MUST 将立项阶段模板文件生成设计为全局文件生成能力的首个竖切；后续其他阶段 SHOULD 能复用同一文件生成、文件记录、权限检查和产出展示模型。

#### Scenario: 后续阶段复用同一模型
- **WHEN** 后续阶段需要从结构化表单或业务数据生成模板文件
- **THEN** 系统 SHOULD 复用同一模板定位、数据映射、渲染、文件记录、权限检查和下载模型
- **AND** 系统 SHOULD 避免为每个资料项复制一次性硬编码生成逻辑

#### Scenario: 立项阶段首个竖切
- **WHEN** 团队实现文件生成能力
- **THEN** `1.1 / 1.2 / 1.3` SHOULD 作为首个端到端竖切
- **AND** 该竖切 SHOULD 暴露后续阶段复用所需的后端边界

### Requirement: 文件生成后端统一治理

技术架构 MUST 由后端统一治理模板路径、生成器、文件记录、权限检查和下载/查看接口；模板填充逻辑 MUST NOT 散落到前端。

#### Scenario: 前端不直接填充模板
- **WHEN** 用户查看或下载生成文件
- **THEN** 前端 SHOULD 调用后端文件状态和下载/查看接口
- **AND** 前端 MUST NOT 直接填充 Excel 或 Word 模板

#### Scenario: 后端统一权限检查
- **WHEN** 用户请求文件状态、元数据、查看或下载
- **THEN** 后端 MUST 统一检查项目和资料查看权限
- **AND** 无权限请求 MUST NOT 泄露存储路径或模板元数据

#### Scenario: 模板和生成器统一治理
- **WHEN** 系统执行模板文件生成
- **THEN** 后端 MUST 统一管理模板路径、模板键、数据映射和渲染器调用
- **AND** 文件生成失败 MUST 可记录和诊断

#### Scenario: mapping registry 统一治理
- **WHEN** 系统执行模板填充
- **THEN** 后端 MUST 通过统一 mapping registry 或 mapping manifest 解析模板目标位置和来源字段
- **AND** mapping 逻辑 MUST NOT 散落硬编码在控制器、页面组件或单个业务流程函数中

#### Scenario: 禁止请求传入任意模板路径
- **WHEN** 业务接口触发文件生成
- **THEN** 接口 MUST NOT 接收任意模板路径参数
- **AND** 后端 MUST 从模板注册表、配置或白名单中解析模板路径

#### Scenario: 模板路径错误可追踪
- **WHEN** 模板缺失、路径不可读或格式不支持
- **THEN** 文件记录 MUST 进入 failed 或等价状态并记录原因
- **AND** 服务 MUST NOT 因模板路径错误崩溃
- **AND** 无权限响应 MUST NOT 泄露本地模板路径

### Requirement: 文件平台保持独立

技术架构 MUST 将文件平台联动、归档、同步和平台权限映射作为后续独立 change；本 change MUST NOT 处理 `file-platform-integration-v1`。

#### Scenario: 不处理文件平台 change
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 修改或实现 `file-platform-integration-v1`
- **AND** 文件平台目录、归档、同步、平台下载权限 MUST 留到后续独立 change

#### Scenario: 本系统内部存储可作为第一版方向
- **WHEN** 后续实现第一版模板文件生成
- **THEN** 系统 MAY 使用本系统内部存储和文件记录
- **AND** 是否接入文件平台 MUST 通过独立设计决定

### Requirement: 文件元数据设计先行

技术架构 MUST 在实现文件生成持久化前明确文件记录模型；规划阶段 MUST NOT 写数据库 migration。

#### Scenario: 规划阶段不写 migration
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 新增数据库 migration
- **AND** 系统 MUST NOT 新增文件记录表实现

#### Scenario: 后续实现前先设计字段
- **WHEN** 后续实现需要文件元数据表
- **THEN** 团队 MUST 先明确项目、资料、表单、模板、版本、状态、文件名、存储路径、生成操作者、生成时间和失败原因等字段
- **AND** 团队 MUST 明确源表单提交时间或版本、源表单数据 hash、不可变源快照引用、触发事件、审批快照、模板版本或模板 hash
- **AND** 旧项目旧表单迁移策略 MUST 独立评估

#### Scenario: 历史文件不依赖可变当前数据解释
- **WHEN** 系统展示或审计历史生成文件
- **THEN** 系统 MUST 能通过生成时源快照、源 hash 和模板版本解释该文件
- **AND** 系统 MUST NOT 只依赖当前在线表单数据或当前审批节点数据解释历史文件

### Requirement: 旧项目和文件格式风险保持边界

技术架构 MUST 将旧项目旧表单迁移、PDF 转换、深度预览和复杂格式保真验证作为后续独立事项。

#### Scenario: 不迁移旧项目
- **WHEN** 本 planning change 完成
- **THEN** 系统 MUST NOT 自动迁移旧项目
- **AND** 系统 MUST NOT 补旧项目表单数据或生成历史文件

#### Scenario: PDF 转换后续处理
- **WHEN** 后续需要将 Excel 或 Word 转为 PDF
- **THEN** PDF 转换 MUST 通过后续独立 change 或独立设计处理
- **AND** 本 change MUST NOT 承诺 PDF 已生成
