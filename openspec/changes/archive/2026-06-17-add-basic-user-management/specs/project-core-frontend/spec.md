## ADDED Requirements

### Requirement: 用户管理页面

前端 MUST 提供第一版基础用户管理页面，并 MUST 只允许平台管理员进入或操作。

#### Scenario: 平台管理员看到用户管理入口

- **WHEN** 当前登录用户 `isPlatformAdmin = true`
- **THEN** 前端必须展示用户管理入口

#### Scenario: 非管理员不展示入口

- **WHEN** 当前登录用户 `isPlatformAdmin` 不为 `true`
- **THEN** 前端不得展示用户管理入口，或在直接访问用户管理页面时展示无权限提示

#### Scenario: 加载用户列表

- **WHEN** 平台管理员打开用户管理页面
- **THEN** 前端必须携带当前登录态调用用户列表接口，并展示用户列表

#### Scenario: 展示用户基础字段

- **WHEN** 用户列表接口返回用户数据
- **THEN** 页面必须展示账号、姓名、部门、角色、启用状态、平台管理员标识和可空 `filePlatformUserId`
- **AND** 页面展示姓名时必须使用响应中的 `name`

#### Scenario: 新增用户表单

- **WHEN** 平台管理员在用户管理页面新增用户
- **THEN** 页面必须提供 `account`、`displayName`、`department`、`role`、`password`、`isEnabled`、`isPlatformAdmin` 和可空 `filePlatformUserId` 输入，并调用新增用户接口
- **AND** 页面必须使用 `displayName` 作为新增用户请求字段

#### Scenario: 编辑用户基础信息

- **WHEN** 平台管理员编辑用户
- **THEN** 页面必须允许编辑 `displayName`、`department`、`role`、`isEnabled`、`isPlatformAdmin` 和 `filePlatformUserId`，不得通过普通编辑表单修改 `account` 或 `password`
- **AND** 页面必须使用响应中的 `name` 初始化姓名展示，并使用 `displayName` 作为编辑用户请求字段

#### Scenario: 启用禁用用户

- **WHEN** 平台管理员在用户管理页面启用或禁用用户
- **THEN** 页面必须携带当前登录态调用对应用户管理接口，并在成功后刷新用户列表

#### Scenario: 重置密码

- **WHEN** 平台管理员在用户管理页面重置用户密码
- **THEN** 页面必须通过单独的重置密码操作提交新密码，并不得在页面展示密码哈希或密码内部字段

#### Scenario: 用户管理加载状态

- **WHEN** 前端请求用户管理接口
- **THEN** 页面必须处理加载中、接口失败和空用户列表状态

#### Scenario: 文件平台用户 ID 只展示和编辑

- **WHEN** 页面展示或编辑 `filePlatformUserId`
- **THEN** 页面不得调用文件管理平台校验、同步文件平台用户或判断文件平台权限

#### Scenario: 用户管理页面边界

- **WHEN** 用户查看或操作用户管理页面
- **THEN** 页面不得新增项目成员管理、责任人分配、个人待办、复杂权限矩阵、部门权限继承、审批流、文件平台同步、登录审计、用户管理操作日志、单点登录或批量导入用户入口
