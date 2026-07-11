## Context

本 change 只规划统一项目权限 resolver/helper，不实现代码。执行前用 `rg` 对代表性权限锚点做了扫描，当前权限判断大体分为基础身份 helper、项目可见性、项目上下文、阶段资料查看/操作、立项在线表单/评价、方案设计节点/上传槽、自动推进/manual fallback 等几类。

### 现状盘点

代表性扫描锚点：

- `digital-platform-api/src/domain/organization.js`
  - 已有基础身份判断：`isSystemAdminUser`、`isGeneralManagerUser`、`isGeneralManagerAssistantUser`、`isCenterManagerUser`、`isEmployeeUser`。
  - 已有项目/资料关系 helper：`isProjectManagerForProject`、`canSubmitStageDocument`、`canApproveStageDocument`、`canManageProjectResponsibility`、`canAdvanceProjectStage`。
  - 已有中心/项目相关性判断：`getProjectParticipatingDepartments`、`isProjectRelatedToDepartment`、`isStageDocumentRelatedToDepartment`。
- `digital-platform-api/src/repositories/stageDocuments/permissionContext.js`
  - 负责查询项目权限上下文，包含中心负责人 `has_department_responsible` SQL、项目经理、商务/技术负责人、创建人、参与部门、项目状态。
  - 属于 Batch 2 的项目上下文 resolver 候选，不应在 Batch 1 移动 SQL。
- `digital-platform-api/src/repositories/stageDocuments/accessControl.js`
  - 集中了一部分阶段资料查看/附件/责任/适用性权限，但仍有本地 `isCurrentUserResponsible`、`isCurrentUserProjectManager`、`isCurrentUserProjectResponsible` 等判断。
  - 同时包含查看权限和操作权限，后续需要分层，不应一次性迁移全部。
- `digital-platform-api/src/repositories/projects/visibility.js`
  - 项目可见性由 `buildProjectVisibilityCondition` 和 `canViewProject` 生成，覆盖总经理/总经理助理/中心负责人全局查看、员工项目关系、资料责任和方案设计角色。
  - 属于 Batch 2 项目查看 resolver 候选，必须保持现有 SQL 条件与可见结果。
- `digital-platform-api/src/repositories/projects/stageAdvanceRepository.js`
  - manual fallback 权限调用 `canAdvanceProjectStage`，中心负责人场景另有 `has_department_responsible` SQL。
  - 自动推进不做用户授权升级；manual fallback API 权限属于 Batch 3。
- `digital-platform-api/src/repositories/stageDocuments/statusRepository.js`
  - `assertUserCanUpdateDocumentStatus` 包含资料提交、确认/退回、1.3 营销中心负责人提交、在线表单来源等操作权限。
  - 属于复杂操作权限，必须留到 Batch 3。
- `digital-platform-api/src/repositories/stageDocuments/workbenchRepository.js`
  - 工作台待办查询同时包含身份过滤、资料责任、1.2 协同、1.3 营销中心负责人、资料审核、历史阶段推进查询函数和方案设计待办。
  - 工作台口径不能在 Batch 1 迁移，避免改变待办生成。
- `digital-platform-api/src/repositories/stageDocuments/onlineFormRepository.js`
  - 在线表单查看依赖 `canViewStageDocumentItem`，编辑/提交逻辑另有 1.1 责任人、1.2 商务/技术负责人、1.3 营销中心负责人和门禁判断。
  - `isMarketingCenterManager` 是本地语义糖，后续可基于参数化中心 helper 表达。
- `digital-platform-api/src/repositories/stageDocuments/initiationReviewRepository.js`
  - 立项 1.2 节点评价/审批通过 `canUserReviewInitiationNode` 和本地 node key 判断表达，工作台中仍有 `user.organizationRole` 和 `user.department` 直接判断。
  - 立项审批状态机和节点操作必须留到 Batch 3。
- `digital-platform-api/src/repositories/projects/solutionDesignWorkflow/permissions.js`
  - 已有模块内本地 `isCenterManagerOf(user, department)` 和 `isManufacturingCenterManager`，同时含方案设计角色、节点、上传槽、报价/投标、财务保密文件等复杂权限。
  - 本地 `isCenterManagerOf` 说明参数化 helper 是可行方向，但方案设计节点权限不能在 Batch 1 大迁移。
- 代表性全局扫描：
  - `rg` 对 `digital-platform-api/src/repositories` 和 `digital-platform-api/src/routes` 中 `isGeneralManagerUser|isCenterManagerUser|isSystemAdminUser|isGeneralManagerAssistantUser|organizationRole|user.department|canView|canSubmit|canApprove|canAdvance|FORBIDDEN|project_manager_user_id|responsible_user_id` 的代表性命中约 433 处。
  - 该数字用于判断散落程度，不作为穷尽清单；后续实现前还需做完整枚举。

### 实现前迁移清单

Batch 1 实现前用以下 pattern 对 `digital-platform-api/src/domain`、`digital-platform-api/src/repositories`、`digital-platform-api/src/routes` 做完整扫描：

`isGeneralManagerUser|isGeneralManagerAssistantUser|isSystemAdminUser|isCenterManagerUser|organizationRole|user.department|project_manager_user_id|responsible_user_id|canAdvanceProjectStage|canSubmitStageDocument|canApproveStageDocument|canView|FORBIDDEN_OPERATION`

命中文件按职责归类如下：

- 基础身份和领域 helper：`domain/organization.js`、`domain/initiationReview.js`、`domain/solutionDesignWorkflow.js`、`domain/projectApproval.js`、`domain/projects.js`、`domain/reports.js`。
- 项目查看和项目基础仓储：`repositories/projects/visibility.js`、`coreRepository.js`、`shared.js`、`approvalRepository.js`、`overviewDashboardRepository.js`、`stageAdvanceRepository.js`、`workspaceRepository.js`、`solutionDesignWorkflowRepository.js`。
- 方案设计拆分模块：`repositories/projects/solutionDesignWorkflow/permissions.js`、`queries.js`、`formDtos.js`。
- 阶段资料权限和资料仓储：`repositories/stageDocuments/accessControl.js`、`permissionContext.js`、`statusRepository.js`、`workbenchRepository.js`、`onlineFormRepository.js`、`initiationReviewRepository.js`、`responsibilityRepository.js`、`generatedFileRepository.js`、`onlineFormImageRepository.js`、`checklistRepository.js`、`shared.js`、`taskRepository.js`、`applicabilityRepository.js`、`stageDocumentAttachmentRepository.js`。
- 报表、用户和路由中的权限判断：`repositories/dailyReportRepository.js`、`weeklyReportRepository.js`、`centerDailyReportRepository.js`、`operationLogRepository.js`、`userRepository.js`、`routes/centerDailyReports.js`、`routes/weeklyReports.js`、`routes/projectRouteHandlers.js`、`routes/users.js`。

Batch 1 可迁移项：

- 在 `domain/organization.js` 收敛基础身份 helper 和低风险 project/document like helper。
- `projects/solutionDesignWorkflow/permissions.js` 的本地 `isCenterManagerOf` 可改为复用 `organization.js`。
- `stageDocuments/onlineFormRepository.js` 的本地 `isMarketingCenterManager` 可改为通过 `isCenterManagerOf(user, BUSINESS_DEPARTMENT.MARKETING_CENTER)` 表达。

Batch 1 暂不迁移项：

- `stageDocuments/statusRepository.js` 的资料提交/确认/退回 gate。
- `stageDocuments/onlineFormRepository.js` 的 1.1/1.2/1.3 在线表单业务 gate。
- `stageDocuments/initiationReviewRepository.js` 的 1.2 营销评价、研发评价和总经理审批状态机。
- `projects/solutionDesignWorkflow/permissions.js` 的节点提交/审批、上传槽、报价/投标、财务保密权限。
- `projects/visibility.js` 和 `stageDocuments/permissionContext.js` 的 SQL 条件。
- `stageDocuments/workbenchRepository.js` 的待办生成查询。
- `projects/stageAdvanceRepository.js` 的 manual fallback API 权限和自动推进触发语义。

### 分类

身份判断散落位置：
- `domain/organization.js` 是现有基础来源。
- `stageDocuments/onlineFormRepository.js` 有本地 `isMarketingCenterManager`。
- `projects/solutionDesignWorkflow/permissions.js` 有本地 `isCenterManagerOf` 与 `isManufacturingCenterManager`。
- `stageDocuments/initiationReviewRepository.js` 和 `workbenchRepository.js` 存在直接 `organizationRole` / `department` 判断。

查看权限判断散落位置：
- `projects/visibility.js` 负责项目可见性。
- `stageDocuments/accessControl.js` 负责完整资料集、资料项、附件、operation log 查看。
- `stageDocuments/onlineFormRepository.js` 通过 `assertCanViewFormDocument` 组合项目上下文和资料查看。
- `onlineFormImageRepository.js`、方案设计 workflow 查询也会复用或扩展查看语义，属于后续审计范围。

操作权限判断散落位置：
- `stageDocuments/statusRepository.js`：资料提交、确认、退回。
- `stageDocuments/onlineFormRepository.js`：在线表单保存/提交、1.1/1.2/1.3 专用规则。
- `stageDocuments/initiationReviewRepository.js`：立项评价/审批节点操作。
- `projects/solutionDesignWorkflow/permissions.js`：角色分配、节点提交/审批、上传槽、报价/投标、财务保密。
- `projects/stageAdvanceRepository.js`：manual fallback API 阶段推进权限。

## Goals / Non-Goals

**Goals:**

- 建立统一项目权限 resolver/helper 的分批迁移规划。
- 第一批只收敛基础身份 helper 和低风险 user/project/document like 判断。
- 明确查看权限与操作权限分离，后续不得把可查看自动升级为可操作。
- 明确参数化中心负责人判断优先，避免继续新增平行函数。
- 为合同签订阶段、共享阶段机制和后续权限 resolver 迁移提供边界。

**Non-Goals:**

- 本轮不实现代码。
- 不改业务行为、API DTO、SQL 结构、operation log、工作台待办口径或自动推进语义。
- 不改前端、migration、8 大阶段、71 项资料数量。
- 不重构方案设计复杂节点状态机。
- 不改立项审批状态机。
- 不下线旧阶段关口审批。
- 不实现合同签订阶段业务。

## Decisions

### 1. 参数化 helper 优先

Batch 1 SHOULD 优先新增或收敛参数化 helper：

- `hasOrganizationRole(user, role)`
- `isCenterManager(user)`
- `isCenterManagerOf(user, department)`
- `isProjectManagerOf(user, projectLike)`
- `isResponsibleUserOf(user, documentLike)`

不要为每个中心新增一堆平行函数。`isMarketingCenterManager`、`isRdCenterManager` 这类函数只能作为少数高频语义糖存在，且必须基于 `isCenterManagerOf` 实现。中心判断必须覆盖 `BUSINESS_DEPARTMENT` 的实际枚举，不能只写营销、研发、制造而漏掉其他中心。

Alternative considered: 直接新增 `canDoX` 矩阵式 resolver。该方案会过早把按钮/流程/业务操作混在一起，风险高，不适合作为第一批。

### 2. 三批迁移

Batch 1: 身份 helper 收敛
- 总经理、总经理助理、系统管理员、中心负责人、项目经理、资料责任人。
- 参数化中心负责人判断。
- 只替换低风险重复表达，不迁移复杂操作权限。
- 必须保持所有返回 boolean 与现有测试结果一致。

Batch 2: 项目上下文 resolver
- 基于项目行、项目经理、参与部门、资料责任人、阶段资料 owner/review department 生成 project permission context。
- 明确 project visibility、complete stage document set visibility、operation log visibility 的边界。
- 继续保持当前 API 返回结构，不新增前端依赖字段，不改变 SQL 结果。
- 优先包裹现有 `permissionContext.js`、`visibility.js`、`accessControl.js` 语义，再考虑调用方迁移。

Batch 3: 操作权限迁移
- 阶段资料提交/确认/退回。
- 在线表单保存/提交。
- 立项 1.2 节点评价/审批。
- 方案设计角色分配、节点提交、节点审批、上传槽、报价/投标、财务保密文件。
- 自动推进/manual fallback API 权限。
- 每类迁移必须有对应回归测试，不做跨状态机大改。

### 3. 查看权限和操作权限分离

resolver 必须清晰区分：
- 可查看项目。
- 可查看完整阶段资料集。
- 可查看单个资料/附件/operation log。
- 可执行资料、表单、节点、阶段推进操作。

查看权限不能作为操作权限的充分条件。中心负责人当前能查看更多项目，不代表能操作无关项目资料或推进阶段；这类边界必须在 resolver 设计中保留。

## Risks / Trade-offs

- 行为漂移风险 -> 第一轮实现只允许做 Batch 1，并以现有测试作为回归基线。
- SQL 结果变化风险 -> Batch 1 不改 SQL；Batch 2 先包裹现有查询结果，不改变 selected columns、joins 或 aliases。
- 工作台待办变化风险 -> Batch 1 不迁移工作台待办生成，Batch 2/3 迁移前必须先补对应断言。
- 方案设计/立项状态机风险 -> 复杂节点、退回、自动推进、派生齐套留到 Batch 3，不在第一轮触碰。
- resolver 过度设计风险 -> 不引入复杂 RBAC、按钮级矩阵或前端权限配置系统，只提供后端 helper/resolver 分层。
- 发现行为差异 -> 暂停实现，回到 review；不得通过修改业务口径让测试通过。

## Migration Plan

1. Batch 1 实现只新增/迁移低风险身份 helper，保持导出兼容。
2. 运行 `test:initiation-workflow`、`test:solution-design`、`test:reports`、`check` 和 OpenSpec strict 校验。
3. review 确认无行为变化后再规划 Batch 2。
4. 任一批次出现权限结果差异时，回退该批迁移，不做数据迁移。

## Open Questions

- Batch 2 的 project permission context 是否放在 `domain/` 还是 `repositories/projects/` 下，需要在实现前按依赖方向确认。
- 是否保留 `organization.js` 作为基础 helper 唯一入口，还是新增 `projectPermissionResolver.js` 并从中 re-export，需在 Batch 1 实现前决定。
