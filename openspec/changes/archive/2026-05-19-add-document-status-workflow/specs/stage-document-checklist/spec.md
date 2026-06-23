## ADDED Requirements

### Requirement: 资料项手工状态流转

系统 MUST 提供项目级阶段资料项的手工状态操作接口，并 MUST 在后端统一校验状态机。

#### Scenario: 标记待提交资料为已提交

- **WHEN** 已登录用户将状态为 `not_submitted` 的项目级资料项标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，并记录 `submitted_by_user_id` 和 `submitted_at`

#### Scenario: 标记已退回资料为已提交

- **WHEN** 已登录用户将状态为 `returned` 的项目级资料项重新标记提交
- **THEN** 系统必须将该资料项状态更新为 `submitted`，记录新的 `submitted_by_user_id` 和 `submitted_at`，并清空 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 确认已提交资料

- **WHEN** 已登录用户确认状态为 `submitted` 的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `confirmed`，并记录 `confirmed_by_user_id` 和 `confirmed_at`

#### Scenario: 退回已提交资料

- **WHEN** 已登录用户填写非空退回原因并退回状态为 `submitted` 的项目级资料项
- **THEN** 系统必须将该资料项状态更新为 `returned`，并记录 `returned_by_user_id`、`returned_at` 和 `return_reason`

#### Scenario: 退回原因必填

- **WHEN** 已登录用户退回资料项但未提供非空退回原因
- **THEN** 系统必须拒绝退回，并且不得改变资料项状态或追溯字段

#### Scenario: 非法状态流转

- **WHEN** 用户请求未被允许的资料项状态流转
- **THEN** 系统必须拒绝该请求，并且不得改变资料项状态或追溯字段

#### Scenario: 状态操作要求登录

- **WHEN** 用户未携带登录态、登录态无效或登录态已过期时请求资料项状态操作
- **THEN** 系统必须拒绝该请求，并提示需要登录

#### Scenario: 状态操作不做角色权限

- **WHEN** 已登录用户请求资料项状态操作
- **THEN** 系统必须只校验登录态和状态机，不得在本能力中校验复杂权限、角色权限或轻角色规则

#### Scenario: 资料项必须属于当前项目

- **WHEN** 用户请求操作某项目下不存在或不属于该项目的资料项
- **THEN** 系统必须拒绝该请求，并且不得改变任何其他项目的资料项状态

### Requirement: 手工状态流转边界

资料项手工状态流转 MUST 只更新数字化平台中的资料项状态和最小追溯字段，不能表示真实文件上传、在线表单提交或文件平台归档。

#### Scenario: 标记提交不创建文件或表单记录

- **WHEN** 用户手工标记资料项为已提交
- **THEN** 系统不得创建文件上传记录、在线表单记录、归档文件、文件平台文件映射或业务日志

#### Scenario: 确认资料不计算齐套率

- **WHEN** 用户手工确认资料项
- **THEN** 系统不得在本能力中计算资料齐套率、推进阶段或生成管理看板指标

#### Scenario: 退回资料不创建个人待办

- **WHEN** 用户手工退回资料项
- **THEN** 系统不得在本能力中创建个人待办、发送通知或分配责任人

## MODIFIED Requirements

### Requirement: 资料项基础状态

系统 MUST 保存和展示项目级资料项基础状态，第一版系统状态枚举只包括 `not_submitted`、`submitted`、`confirmed` 和 `returned`，并且状态变更 MUST 只能通过受控的手工状态操作接口完成。

#### Scenario: 基础状态枚举

- **WHEN** 系统保存资料项状态
- **THEN** 状态必须是 `not_submitted`、`submitted`、`confirmed` 或 `returned` 之一

#### Scenario: 状态显示口径

- **WHEN** 前端展示资料项状态
- **THEN** `not_submitted` 必须显示为“待提交”，`submitted` 必须显示为“已提交”，`confirmed` 必须显示为“已确认”，`returned` 必须显示为“已退回”

#### Scenario: 初始化状态显示

- **WHEN** 项目资料项初始化为 `not_submitted`
- **THEN** 前端必须显示为“待提交”

#### Scenario: 状态流转由专用接口控制

- **WHEN** 用户需要改变资料项状态
- **THEN** 系统必须通过资料项手工状态操作接口执行状态机校验和状态更新

### Requirement: 阶段资料清单查询接口

系统 MUST 提供查询某项目阶段资料清单的后端接口，并 MUST 按阶段分组返回资料项和状态追溯字段。

#### Scenario: 查询项目阶段资料清单

- **WHEN** 前端请求某项目阶段资料清单
- **THEN** 后端必须返回该项目的阶段资料清单数据

#### Scenario: 按阶段分组返回

- **WHEN** 后端返回阶段资料清单
- **THEN** 响应必须按 8 阶段顺序分组，每个阶段包含阶段标识、阶段名称和该阶段资料项列表

#### Scenario: 资料项字段返回

- **WHEN** 后端返回资料项列表
- **THEN** 每个资料项必须包含资料项编号、资料项名称、是否必填、默认责任部门或责任角色、提交方式、`targetFolderPath`、可空 `targetFolderId`、基础状态、`submittedByUserId`、`submittedAt`、`confirmedByUserId`、`confirmedAt`、`returnedByUserId`、`returnedAt` 和 `returnReason`

#### Scenario: 项目不存在

- **WHEN** 请求不存在的项目阶段资料清单
- **THEN** 后端必须返回项目不存在错误

### Requirement: 文件平台边界

阶段资料清单能力 MUST 只保存文件平台目标路径，第一版 `targetFolderId` MUST 为空，手工状态流转不得在本变更中真实联动文件管理平台。

#### Scenario: 不调用文件平台能力

- **WHEN** 系统初始化、补初始化、查询阶段资料清单或手工变更资料项状态
- **THEN** 系统不得调用文件管理平台 API、创建文件夹、上传文件、下载文件或判断文件权限

#### Scenario: 目录 ID 后续回填

- **WHEN** 文件平台真实联动尚未实现
- **THEN** 系统必须保持 `targetFolderId` 为空，待后续文件平台真实联动时再回填目录 ID

#### Scenario: 不实现排除能力

- **WHEN** 用户查看或系统处理阶段资料清单
- **THEN** 系统不得实现在线表单填写、表单生成归档文件、资料齐套率计算、阶段推进、复杂权限、角色权限、轻角色校验、业务日志、责任人分配或个人待办
