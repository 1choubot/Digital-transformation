## ADDED Requirements

### Requirement: 阶段审批流前端展示
前端 MUST 在项目详情页展示阶段审批状态，并 MUST 以接口返回数据为准展示审批节点、审批状态和审批历史入口。

#### Scenario: 展示阶段审批状态
- **WHEN** 阶段数据返回阶段审批状态
- **THEN** 页面必须在对应阶段区域展示 `not_submitted`、`pending_center_manager`、`returned_by_center_manager`、`pending_general_manager`、`returned_by_general_manager`、`approved` 或 `cancelled` 的可读文案

#### Scenario: 阶段 1 展示二级审批进度
- **WHEN** 阶段 key 为 `initiation`
- **THEN** 页面必须展示营销中心负责人审批和总经理审批的二级审批进度

#### Scenario: 阶段 3 展示二级审批进度
- **WHEN** 阶段 key 为 `contract`
- **THEN** 页面必须展示营销中心负责人审批和总经理审批的二级审批进度

#### Scenario: 阶段 8 展示二级审批进度
- **WHEN** 阶段 key 为 `closeout`
- **THEN** 页面必须展示项目经理所属中心负责人审批和总经理审批的二级审批进度

#### Scenario: 不需要总经理审批阶段不展示总经理审批入口
- **WHEN** 阶段 key 为 `solution`、`detailedDesign`、`manufacturing`、`preAcceptance` 或 `finalAcceptance`
- **THEN** 页面不得展示总经理审批入口

#### Scenario: 展示退回原因
- **WHEN** 审批状态为 `returned_by_center_manager` 或 `returned_by_general_manager`
- **THEN** 页面必须展示最近一次退回原因或审批意见

#### Scenario: 展示审批历史入口
- **WHEN** 用户有权查看项目详情
- **THEN** 页面必须提供只读审批历史查看入口，并展示审批时间、审批人、审批角色、审批动作、审批意见和审批前后状态

#### Scenario: 审批历史加载失败
- **WHEN** 审批历史接口请求失败
- **THEN** 页面必须展示可读错误提示，并保留项目详情上下文

### Requirement: 阶段审批流前端操作入口
前端 MUST 根据当前用户组织角色、项目身份、阶段审批中心和接口返回状态展示审批操作入口，但 MUST NOT 将前端隐藏作为权限边界。

#### Scenario: 项目经理看到提交审批入口
- **WHEN** 当前用户是该项目项目经理、当前阶段适用必填资料齐套且审批状态为 `not_submitted`
- **THEN** 页面可以展示提交审批入口

#### Scenario: 项目经理看到重新提交入口
- **WHEN** 当前用户是该项目项目经理且审批状态为 `returned_by_center_manager` 或 `returned_by_general_manager`
- **THEN** 页面可以展示重新提交审批入口

#### Scenario: 当前阶段未齐套提示不能提交审批
- **WHEN** 当前阶段存在缺失适用必填资料
- **THEN** 页面必须提示不能提交审批，并展示接口返回或齐套摘要中的缺失资料

#### Scenario: 中心负责人审批入口要求中心匹配
- **WHEN** 当前用户是中心负责人、审批状态为 `pending_center_manager` 且其部门匹配当前阶段审批中心
- **THEN** 页面可以展示审批通过和退回入口

#### Scenario: 中心负责人中心不匹配不展示审批入口
- **WHEN** 当前用户是中心负责人但其部门不匹配当前阶段审批中心
- **THEN** 页面不得展示中心负责人审批通过或退回入口

#### Scenario: 总经理只在待总经理审批时看到入口
- **WHEN** 当前用户是总经理且审批状态为 `pending_general_manager`
- **THEN** 页面可以展示审批通过和退回入口

#### Scenario: 总经理不处理非总经理节点
- **WHEN** 阶段不需要总经理审批或审批状态不是 `pending_general_manager`
- **THEN** 页面不得展示总经理审批通过或退回入口

#### Scenario: 总经理助理只读查看
- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面不得展示提交审批、审批通过、审批退回、阶段推进或代替总经理审批入口

#### Scenario: 系统管理员不显示业务审批入口
- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 页面不得展示审批通过、审批退回、阶段推进或业务审批入口

#### Scenario: 项目经理不显示审批通过入口
- **WHEN** 当前用户仅因项目经理身份打开项目详情
- **THEN** 页面不得展示中心负责人审批通过、中心负责人退回、总经理审批通过或总经理退回入口

#### Scenario: 退回必须填写原因
- **WHEN** 用户在前端执行审批退回但未填写非空原因
- **THEN** 页面必须展示校验提示，且不得调用退回接口

#### Scenario: 审批历史入口只读
- **WHEN** 用户查看审批历史
- **THEN** 页面不得因查看历史而触发审批记录写入、业务日志写入、审批状态变更或阶段状态变更

#### Scenario: 前端隐藏不是权限边界
- **WHEN** 用户绕过页面直接调用审批接口
- **THEN** 后端仍必须按 OpenSpec 权限规则拒绝越权操作；前端必须能展示 `PROJECT_APPROVAL_FORBIDDEN`

### Requirement: 审批状态下的阶段推进前端
前端 MUST 将阶段推进入口同时绑定齐套摘要、审批状态和当前用户可推进身份，并 MUST 不提供跳阶段、回退或自动流转入口。

#### Scenario: 审批未通过不显示推进入口
- **WHEN** 当前阶段审批状态不是 `approved`
- **THEN** 页面不得展示可点击的阶段推进入口，并应提示需先完成审批

#### Scenario: 审批通过后仍展示齐套门禁
- **WHEN** 当前阶段审批状态为 `approved`
- **THEN** 页面仍必须展示当前阶段适用必填资料齐套情况，并在未齐套时禁止推进

#### Scenario: 项目经理审批通过后可推进自己负责项目
- **WHEN** 当前用户是该项目项目经理、当前阶段审批状态为 `approved` 且齐套门禁满足
- **THEN** 页面可以展示阶段推进入口

#### Scenario: 非项目经理不显示推进入口
- **WHEN** 当前用户不是该项目项目经理且不具备规格允许的其他推进身份
- **THEN** 页面不得显示阶段推进入口

#### Scenario: 不新增自动流转入口
- **WHEN** 页面实现审批流展示和操作
- **THEN** 页面不得新增自动阶段流转、跳阶段、阶段回退、批量审批、消息通知、日报周报或文件管理平台联动入口

### Requirement: 审批错误提示前端
前端 MUST 为项目审批相关稳定错误码提供可理解的中文提示。

#### Scenario: 非法审批动作提示
- **WHEN** 后端返回 `INVALID_APPROVAL_ACTION`
- **THEN** 页面必须提示当前审批动作无效或当前状态不允许该动作

#### Scenario: 退回原因错误提示
- **WHEN** 后端返回 `INVALID_APPROVAL_COMMENT`
- **THEN** 页面必须提示审批意见或退回原因不能为空

#### Scenario: 审批不可提交提示
- **WHEN** 后端返回 `PROJECT_APPROVAL_NOT_SUBMITTABLE`
- **THEN** 页面必须提示当前项目或阶段暂不能提交审批

#### Scenario: 审批非待处理提示
- **WHEN** 后端返回 `PROJECT_APPROVAL_NOT_PENDING`
- **THEN** 页面必须提示当前审批不是待处理状态

#### Scenario: 审批未通过提示
- **WHEN** 后端返回 `PROJECT_APPROVAL_NOT_APPROVED`
- **THEN** 页面必须提示当前阶段审批未通过，暂不能推进阶段

#### Scenario: 审批无权限提示
- **WHEN** 后端返回 `PROJECT_APPROVAL_FORBIDDEN`
- **THEN** 页面必须提示当前用户无权执行该审批操作

#### Scenario: 缺失必填资料提示
- **WHEN** 后端返回 `PROJECT_REQUIRED_DOCUMENTS_INCOMPLETE`
- **THEN** 页面必须提示当前阶段存在未完成适用必填资料，并在有缺失列表时展示缺失资料

#### Scenario: 非法项目 ID 提示
- **WHEN** 后端返回 `INVALID_PROJECT_ID`
- **THEN** 页面必须提示项目参数无效

#### Scenario: 非法阶段 ID 提示
- **WHEN** 后端返回 `INVALID_PROJECT_STAGE_ID`
- **THEN** 页面必须提示阶段参数无效

#### Scenario: 项目不存在提示
- **WHEN** 后端返回 `PROJECT_NOT_FOUND`
- **THEN** 页面必须提示项目不存在

#### Scenario: 阶段不存在提示
- **WHEN** 后端返回 `PROJECT_STAGE_NOT_FOUND`
- **THEN** 页面必须提示阶段不存在或不属于当前项目
