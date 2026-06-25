## ADDED Requirements

### Requirement: 阶段资料归属中心前端展示

前端 MUST 在项目详情阶段资料清单中展示后端返回的结构化责任中心和审核中心，并 MUST 继续以后端权限字段作为按钮显示依据。

#### Scenario: 展示默认责任中心和审核中心

- **WHEN** 阶段资料清单接口返回 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 页面 MUST 展示对应中文部门名称，并允许字段为空时展示为空或未指定

#### Scenario: 不只展示中文角色字符串

- **WHEN** 页面展示资料项默认责任信息
- **THEN** 页面 MUST 优先展示结构化 `ownerDepartment` / `reviewDepartment`，不得只依赖 `defaultResponsibilityRole` / `confirmRole` 表达资料归属

#### Scenario: 按后端权限字段展示责任人分配入口

- **WHEN** 页面判断是否展示“分配责任人”入口
- **THEN** 页面 MUST 使用后端返回的 `canManageResponsibility` 或等价权限字段，不得只根据 `organizationRole` 在前端硬猜

#### Scenario: 按后端权限字段展示资料审核入口

- **WHEN** 页面判断是否展示资料审核通过或退回入口
- **THEN** 页面 MUST 使用后端返回的 `canReviewDocument` 或等价权限字段，不得只根据 `organizationRole` 在前端硬猜

### Requirement: 工作台保持归属中心权限边界

前端工作台 MUST 保持“我的工作台 / 我的待办”文案，并 MUST 使用后端返回的待办和权限结果展示资料责任与资料审核任务。

#### Scenario: 工作台文案保持

- **WHEN** 用户打开工作台
- **THEN** 页面 MUST 继续展示“我的工作台”或“我的待办”，不得改回“我的资料任务”

#### Scenario: 资料责任待办不扩大

- **WHEN** 工作台返回 `document_responsibility` 待办
- **THEN** 页面 MUST 只展示后端返回的本人负责且需要处理的资料，不得在前端补充本中心未分配资料待办

#### Scenario: 审核待办按后端结果展示

- **WHEN** 工作台返回 `document_review` 待办
- **THEN** 页面 MUST 按后端返回结果展示待审核资料，并使用后端权限字段控制处理入口

#### Scenario: 普通员工受限视图保持

- **WHEN** 普通员工从资料责任待办或项目详情进入受限视图
- **THEN** 页面 MUST 以后端过滤后的资料清单为准，不得展示其他人资料或跨中心附件入口

#### Scenario: 阶段推进入口按归属中心判断本中心项目

- **WHEN** 页面判断中心负责人是否可看到阶段推进入口
- **THEN** 页面 MUST 在资料项存在 `ownerDepartment` 或 `reviewDepartment` 时只按这两个字段判断本中心相关资料
- **AND** 仅当 `ownerDepartment` 和 `reviewDepartment` 都为空时，才 MAY 使用 `responsibleUser.department` 作为旧数据兼容判断
