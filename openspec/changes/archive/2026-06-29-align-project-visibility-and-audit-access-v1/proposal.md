## Why

当前项目、阶段资料、附件和业务日志的查看权限仍按较窄的项目参与或中心相关口径过滤，不能满足总经理、总经理助理、中心负责人以及项目创建人对项目全貌的查看需要。需要把“查看权限”按最终口径放宽，同时明确不放宽任何业务操作权限，避免查看能力被误用为提交、审核、推进或返工权限。

## What Changes

- 放宽项目列表、项目详情和项目总览的查看范围：总经理、总经理助理、中心负责人可查看全部项目；项目创建人可查看自己创建的项目；项目经理继续可查看自己负责项目；员工仍只查看自己相关项目；系统管理员不默认获得业务项目访问权。
- 放宽可见项目内的阶段资料清单、已上传附件查看/下载和完整业务日志查看：总经理、总经理助理、中心负责人、项目创建人、项目经理对其可见项目可查看完整阶段资料、全部已上传附件和业务日志。
- 明确查看权限放宽不等于操作权限放宽：资料提交、资料审核/确认/退回、精准返工退回、责任人分配/清空、适用性标记/恢复、附件上传、附件删除、阶段推进、项目编号填写、`1.2` 多节点审批均保持既有业务权限。
- 明确实现边界：查看函数与操作函数不得合并复用；`buildStageDocumentPermissions` 如需调整，仅可调整 `canViewAttachments` 和 `canDownloadAttachment`，不得放宽上传、删除、提交、审核、责任人管理或适用性权限。
- 不新增日报、周报、项目一览表生成；不实现 `1.2 项目立项审批表` 多节点审批；不恢复文件平台联动；不修改文件管理平台职责。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-core`: 调整项目列表、详情、总览和完整审计信息的查看范围，并明确业务操作权限不随查看权放宽。
- `stage-document-checklist`: 调整阶段资料条目、附件查看和附件下载权限，并明确资料、附件和精准返工操作权限保持不变。
- `business-operation-log`: 调整项目业务日志查看范围，并明确本 change 不新增日志导出、系统日志或用户管理日志能力。
- `project-core-frontend`: 调整前端项目列表、详情、阶段资料、附件和日志展示口径，并要求操作按钮继续以后端权限字段为准。
- `technical-architecture`: 明确查看权限与操作权限分离的架构边界，并重申不做文件平台联动、报表生成或通用审批引擎。

## Impact

- Affected backend areas in future implementation: project visibility helpers, project list/detail/overview queries, stage document visibility checks, attachment view/download checks, complete project audit access checks, and related smoke tests.
- Affected frontend areas in future implementation: project list/overview, project detail stage document list, attachment list/download actions, business log view, and permission-driven operation button rendering.
- No database schema change is planned by this proposal.
- No file platform integration, report generation, notification push, generic workflow engine, or `1.2` multi-node approval is included.
