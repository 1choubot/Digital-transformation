## ADDED Requirements

### Requirement: 组织角色与部门模型
系统 MUST 为数字化平台用户维护组织角色和部门归属规则，用于区分全局角色、部门内角色和岗位/职务展示文本。

#### Scenario: 组织角色枚举
- **WHEN** 系统保存用户组织角色
- **THEN** `organizationRole` 必须是 `general_manager`、`system_admin`、`general_manager_assistant`、`center_manager` 或 `employee` 之一

#### Scenario: 部门枚举
- **WHEN** 系统保存用户部门
- **THEN** `department` 必须为空或为 `operations_center`、`marketing_center`、`manufacturing_center`、`rd_center` 之一

#### Scenario: 独立全局角色不属于业务部门
- **WHEN** 用户 `organizationRole` 为 `general_manager`、`system_admin` 或 `general_manager_assistant`
- **THEN** 系统必须要求该用户 `department` 为空或 `null`，不得把这些角色隶属于四个业务部门

#### Scenario: 部门内角色必须属于业务部门
- **WHEN** 用户 `organizationRole` 为 `center_manager` 或 `employee`
- **THEN** 系统必须要求该用户 `department` 为四个业务部门之一

#### Scenario: 岗位文本和组织角色分离
- **WHEN** 系统保存用户岗位或职务描述
- **THEN** 系统必须保留现有 `role` 作为岗位/职务展示文本，并不得用 `role` 替代 `organizationRole` 的组织角色枚举

### Requirement: 系统管理员账号保护
系统 MUST 保持至少一个同时具备系统管理员组织角色和平台管理能力的启用账号，避免组织角色模型上线后系统无人管理账号、组织和基础配置。

#### Scenario: 系统管理员必须具备平台管理能力
- **WHEN** 用户 `organizationRole = system_admin`
- **THEN** 系统必须要求 `isPlatformAdmin = true`，用于用户、组织和基础配置管理

#### Scenario: 系统管理账号保护使用同时满足条件
- **WHEN** 系统校验是否仍保留系统管理账号
- **THEN** 系统必须只统计同时满足 `isEnabled = true`、`organizationRole = system_admin`、`isPlatformAdmin = true` 的用户，不得使用 `system_admin` 或 `isPlatformAdmin` 任一存在即可的口径

#### Scenario: 用户管理操作不得清空最后一个系统管理账号
- **WHEN** 用户新增、编辑、禁用、删除或权限降级操作会导致同时满足 `isEnabled = true`、`organizationRole = system_admin`、`isPlatformAdmin = true` 的账号数量变成 0
- **THEN** 系统必须拒绝该操作，并不得保存导致无人管理的用户状态

#### Scenario: 旧数据恢复逻辑不作为长期权限口径
- **WHEN** 后续实现需要为旧模拟数据或初始化数据补齐系统管理员组织角色
- **THEN** 该逻辑只能作为初始化或修复脚本行为，不得作为运行时长期权限判断，也不得把 `isPlatformAdmin = true` 但 `organizationRole` 非 `system_admin` 的账号计入保护数量

#### Scenario: 系统管理员不默认参与业务审批
- **WHEN** 用户仅因 `organizationRole = system_admin` 或 `isPlatformAdmin = true` 获得系统管理能力
- **THEN** 系统不得把该身份自动视为项目审批人、资料审批人、项目经理或资料责任人

### Requirement: 中心负责人本中心边界
系统 MUST 区分中心负责人的本中心业务边界和用户管理维护边界，并 MUST NOT 将中心负责人扩展为全局业务管理员或系统管理员。

#### Scenario: 中心负责人属于单一业务部门
- **WHEN** 用户 `organizationRole = center_manager`
- **THEN** 系统必须要求其隶属于且只隶属于一个业务部门

#### Scenario: 第一版不开放中心负责人用户维护
- **WHEN** 中心负责人访问用户新增、编辑、启用禁用、删除或重置密码等用户管理维护能力
- **THEN** 第一版系统必须拒绝或不展示该入口；本 change 中用户管理维护仍由 `organizationRole = system_admin` 且 `isPlatformAdmin = true` 的用户执行

#### Scenario: 后续中心负责人用户管理必须限制本中心
- **WHEN** 后续单独 change 实现中心负责人管理本中心员工能力
- **THEN** 系统必须将其管理范围限制为本中心员工，不得维护全局角色、系统管理员、其他中心人员或跨中心人员

#### Scenario: 中心负责人分配本中心资料责任人
- **WHEN** 中心负责人分配或清空资料责任人
- **THEN** 系统必须要求资料属于本中心相关范围；分配目标必须是本中心合法候选用户或项目允许范围内用户

#### Scenario: 不实现复杂权限矩阵
- **WHEN** 系统实现中心负责人边界
- **THEN** 系统不得在本 change 中实现复杂 RBAC、部门权限继承、按钮级权限矩阵或项目成员权限矩阵

### Requirement: 用户管理响应组织字段
系统 MUST 在用户管理列表和详情中返回组织角色和部门字段，并继续使用安全用户模型。

#### Scenario: 用户列表返回组织字段
- **WHEN** 平台管理员或有权用户查询用户列表
- **THEN** 响应必须包含 `organizationRole`、`department`、`role`、`isEnabled` 和 `isPlatformAdmin`

#### Scenario: 用户详情返回组织字段
- **WHEN** 平台管理员或有权用户查询用户详情
- **THEN** 响应必须包含 `organizationRole`、`department`、`role`、`isEnabled` 和 `isPlatformAdmin`

#### Scenario: 用户响应仍不返回密码字段
- **WHEN** 用户管理接口返回用户数据
- **THEN** 响应仍不得包含 `password_hash`、`passwordHash`、密码盐、重置令牌或任何密码内部字段

### Requirement: 总经理助理用户管理边界
系统 MUST 将总经理助理建模为查看、生成、汇总类全局角色，不得将其视为审批或系统管理角色。

#### Scenario: 总经理助理不属于业务部门
- **WHEN** 用户 `organizationRole = general_manager_assistant`
- **THEN** 系统必须要求其 `department` 为空或 `null`

#### Scenario: 总经理助理不是审批人
- **WHEN** 系统判断用户是否可确认资料、退回资料、推进阶段或代替总经理审批
- **THEN** 系统不得仅因用户是 `general_manager_assistant` 而允许这些审批或推进动作

#### Scenario: 总经理助理不是系统管理员
- **WHEN** 用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得默认授予用户管理、组织管理或基础配置管理权限
