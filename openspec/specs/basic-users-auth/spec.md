# basic-users-auth Specification

## Purpose
TBD - created by archiving change add-basic-users-auth. Update Purpose after archive.
## Requirements
### Requirement: 数字化平台用户主数据

系统 MUST 在数字化平台自己的 MySQL 数据库中维护基础用户主数据。用户主数据至少包括账号、姓名、部门、角色、启用状态、平台管理员标识和可选 `filePlatformUserId`。

#### Scenario: 保存启用用户

- **WHEN** 系统初始化或保存数字化平台用户
- **THEN** 系统必须保存账号、姓名、部门、角色、启用状态、平台管理员标识和可选 `filePlatformUserId`

#### Scenario: 用户账号唯一

- **WHEN** 系统保存数字化平台用户
- **THEN** 系统必须保证账号在数字化平台用户表中唯一

#### Scenario: 平台管理员标识默认非管理员

- **WHEN** 系统创建普通数字化平台用户且未明确设置平台管理员标识
- **THEN** 系统必须默认保存 `isPlatformAdmin = false`

#### Scenario: 初始化账号默认为平台管理员

- **WHEN** 系统初始化首个或默认账号
- **THEN** 系统必须默认将初始化账号保存为 `isPlatformAdmin = true`

#### Scenario: 初始化账号配置不得导致无人管理

- **WHEN** 初始化账号脚本支持显式配置覆盖平台管理员标识
- **THEN** 该覆盖不得导致初始化完成后没有任何启用平台管理员

#### Scenario: 升级已有环境可恢复平台管理员

- **WHEN** 已有环境升级后重新运行初始化账号脚本
- **THEN** 系统必须能够把初始化账号设置或恢复为启用平台管理员

#### Scenario: 文件平台用户映射可为空

- **WHEN** 用户暂未建立文件管理平台用户映射
- **THEN** 系统必须允许 `filePlatformUserId` 为空

#### Scenario: 不共用文件平台用户表

- **WHEN** 系统保存或读取数字化平台用户
- **THEN** 系统不得直接读取、共用或迁移文件管理平台数据库中的用户表

### Requirement: 基础登录

系统 MUST 提供数字化平台基础登录能力，通过数字化平台用户表校验账号、密码和启用状态，并在安全用户信息中返回平台管理员标识。

#### Scenario: 启用用户登录成功

- **WHEN** 启用用户提交正确账号和密码
- **THEN** 系统必须返回登录态和当前用户信息，当前用户信息必须包含 `isPlatformAdmin`

#### Scenario: 账号或密码错误

- **WHEN** 用户提交不存在的账号或错误密码
- **THEN** 系统必须拒绝登录，并返回可读错误提示

#### Scenario: 禁用用户不能登录

- **WHEN** 禁用用户提交正确账号和密码
- **THEN** 系统必须拒绝建立新的登录态，并提示用户已禁用

#### Scenario: 登录响应不暴露凭据

- **WHEN** 登录成功后系统返回当前用户信息
- **THEN** 响应中不得包含密码、密码哈希或登录凭据内部字段

### Requirement: 当前用户识别

系统 MUST 能根据前端保存的登录态识别当前数字化平台用户，并返回当前用户基础信息和平台管理员标识。

#### Scenario: 获取当前用户

- **WHEN** 前端携带有效登录态请求当前用户信息
- **THEN** 系统必须返回当前用户的账号、姓名、部门、角色、启用状态、平台管理员标识和可选 `filePlatformUserId`

#### Scenario: 当前用户响应字段命名

- **WHEN** 系统返回当前用户安全信息
- **THEN** 姓名响应字段必须沿用当前安全用户模型 `name`，不得改为 `displayName`

#### Scenario: 登录态无效

- **WHEN** 前端未携带登录态、登录态无效或已过期
- **THEN** 系统必须拒绝当前用户请求，并提示需要重新登录

#### Scenario: 当前用户识别不判断文件权限

- **WHEN** 系统返回当前用户信息
- **THEN** 系统不得在本能力中判断文件下载权限、同步文件平台权限或访问文件管理平台数据库

### Requirement: 退出登录

系统 MUST 提供 `POST /api/auth/logout` 退出登录接口，用于结束当前登录态。

#### Scenario: 成功退出登录

- **WHEN** 已登录用户请求退出登录
- **THEN** 系统必须结束当前登录态，并返回退出成功结果

#### Scenario: 退出后不能继续识别当前用户

- **WHEN** 用户退出登录后继续使用原登录态请求当前用户信息
- **THEN** 系统必须拒绝当前用户请求，并提示需要重新登录

#### Scenario: 退出登录不触发文件平台联动

- **WHEN** 用户请求退出登录
- **THEN** 系统不得同步文件平台用户、同步权限、判断下载权限或访问文件管理平台数据库

### Requirement: 前端登录页

前端 MUST 提供数字化管理平台登录页，并 MUST 调用数字化平台后端登录接口完成登录。

#### Scenario: 展示登录页

- **WHEN** 用户未登录并打开数字化管理平台
- **THEN** 前端必须展示登录页，允许输入账号和密码

#### Scenario: 登录成功进入项目页面

- **WHEN** 用户在登录页提交正确账号和密码
- **THEN** 前端必须保存登录态，并进入项目核心页面

#### Scenario: 登录失败提示

- **WHEN** 登录接口返回账号或密码错误、用户禁用或其他登录失败
- **THEN** 前端必须展示可读错误提示，且不得进入项目页面

### Requirement: 前端登录态和当前用户展示

前端 MUST 保存登录态，恢复当前登录用户，并在项目页面展示当前登录用户。

#### Scenario: 恢复登录态

- **WHEN** 用户刷新页面且本地存在登录态
- **THEN** 前端必须请求当前用户接口验证登录态，并恢复当前登录用户

#### Scenario: 保存平台管理员标识

- **WHEN** 当前用户接口返回 `isPlatformAdmin`
- **THEN** 前端必须在当前用户状态中保存该字段，供用户管理入口判断使用

#### Scenario: 项目页面展示当前用户

- **WHEN** 用户打开项目列表、新建项目或项目详情页面
- **THEN** 前端必须展示当前登录用户的姓名、部门和角色

#### Scenario: 登录态失效返回登录页

- **WHEN** 当前用户接口提示登录态无效或已过期
- **THEN** 前端必须清理本地登录态，并返回登录页

#### Scenario: 不引入排除能力

- **WHEN** 前端保存登录态或展示当前用户
- **THEN** 除用户管理页面入口使用 `isPlatformAdmin` 判断、项目详情页责任人选择使用启用用户候选列表外，前端不得实现复杂菜单权限、文件下载权限、文件平台用户同步、部门权限继承、审批流、单点登录或细粒度按钮权限

### Requirement: 责任人候选用户列表

系统 MUST 提供 `GET /api/users/responsibility-candidates` 用于资料项责任人选择的启用用户候选列表，并 MUST 只返回固定安全用户字段。

#### Scenario: 查询责任人候选用户要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/users/responsibility-candidates`
- **THEN** 系统必须拒绝请求，并提示需要登录

#### Scenario: 查询责任人候选用户不要求平台管理员

- **WHEN** 已登录用户请求 `GET /api/users/responsibility-candidates`
- **THEN** 系统必须允许进入候选用户查询，不得要求 `isPlatformAdmin = true`

#### Scenario: 候选用户接口不得被管理员中间件包住

- **WHEN** 系统注册 `GET /api/users/responsibility-candidates`
- **THEN** 该接口不得被现有用户管理维护路由的 `requirePlatformAdmin` 中间件包住

#### Scenario: 只返回启用用户

- **WHEN** 已登录用户请求 `GET /api/users/responsibility-candidates`
- **THEN** 系统必须只返回 `isEnabled = true` 的数字化平台用户

#### Scenario: 候选用户固定安全字段

- **WHEN** 系统返回责任人候选用户列表
- **THEN** 每个候选用户必须只返回 `id`、`account`、`name`、`department`、`role` 和可空 `filePlatformUserId`

#### Scenario: 候选用户不返回管理员或密码内部字段

- **WHEN** 系统返回责任人候选用户列表
- **THEN** 响应不得包含 `isPlatformAdmin`、`is_platform_admin`、`password_hash`、`passwordHash`、密码盐、重置令牌或任何密码内部字段

#### Scenario: 候选列表不维护用户

- **WHEN** 用户调用 `GET /api/users/responsibility-candidates`
- **THEN** 系统不得通过该能力新增用户、编辑用户、启用用户、禁用用户、重置密码或修改平台管理员标识

#### Scenario: 候选列表不联动文件平台

- **WHEN** 系统查询或返回责任人候选用户
- **THEN** 系统不得调用文件管理平台、读取文件管理平台用户表、同步文件平台用户或判断文件平台权限

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

