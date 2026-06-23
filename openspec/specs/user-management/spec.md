# user-management Specification

## Purpose
TBD - created by archiving change add-basic-user-management. Update Purpose after archive.
## Requirements
### Requirement: 平台管理员边界

系统 MUST 提供最小平台管理员边界，用于保护第一版用户管理 API 和用户管理页面入口。

#### Scenario: 用户保存平台管理员标识

- **WHEN** 系统保存数字化平台用户
- **THEN** 系统必须保存 `is_platform_admin` 字段，并通过 API 映射为 `isPlatformAdmin`

#### Scenario: 平台管理员只保护用户管理

- **WHEN** 系统校验 `isPlatformAdmin`
- **THEN** 该校验只能用于用户管理 API 和用户管理页面入口，不得扩展为项目权限、资料权限、阶段权限或文件权限

#### Scenario: 初始化账号默认成为平台管理员

- **WHEN** 系统初始化首个或默认账号
- **THEN** 初始化账号默认必须保存为 `isPlatformAdmin = true`，避免系统无人可管理用户

#### Scenario: 初始化账号配置不得导致无人管理

- **WHEN** 初始化账号脚本支持显式配置覆盖 `isPlatformAdmin`
- **THEN** 该覆盖不得导致初始化完成后没有任何启用平台管理员；否则系统必须拒绝配置或恢复初始化账号为启用平台管理员

#### Scenario: 已有环境升级兜底

- **WHEN** 已有环境升级后重新运行初始化账号脚本
- **THEN** 系统必须能够把初始化账号设置或恢复为启用平台管理员，用于避免升级后无人可管理

#### Scenario: 非复杂权限

- **WHEN** 系统实现平台管理员边界
- **THEN** 系统不得在本能力中实现复杂 RBAC、部门权限继承、项目级权限矩阵、资料项权限或按钮级权限矩阵

### Requirement: 用户管理接口访问控制

系统 MUST 为用户管理接口同时要求登录态和平台管理员身份。

#### Scenario: 未登录不能访问用户管理

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求用户管理接口
- **THEN** 系统必须拒绝请求，并提示需要登录

#### Scenario: 非平台管理员不能访问用户管理

- **WHEN** 已登录但 `isPlatformAdmin` 不为 `true` 的用户请求用户管理接口
- **THEN** 系统必须拒绝请求，并返回无权限错误

#### Scenario: 平台管理员可访问用户管理

- **WHEN** 已登录且 `isPlatformAdmin = true` 的用户请求用户管理接口
- **THEN** 系统必须允许进入对应用户管理业务校验

#### Scenario: 不信任前端操作人

- **WHEN** 用户管理接口处理请求
- **THEN** 系统必须使用当前登录态识别当前操作用户，不得信任前端传入当前操作人字段

### Requirement: 用户管理安全响应

系统 MUST 在用户管理接口中返回安全用户数据，不得暴露密码内部字段。

#### Scenario: 用户响应不包含密码字段

- **WHEN** 用户管理接口返回用户数据
- **THEN** 响应不得包含 `password_hash`、`passwordHash`、密码盐、重置令牌或其他密码内部字段

#### Scenario: 用户响应包含基础字段

- **WHEN** 用户管理接口返回用户数据
- **THEN** 响应必须包含 `id`、`account`、`name`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId`

#### Scenario: 用户字段命名统一

- **WHEN** 用户管理接口处理用户姓名字段
- **THEN** 请求字段必须使用 `displayName`，数据库字段必须使用 `display_name`，响应字段必须使用安全用户模型中的 `name`

### Requirement: 用户列表和查询

系统 MUST 提供平台管理员查看数字化平台用户的能力。

#### Scenario: 查询用户列表

- **WHEN** 平台管理员请求用户列表
- **THEN** 系统必须返回数字化平台用户列表，并使用安全用户数据模型

#### Scenario: 查询单个用户

- **WHEN** 平台管理员请求查看某个用户详情
- **THEN** 系统 MAY 提供单个用户查询接口；如提供，必须校验用户存在并返回安全用户数据模型

#### Scenario: 用户不存在

- **WHEN** 平台管理员请求不存在的用户
- **THEN** 系统必须返回用户不存在错误

### Requirement: 新增用户

系统 MUST 允许平台管理员新增数字化平台用户。

#### Scenario: 新增有效用户

- **WHEN** 平台管理员提交有效的新增用户信息
- **THEN** 系统必须创建用户，并将请求中的 `displayName` 保存到数据库 `display_name`，响应时通过安全用户模型返回 `name`
- **AND** 系统必须保存 `account`、`department`、`role`、`password` 对应的密码哈希、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId`

#### Scenario: 新增用户必填字段

- **WHEN** 平台管理员新增用户但缺少 `account`、`displayName`、`department`、`role` 或 `password`
- **THEN** 系统必须拒绝创建，并提示缺失字段

#### Scenario: 账号唯一

- **WHEN** 平台管理员新增用户且 `account` 已存在
- **THEN** 系统必须拒绝创建，并返回账号已存在错误

#### Scenario: 默认启用

- **WHEN** 平台管理员新增用户且未明确提供 `isEnabled`
- **THEN** 系统必须默认保存 `isEnabled = true`

#### Scenario: 默认非平台管理员

- **WHEN** 平台管理员新增用户且未明确提供 `isPlatformAdmin`
- **THEN** 系统必须默认保存 `isPlatformAdmin = false`

#### Scenario: 文件平台用户 ID 可为空

- **WHEN** 平台管理员新增用户且未提供 `filePlatformUserId`
- **THEN** 系统必须允许该字段为空，并不得调用文件管理平台校验

### Requirement: 编辑用户基础信息

系统 MUST 允许平台管理员编辑用户基础信息，但不得通过普通编辑接口修改账号或密码。

#### Scenario: 编辑基础信息

- **WHEN** 平台管理员提交有效的用户编辑信息
- **THEN** 系统必须允许修改 `displayName`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和 `filePlatformUserId`
- **AND** 系统必须将请求中的 `displayName` 保存到数据库 `display_name`，响应时通过安全用户模型返回 `name`

#### Scenario: 普通编辑不修改账号

- **WHEN** 平台管理员通过普通编辑接口提交 `account`
- **THEN** 系统必须忽略或拒绝账号修改，且不得改变用户账号

#### Scenario: 普通编辑不修改密码

- **WHEN** 平台管理员通过普通编辑接口提交 `password` 或密码内部字段
- **THEN** 系统必须忽略或拒绝密码修改，且不得改变用户密码

#### Scenario: 编辑不存在用户

- **WHEN** 平台管理员编辑不存在的用户
- **THEN** 系统必须返回用户不存在错误

### Requirement: 启用和禁用用户

系统 MUST 允许平台管理员启用或禁用数字化平台用户。

#### Scenario: 禁用用户

- **WHEN** 平台管理员禁用某个用户
- **THEN** 系统必须将该用户保存为 `isEnabled = false`

#### Scenario: 启用用户

- **WHEN** 平台管理员启用某个用户
- **THEN** 系统必须将该用户保存为 `isEnabled = true`

#### Scenario: 禁用用户不能新登录

- **WHEN** 已禁用用户提交正确账号和密码
- **THEN** 系统必须拒绝建立新的登录态，并提示用户已禁用

#### Scenario: 不强制踢下线

- **WHEN** 当前已登录用户被禁用
- **THEN** 第一版不得新增强制踢下线能力；后续请求是否被拒绝由现有当前用户识别和登录态校验规则决定

### Requirement: 至少保留一个启用平台管理员

系统 MUST 防止用户管理操作导致系统进入 `0` 个启用平台管理员状态。

#### Scenario: 禁用最后一个启用平台管理员

- **WHEN** 平台管理员禁用用户会导致系统没有任何 `isEnabled = true` 且 `isPlatformAdmin = true` 的用户
- **THEN** 系统必须拒绝操作并返回稳定错误，且不得改变该用户的启用状态或平台管理员标识

#### Scenario: 取消最后一个启用平台管理员

- **WHEN** 平台管理员取消用户的 `isPlatformAdmin` 会导致系统没有任何启用平台管理员
- **THEN** 系统必须拒绝操作并返回稳定错误，且不得改变该用户的平台管理员标识或启用状态

#### Scenario: 编辑启用和管理员字段导致无人管理

- **WHEN** 平台管理员通过普通编辑接口修改 `isEnabled` 或 `isPlatformAdmin`，且修改结果会导致系统没有任何启用平台管理员
- **THEN** 系统必须拒绝操作并返回稳定错误，且不得保存本次编辑

#### Scenario: 安全不变量不是复杂权限

- **WHEN** 系统校验至少保留一个启用平台管理员
- **THEN** 该校验只能用于用户管理自身的基础安全保护，不得扩展为项目权限、部门权限、资料权限、文件权限或按钮权限

### Requirement: 重置用户密码

系统 MUST 允许平台管理员通过单独接口重置用户密码。

#### Scenario: 重置密码成功

- **WHEN** 平台管理员为存在用户提交有效新密码
- **THEN** 系统必须更新该用户密码哈希，并不得在响应中返回密码或密码哈希

#### Scenario: 重置密码必填

- **WHEN** 平台管理员重置密码但未提供非空新密码
- **THEN** 系统必须拒绝请求，并提示密码必填

#### Scenario: 重置不存在用户密码

- **WHEN** 平台管理员重置不存在用户的密码
- **THEN** 系统必须返回用户不存在错误

### Requirement: 用户管理边界

用户管理能力 MUST 只实现第一版基础用户维护，不得扩展为其他平台能力；`GET /api/users/responsibility-candidates` 责任人候选用户列表属于资料责任人分配的辅助查询能力，不属于用户管理维护接口。

#### Scenario: 不实现项目和待办能力

- **WHEN** 系统处理用户管理
- **THEN** 系统不得在用户管理维护能力中实现项目成员管理、项目经理账号绑定、责任人分配或个人待办

#### Scenario: 不实现复杂权限

- **WHEN** 系统处理用户管理
- **THEN** 系统不得在本能力中实现复杂权限、角色权限矩阵、部门权限继承、资料项权限、项目级权限矩阵或按钮级权限矩阵

#### Scenario: 不联动文件平台

- **WHEN** 系统处理用户管理
- **THEN** 系统不得同步文件平台用户、读取文件管理平台用户表或判断文件平台权限

#### Scenario: 不记录用户管理操作日志

- **WHEN** 平台管理员执行用户管理操作
- **THEN** 第一版不得写入登录审计、用户管理操作日志或项目业务操作日志

#### Scenario: 不实现单点登录和批量导入

- **WHEN** 系统处理用户管理
- **THEN** 系统不得在本能力中实现单点登录或批量导入用户

#### Scenario: 候选列表不改变用户管理边界

- **WHEN** 系统提供 `GET /api/users/responsibility-candidates`
- **THEN** 该候选列表不得改变用户管理接口的平台管理员保护规则，也不得允许非平台管理员维护用户主数据

### Requirement: 责任人候选列表与用户管理边界

系统 MUST 将 `GET /api/users/responsibility-candidates` 责任人候选用户列表与平台管理员用户管理维护接口保持边界隔离。

#### Scenario: 候选列表不是用户管理维护接口

- **WHEN** 已登录用户请求 `GET /api/users/responsibility-candidates`
- **THEN** 系统必须将该能力作为业务分配辅助查询处理，不得要求平台管理员身份，也不得提供用户新增、编辑、启用、禁用或重置密码能力

#### Scenario: 候选列表不得被平台管理员中间件包住

- **WHEN** 系统注册 `GET /api/users/responsibility-candidates`
- **THEN** 该接口不得被现有用户管理维护路由的 `requirePlatformAdmin` 中间件包住

#### Scenario: 用户管理仍由平台管理员保护

- **WHEN** 用户请求用户列表维护、新增用户、编辑用户、启用禁用用户或重置密码等用户管理接口
- **THEN** 系统必须继续要求登录态和 `isPlatformAdmin = true`

#### Scenario: 平台管理员不扩展为资料权限

- **WHEN** 系统处理资料项责任人分配或 `GET /api/users/responsibility-candidates`
- **THEN** 系统不得使用 `isPlatformAdmin` 作为项目权限、资料权限、文件权限或责任人分配权限

#### Scenario: 候选列表不返回平台管理员字段

- **WHEN** 系统返回 `GET /api/users/responsibility-candidates` 的候选用户
- **THEN** 响应不得包含 `isPlatformAdmin` 或 `is_platform_admin`

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

