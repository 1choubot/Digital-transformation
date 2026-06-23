## ADDED Requirements

### Requirement: 项目模式
系统 MUST 为项目维护项目模式字段，并 MUST 保持自研模式和供应链/外包模式共用同一项目流程、阶段资料和状态机。

#### Scenario: 项目模式枚举
- **WHEN** 系统创建或保存项目
- **THEN** `projectMode` 必须是 `self_developed` 或 `outsourced` 之一

#### Scenario: 自研模式说明
- **WHEN** 项目 `projectMode = self_developed`
- **THEN** 系统必须表示该项目由公司员工自己产出资料

#### Scenario: 外包模式说明
- **WHEN** 项目 `projectMode = outsourced`
- **THEN** 系统必须表示第三方产出资料，但系统内仍由公司员工负责检查、整理成公司模板并提交

#### Scenario: 项目模式不改变阶段流程
- **WHEN** 系统初始化自研或外包项目
- **THEN** 两种模式都必须使用同一套标准 8 阶段，不得建立两套流程

#### Scenario: 项目模式不改变资料清单
- **WHEN** 系统初始化自研或外包项目阶段资料
- **THEN** 两种模式都必须使用同一套 20260610 版 54 项资料

#### Scenario: 项目模式不改变状态规则
- **WHEN** 系统处理自研或外包项目
- **THEN** `projectMode` 不得改变阶段推进规则、资料状态机、适用/不适用规则、附件规则或齐套门禁

### Requirement: 项目可见范围
系统 MUST 对项目列表、项目详情和项目总览看板按当前用户过滤可见项目，并 MUST 使用后端校验作为安全边界。

#### Scenario: 项目列表必须登录
- **WHEN** 未登录用户请求 `GET /api/projects`
- **THEN** 系统必须返回未登录错误，不得返回项目列表

#### Scenario: 项目详情必须登录
- **WHEN** 未登录用户请求 `GET /api/projects/:projectId`
- **THEN** 系统必须返回未登录错误，不得返回项目详情

#### Scenario: 管理层全局查看
- **WHEN** 当前用户 `organizationRole` 为 `general_manager` 或 `general_manager_assistant`
- **THEN** 项目列表、项目详情和项目总览看板可返回全部项目

#### Scenario: 系统管理员无默认业务项目权限
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理身份返回全部业务项目或授予项目详情查看权限

#### Scenario: 项目经理和资料责任人可见
- **WHEN** 当前用户是某项目 `projectManagerUserId` 或在该项目中至少负责一项资料
- **THEN** 系统必须允许该用户查看该项目列表项、详情和总览卡片

#### Scenario: 中心负责人只能查看本中心相关项目
- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 系统只能返回本中心相关项目；本中心相关按 `participating_departments` 包含其部门，或项目中存在本中心责任人资料判断

#### Scenario: 普通员工只能查看自己相关项目
- **WHEN** 当前用户 `organizationRole = employee`
- **THEN** 系统只能返回该用户负责资料或作为项目经理的项目

#### Scenario: 无权项目详情返回权限错误
- **WHEN** 已登录用户直接访问无权项目详情
- **THEN** 系统必须返回稳定权限错误码 `FORBIDDEN_OPERATION`，不得返回项目详情

### Requirement: 项目参与部门枚举
系统 MUST 将项目参与部门保存为四个业务部门稳定枚举数组，并 MUST NOT 保存中文部门名或自由文本。

#### Scenario: 参与部门合法枚举
- **WHEN** 用户创建或保存项目并提交 `participatingDepartments`
- **THEN** 每个参与部门必须是 `operations_center`、`marketing_center`、`manufacturing_center` 或 `rd_center` 之一

#### Scenario: 参与部门空值
- **WHEN** 用户不提交参与部门、提交空值或空数组
- **THEN** 系统必须允许保存为空配置，表示未配置参与部门

#### Scenario: 参与部门重复值去重
- **WHEN** 用户提交重复的参与部门枚举
- **THEN** 系统必须去重后保存，不得保存重复部门值

#### Scenario: 非法参与部门返回稳定错误
- **WHEN** 用户提交中文部门名、未知值、非数组非空值或任意自由文本参与部门
- **THEN** 系统必须拒绝保存，并返回稳定错误码 `INVALID_PARTICIPATING_DEPARTMENT`，HTTP 状态为 400

#### Scenario: 参与部门用于中心负责人可见范围
- **WHEN** 系统判断中心负责人是否可见某项目
- **THEN** 系统只能基于合法 `participatingDepartments` 枚举数组或项目中本中心责任人资料判断本中心相关项目

### Requirement: 项目经理用户关联
系统 MUST 将项目经理建模为项目内用户关联，并 MUST 校验项目经理只能由启用的部门用户担任。

#### Scenario: 项目保存项目经理用户 ID
- **WHEN** 系统创建或编辑项目
- **THEN** 系统必须保存 `projectManagerUserId`，并在响应中返回 `projectManagerUser`

#### Scenario: 项目经理权威字段
- **WHEN** 系统判断项目经理身份或项目经理权限
- **THEN** 系统必须以 `projectManagerUserId` 为权威字段，不得使用旧 `projectManager` 文本作为权限判断依据

#### Scenario: 项目创建编辑以项目经理用户 ID 为准
- **WHEN** 用户创建或编辑项目经理
- **THEN** 请求必须以 `projectManagerUserId` 为准；如果响应保留 `projectManager` 文本，该文本只能从 `projectManagerUser.name` 派生，不能由前端任意提交

#### Scenario: 项目经理必须是启用用户
- **WHEN** 用户指定项目经理
- **THEN** 被指定用户必须是启用的数字化平台用户

#### Scenario: 非法项目经理 ID 返回稳定错误
- **WHEN** 用户提交非数字、空字符串、0、负数、小数或其他非法 `projectManagerUserId`
- **THEN** 系统必须返回稳定错误码 `INVALID_PROJECT_MANAGER_USER_ID`

#### Scenario: 项目经理不存在或禁用返回稳定错误
- **WHEN** 用户提交的 `projectManagerUserId` 对应用户不存在或已禁用
- **THEN** 系统必须返回稳定错误码 `PROJECT_MANAGER_USER_NOT_FOUND_OR_DISABLED`

#### Scenario: 项目经理必须是部门用户
- **WHEN** 用户指定项目经理
- **THEN** 被指定用户 `organizationRole` 必须是 `center_manager` 或 `employee`，且必须隶属于四个业务部门之一

#### Scenario: 全局角色不能作为项目经理
- **WHEN** 用户尝试指定总经理、系统管理员或总经理助理为项目经理
- **THEN** 系统必须拒绝该项目经理设置，并返回稳定错误码 `PROJECT_MANAGER_USER_ROLE_NOT_ALLOWED`

#### Scenario: 项目经理不是全局角色
- **WHEN** 系统判断用户组织角色
- **THEN** 系统不得把项目经理保存为全局 `organizationRole`；项目经理只能来自具体项目的用户关联

#### Scenario: 项目经理默认不是审批人
- **WHEN** 项目经理执行资料确认、资料退回或审批相关动作
- **THEN** 系统不得仅因其为项目经理而授予资料审批权

#### Scenario: 项目经理可同时作为资料责任人
- **WHEN** 项目经理被分配为某个资料项责任人
- **THEN** 系统必须允许该用户作为该资料项 `responsibleUserId`

### Requirement: 项目经理职责边界
系统 MUST 明确项目经理在项目内负责推进、任务分配、催办和全量进度查看，但不得因此改变资料审批身份。

#### Scenario: 项目经理查看项目全量进度
- **WHEN** 项目经理查看其负责项目
- **THEN** 系统必须允许其查看该项目阶段、资料、齐套摘要、责任人和附件等全量进度信息

#### Scenario: 项目经理分配或调整资料责任人
- **WHEN** 项目经理在其负责项目中分配或调整资料责任人
- **THEN** 第一版可将可选范围限制在项目参与部门内或符合资料责任人候选规则的部门用户

#### Scenario: 非项目经理不得仅凭员工身份分配资料责任人
- **WHEN** 用户不是该项目项目经理、不是中心负责人、也不是系统允许的其他角色，却直接调用该项目资料责任人分配或清空接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理催办资料
- **WHEN** 后续实现催办能力
- **THEN** 项目经理可对其负责项目的资料责任人发起催办，但本 change 不实现自动通知

#### Scenario: 项目经理齐套后推进阶段
- **WHEN** 当前阶段适用必填资料全部 `confirmed`
- **THEN** 项目经理可推进其负责项目当前阶段，且阶段推进仍必须基于齐套门禁

#### Scenario: 非项目经理不得推进不属于自己的项目
- **WHEN** 普通员工不是该项目项目经理却直接调用该项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 总经理助理不得推进任何项目
- **WHEN** 总经理助理直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 系统管理员不得推进业务项目
- **WHEN** 系统管理员直接调用任意项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 中心负责人不得跨中心推进
- **WHEN** 中心负责人直接调用非本中心相关项目阶段推进接口
- **THEN** 后端必须拒绝该操作，并返回稳定权限错误码 `FORBIDDEN_OPERATION` 或既有统一权限错误码

#### Scenario: 项目经理不因项目身份获得资料审批权
- **WHEN** 用户仅因是该项目项目经理而直接调用资料确认或退回接口
- **THEN** 后端必须拒绝该操作，除非该用户同时具备中心负责人、总经理或后续审批规则允许的审批身份

### Requirement: 项目参与人派生
系统 MUST 从项目资料责任人派生项目参与人，不得在第一版新增项目成员表或项目参与人表。

#### Scenario: 项目参与人由资料责任人派生
- **WHEN** 用户在某项目中至少负责一项资料
- **THEN** 系统必须将该用户视为该项目参与人

#### Scenario: 不新增项目参与人表
- **WHEN** 系统表达项目参与人
- **THEN** 系统不得在本 change 中新增项目参与人表或手工维护项目参与人清单

#### Scenario: 不新增项目成员表
- **WHEN** 系统表达项目内协作关系
- **THEN** 系统不得在本 change 中新增项目成员表

#### Scenario: 项目参与人不改变阶段推进门禁
- **WHEN** 系统判断阶段是否可推进
- **THEN** 项目参与人派生规则不得改变当前阶段适用必填资料全部 `confirmed` 的门禁口径
