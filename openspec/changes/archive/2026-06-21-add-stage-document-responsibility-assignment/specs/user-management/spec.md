## ADDED Requirements

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

## MODIFIED Requirements

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
