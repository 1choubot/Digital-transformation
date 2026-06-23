## MODIFIED Requirements

### Requirement: 项目创建

系统 MUST 提供项目创建能力。项目创建成功后必须同时完成项目主数据保存、当前登录用户创建人记录、标准 8 阶段初始化、项目级阶段资料清单初始化和 `project.created` 项目业务操作日志写入。

#### Scenario: 成功创建项目

- **WHEN** 已登录用户提交有效的项目创建信息
- **THEN** 系统必须保存项目主数据、记录当前登录用户为创建人、为该项目生成标准 8 阶段记录、初始化项目级阶段资料清单，并在同一事务中记录 `action_type = project.created` 的项目业务操作日志

#### Scenario: 未登录不能创建项目

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时提交项目创建请求
- **THEN** 系统必须拒绝创建，并返回需要登录的错误

#### Scenario: 创建信息不完整

- **WHEN** 已登录用户缺少项目编号、项目名称、客户或项目经理等必需基础信息
- **THEN** 系统必须拒绝创建，并提示需要补充的信息

#### Scenario: 创建人来自当前登录态

- **WHEN** 已登录用户创建项目
- **THEN** 系统必须根据当前登录态识别创建人，不得信任前端提交的创建人字段

#### Scenario: 创建项目不触发文件平台联动

- **WHEN** 项目创建成功
- **THEN** 系统不能在本能力中调用文件管理平台创建目录、上传文件、下载文件、生成文件映射、同步文件平台用户、同步权限或判断下载权限

#### Scenario: 创建日志失败回滚项目创建

- **WHEN** 项目主数据、8 阶段初始化或项目级阶段资料清单初始化已经准备提交，但 `project.created` 业务操作日志写入失败
- **THEN** 系统必须回滚项目创建事务，不得留下没有对应创建日志的新项目

### Requirement: 标准 8 阶段初始化

系统 MUST 在项目创建成功后为项目初始化标准 8 阶段，阶段必须包含顺序、阶段标识、阶段名称和阶段状态，并作为项目级阶段资料清单分组依据。

#### Scenario: 初始化阶段顺序

- **WHEN** 项目创建成功
- **THEN** 系统必须按顺序生成立项阶段、方案设计阶段、合同签订阶段、详细设计阶段、生产制作阶段、预验收阶段、终验收阶段和结题阶段

#### Scenario: 初始化阶段标识

- **WHEN** 系统生成标准 8 阶段记录
- **THEN** 每个阶段必须保存稳定阶段标识：`initiation`、`solution`、`contract`、`detailedDesign`、`manufacturing`、`preAcceptance`、`finalAcceptance`、`closeout`

#### Scenario: 初始化当前阶段

- **WHEN** 系统完成 8 阶段初始化
- **THEN** 立项阶段必须被标记为当前阶段，其他阶段必须处于未开始状态

#### Scenario: 阶段资料清单随项目初始化

- **WHEN** 系统完成项目创建和 8 阶段初始化
- **THEN** 系统必须为该项目生成按 8 阶段归属的项目级阶段资料清单

#### Scenario: 阶段初始化不生成排除能力

- **WHEN** 系统完成项目创建、8 阶段初始化和阶段资料清单初始化
- **THEN** 除项目创建事务按业务操作日志能力记录 `project.created` 外，系统不能在本能力中生成在线表单填写记录、文件上传记录、文件归档记录、资料齐套率结果或阶段推进记录

### Requirement: 项目阶段手工推进

系统 MUST 提供项目阶段手工推进能力，已登录用户只能推进项目当前阶段，目标阶段必须由服务端根据标准 8 阶段顺序自动确定；推进成功后 MUST 记录项目业务操作日志。

#### Scenario: 阶段推进要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `POST /api/projects/:projectId/stages/advance`
- **THEN** 系统必须拒绝推进，并提示需要登录

#### Scenario: 阶段推进不做角色权限

- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须只校验登录态、项目阶段状态和齐套门禁，不得在本能力中校验项目经理角色、复杂权限、角色权限或轻角色规则

#### Scenario: 项目必须存在

- **WHEN** 已登录用户请求推进不存在的项目
- **THEN** 系统必须拒绝推进，并返回项目不存在错误

#### Scenario: 只推进当前阶段

- **WHEN** 已登录用户请求推进项目阶段
- **THEN** 系统必须根据服务端保存的当前阶段执行推进，不得要求或信任前端提交的目标阶段、目标阶段顺序或目标阶段标识

#### Scenario: 当前阶段必须唯一

- **WHEN** 项目没有当前阶段或存在多个当前阶段
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 当前阶段必须为 current

- **WHEN** 项目唯一当前阶段的 `stage_status` 不是 `current`
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 按标准顺序推进到下一阶段

- **WHEN** 当前阶段不是第 8 阶段、当前阶段适用必填资料齐套，且下一阶段存在、顺序为 `current.stage_order + 1`、`stage_status` 为 `not_started`、`is_current` 为 `0`
- **THEN** 系统必须在事务中将当前阶段 `stage_status` 改为 `completed`、`is_current` 改为 `0`、记录 `completed_at`，并将下一顺序阶段 `stage_status` 改为 `current`、`is_current` 改为 `1`、记录 `started_at`

#### Scenario: 下一阶段必须可接收推进

- **WHEN** 当前阶段不是第 8 阶段，但下一阶段不存在、下一阶段顺序不是 `current.stage_order + 1`、下一阶段 `stage_status` 不是 `not_started` 或下一阶段 `is_current` 不是 `0`
- **THEN** 系统必须拒绝推进，并且不得修改项目状态或任何阶段状态

#### Scenario: 不支持跳阶段或回退

- **WHEN** 用户试图通过请求参数、请求体或其他前端输入指定跳阶段、回退阶段或任意目标阶段
- **THEN** 系统必须忽略或拒绝该输入，并且只能按当前阶段的下一顺序阶段推进

#### Scenario: 第 8 阶段推进完成项目

- **WHEN** 当前阶段是第 8 阶段 `closeout` 且当前阶段适用必填资料齐套
- **THEN** 系统必须在事务中将该阶段 `stage_status` 改为 `completed`、`is_current` 改为 `0`、记录 `completed_at`，并将项目 `status` 改为 `completed`，且项目不再有当前阶段

#### Scenario: 已完成项目不能继续推进

- **WHEN** 项目 `status` 为 `completed`
- **THEN** 系统必须拒绝阶段推进请求，并且不得修改项目状态或任何阶段状态

#### Scenario: 已完成项目异常残留当前阶段仍不能推进

- **WHEN** 项目 `status` 为 `completed`，但异常数据中仍存在 `is_current = 1` 的阶段
- **THEN** 系统必须拒绝阶段推进请求，并且不得修改项目状态或任何阶段状态

#### Scenario: 阶段推进成功记录业务日志

- **WHEN** 已登录用户成功推进项目阶段
- **THEN** 系统必须从 `req.auth.user.id` 传入 `userId`，并在同一事务中记录 `action_type = stage.advanced` 且 `target_type = stage` 的项目业务操作日志，日志 `actor_user_id` 必须使用该 `userId`

#### Scenario: 第 8 阶段完成项目记录业务日志

- **WHEN** 第 8 阶段 `closeout` 推进成功并使项目 `status` 变为 `completed`
- **THEN** 系统必须在同一事务中额外记录 `action_type = project.completed` 且 `target_type = project` 的项目业务操作日志，日志 `actor_user_id` 必须使用阶段推进请求的当前登录用户 `userId`

#### Scenario: 阶段推进日志失败回滚业务变更

- **WHEN** 阶段状态或项目完成状态已经准备提交，但 `stage.advanced` 或 `project.completed` 业务操作日志写入失败
- **THEN** 系统必须回滚阶段推进事务，不得修改项目状态或任何阶段状态

#### Scenario: 阶段推进不生成排除能力

- **WHEN** 阶段推进成功或失败
- **THEN** 除本变更定义的项目业务操作日志外，系统不得在本能力中执行阶段回退、批量推进、审批流、阶段推进操作人完整日志、管理层看板、文件上传、文件下载、文件管理平台联动、在线表单、责任人分配、个人待办或通知
