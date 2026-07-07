## ADDED Requirements

### Requirement: 立项在线表单责任人分配权限一致性

系统 MUST 对 `1.1 项目需求表` 和 `1.2 项目立项审批表` 使用一致的责任人分配权限规则，并 MUST 保证后端返回的 `permissions.canManageResponsibility` 与责任人保存/清空接口的实际授权结果一致。

#### Scenario: 营销中心负责人可分配 1.1 和 1.2
- **WHEN** 当前用户是 `organizationRole = center_manager` 且 `department = marketing_center`
- **AND** 资料项为 `1.1 项目需求表` 或 `1.2 项目立项审批表`
- **THEN** 阶段资料清单、项目工作区产出或等价资料权限上下文 MUST 返回 `canManageResponsibility = true`
- **AND** 责任人保存/清空接口 MUST 允许该用户分配或清空责任人

#### Scenario: 非营销中心负责人不得分配 1.1 和 1.2
- **WHEN** 当前用户是研发中心负责人、其他中心负责人、总经理助理、系统管理员或非中心负责人
- **AND** 资料项为 `1.1 项目需求表` 或 `1.2 项目立项审批表`
- **THEN** 后端返回的 `canManageResponsibility` MUST 为 false
- **AND** 责任人保存/清空接口 MUST 拒绝该用户操作
- **AND** 系统 MUST NOT 因项目经理、项目创建人、总经理、项目查看权限或中心负责人身份本身放宽该权限

#### Scenario: 1.3 不单独分配责任人
- **WHEN** 资料项为 `1.3 项目立项通知`
- **THEN** 后端返回的 `canManageResponsibility` MUST 为 false
- **AND** 责任人保存/清空接口 MUST NOT 要求或允许为 `1.3` 单独分配资料责任人
- **AND** `1.3` MUST 继续按营销中心负责人默认处理规则填写和提交

#### Scenario: 其他阶段资料分配权限不被放宽
- **WHEN** 资料项不是 `1.1 项目需求表`、`1.2 项目立项审批表` 或 `1.3 项目立项通知`
- **THEN** 系统 MUST 继续使用既有资料责任人分配权限规则
- **AND** 本修复 MUST NOT 将营销中心负责人扩展为所有阶段资料的责任人分配人

#### Scenario: 在线表单提交责任人规则不变
- **WHEN** `1.1` 或 `1.2` 已完成责任人分配
- **THEN** 只有被分配责任人可保存、填写或提交对应在线表单
- **AND** 未分配责任人或当前用户不是责任人时，在线表单提交 MUST 继续被拒绝
