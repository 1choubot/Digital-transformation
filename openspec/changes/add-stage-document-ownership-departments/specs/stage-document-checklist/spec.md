## ADDED Requirements

### Requirement: 阶段资料结构化归属中心

系统 MUST 为现有 `v20260610` 阶段资料模板和项目级阶段资料快照维护结构化归属中心字段，并 MUST 不切换到 `v20260624` 模板。

#### Scenario: 模板包含结构化归属中心

- **WHEN** 系统初始化或读取 `v20260610` 阶段资料模板
- **THEN** 每个模板项 MUST 包含可空 `ownerDepartment` 和可空 `reviewDepartment`

#### Scenario: 归属中心使用现有部门枚举

- **WHEN** 模板或项目级资料项保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 字段值 MUST 为空或属于现有 `BUSINESS_DEPARTMENT` 常量

#### Scenario: 新项目保存归属中心快照

- **WHEN** 项目创建成功并初始化 54 项 `v20260610` 阶段资料
- **THEN** 系统 MUST 将模板中的 `ownerDepartment` 和 `reviewDepartment` 保存到项目级资料快照

#### Scenario: 不切换新版模板

- **WHEN** 本 change 实现后创建新项目
- **THEN** 系统 MUST 仍初始化 `v20260610` 的 54 项资料模板，不得初始化 20260624 的 64 个文件产出或 66 行规划表

#### Scenario: 旧数据兼容

- **WHEN** 旧项目资料缺少或未保存 `ownerDepartment`、`reviewDepartment`
- **THEN** 系统 MUST 不因字段为空导致资料清单、权限判断、附件查询或工作台查询报错

### Requirement: 中心负责人按归属中心访问资料

系统 MUST 使用结构化归属中心判断中心负责人对阶段资料的可见、分配、审核和附件访问范围。

#### Scenario: 中心负责人查看本中心未分配资料

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 或 `reviewDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其查看该资料项，即使该资料项尚未分配责任人

#### Scenario: 中心负责人分配本中心未分配资料

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其为该资料项分配或清空本中心责任人

#### Scenario: 中心负责人不能分配其他中心资料

- **WHEN** 当前用户是中心负责人但资料项 `ownerDepartment` 不等于本人部门
- **THEN** 系统 MUST 拒绝其分配该资料项责任人，除非其同时具备项目经理或总经理等其他允许身份

#### Scenario: 中心负责人按审核中心审核资料

- **WHEN** 当前用户是中心负责人、资料项 `reviewDepartment` 等于本人部门、资料项适用且状态为 `submitted`
- **THEN** 系统 MUST 允许其确认或退回该资料项

#### Scenario: 中心负责人按归属中心管理资料适用性

- **WHEN** 当前用户是中心负责人且资料项 `ownerDepartment` 或 `reviewDepartment` 等于本人部门
- **THEN** 系统 MUST 允许其按既有适用性状态机标记该资料项不适用或恢复适用

#### Scenario: 适用性管理旧数据 fallback

- **WHEN** 资料项 `ownerDepartment` 和 `reviewDepartment` 都为空
- **THEN** 系统 MAY 继续使用资料责任人部门判断中心负责人是否可管理该资料项适用性

#### Scenario: 适用性管理不扩大无关用户权限

- **WHEN** 当前用户是普通员工、系统管理员、总经理助理或跨中心中心负责人
- **THEN** 系统 MUST 拒绝其仅因归属中心字段存在而标记资料不适用或恢复适用

#### Scenario: 审核待办按审核中心生成

- **WHEN** 资料项适用、状态为 `submitted` 且 `reviewDepartment` 等于中心负责人部门
- **THEN** 系统 MUST 将该资料项纳入该中心负责人的 `document_review` 工作台待办

#### Scenario: 不生成未分配资料待办

- **WHEN** 资料项尚未分配责任人且状态不是 `submitted`
- **THEN** 系统 MUST 不仅因 `ownerDepartment` 匹配中心负责人部门而生成工作台待办

#### Scenario: 普通员工范围不扩大

- **WHEN** 当前用户是普通员工
- **THEN** 系统 MUST 仍只允许其查看、处理和访问本人负责的资料项，不得仅因 `ownerDepartment` 或 `reviewDepartment` 扩大可见范围

#### Scenario: 管理辅助角色权限不扩大

- **WHEN** 当前用户是系统管理员或总经理助理
- **THEN** 系统 MUST 不因资料归属中心字段授予其业务附件上传、下载、删除、资料审核或责任人分配权限

#### Scenario: 附件访问使用资料可见性但上传不放宽

- **WHEN** 中心负责人因归属中心匹配获得资料项附件查看权限
- **THEN** 系统 MAY 允许其查看和下载附件，但 MUST 仍只允许资料责任人本人上传附件

### Requirement: 归属中心字段返回

阶段资料清单和工作台资料项响应 MUST 返回结构化归属中心字段。

#### Scenario: 阶段资料清单返回归属中心

- **WHEN** 用户查询项目阶段资料清单
- **THEN** 每个资料项 MUST 返回 `ownerDepartment` 和 `reviewDepartment`

#### Scenario: 工作台资料项返回归属中心

- **WHEN** 用户查询我的工作台且返回资料类待办
- **THEN** 每个资料项待办 MUST 返回 `ownerDepartment` 和 `reviewDepartment`，或在权限计算上下文中包含等价字段

#### Scenario: 权限字段继续返回

- **WHEN** 系统返回阶段资料清单或工作台资料项
- **THEN** 响应 MUST 继续包含 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility` 或等价权限字段
