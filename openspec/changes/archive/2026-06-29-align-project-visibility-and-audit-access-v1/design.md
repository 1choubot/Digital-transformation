## Context

20260625 在线平台内部资料闭环和后续精准返工已经把项目、阶段资料、附件、业务日志留在数字化平台内处理。当前权限口径仍偏向“项目参与/本中心相关”过滤，导致总经理、总经理助理、中心负责人和项目创建人无法稳定查看完整项目资料、附件和业务日志。

本 change 只调整查看权限，不改变任何业务操作权限。后续实现必须把查看权限 helper 与操作权限 helper 分离，避免全量查看角色意外获得资料提交、审核、返工、附件上传/删除、阶段推进或项目编号填写能力。

## Goals / Non-Goals

**Goals:**

- 总经理、总经理助理、中心负责人可查看全部项目、完整阶段资料、全部已上传附件和全部项目业务日志。
- 项目创建人可查看自己创建项目的详情、完整阶段资料、全部已上传附件和业务日志。
- 项目经理继续可查看自己负责项目的完整阶段资料、全部已上传附件和业务日志。
- 员工仍只查看自己相关项目和资料。
- 系统管理员仍只做账号/平台维护，不因系统管理员身份默认获得业务项目、资料、附件或日志访问权。
- 查看权限放宽仅覆盖项目列表/详情/总览、阶段资料条目、附件查看/下载和业务日志查看。

**Non-Goals:**

- 不放宽资料提交、资料审核/确认/退回、精准返工退回、责任人分配/清空、适用性标记/恢复、附件上传、附件删除、阶段推进、项目编号填写或 `1.2` 多节点审批权限。
- 不新增日报、周报、项目一览表生成。
- 不实现 `1.2 项目立项审批表` 商务评价、技术评价、总经理多节点在线审批。
- 不恢复文件平台联动，不调用文件管理平台 API。
- 不做通用审批流引擎、推送通知或复杂权限配置页面。

## Decisions

### Split View Permissions From Operation Permissions

后续实现应保留独立查看判断。本 change 可放宽的查看 helper 包括 `visibility.js`、`canViewStageDocumentItem`、`canViewStageDocumentAttachments`、`canDownloadStageDocumentAttachment`、`canViewProjectOperationLogs` 或等价业务日志查看 helper。

`canViewCompleteProjectAudit` 或等价 legacy 阶段审批历史 helper 不作为业务日志放宽 helper。legacy 阶段审批历史查看权限必须与业务日志查看权限分离，不能因为总经理助理、中心负责人或项目创建人能查看业务日志，就自动允许其查看 legacy 阶段审批历史。

操作函数不得复用“可查看项目”作为授权依据。`canReviewStageDocument`、`canSubmitStageDocument`、`canManageProjectResponsibility`、`canManageStageDocumentApplicability`、`canAdvanceProjectStage`、精准返工退回权限、项目编号填写权限必须继续按既有业务规则判断。

Alternative considered: 把“项目可见”直接作为项目内资料、附件和日志的统一权限。该方案实现简单，但会让上传、删除、审核、返工和推进很容易误用项目可见结果，因此拒绝。

### Define Full Business Viewers

后续实现可将总经理、总经理助理、中心负责人视为全局业务查看角色。项目创建人和项目经理只对自己创建或负责的项目拥有完整查看权。普通员工保留受限视图。系统管理员不进入业务查看角色集合。

Alternative considered: 中心负责人继续只看本中心项目或本中心资料。该方案与最终口径不一致，且无法支持管理层横向查看全部项目。

### Keep Attachment Operations Separate

`buildStageDocumentPermissions` 如需调整，只能调整 `canViewAttachments` 和 `canDownloadAttachment`。`canUploadAttachment`、`canDeleteAttachment`、`canSubmitDocument`、`canReviewDocument`、`canManageResponsibility`、`canChangeApplicability` 不得因本 change 放宽。

Alternative considered: 全量查看角色默认获得附件上传或删除。该方案会把查看职责变成资料维护职责，违反业务口径。

### Frontend Trusts Backend Permission Fields

前端可以展示后端返回的完整项目、资料、附件和日志，但操作入口必须继续以后端权限字段为准。前端不得仅根据 `organizationRole` 或“项目可见”硬编码展示审核、提交、推进、责任分配、适用性、上传或删除入口。

Alternative considered: 前端按角色自行推导按钮显示。该方案容易与后端安全边界分叉，因此只允许用后端权限字段做最终依据。

## Risks / Trade-offs

- [Risk] 全量查看角色被误授业务操作权限 -> Mitigation: spec 和任务明确 view helper 与 operation helper 不得合并，smoke 覆盖跨中心中心负责人、总经理助理不能操作。
- [Risk] 项目创建人完整查看与普通员工受限查看混淆 -> Mitigation: 项目创建人仅对 `createdByUserId` 匹配项目获得完整查看，普通员工仍按责任资料和相关项目过滤。
- [Risk] 附件下载放宽后被误认为上传/删除也放宽 -> Mitigation: 仅调整 `canViewAttachments` / `canDownloadAttachment`，上传和删除继续按既有权限字段控制。
- [Risk] 系统管理员被误认为拥有全量业务可见 -> Mitigation: 明确系统管理员只做账号/平台维护，smoke 覆盖系统管理员看不到业务项目和日志。
