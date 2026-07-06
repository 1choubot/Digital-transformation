## ADDED Requirements

### Requirement: 立项在线表单模板对齐架构边界

技术架构 MUST 支持后续通过在线表单 schema 扩展对齐真实模板，同时 MUST NOT 在本 change 引入文件平台、文件生成、数据库 migration 或第二套流程状态机。

#### Scenario: 在线表单数据复用现有存储
- **WHEN** 后续实现扩展 `1.1`、`1.2`、`1.3` 在线表单 schema
- **THEN** 系统 MUST 优先复用现有在线表单数据存储
- **AND** schema MUST 支持分组、评分项或表格型结构、只读/自动带出字段和通知预览
- **AND** 本 change MUST NOT 引入旧 schema 兼容层
- **AND** 在线表单读取 MUST 以当前 schema 为准
- **AND** 旧简化 `form_data_json` MUST NOT 转换或迁移为新字段结构
- **AND** 实现阶段若证明必须调整数据库结构，MUST 通过独立明确的数据库设计和 migration 评审处理

#### Scenario: 不生成文件不接文件平台
- **WHEN** 用户保存、提交或查看 `1.1`、`1.2`、`1.3` 在线表单
- **THEN** 系统 MUST NOT 生成 Excel、Word、PDF 或普通附件
- **AND** 系统 MUST NOT 调用文件平台或模板套打能力
- **AND** 系统 MUST NOT 将在线表单完成状态绑定到文件平台文件

#### Scenario: 不引入第二套审批或状态机
- **WHEN** 后续实现 `1.2 项目立项审批表` 的商务模块、技术模块和三方意见展示
- **THEN** 系统 MUST 继续复用现有 `1.2` 商务评价、技术评价、总经理审批流
- **AND** 系统 MUST NOT 在普通表单里创建第二套商务评价、技术评价或总经理审批状态机
- **AND** 系统 MUST NOT 改变项目结束、退回、返工主流程

#### Scenario: 本规划 change 不修改业务代码
- **WHEN** 本规划 change 处于 proposal/design/spec/tasks 阶段
- **THEN** 变更 MUST 只包含规划文档和 OpenSpec artifacts
- **AND** 变更 MUST NOT 修改 `digital-platform-api/src/**`
- **AND** 变更 MUST NOT 修改 `digital-platform-web/src/**`
- **AND** 变更 MUST NOT 修改数据库 schema 或 migration
