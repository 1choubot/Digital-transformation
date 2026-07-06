## ADDED Requirements

### Requirement: 立项协同表单实现架构边界

技术架构 MUST 支持本 change 在实现阶段修改 API/Web 业务代码和必要的 schema 初始化逻辑；本 change MUST NOT 写独立数据库 migration 文件，MUST NOT 批量迁移旧项目，MUST NOT 生成 Excel / Word / PDF 或接入文件平台。

#### Scenario: 客户联系人持久化
- **WHEN** 系统需要保存新建项目客户联系人
- **THEN** 系统 MUST 使用稳定项目主数据字段或等价持久化能力
- **AND** 旧项目缺少客户联系人时 MUST 允许为空
- **AND** 系统 MUST NOT 批量补写旧项目客户联系人

#### Scenario: 1.2 协同状态持久化
- **WHEN** 系统保存 `1.2` 商务部分和技术部分完成状态
- **THEN** 系统 SHOULD 优先复用现有在线表单数据存储
- **AND** 协同状态 MUST NOT 新增第二套审批状态机或资料状态机

#### Scenario: 不写独立 migration 文件
- **WHEN** 本 change 完成实现
- **THEN** 本 change MUST NOT 新增 migration 文件
- **AND** 若后续生成文件元数据或更复杂协同查询需要结构化字段，MUST 通过后续独立数据库设计处理

### Requirement: 1.2 协同填写复用现有架构

技术架构 MUST 让 `1.2` 协同填写复用现有在线表单、权限、工作台、评价审批、业务日志和阶段资料状态边界，不得引入第二套审批状态机或通用流程引擎。

#### Scenario: 不新增第二套审批流
- **WHEN** 系统实现 `1.2` 商务负责人和技术负责人协同填写
- **THEN** 系统 MUST 继续复用现有商务评价、技术评价、总经理审批节点
- **AND** 系统 MUST NOT 在普通表单里创建第二套商务评价、技术评价或总经理审批流

#### Scenario: 不新增第二套资料状态机
- **WHEN** 系统实现商务部分和技术部分完成状态
- **THEN** 系统 MUST 将其作为 `1.2` 在线表单内部协同状态或等价稳定状态
- **AND** 系统 MUST NOT 创建第二套上传、提交、审核、退回或返工规则

#### Scenario: 不引入 BPM
- **WHEN** 系统实现协同填写和评价审批启动门禁
- **THEN** 系统 MUST NOT 引入 BPM、通用流程引擎、可视化流程编排或任意节点配置器

### Requirement: 模板文件生成后置架构边界

技术架构 MUST 将 Excel / Word / PDF 生成、模板填充、文件存储、下载预览、文件版本和文件平台联动作为后续独立设计点；本 change MUST NOT 表达为已经完成文件生成。

#### Scenario: 本 change 不生成文件
- **WHEN** 本 change 完成实现
- **THEN** 系统 MUST NOT 生成 Excel、Word、PDF、普通附件或文件平台文件
- **AND** 系统 MUST NOT 新增模板填充库、文件生成 worker 或文件存储编排

#### Scenario: 文件生成后续独立设计
- **WHEN** 后续实现模板文件生成
- **THEN** 团队 MUST 独立明确模板填充规则、生成触发点、失败重试、覆盖或版本化策略、存储位置、预览下载权限和业务日志
- **AND** 后续实现 MUST 明确是否接入文件平台

#### Scenario: 文件平台保持独立 change
- **WHEN** 后续需要将生成文件归档或同步到文件平台
- **THEN** 文件平台联动 MUST 通过后续独立 change 处理
- **AND** 本 change MUST NOT 处理 `file-platform-integration-v1`

### Requirement: 旧项目和兼容区保持边界

技术架构 MUST 保持旧项目迁移、旧数据兼容展示和兼容资料区删除为后续独立事项。

#### Scenario: 不迁移旧项目
- **WHEN** 本 change 处于实现阶段
- **THEN** 系统 MUST NOT 自动迁移旧项目
- **AND** 系统 MUST NOT 补初始化旧项目或改写旧项目历史资料状态

#### Scenario: 不删除兼容资料区
- **WHEN** 本 change 完成实现
- **THEN** 系统 MUST NOT 删除、隐藏或物理移除兼容资料区
- **AND** 兼容资料区清理 MUST 通过后续独立 change 决定

#### Scenario: 不处理其他 active changes
- **WHEN** 本 change 完成实现
- **THEN** 团队 MUST NOT 在本 change 中处理 `file-platform-integration-v1` 或 `define-digital-platform-v1`
- **AND** 文件平台联动和数字平台定义 MUST 保持独立 change 边界
