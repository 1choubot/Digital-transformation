## ADDED Requirements

### Requirement: 项目权限 resolver 分层收敛
技术架构 MUST 逐步收敛项目权限身份判断到统一 resolver/helper，并保持查看权限和操作权限分离。

#### Scenario: 基础身份判断统一
- **WHEN** 后端代码需要判断总经理、总经理助理、系统管理员、中心负责人、项目经理或资料责任人身份
- **THEN** 实现 MUST 优先复用统一 helper/resolver，而不是在 repository、route 或 workflow 模块中新增孤立判断
- **AND** 中心负责人判断 MUST 支持参数化部门输入，覆盖 `BUSINESS_DEPARTMENT` 的实际枚举

#### Scenario: 查看权限不自动升级为操作权限
- **WHEN** resolver 返回用户可查看项目、资料或日志
- **THEN** 系统 MUST NOT 因可查看结果自动授予提交、审批、退回、上传、删除或阶段推进权限
- **AND** 操作权限 MUST 使用单独的操作语义或显式 gate 判断

#### Scenario: 不引入复杂 RBAC 或按钮矩阵
- **WHEN** 后端收敛项目权限 resolver
- **THEN** resolver MUST NOT 引入复杂 RBAC、按钮级权限矩阵或前端驱动的权限配置系统
- **AND** resolver MUST 保持面向现有项目、阶段、资料、节点和角色上下文的后端 helper 形态

#### Scenario: 第一批迁移保持行为不变
- **WHEN** 实现第一批身份 helper 收敛
- **THEN** 实现 MUST 保持现有 API、DTO、SQL、operation log、工作台待办和自动推进语义不变
- **AND** 实现 MUST 通过现有后端回归测试证明权限结果未变化

#### Scenario: 后续阶段流程复用统一权限基础
- **WHEN** 后续实现合同签订阶段、共享阶段机制或新的阶段 workflow
- **THEN** 后端 MUST 复用统一权限 helper/resolver 的基础身份和项目上下文能力
- **AND** 后续流程 MUST NOT 新建孤立权限判断体系
