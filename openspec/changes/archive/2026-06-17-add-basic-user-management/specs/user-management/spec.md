## ADDED Requirements

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

用户管理能力 MUST 只实现第一版基础用户维护，不得扩展为其他平台能力。

#### Scenario: 不实现项目和待办能力

- **WHEN** 系统处理用户管理
- **THEN** 系统不得在本能力中实现项目成员管理、项目经理账号绑定、责任人分配或个人待办

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
