## ADDED Requirements

### Requirement: 阶段资料清单权限过滤

系统 MUST 支持按当前用户权限过滤阶段资料清单，并 MUST 区分完整项目资料视图和受限任务资料视图。

#### Scenario: 普通员工只看自己负责资料

- **WHEN** 普通员工仅因负责资料项而查询某项目阶段资料清单
- **THEN** 系统必须只返回该员工负责的资料项，不得返回其他人负责的资料项

#### Scenario: 资料审核人可看待审核资料

- **WHEN** 当前用户有权审核某资料项且该资料项处于待审核状态
- **THEN** 系统必须允许其查看该资料项及必要的审核上下文

#### Scenario: 资料级审核人按责任人部门确定

- **WHEN** 资料项 `status = submitted` 且已分配责任人
- **THEN** 第一版资料审核人必须是该责任人所属部门的中心负责人

#### Scenario: 项目经理不是资料级审核人

- **WHEN** 当前用户仅因 `projectManagerUserId = 当前用户 id` 访问资料项
- **THEN** 系统不得授予其资料审核权限或 `document_review` 待办

#### Scenario: 总经理不默认接收全部资料审核

- **WHEN** 资料项 `status = submitted`
- **THEN** 系统不得默认为总经理生成所有资料项的 `document_review` 待办；总经理主要处理阶段关口审批

#### Scenario: 未分配责任人资料不生成中心审核待办

- **WHEN** 资料项没有分配责任人
- **THEN** 系统不得根据项目参与部门或中文责任角色模糊生成中心负责人资料审核待办

#### Scenario: 项目经理可看自己项目完整资料

- **WHEN** 当前用户是项目经理并查询自己负责项目的资料清单
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 总经理可看完整资料

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统必须允许返回完整阶段资料清单

#### Scenario: 中心负责人资料范围收敛

- **WHEN** 当前用户是中心负责人并查询项目资料清单
- **THEN** 第一版应只返回本中心相关资料，除非后续设计明确允许中心负责人查看项目全量资料

#### Scenario: 本中心相关资料按责任人部门判断

- **WHEN** 系统判断某资料项是否属于中心负责人本中心相关资料
- **THEN** 第一版必须优先使用 `responsibleUser.department` 与中心负责人 `department` 是否一致判断

#### Scenario: 项目参与部门不放开全量资料

- **WHEN** 项目 `participatingDepartments` 包含某中心
- **THEN** 系统可以将其用于项目基础可见性，但不得因此允许该中心负责人查看项目全量资料或全量附件

#### Scenario: 未分配责任人资料默认不展示附件

- **WHEN** 资料项没有分配责任人且当前用户不是项目经理或总经理
- **THEN** 系统不得默认返回该资料项附件列表或附件操作权限

#### Scenario: 不使用中文字符串模糊判断审核中心

- **WHEN** 系统判断资料审核中心或附件访问中心
- **THEN** 系统不得依赖中文 `confirmRole`、默认责任角色或资料名称的模糊匹配；如需模板审核中心映射，必须另行设计结构化字段

#### Scenario: 返回资料项权限字段

- **WHEN** 系统返回阶段资料清单或工作台资料项
- **THEN** 响应必须包含当前用户对资料项的权限字段，包括 `canViewAttachments`、`canUploadAttachment`、`canDownloadAttachment`、`canDeleteAttachment`、`canSubmitDocument` 和 `canReviewDocument`，或提供等价结构化权限结果

#### Scenario: 受限资料清单仍保留阶段上下文

- **WHEN** 系统返回受限任务资料视图
- **THEN** 响应必须保留项目、阶段和资料项必要字段，使前端能展示任务所属项目和阶段

### Requirement: 资料审核待办来源

系统 MUST 将待当前用户审核的资料项作为工作台资料审核待办来源。

#### Scenario: 待审核资料状态

- **WHEN** 资料项适用、未删除、`status = submitted`，且当前用户符合资料审核人规则
- **THEN** 系统必须将该资料项纳入 `document_review` 待办

#### Scenario: 资料责任任务来源

- **WHEN** 资料项适用、未删除、`responsibleUserId = 当前用户 id`，且状态为 `not_submitted` 或 `returned`
- **THEN** 系统必须将该资料项纳入 `document_responsibility` 待办

#### Scenario: 已提交资料不是责任人处理待办

- **WHEN** 资料项 `responsibleUserId = 当前用户 id` 且状态为 `submitted`
- **THEN** 系统不得将其计入责任人待办处理数，只能作为已提交待审核状态信息展示

#### Scenario: 非待审核状态不进入审核待办

- **WHEN** 资料项状态为 `not_submitted`、`returned` 或 `confirmed`
- **THEN** 系统不得仅因用户有审核权限就将其纳入 `document_review` 待办

#### Scenario: 资料审核待办只读查询

- **WHEN** 系统查询资料审核待办
- **THEN** 系统不得改变资料状态、审批状态、附件、责任人或业务日志

### Requirement: 阶段资料附件资料项级权限

阶段资料附件接口 MUST 在项目存在和资料项存在校验后执行资料项级权限判断，不能只用项目可见性作为附件访问依据。

#### Scenario: 附件访问不能只按项目可见性

- **WHEN** 用户对某资料项调用附件列表、下载、上传或删除接口
- **THEN** 系统必须校验当前用户是否有权访问该资料项附件，不得仅因用户可见项目就允许操作

#### Scenario: 普通员工访问自己负责资料附件

- **WHEN** 普通员工是资料项 `responsibleUserId`
- **THEN** 系统可以允许其上传、查看和下载该资料项附件

#### Scenario: 普通员工不能访问别人资料附件

- **WHEN** 普通员工不是资料项责任人且不具备其他资料访问身份
- **THEN** 系统必须拒绝其查看、下载、上传或删除该资料项附件，并返回 `FORBIDDEN_OPERATION`

#### Scenario: 项目经理查看自己项目附件

- **WHEN** 当前用户是该项目项目经理
- **THEN** 系统可以允许其查看和下载该项目资料附件

#### Scenario: 附件上传只允许资料责任人

- **WHEN** 用户上传资料项附件
- **THEN** 第一版系统必须要求该资料项 `responsibleUserId` 等于当前用户 ID；项目经理、中心负责人、总经理默认不得代替责任人上传附件

#### Scenario: 上传权限不得复用宽泛提交权限

- **WHEN** 系统计算 `canUploadAttachment`
- **THEN** 系统不得直接复用现有宽泛 `canSubmitStageDocument` 或等价阶段资料提交权限；上传权限必须按资料项责任人本人单独判断

#### Scenario: 审核和统筹权限不产生代上传权限

- **GIVEN** 当前用户是项目经理、中心负责人或总经理
- **AND** 当前用户不是该资料项责任人
- **WHEN** 用户上传该资料项附件
- **THEN** 系统必须拒绝请求并返回 `FORBIDDEN_OPERATION`

#### Scenario: 项目经理删除附件边界

- **WHEN** 项目经理删除自己负责项目的附件
- **THEN** 第一版只允许其删除自己上传、当前仍有资料项附件访问权且资料尚未审核通过的附件

#### Scenario: 中心负责人访问本中心资料附件

- **WHEN** 当前用户是中心负责人且资料项属于本中心相关范围
- **THEN** 系统可以允许其查看、下载和审核该资料项附件

#### Scenario: 中心负责人默认不删除他人附件

- **WHEN** 中心负责人审核本中心资料附件
- **THEN** 系统默认不得允许其删除他人上传的附件，应通过退回资料让责任人处理附件问题

#### Scenario: 附件删除要求当前访问权

- **WHEN** 用户删除某资料项附件
- **THEN** 系统必须同时校验当前用户不是系统管理员或总经理助理、当前用户仍有该资料项附件访问权、当前用户是该附件上传人、且资料状态不是 `confirmed`

#### Scenario: 旧责任人不能删除已失权附件

- **WHEN** 用户曾是资料责任人并上传附件，但该资料项责任人后来变更为其他用户
- **THEN** 原责任人不得仅凭 `uploadedByUserId = 当前用户 id` 删除该附件，系统必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 中心负责人跨中心附件访问失败

- **WHEN** 中心负责人访问非本中心相关资料项附件
- **THEN** 系统必须返回 `FORBIDDEN_OPERATION`

#### Scenario: 总经理访问全部附件

- **WHEN** 当前用户 `organizationRole = general_manager`
- **THEN** 系统可以允许其查看和下载全部资料附件

#### Scenario: 总经理删除附件记录日志

- **WHEN** 系统允许总经理删除任意资料附件
- **THEN** 删除成功必须写入业务日志，且失败不得改变附件记录

#### Scenario: 系统管理员无默认附件访问

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 系统不得仅因系统管理员身份允许其访问业务资料附件

#### Scenario: 总经理助理无默认附件访问

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 系统不得允许其下载、上传或删除业务资料附件

#### Scenario: 无权附件上传无副作用

- **WHEN** 用户无权上传某资料项附件
- **THEN** 系统必须在解析或保存文件前拒绝请求，不得留下临时文件、不得保存上传文件、不得新增附件记录、不得写成功业务日志

#### Scenario: 无权附件删除无副作用

- **WHEN** 用户无权删除某资料项附件
- **THEN** 系统不得软删除附件、不得改变附件记录、不得写成功业务日志

#### Scenario: 上传附件仍不等于提交审核

- **WHEN** 用户成功上传附件
- **THEN** 系统仍不得自动提交资料审核、不得自动审核通过、不得自动提交阶段关口审批
