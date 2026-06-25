## ADDED Requirements

### Requirement: 我的工作台查询接口

系统 MUST 提供当前登录用户的工作台查询接口，用于返回资料责任、资料审核、阶段关口审批和阶段推进相关待办，并 MUST 只基于当前登录态确定用户身份。

#### Scenario: 查询我的工作台

- **WHEN** 已登录用户请求 `GET /api/me/workbench`
- **THEN** 系统必须返回当前用户的工作台摘要和待办列表

#### Scenario: 工作台要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求 `GET /api/me/workbench`
- **THEN** 系统必须拒绝请求，并返回需要登录的错误

#### Scenario: 工作台不信任前端用户参数

- **WHEN** 前端在查询工作台时尝试传入用户 ID、责任人 ID、审核人 ID 或审批人 ID
- **THEN** 系统必须忽略或拒绝该参数，并只使用当前登录态中的用户 ID 和组织角色

#### Scenario: 返回工作台待办类型

- **WHEN** 系统返回工作台待办
- **THEN** 每条待办的 `type` 必须是 `document_responsibility`、`document_review`、`stage_gate_approval` 或 `stage_advance` 之一

#### Scenario: 返回工作台待办字段

- **WHEN** 系统返回工作台待办列表
- **THEN** 每条待办至少必须包含 `type`、`projectId`、`projectCode`、`projectName`、`stageId`、`stageOrder`、`stageName`、可空 `documentId`、可空 `documentCode`、可空 `documentName`、`status`、`actionText`、`createdAt` 或 `updatedAt`、以及 `targetRoute`

#### Scenario: 普通员工资料待办进入受限路由

- **WHEN** 系统为普通员工返回 `document_responsibility` 待办
- **THEN** `targetRoute` 必须指向受限任务视图或携带 `documentId` / `taskMode` 的受限详情，不得直接指向完整项目详情

#### Scenario: 返回工作台汇总计数

- **WHEN** 系统返回工作台数据
- **THEN** 响应必须包含按待办类型分组的数量和总待办数量

#### Scenario: 资料责任待办只包含需处理状态

- **WHEN** 系统生成 `document_responsibility` 待办
- **THEN** 只允许包含当前用户负责且状态为 `not_submitted` 或 `returned` 的适用资料项

#### Scenario: 已提交资料不计入责任待办处理数

- **WHEN** 当前用户负责的资料项状态为 `submitted`
- **THEN** 系统不得将其计入 `document_responsibility` 可处理待办数量；如需展示，只能作为“已提交待审核”的状态信息

#### Scenario: 资料审核待办只包含 submitted

- **WHEN** 系统生成 `document_review` 待办
- **THEN** 只允许包含 `status = submitted` 且当前用户具备资料审核权限的资料项

#### Scenario: 工作台查询只读

- **WHEN** 用户查询我的工作台
- **THEN** 系统不得改变项目状态、阶段状态、阶段审批状态、资料状态、资料适用性、责任人、附件或业务日志

### Requirement: 项目基础可见与资料访问分离

系统 MUST 区分项目基础信息可见性和项目资料/附件访问权限，不得因用户可见某项目基础信息就自动授予完整资料清单或附件访问权。

#### Scenario: 普通员工可见相关项目基础信息

- **WHEN** 普通员工负责某项目中的至少一个资料项
- **THEN** 系统可以允许该员工查看该项目基础信息，用于理解任务所属项目

#### Scenario: 普通员工不因项目可见获得完整资料清单

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看该项目完整阶段资料清单

#### Scenario: 普通员工不因项目可见获得全部附件访问

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统不得默认允许其查看、下载、上传或删除其他资料项附件

#### Scenario: 项目经理查看自己项目完整资料

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统必须允许其查看该项目完整资料清单和附件信息，用于统筹项目

#### Scenario: 总经理查看完整项目资料

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统必须允许其查看全部项目和完整项目资料

#### Scenario: 系统管理员无默认业务资料访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份授予业务项目资料或附件访问权限

#### Scenario: 总经理助理无默认附件下载权限

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得仅因总经理助理身份授予业务资料附件下载、上传或删除权限

#### Scenario: 项目列表仍展示有权基础项目

- **WHEN** 用户查询项目列表或项目总览
- **THEN** 系统可以继续返回该用户有权看到的项目基础信息，但不得通过列表或总览泄露无权资料附件内容

#### Scenario: 员工直接打开项目详情仍受资料过滤

- **WHEN** 普通员工直接打开项目详情地址或直接调用资料清单 API
- **THEN** 后端仍必须只返回该员工有权访问的资料项，不得因绕过工作台入口返回完整资料清单

### Requirement: 工作台阶段关口审批和阶段推进待办

系统 MUST 将待当前用户处理的阶段关口审批和可推进阶段纳入我的工作台。

#### Scenario: 中心负责人阶段关口审批待办

- **WHEN** 当前阶段审批状态为 `pending_center_manager` 且当前用户是匹配审批中心的中心负责人
- **THEN** 工作台必须返回 `stage_gate_approval` 待办

#### Scenario: 总经理阶段关口审批待办

- **WHEN** 当前阶段审批状态为 `pending_general_manager` 且当前用户 `organizationRole = general_manager`
- **THEN** 工作台必须返回 `stage_gate_approval` 待办

#### Scenario: 项目经理阶段推进待办

- **WHEN** 当前用户是项目经理、当前阶段关口审批状态为 `approved`、且当前阶段适用必填资料齐套
- **THEN** 工作台必须返回 `stage_advance` 待办

#### Scenario: 阶段推进待办要求仍然齐套

- **WHEN** 当前阶段关口审批状态为 `approved` 但当前阶段适用必填资料不再齐套
- **THEN** 工作台不得返回该阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段不生成普通推进待办

- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台不得错误生成普通 `stage_advance` 待办；如后续需要“项目结题完成”动作，必须另起 change 定义

#### Scenario: 无权用户无阶段审批待办

- **WHEN** 用户不是当前阶段关口审批节点的处理人
- **THEN** 工作台不得返回该阶段的 `stage_gate_approval` 待办

#### Scenario: 总经理助理无业务处理待办

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 工作台不得返回需要其提交、审核、审批或推进的业务处理待办

#### Scenario: 系统管理员无业务处理待办

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 工作台不得返回需要其提交、审核、审批或推进的业务处理待办

### Requirement: 整项目审计信息访问控制

系统 MUST 将项目基础可见性与整项目业务日志、阶段关口审批历史访问权限分开，不能只因为用户可见项目基础信息就返回整项目审计信息。

#### Scenario: 项目经理查看自己项目审计信息

- **WHEN** 当前用户是项目 `projectManagerUserId`
- **THEN** 系统可以允许其查看该项目完整业务日志和阶段关口审批历史

#### Scenario: 总经理查看完整审计信息

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统可以允许其查看全部项目的完整业务日志和阶段关口审批历史

#### Scenario: 普通员工不得查看整项目业务日志

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整业务日志，并返回无权错误

#### Scenario: 普通员工不得查看整项目审批历史

- **WHEN** 普通员工仅因负责某个资料项而可见项目
- **THEN** 系统必须拒绝其查询该项目完整阶段关口审批历史，并返回无权错误

#### Scenario: 项目可见性不等于审计可见性

- **WHEN** 用户只有项目基础可见权限但没有完整项目资料或审计权限
- **THEN** 系统不得通过业务日志或阶段关口审批历史接口泄露其他资料项、附件、审批意见或项目级操作上下文
