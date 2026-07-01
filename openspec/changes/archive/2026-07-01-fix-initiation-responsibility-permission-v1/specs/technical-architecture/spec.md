## ADDED Requirements

### Requirement: 立项责任人分配授权 helper 边界

技术架构 MUST 使用专用授权 helper 表达立项在线表单责任人分配权限，避免通过全局项目责任人管理权限或项目查看权限放宽 `1.1 / 1.2` 分配能力。

#### Scenario: 专用 helper 范围
- **WHEN** 后端判断 `1.1 项目需求表` 或 `1.2 项目立项审批表` 的责任人分配权限
- **THEN** 后端 MUST 使用 `canManageInitiationOnlineFormResponsibility` 或等价专用 helper
- **AND** 该 helper MUST 只允许营销中心负责人
- **AND** 该 helper MUST 排除总经理助理、系统管理员、研发中心负责人和非营销中心负责人

#### Scenario: 返回权限和写接口复用同一口径
- **WHEN** 后端构建阶段资料清单、项目工作区产出权限或执行责任人保存/清空接口
- **THEN** `1.1 / 1.2` 的 `canManageResponsibility` 返回值和写接口授权 MUST 复用同一专用 helper 或等价共享逻辑
- **AND** 系统 MUST NOT 在返回权限与实际写接口之间维护两套不一致规则

#### Scenario: 不放宽全局责任人管理 helper
- **WHEN** 实现该修复
- **THEN** 后端 MUST NOT 直接放宽全局 `canManageProjectResponsibility` 或等价全局 helper
- **AND** 其他阶段资料责任人分配权限 MUST 保持既有规则

#### Scenario: 1.3 不进入责任人分配 helper
- **WHEN** 后端判断 `1.3 项目立项通知`
- **THEN** 专用责任人分配 helper MUST 返回 false
- **AND** 系统 MUST NOT 通过资料责任人分配接口表达 `1.3` 默认处理人
