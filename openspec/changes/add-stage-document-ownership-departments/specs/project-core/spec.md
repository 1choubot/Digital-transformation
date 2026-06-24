## ADDED Requirements

### Requirement: 项目可见性按结构化归属中心识别

系统 MUST 在中心负责人项目可见性判断中使用结构化阶段资料归属中心，并 MUST 保持普通员工、系统管理员和总经理助理既有项目可见边界。

#### Scenario: 中心负责人本中心相关项目

- **WHEN** 当前用户是中心负责人且系统判断其是否可见某项目
- **THEN** 系统 MUST 在 `participatingDepartments` 包含本人部门、项目中存在 `ownerDepartment = 本人部门` 的阶段资料、或项目中存在 `reviewDepartment = 本人部门` 的阶段资料时，将该项目视为本中心相关项目

#### Scenario: 责任人部门仅作为旧数据 fallback

- **WHEN** 项目阶段资料已保存 `ownerDepartment` 或 `reviewDepartment`
- **THEN** 系统 MUST 优先使用 `ownerDepartment` 和 `reviewDepartment` 判断中心负责人项目可见范围，不得再无条件使用 `responsibleUser.department`

#### Scenario: 旧资料缺少归属中心时兼容责任人部门

- **WHEN** 某项目阶段资料的 `ownerDepartment` 和 `reviewDepartment` 都为空
- **THEN** 系统 MAY 继续使用该资料责任人的部门作为旧数据兼容判断

### Requirement: 阶段推进按结构化归属中心识别本中心项目

系统 MUST 使用结构化归属中心判断中心负责人是否可推进本中心相关项目阶段，并 MUST 保持阶段审批状态和齐套门禁不变。

#### Scenario: 中心负责人推进本中心相关项目

- **WHEN** 当前用户是中心负责人且项目属于其本中心相关项目
- **AND** 当前阶段关口审批状态为 `approved`
- **AND** 当前阶段适用必填资料齐套
- **THEN** 系统 MAY 允许其推进当前阶段

#### Scenario: 中心负责人不得跨中心推进

- **WHEN** 当前用户是中心负责人但项目不属于其本中心相关项目
- **THEN** 系统 MUST 拒绝其推进阶段，除非该用户同时具备项目经理或总经理等其他允许身份

#### Scenario: 阶段推进归属判断优先级

- **WHEN** 系统判断中心负责人是否可推进某项目阶段
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门

### Requirement: 工作台阶段推进待办按结构化归属中心识别

系统 MUST 使用结构化归属中心生成中心负责人 `stage_advance` 工作台待办，并 MUST 保持既有阶段推进前置条件。

#### Scenario: 中心负责人因归属中心获得阶段推进待办

- **WHEN** 当前用户是中心负责人且项目中存在 `ownerDepartment = 本人部门` 或 `reviewDepartment = 本人部门` 的阶段资料
- **AND** 当前阶段关口审批状态为 `approved`
- **AND** 当前阶段适用必填资料齐套
- **AND** 当前阶段不是第 8 阶段
- **THEN** 工作台 MAY 返回该项目当前阶段的 `stage_advance` 待办

#### Scenario: 第 8 阶段仍不生成普通推进待办

- **WHEN** 当前阶段是第 8 阶段 `closeout`
- **THEN** 工作台 MUST NOT 生成普通 `stage_advance` 待办

#### Scenario: 阶段推进待办限制不变

- **WHEN** 当前阶段关口审批状态不是 `approved`，或当前阶段适用必填资料未齐套，或项目已完成
- **THEN** 工作台 MUST NOT 返回该阶段的 `stage_advance` 待办

#### Scenario: 阶段推进待办归属判断优先级

- **WHEN** 系统判断中心负责人是否应获得 `stage_advance` 待办
- **THEN** 系统 MUST 优先使用项目 `participatingDepartments`、阶段资料 `ownerDepartment` 和 `reviewDepartment`
- **AND** 仅在阶段资料 `ownerDepartment` 和 `reviewDepartment` 均为空时，才 MAY 兼容使用责任人部门
