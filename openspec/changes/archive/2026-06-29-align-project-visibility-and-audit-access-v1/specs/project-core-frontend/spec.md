## MODIFIED Requirements

### Requirement: 项目列表页

前端 MUST 提供项目列表页，并 MUST 调用 `GET /api/projects` 获取后端按当前用户查看权限过滤后的正式项目数据和创建人追溯字段。

#### Scenario: 加载项目列表

- **WHEN** 用户打开项目列表页
- **THEN** 前端必须调用 `GET /api/projects` 并展示返回的项目列表

#### Scenario: 管理层项目列表展示全部项目

- **WHEN** 总经理、总经理助理或中心负责人打开项目列表页
- **THEN** 页面 MUST 展示后端返回的全部项目列表

#### Scenario: 创建人项目列表展示自己创建项目

- **WHEN** 项目创建人打开项目列表页
- **THEN** 页面 MUST 展示后端返回的其创建项目

#### Scenario: 展示列表基础字段

- **WHEN** 项目列表接口返回项目数据
- **THEN** 页面必须展示项目编号、项目名称、客户、项目经理、项目状态、当前阶段、计划开始时间、计划完成时间和创建人基础信息或创建人字段

#### Scenario: 历史项目创建人为空

- **WHEN** 项目列表接口返回创建人为空的历史项目
- **THEN** 页面必须允许创建人为空，并继续展示该项目

#### Scenario: 项目列表空状态

- **WHEN** 项目列表接口返回空数组
- **THEN** 页面必须展示空状态，并提供新建项目入口

#### Scenario: 列表接口失败

- **WHEN** 项目列表接口请求失败
- **THEN** 页面必须展示可读错误提示，并允许用户重新加载

#### Scenario: 列表不展示排除能力

- **WHEN** 用户打开项目列表页
- **THEN** 页面不能展示看板指标、资料齐套率、资料缺失统计、文件归档状态、复杂权限入口或日志入口

### Requirement: 项目详情页

前端 MUST 提供项目详情页，并 MUST 组合调用项目基础状态、阶段资料清单、附件、业务日志、总览/齐套等后端接口展示项目详情体验；`GET /api/projects/:projectId` 只用于获取项目基础状态和创建人追溯字段，不承载阶段资料清单、附件列表/下载、业务日志或齐套摘要全集。

#### Scenario: 展示项目基础信息

- **WHEN** 项目详情接口返回项目数据
- **THEN** 页面必须展示项目编号、项目名称、客户、项目经理、参与部门、项目状态、计划时间、备注和创建人基础信息或创建人字段
- **AND** 当 `projectCode` 为空时 MUST 显示 `待生成` 或等价文案

#### Scenario: 全量查看角色看到完整项目详情

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理打开其有权查看的项目详情
- **THEN** 页面 MUST 通过阶段资料、附件、业务日志等独立接口组合展示后端允许其查看的完整阶段资料清单、阶段资料附件区域和业务日志区域

#### Scenario: 展示阶段资料清单

- **WHEN** 用户打开项目详情页
- **THEN** 页面必须展示“阶段资料清单”区域，并按后端返回结果展示资料项名称、是否必填、默认责任部门或责任角色、提交方式、基础状态、`completionMode`、派生完成状态、状态追溯字段、适用性、适用性追溯字段、责任人、责任人变更追溯字段、阶段资料附件区域和阶段资料齐套摘要

#### Scenario: 员工受限详情只展示后端返回资料

- **WHEN** 普通员工打开仅因资料责任相关而可见的项目详情
- **THEN** 页面 MUST 只展示后端返回的资料项，不得在前端补齐或伪造完整 64 项资料

#### Scenario: 展示资料项派生完成状态

- **WHEN** 页面展示资料项状态
- **THEN** 页面 MUST 优先使用后端返回的 `completionStatus`、`isComplete` 或等价派生字段展示业务完成状态
- **AND** 页面 MUST NOT 仅凭基础 `status = submitted` 将所有资料显示为待审核

#### Scenario: submit_only submitted 展示已完成

- **WHEN** 资料项 `completionMode = submit_only` 且基础状态为 `submitted`
- **THEN** 页面 MUST 展示为已完成或等价完成状态
- **AND** 页面 MUST NOT 展示为待审核

#### Scenario: approval_required submitted 展示待审核

- **WHEN** 资料项 `completionMode = approval_required` 且基础状态为 `submitted`
- **THEN** 页面 MUST 展示为待审核或等价状态

#### Scenario: 操作按钮仍按后端权限字段

- **WHEN** 页面展示资料提交、资料审核、资料退回、精准返工、责任人分配、适用性、附件上传、附件删除、阶段推进或项目编号填写入口
- **THEN** 页面 MUST 使用后端返回的对应权限字段或接口授权结果作为依据
- **AND** 页面 MUST NOT 仅因用户可查看项目、资料、附件或业务日志而显示这些操作入口

### Requirement: 项目详情页业务日志展示

前端 MUST 在项目详情页提供只读“业务日志”区域，用于展示后端允许当前用户查看的项目最近业务操作日志。

#### Scenario: 查询项目业务日志

- **WHEN** 用户打开项目详情页
- **THEN** 前端必须调用 `GET /api/projects/:projectId/operation-logs` 查询该项目业务日志

#### Scenario: 全量查看角色展示业务日志

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理打开其有业务日志查看权的项目详情
- **THEN** 页面 MUST 展示后端返回的业务日志列表

#### Scenario: 无权日志错误展示

- **WHEN** 后端对业务日志接口返回无权错误
- **THEN** 页面 MUST 展示可读无权提示或隐藏日志内容，不得伪造日志数据

#### Scenario: 展示业务日志字段

- **WHEN** 业务日志接口返回日志列表
- **THEN** 页面必须展示日志时间、操作人字段、`actionType` 或中文摘要、`summary`

#### Scenario: 业务日志加载状态

- **WHEN** 前端查询项目业务日志
- **THEN** 页面必须处理加载中、接口失败和空日志状态

#### Scenario: 业务日志只读

- **WHEN** 用户查看项目详情页业务日志区域
- **THEN** 页面不得提供日志新增、编辑、删除、筛选导出、复杂分页、权限配置、通知、个人待办或责任人分配入口

### Requirement: 项目总览页面

项目总览页面 MUST 使用后端按当前用户查看权限返回的项目范围，并 MUST 使用当前阶段 `completionMode` 派生完成数量展示后端返回的齐套率、未完成资料和我的待办资料数量，不得继续把“已确认数量”作为唯一完成口径。

#### Scenario: 总览展示后端可见项目

- **WHEN** 用户打开项目总览页面
- **THEN** 页面 MUST 携带登录态调用 `GET /api/projects/overview-dashboard`
- **AND** 页面 MUST 只展示后端返回的项目卡片和汇总指标

#### Scenario: 管理层总览展示全部项目

- **WHEN** 总经理、总经理助理或中心负责人打开项目总览页面
- **THEN** 页面 MUST 展示后端返回的全部项目总览数据

#### Scenario: 创建人总览展示自己创建项目

- **WHEN** 项目创建人打开项目总览页面
- **THEN** 页面 MUST 展示后端返回的其创建项目总览数据

#### Scenario: 当前阶段齐套率使用完成数量

- **WHEN** 后端返回项目当前阶段齐套摘要且页面展示项目当前阶段齐套率
- **THEN** 页面 MUST 使用 `completedRequiredCount` 或等价 `completionMode` 派生完成数量计算和展示

#### Scenario: 不以已确认为唯一口径

- **WHEN** 页面展示当前阶段资料完成摘要
- **THEN** 页面 MUST NOT 将“已确认数量”表达为当前流程唯一完成口径
- **AND** 页面 MUST NOT 暗示 `submit_only` 资料必须确认后才完成

#### Scenario: 未完成资料展示 completionMode

- **WHEN** 后端返回当前阶段未完成资料明细且页面展示当前阶段未完成资料
- **THEN** 页面 MUST 展示或可查看每项资料的 `completionMode` 和派生完成状态

#### Scenario: 普通员工受限总览不展示完整齐套明细

- **WHEN** 普通员工仅因资料责任关系看到项目总览卡片
- **THEN** 页面 MUST 只展示后端返回的项目基础卡片、个人待办数和可见资料明细
- **AND** 页面 MUST NOT 补齐或伪造完整当前阶段齐套摘要
- **AND** 页面 MUST NOT 展示后端未返回的其他资料编号、名称、状态或 `completionMode`
- **AND** 当后端未返回齐套摘要时，页面应显示“暂无可查看齐套明细”或等价文案

### Requirement: 项目详情页资料附件展示与操作

项目详情页资料附件区域 MUST 继续使用在线平台附件能力，并 MUST 以后端返回的 `completionMode`、`revision_required` 和附件权限字段展示附件列表、下载、上传和删除入口；附件操作不得表达为文件平台归档完成。

#### Scenario: 全量查看角色显示附件列表和下载入口

- **WHEN** 总经理、总经理助理、中心负责人、项目创建人或项目经理查看其可见项目资料项
- **AND** 后端返回 `canViewAttachments` 或 `canDownloadAttachment` 为 true
- **THEN** 页面 MUST 显示附件列表和下载入口

#### Scenario: 上传删除入口仍按后端权限字段

- **WHEN** 页面判断附件上传或删除入口是否展示
- **THEN** 页面 MUST 分别使用后端返回的 `canUploadAttachment` 和 `canDeleteAttachment`
- **AND** 页面 MUST NOT 因用户可查看或下载附件而显示上传或删除入口

#### Scenario: 上传后完成状态以后端为准

- **WHEN** 用户上传或提交资料附件后页面刷新资料项
- **THEN** 页面 MUST 使用后端返回的 `isComplete`、`completionStatus` 或等价派生状态展示资料是否完成
- **AND** 页面 MUST NOT 将“附件上传一定不等于资料完成”作为通用规则

#### Scenario: submit_only 返工需要明确完成动作

- **WHEN** `submit_only` 或 `conditional_submit` 资料 `revision_required = true`
- **AND** 用户完成上传或修改
- **THEN** 页面 MUST 提供或引导执行明确返工完成动作
- **AND** 页面 MUST NOT 仅因附件存在就绕过后端返工清除权限

#### Scenario: approval_required 返工不直接清除

- **WHEN** `approval_required` 资料 `revision_required = true`
- **THEN** 页面 MUST 显示“返工重提”或等价入口
- **AND** 页面 MUST NOT 提供绕过审核的清除返工主流程入口

#### Scenario: approval_required 返工重提后展示待审核

- **WHEN** `approval_required` 资料执行返工重提后后端返回 `status = submitted`
- **AND** `revision_required = true`
- **THEN** 页面 MUST 展示该资料为待审核且仍需审核确认清除返工
- **AND** 页面 MUST NOT 将重提动作本身展示为已完成

#### Scenario: 附件不表达文件平台归档

- **WHEN** 页面展示附件列表、上传、下载或删除操作
- **THEN** 页面 MUST NOT 将附件存在、附件上传成功、资料提交成功或返工完成表达为文件平台归档完成

### Requirement: 前端项目可见范围

前端 MUST 以登录态调用项目列表、项目详情和项目总览接口，并 MUST 以接口返回的可见项目作为展示依据。

#### Scenario: 项目列表只展示后端可见项目

- **WHEN** 当前用户打开项目列表页
- **THEN** 页面必须携带登录态调用 `GET /api/projects`，并只展示后端返回的项目，不得在前端拼接或展示无权项目

#### Scenario: 管理层可见全部项目

- **WHEN** 当前用户是总经理、总经理助理或中心负责人
- **THEN** 页面 MUST 展示后端返回的全部项目，不得在前端按中心或参与关系二次过滤

#### Scenario: 创建人可见自己创建项目

- **WHEN** 当前用户是项目创建人
- **THEN** 页面 MUST 展示后端返回的其创建项目

#### Scenario: 系统管理员不显示业务项目

- **WHEN** 当前用户仅具备系统管理员身份且后端未返回业务项目
- **THEN** 页面 MUST NOT 因其系统管理员身份在前端补充或显示业务项目

#### Scenario: 项目详情无权错误展示

- **WHEN** 后端对项目详情返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示无权访问提示，不得继续把该项目当作可操作项目

#### Scenario: 项目总览只展示后端可见项目

- **WHEN** 当前用户打开项目总览页
- **THEN** 页面必须携带登录态调用 `GET /api/projects/overview-dashboard`，并只展示后端返回的项目卡片和汇总指标

### Requirement: 项目详情组织权限入口边界

前端 MUST 根据后端权限字段展示项目详情页操作入口；总经理、总经理助理、中心负责人、项目创建人和项目经理的查看能力不得直接推导为审批、退回、阶段推进、责任人分配、适用性管理、项目编号填写或附件上传/删除入口。

#### Scenario: 总经理助理全局查看

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面可以展示所有项目、所有流程和所有资料进度的查看入口

#### Scenario: 中心负责人全局查看

- **WHEN** 当前用户 `organizationRole = center_manager`
- **THEN** 页面可以展示全部项目、完整阶段资料、附件下载和业务日志查看入口
- **AND** 页面 MUST NOT 仅因中心负责人可全局查看而显示跨中心业务操作入口

#### Scenario: 项目创建人查看自己创建项目

- **WHEN** 当前用户是某项目创建人
- **THEN** 页面可以展示该项目完整阶段资料、附件下载和业务日志查看入口
- **AND** 页面 MUST NOT 仅因创建人身份显示资料提交、审核、退回、精准返工、责任人分配、适用性、阶段推进、项目编号填写、附件上传或附件删除入口

#### Scenario: 总经理助理不显示审批入口

- **WHEN** 当前用户 `organizationRole = general_manager_assistant`
- **THEN** 页面不得仅因该身份显示资料确认、资料退回、精准返工退回、阶段推进、资料责任人分配、标记不适用、恢复适用、附件上传或附件删除入口

#### Scenario: 系统管理员不显示业务操作入口

- **WHEN** 当前用户 `organizationRole = system_admin`
- **THEN** 页面不得显示资料确认、资料退回、精准返工退回、阶段推进、资料责任人分配、标记不适用、恢复适用、附件上传、附件删除或项目编号填写入口，除非后端返回明确业务权限

#### Scenario: 前端隐藏不是权限边界

- **WHEN** 总经理助理或其他无权用户绕过页面直接调用资料确认、退回、精准返工、阶段推进、资料责任人分配、清空、适用性、附件上传、附件删除或项目编号填写接口
- **THEN** 后端仍必须拒绝；页面应正确展示 `FORBIDDEN_OPERATION` 或既有统一权限错误码对应的错误信息

#### Scenario: 项目经理查看全量进度

- **WHEN** 当前用户是某项目的项目经理
- **THEN** 项目详情页必须允许其查看该项目全量阶段、资料、齐套摘要、责任人、附件进度和业务日志

#### Scenario: 项目经理推进入口仍受齐套门禁

- **WHEN** 当前用户是某项目的项目经理且页面显示阶段推进入口
- **THEN** 页面必须继续基于后端返回的当前阶段适用资料齐套摘要、返工门禁和推进权限提示是否可推进

#### Scenario: 非项目经理不显示阶段推进入口

- **WHEN** 当前用户不是该项目项目经理，也不具备后端返回的其他推进权限
- **THEN** 页面不得仅因其可查看项目而显示该项目阶段推进入口

### Requirement: 附件按钮权限展示

前端 MUST 根据后端权限边界展示附件列表、下载、上传和删除入口，但 MUST NOT 将前端隐藏作为唯一权限边界。

#### Scenario: 有查看权限展示附件列表

- **WHEN** 后端返回 `canViewAttachments = true`
- **THEN** 页面可以展示附件列表

#### Scenario: 有下载权限展示下载按钮

- **WHEN** 后端返回 `canDownloadAttachment = true`
- **THEN** 页面可以展示附件下载按钮

#### Scenario: 上传按钮只使用上传权限字段

- **WHEN** 页面判断附件上传入口是否展示
- **THEN** 页面必须使用后端返回的 `canUploadAttachment` 或等价上传权限字段，不得用项目可见性、完整资料查看权、附件下载权、项目经理身份、中心负责人身份、总经理身份或总经理助理身份推导上传权限

#### Scenario: 删除按钮只使用删除权限字段

- **WHEN** 页面判断附件删除入口是否展示
- **THEN** 页面必须使用后端返回的 `canDeleteAttachment` 或等价删除权限字段，不得用项目可见性、完整资料查看权、附件下载权、项目经理身份、中心负责人身份、总经理身份或总经理助理身份推导删除权限

#### Scenario: 无权用户隐藏附件操作

- **WHEN** 当前用户无权访问资料项附件
- **THEN** 页面不得展示附件列表、下载按钮、上传按钮或删除按钮

#### Scenario: 附件无权错误提示

- **WHEN** 后端对附件操作返回 `FORBIDDEN_OPERATION`
- **THEN** 页面必须展示可理解的无权访问或无权操作提示

#### Scenario: 前端隐藏不是权限边界

- **WHEN** 用户绕过页面直接调用附件接口
- **THEN** 后端仍必须按资料项级权限拒绝；前端只负责入口隐藏和错误提示
