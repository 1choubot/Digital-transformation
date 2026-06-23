## ADDED Requirements

### Requirement: 登录态组织角色字段
系统 MUST 在登录响应和当前用户识别中返回组织角色、部门和岗位展示文本，并继续保持安全用户模型。

#### Scenario: 登录成功返回组织字段
- **WHEN** 启用用户登录成功
- **THEN** 当前用户信息必须包含 `organizationRole`、`department`、`role`、`isPlatformAdmin` 和可空 `filePlatformUserId`

#### Scenario: 当前用户接口返回组织字段
- **WHEN** 前端携带有效登录态请求 `/api/auth/me`
- **THEN** 系统必须返回当前用户的 `organizationRole`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId`

#### Scenario: 登录态安全响应不暴露凭据
- **WHEN** 登录响应或当前用户接口返回安全用户信息
- **THEN** 响应不得包含 `password_hash`、`passwordHash`、密码盐、重置令牌或任何登录凭据内部字段

### Requirement: 认证身份边界
系统 MUST 在认证和当前用户识别层区分系统管理员、业务组织角色和总经理助理，不得把认证字段直接扩展为复杂业务审批权限。

#### Scenario: 系统管理员和平台管理员边界
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统必须要求其与系统管理权限开关 `isPlatformAdmin = true` 保持一致，用于账号、组织和基础配置管理

#### Scenario: 系统管理员不是业务全局角色
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因该身份授予业务项目全局查看、资料确认、资料退回、阶段推进、资料责任人分配、标记不适用或恢复适用权限

#### Scenario: 平台管理能力不替代组织角色
- **WHEN** 系统判断用户是否属于系统管理员组织角色
- **THEN** 系统不得仅因 `isPlatformAdmin = true` 而把非 `system_admin` 用户视为系统管理员组织角色；长期权限口径必须保持组织角色和平台管理开关一致

#### Scenario: 总经理助理不视为审批人
- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得把该身份视为资料确认人、资料退回人、阶段推进人或总经理审批代理人

#### Scenario: 项目经理不是登录态全局角色
- **WHEN** 系统返回当前用户信息
- **THEN** 系统不得通过全局 `organizationRole` 表示项目经理；项目经理必须来自具体项目的用户关联

#### Scenario: 不在认证层实现复杂权限
- **WHEN** 系统识别当前用户
- **THEN** 认证层不得直接实现复杂 RBAC、项目成员权限、资料权限、文件权限或审批流节点权限

### Requirement: 责任人候选组织字段
系统 MUST 在资料责任人候选用户列表中提供组织角色和部门展示所需字段，并继续限制安全字段。

#### Scenario: 候选用户包含组织字段
- **WHEN** 已登录用户请求 `GET /api/users/responsibility-candidates`
- **THEN** 每个候选用户必须包含 `organizationRole`、`department`、`role`、`id`、`account`、`name` 和可空 `filePlatformUserId`

#### Scenario: 候选用户只返回可作为资料责任人的启用用户
- **WHEN** 系统返回责任人候选用户列表
- **THEN** 系统必须只返回 `isEnabled = true`、`organizationRole` 为 `center_manager` 或 `employee`、且 `department` 为四个业务部门之一的用户

#### Scenario: 候选用户排除全局角色和禁用用户
- **WHEN** 系统返回责任人候选用户列表
- **THEN** 系统不得返回总经理、系统管理员、总经理助理或禁用用户

#### Scenario: 候选用户不返回管理或密码内部字段
- **WHEN** 系统返回责任人候选用户列表
- **THEN** 响应不得包含 `passwordHash`、`password_hash`、密码盐、重置令牌、`isPlatformAdmin`、`is_platform_admin` 或其他非展示必需的内部管理字段
