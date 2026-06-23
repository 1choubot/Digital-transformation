## ADDED Requirements

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

## MODIFIED Requirements

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
