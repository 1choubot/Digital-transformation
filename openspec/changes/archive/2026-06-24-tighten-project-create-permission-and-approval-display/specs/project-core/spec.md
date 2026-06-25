## MODIFIED Requirements

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建必须要求当前登录用户具备创建项目权限；创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入。

#### Scenario: 成功创建项目

- **WHEN** 具备创建项目权限的已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 未登录不能创建项目

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时提交项目创建请求
- **THEN** 系统必须拒绝创建，并返回需要登录的错误

#### Scenario: 总经理可以创建项目

- **WHEN** 当前登录用户 `organizationRole = general_manager` 且提交有效项目创建信息
- **THEN** 系统必须允许创建项目，并继续执行项目主数据保存、8 阶段初始化、54 项 v20260610 资料初始化和 `project.created` 业务日志写入

#### Scenario: 中心负责人可以创建项目

- **WHEN** 当前登录用户 `organizationRole = center_manager` 且提交有效项目创建信息
- **THEN** 系统必须允许创建项目，并继续执行项目主数据保存、8 阶段初始化、54 项 v20260610 资料初始化和 `project.created` 业务日志写入

#### Scenario: 普通员工不能创建项目

- **WHEN** 当前登录用户 `organizationRole = employee` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 总经理助理不能创建项目

- **WHEN** 当前登录用户 `organizationRole = general_manager_assistant` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 系统管理员不能创建项目

- **WHEN** 当前登录用户 `organizationRole = system_admin` 且提交项目创建请求
- **THEN** 系统必须拒绝创建，返回 `FORBIDDEN_OPERATION`，HTTP 状态码必须为 403

#### Scenario: 创建失败无副作用

- **WHEN** 项目创建因权限不足、字段校验失败、项目经理校验失败或其他创建前置校验失败
- **THEN** 系统不得插入项目主数据，不得生成项目阶段，不得生成项目级阶段资料，不得写入 `project.created` 或其他成功业务日志

#### Scenario: 创建信息不完整

- **WHEN** 具备创建项目权限的已登录用户缺少项目编号、项目名称、客户或项目经理等必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息

#### Scenario: 创建人来自当前登录态

- **WHEN** 具备创建项目权限的已登录用户创建项目
- **THEN** 系统必须根据当前登录态识别创建人，不得信任前端提交的创建人字段

#### Scenario: 创建项目不触发文件平台联动

- **WHEN** 项目创建成功
- **THEN** 系统不能在本能力中调用文件管理平台创建目录、上传文件、下载文件、生成文件映射、同步文件平台用户、同步权限或判断下载权限

#### Scenario: 创建日志失败回滚项目创建

- **WHEN** 项目主数据、8 阶段初始化或项目级阶段资料清单初始化已经准备提交，但 `project.created` 业务操作日志写入失败
- **THEN** 系统必须回滚项目创建事务，不得留下没有对应创建日志的新项目
