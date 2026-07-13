## ADDED Requirements

### Requirement: 方案设计在线表单生成文件下载 revision 规则
项目核心能力 MUST 让 C05 项目方案分析表、C15 内部方案评审记录表和 C16 客户方案评审记录表生成文件下载使用与节点提交门禁一致的 revision 规则。

#### Scenario: C05 高 revision 生成文件可下载
- **WHEN** C05 项目方案分析表已提交
- **AND** `form.revision >= solution_analysis.current_revision`
- **AND** 生成文件状态为 `generated`
- **AND** `generated_file_storage_key` 非空且存储文件可读
- **THEN** 后端 MUST 允许下载 C05 项目方案分析表生成文件

#### Scenario: C15 C16 高 revision 生成文件可下载
- **WHEN** C15 内部方案评审记录表或 C16 客户方案评审记录表已提交
- **AND** `form.revision >= 对应评审节点 current_revision`
- **AND** 生成文件状态为 `generated`
- **AND** `generated_file_storage_key` 非空且存储文件可读
- **THEN** 后端 MUST 允许下载对应方案评审记录表生成文件

#### Scenario: 生成文件下载拒绝未满足业务状态
- **WHEN** 用户下载 C05、C15 或 C16 生成文件
- **AND** 表单不存在、表单未提交、`form.revision < node.current_revision`、生成状态不是 `generated` 或 `generated_file_storage_key` 为空
- **THEN** 后端 MUST 拒绝下载并返回生成文件不可用业务错误

#### Scenario: 生成文件下载拒绝缺失存储文件
- **WHEN** 用户下载 C05、C15 或 C16 生成文件
- **AND** 表单状态和 revision 满足下载规则
- **AND** 存储文件不可读或已丢失
- **THEN** 后端 MUST 拒绝下载并返回存储文件缺失业务错误

#### Scenario: 下载规则不改变方案设计流程边界
- **WHEN** 实现本下载规则修复
- **THEN** 系统 MUST NOT 改变方案设计状态机、节点版本递增规则、表单 revision 递增规则、模板生成内容、前端页面或数据库结构
